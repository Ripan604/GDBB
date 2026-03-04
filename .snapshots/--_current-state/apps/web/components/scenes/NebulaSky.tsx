'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const nebulaVertexShader = `
precision mediump float;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const nebulaFragmentShader = `
precision mediump float;

uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uScale;
uniform float uSpeed;
uniform float uOpacity;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.58;
  for (int i = 0; i < 3; i++) {
    value += amplitude * noise(p);
    p *= 1.98;
    amplitude *= 0.54;
  }
  return value;
}

void main() {
  vec2 uv = vUv;
  uv.x *= 1.45;
  uv *= uScale;
  uv += vec2(uTime * uSpeed, -uTime * (uSpeed * 0.3));

  float n = fbm(uv);
  float m = fbm(uv * 0.6 + vec2(2.0, 1.0));
  float cloud = smoothstep(0.38, 0.95, n * 0.7 + m * 0.45 + vUv.y * 0.22);
  vec3 color = mix(uColorA, uColorB, smoothstep(0.15, 0.85, n + m * 0.25));
  float alpha = cloud * uOpacity;
  gl_FragColor = vec4(color, alpha);
}
`;

const starsVertexShader = `
precision mediump float;
attribute float aSeed;
attribute float aSize;
uniform float uTime;
varying float vTwinkle;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float twinkle = 0.55 + 0.45 * sin(uTime * 1.35 + aSeed * 24.0);
  vTwinkle = twinkle;
  gl_PointSize = aSize * twinkle * (130.0 / max(1.0, -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
}
`;

const starsFragmentShader = `
precision mediump float;
varying float vTwinkle;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float dist = length(uv);
  float core = smoothstep(0.5, 0.03, dist);
  float rayX = max(0.0, 1.0 - abs(uv.x * 20.0)) * 0.38;
  float rayY = max(0.0, 1.0 - abs(uv.y * 20.0)) * 0.38;
  float glow = (core + rayX + rayY) * vTwinkle;
  vec3 color = vec3(0.88, 0.93, 1.0) * glow;
  gl_FragColor = vec4(color, glow);
}
`;

type NebulaLayerDef = {
  position: [number, number, number];
  rotation: [number, number, number];
  colorA: string;
  colorB: string;
  scale: number;
  speed: number;
  opacity: number;
};

function createNebulaMaterial(layer: NebulaLayerDef): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: nebulaVertexShader,
    fragmentShader: nebulaFragmentShader,
    uniforms: {
      uTime: { value: Math.random() * 100 },
      uColorA: { value: new THREE.Color(layer.colorA) },
      uColorB: { value: new THREE.Color(layer.colorB) },
      uScale: { value: layer.scale },
      uSpeed: { value: layer.speed },
      uOpacity: { value: layer.opacity },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function NebulaSky({
  particleCount,
  showStars,
}: {
  particleCount: number;
  showStars: boolean;
}) {
  const layers = useMemo<NebulaLayerDef[]>(
    () => [
      {
        position: [0, -1.5, -18],
        rotation: [0.02, 0.05, 0],
        colorA: '#173a8a',
        colorB: '#f08a3e',
        scale: 2.0,
        speed: 0.016,
        opacity: 0.42,
      },
      {
        position: [-3.2, -0.6, -17],
        rotation: [-0.03, -0.08, 0.06],
        colorA: '#2f6cf5',
        colorB: '#f5bf72',
        scale: 2.7,
        speed: 0.012,
        opacity: 0.27,
      },
    ],
    [],
  );

  const starsRef = useRef<THREE.Points>(null);
  const nebulaMaterials = useMemo(() => layers.map((layer) => createNebulaMaterial(layer)), [layers]);
  const starsMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: starsVertexShader,
        fragmentShader: starsFragmentShader,
        uniforms: { uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  const stars = useMemo(() => {
    const count = Math.max(420, Math.floor(particleCount / 120));
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = 14 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.7;
      positions[i * 3 + 2] = -8 - Math.abs(r * Math.sin(phi) * Math.sin(theta));
      seeds[i] = Math.random();
      sizes[i] = 1.6 + Math.random() * 2.2;
    }

    return { count, positions, seeds, sizes };
  }, [particleCount]);

  useFrame((_, delta) => {
    nebulaMaterials.forEach((material) => {
      if (material.uniforms.uTime) {
        material.uniforms.uTime.value += delta;
      }
    });

    if (starsMaterial.uniforms.uTime) {
      starsMaterial.uniforms.uTime.value += delta;
    }

    if (starsRef.current) {
      starsRef.current.rotation.y += delta * 0.01;
    }
  });

  useEffect(() => {
    const currentNebulaMaterials = nebulaMaterials;
    const currentStarsMaterial = starsMaterial;
    return () => {
      currentNebulaMaterials.forEach((material) => material.dispose());
      currentStarsMaterial.dispose();
    };
  }, [nebulaMaterials, starsMaterial]);

  return (
    <group>
      {layers.map((layer, index) => {
        return (
          <mesh
            key={index}
            position={layer.position}
            rotation={layer.rotation}
            material={nebulaMaterials[index]}
            frustumCulled={false}
          >
            <planeGeometry args={[48, 24, 1, 1]} />
          </mesh>
        );
      })}

      {showStars && (
        <points ref={starsRef} frustumCulled={false} material={starsMaterial}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[stars.positions, 3]} />
            <bufferAttribute attach="attributes-aSeed" args={[stars.seeds, 1]} />
            <bufferAttribute attach="attributes-aSize" args={[stars.sizes, 1]} />
          </bufferGeometry>
        </points>
      )}
    </group>
  );
}
