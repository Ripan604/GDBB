'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useDeltaTime } from '@/lib/hooks/useDeltaTime';
import { SceneShell } from './SceneShell';

const coreVertexShader = `
precision mediump float;
uniform float uTime;
uniform float uPulse;
varying float vNoise;
void main() {
  float n = sin(position.x * 3.2 + uTime * 0.8) *
            cos(position.y * 2.1 + uTime * 0.5) *
            sin(position.z * 4.1 + uTime * 1.1);
  vNoise = n;
  vec3 displaced = position + normal * n * uPulse;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

const coreFragmentShader = `
precision mediump float;
uniform vec3 uColorInner;
uniform vec3 uColorOuter;
varying float vNoise;
void main() {
  float t = clamp((vNoise + 1.0) * 0.5, 0.0, 1.0);
  vec3 color = mix(uColorInner, uColorOuter, t);
  gl_FragColor = vec4(color, 0.98);
}
`;

function NeuralCore() {
  const meshRef = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: coreVertexShader,
        fragmentShader: coreFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uPulse: { value: 0.22 },
          uColorInner: { value: new THREE.Color('#5fe8ff') },
          uColorOuter: { value: new THREE.Color('#7b2fbe') },
        },
        transparent: true,
      }),
    [],
  );

  useDeltaTime((delta, elapsed) => {
    if (material.uniforms.uTime) {
      material.uniforms.uTime.value = elapsed;
    }
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * 0.16;
    meshRef.current.rotation.x = Math.sin(elapsed * 0.4) * 0.08;
  });

  useEffect(() => {
    const currentMaterial = material;
    return () => {
      currentMaterial.dispose();
    };
  }, [material]);

  return (
    <mesh ref={meshRef} material={material}>
      <icosahedronGeometry args={[1.1, 5]} />
    </mesh>
  );
}

function SynapseLattice() {
  const linesRef = useRef<THREE.LineSegments>(null);
  const sparksRef = useRef<THREE.Points>(null);

  const data = useMemo(() => {
    const nodeCount = 120;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < nodeCount; i += 1) {
      const dir = new THREE.Vector3().randomDirection().multiplyScalar(1.45 + Math.random() * 0.25);
      points.push(dir);
    }

    const pairs: number[] = [];
    for (let i = 0; i < nodeCount; i += 1) {
      for (let j = i + 1; j < nodeCount; j += 1) {
        const from = points[i];
        const to = points[j];
        if (!from || !to) continue;
        if (from.distanceToSquared(to) < 1.1 && Math.random() > 0.45) {
          pairs.push(i, j);
        }
      }
    }

    const lineCoords: number[] = [];
    for (let idx = 0; idx < pairs.length; idx += 2) {
      const aIndex = pairs[idx];
      const bIndex = pairs[idx + 1];
      if (aIndex === undefined || bIndex === undefined) continue;
      const a = points[aIndex];
      const b = points[bIndex];
      if (!a || !b) continue;
      lineCoords.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }

    const linePositions = new Float32Array(lineCoords);
    const sparkPositions = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      sparkPositions[i * 3 + 0] = p.x;
      sparkPositions[i * 3 + 1] = p.y;
      sparkPositions[i * 3 + 2] = p.z;
    });

    return { linePositions, sparkPositions };
  }, []);

  useDeltaTime((delta, elapsed) => {
    if (linesRef.current) {
      linesRef.current.rotation.y -= delta * 0.06;
      const mat = linesRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.18 + (Math.sin(elapsed * 0.8) * 0.5 + 0.5) * 0.25;
    }
    if (sparksRef.current) {
      sparksRef.current.rotation.y += delta * 0.11;
      sparksRef.current.rotation.x = Math.sin(elapsed * 0.5) * 0.08;
    }
  });

  return (
    <group>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#73dfff" transparent opacity={0.3} />
      </lineSegments>
      <points ref={sparksRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.sparkPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#ffd9a8" size={0.03} sizeAttenuation transparent opacity={0.8} />
      </points>
    </group>
  );
}

function OrbitBand({
  radius,
  color,
  speed,
  tilt,
}: {
  radius: number;
  color: string;
  speed: number;
  tilt: [number, number, number];
}) {
  const ref = useRef<THREE.Mesh>(null);
  useDeltaTime((delta, elapsed) => {
    if (!ref.current) return;
    ref.current.rotation.z += delta * speed;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.16 + (Math.sin(elapsed * (0.9 + speed)) * 0.5 + 0.5) * 0.22;
  });

  return (
    <mesh ref={ref} rotation={tilt}>
      <torusGeometry args={[radius, 0.02, 18, 160]} />
      <meshBasicMaterial color={color} transparent opacity={0.24} />
    </mesh>
  );
}

function PhaseBeacon({
  color,
  radius,
  speed,
}: {
  color: string;
  radius: number;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useDeltaTime((delta, elapsed) => {
    if (!ref.current) return;
    ref.current.position.x = Math.cos(elapsed * speed) * radius;
    ref.current.position.z = Math.sin(elapsed * speed) * radius;
    ref.current.position.y = Math.sin(elapsed * speed * 0.6) * 0.18;
    ref.current.rotation.y += delta * 1.2;
  });

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[0.12, 1]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.95} />
    </mesh>
  );
}

export function HeroScene() {
  return (
    <SceneShell label="GDBB nebula hero scene" dramatic showStars showNebula>
      <NeuralCore />
      <SynapseLattice />
      <OrbitBand radius={1.9} color="#00d4ff" speed={0.15} tilt={[0.35, 0.25, 0.1]} />
      <OrbitBand radius={2.4} color="#7b2fbe" speed={-0.12} tilt={[-0.22, 0.55, 0.05]} />
      <OrbitBand radius={2.85} color="#ff8d4e" speed={0.09} tilt={[0.1, -0.4, -0.25]} />
      <PhaseBeacon color="#00d4ff" radius={2} speed={0.62} />
      <PhaseBeacon color="#7b2fbe" radius={2.45} speed={0.46} />
      <PhaseBeacon color="#ff8d4e" radius={2.9} speed={0.34} />
    </SceneShell>
  );
}
