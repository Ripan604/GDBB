'use client';

import { type MutableRefObject, useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { Vector2 } from 'three';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { useAdaptiveQuality } from '@/lib/hooks/useAdaptiveQuality';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = THREE.MathUtils.clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function CameraRig({
  pointer,
  scrollProgress,
}: {
  pointer: MutableRefObject<{ x: number; y: number }>;
  scrollProgress: MutableRefObject<number>;
}) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const p = scrollProgress.current;
    const zoom = smoothstep(0.02, 0.98, p);
    const targetX = pointer.current.x * 0.22;
    const targetY = pointer.current.y * 0.12;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 3.8, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 3.8, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, THREE.MathUtils.lerp(7.2, 6.2, zoom), 2.8, delta);
    camera.lookAt(0, 0.1, 0);
  });

  return null;
}

type Brick = {
  base: THREE.Vector3;
  offset: THREE.Vector3;
  rotY: number;
};

function PolarSkyDome() {
  const shader = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition).y * 0.5 + 0.5;
            vec3 top = vec3(0.36, 0.44, 0.56);
            vec3 mid = vec3(0.24, 0.30, 0.40);
            vec3 bottom = vec3(0.12, 0.16, 0.24);
            vec3 c = mix(bottom, mid, smoothstep(0.0, 0.6, h));
            c = mix(c, top, smoothstep(0.45, 1.0, h));
            gl_FragColor = vec4(c, 1.0);
          }
        `,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => {
    const material = shader;
    return () => material.dispose();
  }, [shader]);

  return (
    <mesh>
      <sphereGeometry args={[80, 36, 18]} />
      <primitive object={shader} attach="material" />
    </mesh>
  );
}

function MistBands() {
  const refs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame((state, delta) => {
    refs.current.forEach((mesh, index) => {
      if (!mesh) return;
      mesh.position.x += delta * (0.11 + index * 0.02);
      if (mesh.position.x > 8) {
        mesh.position.x = -8;
      }
      mesh.rotation.z = Math.sin(state.clock.elapsedTime * (0.2 + index * 0.08)) * 0.05;
    });
  });

  return (
    <group>
      {[
        { y: 2.1, z: -11.5, opacity: 0.028, scale: 16 },
        { y: 1.2, z: -12.8, opacity: 0.022, scale: 14 },
        { y: 0.3, z: -13.6, opacity: 0.018, scale: 12 },
      ].map((item, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            refs.current[index] = mesh;
          }}
          position={[-7 + index * 2, item.y, item.z]}
        >
          <planeGeometry args={[item.scale, item.scale * 0.4]} />
          <meshBasicMaterial color="#d7e2f0" transparent opacity={item.opacity} />
        </mesh>
      ))}
    </group>
  );
}

function buildTerrainGeometry(width: number, depth: number, segments: number, amplitude: number, seed: number) {
  const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
  const positions = geometry.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const n =
      Math.sin(x * 0.3 + seed * 0.17) * 0.22 +
      Math.cos(y * 0.21 + seed * 0.13) * 0.21 +
      Math.sin((x + y) * 0.09 + seed * 0.31) * 0.35;
    positions.setZ(i, n * amplitude);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function smoothstepValue(edge0: number, edge1: number, value: number) {
  const t = THREE.MathUtils.clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function paintMountainColors(geometry: THREE.PlaneGeometry, seed: number) {
  const random = rng(seed);
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const normals = geometry.attributes.normal as THREE.BufferAttribute;

  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < positions.count; i += 1) {
    const z = positions.getZ(i);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  const zRange = Math.max(0.001, maxZ - minZ);

  const deepRock = new THREE.Color('#15233c');
  const rock = new THREE.Color('#263c5d');
  const frost = new THREE.Color('#4d6e97');
  const snow = new THREE.Color('#f2f7ff');
  const tempA = new THREE.Color();
  const tempB = new THREE.Color();
  const result = new THREE.Color();
  const colors = new Float32Array(positions.count * 3);

  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const nUp = THREE.MathUtils.clamp(normals.getZ(i), 0, 1);
    const h = (z - minZ) / zRange;
    const slope = 1 - nUp;
    const ridgeNoise = Math.sin(x * 0.11 + y * 0.17 + seed * 0.13) * 0.5 + 0.5;
    const grain = random() * 0.07 - 0.035;

    const snowByHeight = smoothstepValue(0.56, 0.92, h);
    const snowBySlope = 1 - smoothstepValue(0.16, 0.82, slope);
    const snowMask = THREE.MathUtils.clamp(snowByHeight * (0.68 + ridgeNoise * 0.52) * snowBySlope, 0, 1);
    const frostMask = THREE.MathUtils.clamp(smoothstepValue(0.24, 0.72, h) * (0.45 + ridgeNoise * 0.35), 0, 1) * (1 - snowMask);
    const deepRockMask = THREE.MathUtils.clamp(smoothstepValue(0.52, 0.98, slope) * (1 - h * 0.55), 0, 1);

    tempA.copy(rock).lerp(frost, frostMask);
    tempA.lerp(deepRock, deepRockMask * 0.7);
    tempB.copy(tempA).lerp(snow, snowMask);
    result.copy(tempB);
    result.offsetHSL(0, 0, grain);

    colors[i * 3 + 0] = THREE.MathUtils.clamp(result.r, 0, 1);
    colors[i * 3 + 1] = THREE.MathUtils.clamp(result.g, 0, 1);
    colors[i * 3 + 2] = THREE.MathUtils.clamp(result.b, 0, 1);
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function IceTerrain() {
  const ground = useMemo(() => buildTerrainGeometry(38, 26, 110, 1.35, 3), []);
  const groundDetail = useMemo(() => buildTerrainGeometry(38, 26, 140, 0.32, 29), []);
  const backMountainRange = useMemo(() => paintMountainColors(buildTerrainGeometry(124, 40, 210, 5.6, 131), 1331), []);
  const farMountainRange = useMemo(() => paintMountainColors(buildTerrainGeometry(82, 34, 180, 4.2, 61), 501), []);
  const leftMountainRange = useMemo(() => paintMountainColors(buildTerrainGeometry(52, 28, 140, 3.2, 73), 707), []);
  const rightMountainRange = useMemo(() => paintMountainColors(buildTerrainGeometry(56, 30, 150, 3.45, 97), 947), []);
  const farSnowCap = useMemo(() => paintMountainColors(buildTerrainGeometry(82, 34, 180, 4.25, 61), 811), []);

  useEffect(() => {
    const g = ground;
    const gd = groundDetail;
    const back = backMountainRange;
    const far = farMountainRange;
    const left = leftMountainRange;
    const right = rightMountainRange;
    const cap = farSnowCap;
    return () => {
      g.dispose();
      gd.dispose();
      back.dispose();
      far.dispose();
      left.dispose();
      right.dispose();
      cap.dispose();
    };
  }, [backMountainRange, farMountainRange, farSnowCap, ground, groundDetail, leftMountainRange, rightMountainRange]);

  return (
    <group>
      <mesh geometry={ground} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.58, -0.2]} receiveShadow>
        <meshStandardMaterial color="#4f5f74" roughness={0.96} metalness={0.02} />
      </mesh>
      <mesh geometry={groundDetail} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.56, -0.2]} receiveShadow>
        <meshStandardMaterial color="#9cb1cb" roughness={0.32} metalness={0.1} transparent opacity={0.11} />
      </mesh>

      <mesh geometry={backMountainRange} rotation={[-Math.PI / 2.12, 0.01, 0]} position={[0, 4.9, -22.8]} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.96} metalness={0.02} transparent opacity={0.85} />
      </mesh>

      <mesh geometry={farMountainRange} rotation={[-Math.PI / 2.1, 0.02, 0]} position={[0, 3.75, -15.3]} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.94} metalness={0.03} />
      </mesh>
      <mesh geometry={farSnowCap} rotation={[-Math.PI / 2.1, 0.02, 0]} position={[0, 3.81, -15.24]} receiveShadow>
        <meshStandardMaterial color="#e8f1ff" roughness={0.38} metalness={0.05} transparent opacity={0.22} />
      </mesh>

      <mesh geometry={leftMountainRange} rotation={[-Math.PI / 2.04, 0.24, 0.07]} position={[-9.4, 2.8, -11.9]} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.92} metalness={0.03} />
      </mesh>

      <mesh geometry={rightMountainRange} rotation={[-Math.PI / 2.02, -0.2, -0.06]} position={[10.0, 2.95, -12.1]} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.9} metalness={0.03} />
      </mesh>

      <mesh position={[0, 1.35, -10.8]}>
        <planeGeometry args={[42, 5.2]} />
        <meshBasicMaterial color="#7aa0d1" transparent opacity={0.09} depthWrite={false} />
      </mesh>
      <mesh position={[0, 2.25, -14.6]}>
        <planeGeometry args={[56, 7.4]} />
        <meshBasicMaterial color="#6a8ebd" transparent opacity={0.07} depthWrite={false} />
      </mesh>
      <mesh position={[0, 3.6, -20.2]}>
        <planeGeometry args={[82, 10.2]} />
        <meshBasicMaterial color="#5c7ea9" transparent opacity={0.06} depthWrite={false} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.06, 0]}>
        <ringGeometry args={[1.8, 3.3, 90]} />
        <meshBasicMaterial color="#a7bfd8" transparent opacity={0.14} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.02, 0]}>
        <ringGeometry args={[3.7, 5.8, 90]} />
        <meshBasicMaterial color="#93abc6" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

function SnowField({ density }: { density: number }) {
  const ref = useRef<THREE.Points>(null);

  const { positions, speeds } = useMemo(() => {
    const random = rng(241);
    const count = Math.max(800, Math.floor(density / 2.5));
    const pos = new Float32Array(count * 3);
    const sp = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      pos[i * 3 + 0] = (random() - 0.5) * 20;
      pos[i * 3 + 1] = random() * 9 - 1;
      pos[i * 3 + 2] = -random() * 14;
      sp[i] = 0.08 + random() * 0.2;
    }
    return { positions: pos, speeds: sp };
  }, [density]);

  useFrame((_, delta) => {
    const points = ref.current;
    if (!points) return;
    const attr = points.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < speeds.length; i += 1) {
      const y = attr.getY(i) - speeds[i]! * delta;
      attr.setY(i, y < -1.6 ? 6.5 : y);
    }
    attr.needsUpdate = true;
    points.rotation.y += delta * 0.01;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#f5f9ff" size={0.016} transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

function ConstellationField({ density, scrollProgress }: { density: number; scrollProgress: MutableRefObject<number> }) {
  const ref = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);

  const lines = useMemo(() => {
    const random = rng(873);
    const count = Math.max(70, Math.floor(density / 350));
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < count; i += 1) {
      points.push(new THREE.Vector3((random() - 0.5) * 24, random() * 7 - 1, -4 - random() * 8));
    }
    const coords: number[] = [];
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const a = points[i];
        const b = points[j];
        if (!a || !b) continue;
        if (a.distanceToSquared(b) < 9 && random() > 0.83) {
          coords.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
    }
    return new Float32Array(coords);
  }, [density]);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.005;
    }
    if (materialRef.current) {
      const fadeOut = smoothstep(0.2, 0.45, scrollProgress.current);
      materialRef.current.opacity = THREE.MathUtils.lerp(0.35, 0.04, fadeOut);
    }
  });

  return (
    <group ref={ref}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[lines, 3]} />
        </bufferGeometry>
        <lineBasicMaterial ref={materialRef} color="#f5f9ff" transparent opacity={0.35} />
      </lineSegments>
    </group>
  );
}

function SigmaDotStructure({
  density,
  scrollProgress,
  pointer,
}: {
  density: number;
  scrollProgress: MutableRefObject<number>;
  pointer: MutableRefObject<{ x: number; y: number }>;
}) {
  const ref = useRef<THREE.Points>(null);
  const pointerVecRef = useRef(new THREE.Vector2(0, 0));

  const { geometry, material } = useMemo(() => {
    const random = rng(404);
    const count = Math.min(12_000, Math.max(6_000, Math.floor(density * 0.72)));
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const lane = random();
      let ax = 0;
      let ay = 0;

      if (lane < 0.25) {
        const t = random();
        ax = -1.4 + t * 2.8;
        ay = 1.02;
      } else if (lane < 0.5) {
        const t = random();
        ax = 1.22 - t * 2.18;
        ay = 0.98 - t * 0.86;
      } else if (lane < 0.75) {
        const t = random();
        ax = -0.96 + t * 2.18;
        ay = 0.12 - t * 0.9;
      } else {
        const t = random();
        ax = -1.38 + t * 2.76;
        ay = -1.02;
      }

      const thickness = 0.015 + random() * 0.06;
      const angle = random() * Math.PI * 2;
      const radial = Math.pow(random(), 0.72) * thickness;
      const x = (ax + Math.cos(angle) * radial) * 0.98;
      const y = (ay + Math.sin(angle) * radial) * 0.98;
      const z = (random() - 0.5) * (0.18 + Math.abs(y) * 0.06);

      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      randoms[i] = random();
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    buffer.setAttribute('aRandom', new THREE.Float32BufferAttribute(randoms, 1));

    const shader = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: true,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uReveal: { value: 0 },
        uPointer: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        precision mediump float;

        uniform float uTime;
        uniform float uReveal;
        uniform vec2 uPointer;
        attribute float aRandom;
        varying float vAlpha;

        void main() {
          vec3 p = position;
          vec2 cursor = uPointer * vec2(2.2, 1.4);
          vec2 d = p.xy - cursor;
          float dist = length(d);
          float force = exp(-dist * dist * 4.2) * uReveal;
          vec2 dir = normalize(d + vec2(0.0001, 0.0001));
          p.xy += dir * force * (0.22 + aRandom * 0.18);
          p.z += force * (0.14 + aRandom * 0.22);
          p.z += sin(uTime * 1.9 + aRandom * 24.0) * (0.004 + force * 0.012);

          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          float baseSize = 1.2 + aRandom * 1.8;
          gl_PointSize = (baseSize + force * 3.6) * (120.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          vAlpha = (0.4 + aRandom * 0.6) * uReveal;
        }
      `,
      fragmentShader: `
        precision mediump float;

        varying float vAlpha;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = dot(uv, uv);
          float core = smoothstep(0.22, 0.0, d);
          if (core < 0.01) discard;
          vec3 color = mix(vec3(0.68, 0.82, 0.96), vec3(0.94, 0.97, 1.0), core);
          gl_FragColor = vec4(color, core * vAlpha);
        }
      `,
    });

    return { geometry: buffer, material: shader };
  }, [density]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((state, delta) => {
    const p = scrollProgress.current;
    const appear = smoothstep(0.02, 0.98, p);
    const points = ref.current;
    const shader = points?.material as THREE.ShaderMaterial | undefined;
    if (!points || !shader) return;

    pointerVecRef.current.set(pointer.current.x, pointer.current.y);
    points.visible = true;
    points.rotation.y += delta * (0.04 + appear * 0.18);
    points.rotation.x = THREE.MathUtils.damp(points.rotation.x, pointer.current.y * 0.12 * appear, 4, delta);
    points.position.y = THREE.MathUtils.damp(points.position.y, 0.06 + pointer.current.y * 0.14 * appear, 4, delta);
    points.position.x = THREE.MathUtils.damp(points.position.x, pointer.current.x * 0.12 * appear, 4, delta);
    points.scale.setScalar(0.16 + appear * 0.38);

    const uniforms = shader.uniforms as {
      uTime: { value: number };
      uReveal: { value: number };
      uPointer: { value: THREE.Vector2 };
    };
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uReveal.value = THREE.MathUtils.damp(uniforms.uReveal.value, 0.04 + appear * 0.7, 4.6, delta);
    const uniformPointer = uniforms.uPointer.value;
    uniformPointer.lerp(pointerVecRef.current, 1 - Math.exp(-delta * 6));
  });

  return <points ref={ref} visible={false} position={[0.02, 0.08, -1.25]} geometry={geometry} material={material} />;
}

function CentralMorph({
  scrollProgress,
  pointer,
}: {
  scrollProgress: MutableRefObject<number>;
  pointer: MutableRefObject<{ x: number; y: number }>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const brickRefs = useRef<Array<THREE.Mesh | null>>([]);
  const hoveredBrickRef = useRef<number | null>(null);
  const innerShellRef = useRef<THREE.Mesh>(null);
  const doorGlowRef = useRef<THREE.Mesh>(null);
  const ringARef = useRef<THREE.Mesh>(null);
  const ringBRef = useRef<THREE.Mesh>(null);
  const ringCRef = useRef<THREE.Mesh>(null);

  const brickGeometry = useMemo(() => new RoundedBoxGeometry(0.54, 0.31, 0.28, 4, 0.055), []);
  const brickEdgeGeometry = useMemo(() => new THREE.EdgesGeometry(brickGeometry, 15), [brickGeometry]);
  const seamMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#c5ddfa',
        transparent: true,
        opacity: 0.52,
      }),
    [],
  );
  const brickMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#95a8c0',
        emissive: '#6f89a7',
        emissiveIntensity: 0.2,
        roughness: 0.68,
        metalness: 0.1,
        transparent: false,
        opacity: 1,
      }),
    [],
  );

  const bricks = useMemo<Brick[]>(() => {
    const random = rng(41);
    const rows = [
      { radius: 1.9, y: -0.8, count: 24 },
      { radius: 1.74, y: -0.56, count: 22 },
      { radius: 1.58, y: -0.34, count: 20 },
      { radius: 1.42, y: -0.12, count: 18 },
      { radius: 1.26, y: 0.1, count: 16 },
      { radius: 1.1, y: 0.32, count: 14 },
      { radius: 0.92, y: 0.54, count: 12 },
      { radius: 0.74, y: 0.74, count: 10 },
      { radius: 0.56, y: 0.92, count: 8 },
    ];

    const list: Brick[] = [];
    rows.forEach((row, rowIndex) => {
      for (let i = 0; i < row.count; i += 1) {
        const angle = (i / row.count) * Math.PI * 2 + (rowIndex % 2) * (Math.PI / row.count);
        list.push({
          base: new THREE.Vector3(Math.cos(angle) * row.radius, row.y, Math.sin(angle) * row.radius),
          offset: new THREE.Vector3((random() - 0.5) * 0.35, random() * 0.25, (random() - 0.5) * 0.35),
          rotY: angle,
        });
      }
    });

    const entrance = [
      [-0.62, -0.75, 1.82],
      [-0.06, -0.75, 1.88],
      [0.5, -0.75, 1.82],
      [-0.62, -0.48, 1.82],
      [0.5, -0.48, 1.82],
      [-0.32, -0.19, 1.8],
      [0.2, -0.19, 1.8],
      [-0.62, -0.75, 1.33],
      [-0.06, -0.75, 1.39],
      [0.5, -0.75, 1.33],
      [-0.62, -0.48, 1.33],
      [0.5, -0.48, 1.33],
      [-0.32, -0.19, 1.31],
      [0.2, -0.19, 1.31],
    ] as const;

    entrance.forEach((coords) => {
      list.push({
        base: new THREE.Vector3(coords[0], coords[1], coords[2]),
        offset: new THREE.Vector3((random() - 0.5) * 1.0, random() * 0.8, 0.8 + random() * 0.5),
        rotY: 0,
      });
    });

    return list;
  }, []);

  useEffect(() => {
    return () => {
      brickMaterial.dispose();
      seamMaterial.dispose();
      brickGeometry.dispose();
      brickEdgeGeometry.dispose();
    };
  }, [brickEdgeGeometry, brickGeometry, brickMaterial, seamMaterial]);

  useFrame((state, delta) => {
    const p = scrollProgress.current;
    const transition = smoothstep(0.02, 0.98, p);
    const ringIn = 0.2 + transition * 0.55;

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
      groupRef.current.rotation.y += pointer.current.x * delta * 0.32;
      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, pointer.current.y * 0.06, 3, delta);
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.35) * 0.04;
    }

    brickMaterial.emissiveIntensity = 0.18 + Math.sin(state.clock.elapsedTime * 0.5) * 0.035;
    seamMaterial.opacity = 0.44 + Math.sin(state.clock.elapsedTime * 0.36) * 0.04;

    if (innerShellRef.current) {
      const shellMaterial = innerShellRef.current.material as THREE.MeshStandardMaterial;
      shellMaterial.opacity = THREE.MathUtils.damp(shellMaterial.opacity, 0.32, 4.5, delta);
    }

    if (doorGlowRef.current) {
      const glowMaterial = doorGlowRef.current.material as THREE.MeshBasicMaterial;
      glowMaterial.opacity = 0.13;
    }

    brickRefs.current.forEach((mesh, index) => {
      const brick = bricks[index];
      if (!mesh || !brick) return;

      const hovered = hoveredBrickRef.current === index ? 1 : 0;
      const breathe = Math.sin(state.clock.elapsedTime * 1.8 + index * 0.11) * 0.012;
      const tx = brick.base.x + pointer.current.x * hovered * 0.12;
      const ty = brick.base.y + breathe + hovered * 0.12 + pointer.current.y * hovered * 0.05;
      const tz = brick.base.z + pointer.current.y * hovered * 0.09;

      mesh.position.x = THREE.MathUtils.damp(mesh.position.x, tx, 6.2, delta);
      mesh.position.y = THREE.MathUtils.damp(mesh.position.y, ty, 6.2, delta);
      mesh.position.z = THREE.MathUtils.damp(mesh.position.z, tz, 6.2, delta);
      mesh.rotation.y = THREE.MathUtils.damp(mesh.rotation.y, brick.rotY + hovered * 0.1, 5.5, delta);
      mesh.rotation.x = THREE.MathUtils.damp(mesh.rotation.x, hovered * 0.08, 5.5, delta);
      mesh.scale.setScalar(THREE.MathUtils.damp(mesh.scale.x, 1 + hovered * 0.18, 7.8, delta));
    });

    if (ringARef.current && ringBRef.current && ringCRef.current) {
      ringARef.current.visible = true;
      ringBRef.current.visible = true;
      ringCRef.current.visible = true;
      ringARef.current.rotation.z += delta * (0.1 + ringIn * 0.8);
      ringBRef.current.rotation.z -= delta * (0.08 + ringIn * 0.6);
      ringCRef.current.rotation.z += delta * (0.07 + ringIn * 0.68);
      ringARef.current.scale.setScalar(0.68 + ringIn * 0.9);
      ringBRef.current.scale.setScalar(0.82 + ringIn * 0.95);
      ringCRef.current.scale.setScalar(1.02 + ringIn * 1.05);
      (ringARef.current.material as THREE.MeshBasicMaterial).opacity = 0.04 + ringIn * 0.14;
      (ringBRef.current.material as THREE.MeshBasicMaterial).opacity = 0.03 + ringIn * 0.11;
      (ringCRef.current.material as THREE.MeshBasicMaterial).opacity = 0.02 + ringIn * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.2, -1.25]} rotation={[0, 0.42, 0]}>
      <mesh ref={innerShellRef} position={[0, 0.04, 0]} scale={[1, 0.94, 1]}>
        <sphereGeometry args={[1.92, 42, 32, 0, Math.PI * 2, 0, Math.PI * 0.94]} />
        <meshStandardMaterial
          color="#d3e0ef"
          emissive="#9eb8d5"
          emissiveIntensity={0.14}
          roughness={0.45}
          metalness={0.08}
          transparent
          opacity={0.34}
        />
      </mesh>

      <mesh ref={doorGlowRef} rotation={[Math.PI / 2, 0, 0]} position={[0.0, -0.34, 1.58]}>
        <cylinderGeometry args={[0.52, 0.52, 0.86, 28, 1, true, 0, Math.PI]} />
        <meshBasicMaterial color="#b9d7f5" transparent opacity={0.14} side={THREE.DoubleSide} />
      </mesh>

      <group>
        {bricks.map((brick, index) => (
          <mesh
            key={index}
            ref={(mesh) => {
              brickRefs.current[index] = mesh;
            }}
            position={brick.base}
            rotation={[0, brick.rotY, 0]}
            material={brickMaterial}
            castShadow
            receiveShadow
            onPointerOver={(event) => {
              event.stopPropagation();
              hoveredBrickRef.current = index;
            }}
            onPointerOut={(event) => {
              event.stopPropagation();
              if (hoveredBrickRef.current === index) hoveredBrickRef.current = null;
            }}
          >
            <primitive object={brickGeometry} attach="geometry" />
            <lineSegments geometry={brickEdgeGeometry} material={seamMaterial} />
          </mesh>
        ))}
      </group>

      <mesh ref={ringARef} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.4, 0.07, 18, 120]} />
        <meshBasicMaterial color="#b7d0e8" transparent opacity={0.1} />
      </mesh>
      <mesh ref={ringBRef} rotation={[-Math.PI / 2, 0.55, 0.22]}>
        <torusGeometry args={[3.1, 0.05, 16, 120]} />
        <meshBasicMaterial color="#9ab6d2" transparent opacity={0.1} />
      </mesh>
      <mesh ref={ringCRef} rotation={[-Math.PI / 2, 0.2, -0.14]}>
        <torusGeometry args={[4.4, 0.04, 16, 120]} />
        <meshBasicMaterial color="#7f9fbe" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

function useSceneProgress(pathname: string) {
  const progressRef = useRef(0.08);

  useEffect(() => {
    if (pathname !== '/') {
      progressRef.current = 0.28;
      return;
    }

    const update = () => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter-id]'));
      const chapterIds = Array.from(
        new Set(
          sections
            .map((section) => section.dataset.chapterId)
            .filter((id): id is string => typeof id === 'string' && id.length > 0),
        ),
      );

      if (!sections.length || !chapterIds.length) {
        progressRef.current = 0.08;
        return;
      }

      const anchor = window.innerHeight * 0.44;
      let activeNode: HTMLElement | null = sections[0] ?? null;
      if (!activeNode) {
        progressRef.current = 0.08;
        return;
      }
      let bestTop = Number.NEGATIVE_INFINITY;
      sections.forEach((section) => {
        const top = section.getBoundingClientRect().top;
        if (top <= anchor && top > bestTop) {
          bestTop = top;
          activeNode = section;
        }
      });

      const activeId = activeNode.dataset.chapterId ?? (chapterIds[0] ?? 'topic-home');
      const chapterIndex = Math.max(0, chapterIds.indexOf(activeId));
      const rect = activeNode.getBoundingClientRect();
      const local = THREE.MathUtils.clamp((anchor - rect.top) / Math.max(rect.height, 1), 0, 1);
      progressRef.current = THREE.MathUtils.clamp((chapterIndex + local) / chapterIds.length, 0, 1);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [pathname]);

  return progressRef;
}

export function GlobalBackground3D() {
  const pathname = usePathname();
  const quality = useAdaptiveQuality();
  const reducedMotion = useReducedMotion();
  const scrollProgressRef = useSceneProgress(pathname ?? '/');
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = (event.clientY / window.innerHeight) * 2 - 1;
      pointerRef.current = { x, y: -y };
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  if (quality.mobileFallback || reducedMotion) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-0" aria-hidden>
      <Canvas
        shadows={quality.shadowsEnabled}
        dpr={[1, quality.dprMax]}
        camera={{ position: [0, 0, 7.6], fov: 48 }}
        gl={{ antialias: quality.antialias, powerPreference: 'high-performance', alpha: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.78;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
        performance={{ min: 0.62 }}
      >
        <color attach="background" args={['#17253a']} />
        <fog attach="fog" args={['#233a58', 6.0, 30]} />
        <PolarSkyDome />
        <ambientLight intensity={0.34} />
        <hemisphereLight intensity={0.22} color="#dbe9fb" groundColor="#2f3f55" />
        <directionalLight
          castShadow={quality.shadowsEnabled}
          intensity={1.15}
          position={[5, 6, 4]}
          color="#dcecff"
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={1}
          shadow-camera-far={20}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
          shadow-bias={-0.0002}
        />
        <directionalLight intensity={0.42} position={[-4, 2, -2]} color="#7e9cc2" />
        <pointLight intensity={0.3} position={[0.25, 0.7, 2.2]} color="#9fc4e8" distance={6.4} decay={2} />
        <pointLight intensity={0.82} position={[0.02, -0.26, 0.48]} color="#ffd59a" distance={4.4} decay={2} />

        <CameraRig pointer={pointerRef} scrollProgress={scrollProgressRef} />
        <IceTerrain />
        <MistBands />
        <ConstellationField density={quality.particleCount} scrollProgress={scrollProgressRef} />
        <SnowField density={quality.particleCount} />
        <SigmaDotStructure density={quality.particleCount} scrollProgress={scrollProgressRef} pointer={pointerRef} />
        <CentralMorph scrollProgress={scrollProgressRef} pointer={pointerRef} />

        {quality.bloomEnabled && (
          <EffectComposer>
            <Bloom luminanceThreshold={0.76} luminanceSmoothing={0.8} intensity={0.24} radius={0.48} />
            <ChromaticAberration offset={new Vector2(0.0007, 0.0007)} radialModulation modulationOffset={0} />
            <Vignette eskil={false} offset={0.22} darkness={0.34} />
            <Noise opacity={0.008} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
