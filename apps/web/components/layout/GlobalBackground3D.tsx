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
    camera.position.z = THREE.MathUtils.damp(camera.position.z, THREE.MathUtils.lerp(6.35, 5.55, zoom), 2.8, delta);
    camera.lookAt(0, 0.1, 0);
  });

  return null;
}

type Brick = {
  base: THREE.Vector3;
  offset: THREE.Vector3;
  rotY: number;
};

function buildGdbbPoints(count: number) {
  const random = rng(1337);
  const points: THREE.Vector3[] = [];
  const glyphs = {
    G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
    D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  } as const;

  const word = ['G', 'D', 'B', 'B'] as const;
  const rows = glyphs.G.length;
  const colsPerGlyph = glyphs.G[0]?.length ?? 5;
  const gap = 2;
  const totalCols = word.length * colsPerGlyph + (word.length - 1) * gap;
  const centerX = (totalCols - 1) * 0.5;
  const centerY = (rows - 1) * 0.5;

  word.forEach((char, charIndex) => {
    const glyph = glyphs[char];
    glyph.forEach((line, row) => {
      for (let col = 0; col < line.length; col += 1) {
        if (line[col] !== '1') continue;
        const worldCol = charIndex * (colsPerGlyph + gap) + col;
        points.push(
          new THREE.Vector3(
            (worldCol - centerX) * 0.26 + (random() - 0.5) * 0.028,
            (centerY - row) * 0.33 + (random() - 0.5) * 0.028,
            (random() - 0.5) * 0.06,
          ),
        );
      }
    });
  });

  const basePoints = points.slice();

  while (points.length < count) {
    const source = basePoints[Math.floor(random() * Math.max(1, basePoints.length))] ?? new THREE.Vector3(0, 0, 0);
    points.push(
      source
        .clone()
        .add(new THREE.Vector3((random() - 0.5) * 0.05, (random() - 0.5) * 0.05, (random() - 0.5) * 0.04)),
    );
  }

  return points
    .slice(0, count)
    .map((point) => point.multiply(new THREE.Vector3(0.74, 0.84, 0.92)).add(new THREE.Vector3(-0.64, 0.98, 0.86)));
}

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
        { y: 3.4, z: -20.5, opacity: 0.014, scale: 20 },
        { y: 2.4, z: -22.4, opacity: 0.012, scale: 18 },
        { y: 1.6, z: -24.3, opacity: 0.01, scale: 16 },
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

  const deepRock = new THREE.Color('#203653');
  const rock = new THREE.Color('#355173');
  const frost = new THREE.Color('#6f8fb6');
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
  const ground = useMemo(() => buildTerrainGeometry(38, 26, 110, 1.2, 3), []);
  const groundDetail = useMemo(() => buildTerrainGeometry(38, 26, 128, 0.26, 29), []);
  const backMountainRange = useMemo(() => paintMountainColors(buildTerrainGeometry(124, 40, 172, 3.85, 131), 1331), []);
  const farMountainRange = useMemo(() => paintMountainColors(buildTerrainGeometry(82, 34, 148, 2.95, 61), 501), []);
  const leftMountainRange = useMemo(() => paintMountainColors(buildTerrainGeometry(34, 22, 108, 2.08, 73), 707), []);
  const rightMountainRange = useMemo(() => paintMountainColors(buildTerrainGeometry(36, 22, 108, 2.12, 97), 947), []);
  const farSnowCap = useMemo(() => paintMountainColors(buildTerrainGeometry(82, 34, 148, 3.0, 61), 811), []);

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

      <mesh geometry={backMountainRange} rotation={[-Math.PI / 2.15, 0.01, 0]} position={[0, 8.85, -43.2]} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.95} metalness={0.02} transparent opacity={0.58} />
      </mesh>

      <mesh geometry={farMountainRange} rotation={[-Math.PI / 2.14, 0.02, 0]} position={[0, 7.75, -38.6]} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.93} metalness={0.03} transparent opacity={0.62} />
      </mesh>
      <mesh geometry={farSnowCap} rotation={[-Math.PI / 2.14, 0.02, 0]} position={[0, 7.82, -38.4]} receiveShadow>
        <meshStandardMaterial color="#e8f1ff" roughness={0.36} metalness={0.05} transparent opacity={0.24} />
      </mesh>

      <mesh geometry={leftMountainRange} rotation={[-Math.PI / 2.12, 0.19, 0.03]} position={[-20.8, 8.15, -41.1]} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.92} metalness={0.03} transparent opacity={0.58} />
      </mesh>

      <mesh geometry={rightMountainRange} rotation={[-Math.PI / 2.12, -0.18, -0.02]} position={[20.8, 8.12, -41.4]} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.9} metalness={0.03} transparent opacity={0.58} />
      </mesh>

      <mesh position={[0, 2.7, -28.8]}>
        <planeGeometry args={[48, 6.4]} />
        <meshBasicMaterial color="#89abd6" transparent opacity={0.046} depthWrite={false} />
      </mesh>
      <mesh position={[0, 3.8, -34.2]}>
        <planeGeometry args={[64, 8.4]} />
        <meshBasicMaterial color="#7c9fc9" transparent opacity={0.04} depthWrite={false} />
      </mesh>
      <mesh position={[0, 4.6, -40.2]}>
        <planeGeometry args={[90, 11.4]} />
        <meshBasicMaterial color="#7392ba" transparent opacity={0.036} depthWrite={false} />
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

function BlinkingStars({ density }: { density: number }) {
  const ref = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const random = rng(1103);
    const count = Math.max(560, Math.floor(density / 96));
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      positions[i * 3 + 0] = (random() - 0.5) * 30;
      positions[i * 3 + 1] = 0.2 + random() * 8.6;
      positions[i * 3 + 2] = -1.8 - random() * 18.5;
      seeds[i] = random() * Math.PI * 2;
      sizes[i] = 1.35 + random() * 1.6;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
    g.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));

    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      toneMapped: false,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        precision mediump float;

        uniform float uTime;
        attribute float aSeed;
        attribute float aSize;
        varying float vAlpha;

        void main() {
          vec3 p = position;
          float twinkleA = 0.52 + 0.48 * sin(uTime * 1.06 + aSeed);
          float twinkleB = 0.58 + 0.42 * sin(uTime * 1.42 + aSeed * 1.73);
          float twinkle = twinkleA * twinkleB;
          vAlpha = twinkle;

          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (aSize * twinkle) * (104.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        precision mediump float;

        varying float vAlpha;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = dot(uv, uv);
          float core = smoothstep(0.34, 0.0, d);
          if (core < 0.01) discard;
          vec3 color = vec3(0.96, 0.985, 1.0);
          gl_FragColor = vec4(color, core * vAlpha * 0.56);
        }
      `,
    });

    return { geometry: g, material: m };
  }, [density]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((state, delta) => {
    const points = ref.current;
    if (!points) return;
    const shader = points.material as THREE.ShaderMaterial;
    const uniforms = shader.uniforms as { uTime: { value: number } };
    uniforms.uTime.value = state.clock.elapsedTime;
    points.rotation.y += delta * 0.0025;
  });

  return <points ref={ref} frustumCulled={false} geometry={geometry} material={material} />;
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
    const count = Math.min(7_000, Math.max(3_000, Math.floor(density * 0.34)));
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);
    const depths = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const theta = random() * Math.PI * 2;
      const radius = Math.pow(random(), 0.72) * 13.8;
      const x = Math.cos(theta) * radius + (random() - 0.5) * 1.6;
      const y = (random() - 0.5) * 6.0;
      const z = -8.0 - random() * 28.0;

      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      randoms[i] = random();
      depths[i] = random();
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    buffer.setAttribute('aRandom', new THREE.Float32BufferAttribute(randoms, 1));
    buffer.setAttribute('aDepth', new THREE.Float32BufferAttribute(depths, 1));

    const shader = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
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
        attribute float aDepth;
        varying float vAlpha;
        varying float vTone;

        void main() {
          vec3 p = position;
          float swirlA = sin(uTime * (0.33 + aRandom * 0.66) + aRandom * 14.0);
          float swirlB = cos(uTime * (0.29 + aRandom * 0.62) + aRandom * 11.0);
          p.x += swirlA * (0.08 + aDepth * 0.14);
          p.y += swirlB * (0.06 + aDepth * 0.12);

          vec2 cursor = uPointer * vec2(5.2, 2.8);
          vec2 d = p.xy - cursor;
          float distSq = dot(d, d);
          float force = exp(-distSq * 0.36) * uReveal;
          vec2 dir = normalize(d + vec2(0.0001, 0.0001));
          p.xy += dir * force * (0.07 + aRandom * 0.1);
          p.z += sin(uTime * 1.8 + aRandom * 24.0) * (0.06 + aDepth * 0.12);

          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          float baseSize = 0.35 + aRandom * 1.2 + aDepth * 1.1;
          gl_PointSize = (baseSize + force * 1.4) * (70.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          vAlpha = (0.04 + aRandom * 0.16 + aDepth * 0.08) * uReveal;
          vTone = aDepth;
        }
      `,
      fragmentShader: `
        precision mediump float;

        varying float vAlpha;
        varying float vTone;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = dot(uv, uv);
          float core = smoothstep(0.24, 0.0, d);
          if (core < 0.01) discard;
          vec3 cyan = vec3(0.22, 0.66, 0.92);
          vec3 violet = vec3(0.42, 0.44, 0.86);
          vec3 mint = vec3(0.33, 0.8, 0.71);
          vec3 color = mix(cyan, violet, vTone);
          color = mix(color, mint, core * 0.18);
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
    points.rotation.y += delta * 0.01;
    points.rotation.x = THREE.MathUtils.damp(points.rotation.x, pointer.current.y * 0.02, 3.2, delta);
    points.position.y = THREE.MathUtils.damp(points.position.y, 0.18 + pointer.current.y * 0.1, 3.4, delta);
    points.position.x = THREE.MathUtils.damp(points.position.x, pointer.current.x * 0.12, 3.4, delta);
    points.scale.setScalar(0.96 + appear * 0.1);

    const uniforms = shader.uniforms as {
      uTime: { value: number };
      uReveal: { value: number };
      uPointer: { value: THREE.Vector2 };
    };
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uReveal.value = THREE.MathUtils.damp(uniforms.uReveal.value, 0.18 + appear * 0.22, 4.2, delta);
    const uniformPointer = uniforms.uPointer.value;
    uniformPointer.lerp(pointerVecRef.current, 1 - Math.exp(-delta * 6));
  });

  return <points ref={ref} visible={false} position={[0, 0.18, -3.8]} geometry={geometry} material={material} />;
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
  const interactionAnchorRef = useRef<THREE.Mesh>(null);
  const cursorLocalPointRef = useRef(new THREE.Vector3(999, 999, 999));
  const cursorHoverRef = useRef(false);
  const cursorInfluenceRef = useRef(0);
  const revealPhaseRef = useRef(0);
  const previousChapterScaleRef = useRef(1);
  const explosionStartRef = useRef(-1000);
  const explosionStrengthRef = useRef(1);
  const explosionAudioRef = useRef<AudioContext | null>(null);
  const innerShellRef = useRef<THREE.Mesh>(null);
  const doorGlowRef = useRef<THREE.Mesh>(null);
  const ringARef = useRef<THREE.Mesh>(null);
  const ringBRef = useRef<THREE.Mesh>(null);
  const ringCRef = useRef<THREE.Mesh>(null);
  const ballMeshRef = useRef<THREE.InstancedMesh>(null);
  const ballDummy = useMemo(() => new THREE.Object3D(), []);
  const ballPos = useMemo(() => new THREE.Vector3(), []);
  const ballCursorTarget = useMemo(() => new THREE.Vector3(), []);
  const ballCursorDir = useMemo(() => new THREE.Vector3(), []);
  const ballScaleVec = useMemo(() => new THREE.Vector3(), []);
  const tempTarget = useMemo(() => new THREE.Vector3(), []);
  const tempPush = useMemo(() => new THREE.Vector3(), []);
  const BALL_COUNT = 100;
  const basePosition = useMemo(() => new THREE.Vector3(1.45, -0.78, -3.06), []);

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
        color: '#b6cbe3',
        emissive: '#87a5c7',
        emissiveIntensity: 0.24,
        roughness: 0.62,
        metalness: 0.1,
        transparent: true,
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
      { radius: 0.4, y: 1.08, count: 6 },
      { radius: 0.24, y: 1.22, count: 4 },
      { radius: 0.1, y: 1.34, count: 2 },
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

    list.push({
      base: new THREE.Vector3(0, 1.46, 0),
      offset: new THREE.Vector3((random() - 0.5) * 0.2, random() * 0.14, (random() - 0.5) * 0.2),
      rotY: 0,
    });

    return list;
  }, []);

  const ballGeometry = useMemo(() => new THREE.SphereGeometry(0.074, 10, 10), []);
  const ballMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#eaf3ff',
        emissiveIntensity: 0.03,
        roughness: 0.92,
        metalness: 0.0,
        transparent: true,
        opacity: 0,
        fog: false,
        toneMapped: false,
        depthWrite: false,
      }),
    [],
  );

  const ballOrigin = useMemo(() => {
    const points = bricks.slice(0, BALL_COUNT).map((brick) => brick.base.clone());
    while (points.length < BALL_COUNT) {
      points.push(new THREE.Vector3(0, -0.2, 0));
    }
    return points.slice(0, BALL_COUNT);
  }, [bricks, BALL_COUNT]);

  const gdbbPoints = useMemo(() => buildGdbbPoints(BALL_COUNT), [BALL_COUNT]);
  const ballScatter = useMemo(() => {
    const random = rng(5701);
    return Array.from({ length: BALL_COUNT }, () => {
      return new THREE.Vector3((random() - 0.5) * 1.25, (random() - 0.5) * 1.05, (random() - 0.5) * 0.88);
    });
  }, [BALL_COUNT]);
  const ballSource = useMemo(() => {
    const random = rng(8111);
    return Array.from({ length: BALL_COUNT }, () => {
      const angle = random() * Math.PI * 2;
      const radius = Math.pow(random(), 0.62) * 0.26;
      return new THREE.Vector3(
        Math.cos(angle) * radius * 0.72,
        -0.34 + (random() - 0.5) * 0.18,
        1.54 - random() * 0.54,
      );
    });
  }, [BALL_COUNT]);
  const ballDelay = useMemo(() => {
    const random = rng(8213);
    return Array.from({ length: BALL_COUNT }, () => random() * 0.46);
  }, [BALL_COUNT]);
  const ballShape = useMemo(() => {
    const random = rng(9031);
    return Array.from({ length: BALL_COUNT }, () => {
      const sx = 0.86 + random() * 0.36;
      const sy = 0.82 + random() * 0.4;
      const sz = 0.86 + random() * 0.34;
      return new THREE.Vector3(sx, sy, sz);
    });
  }, [BALL_COUNT]);
  const explosionVectors = useMemo(() => {
    const random = rng(9907);
    return bricks.map((brick) => {
      const radial = new THREE.Vector3(brick.base.x + (random() - 0.5) * 0.52, 0, brick.base.z + (random() - 0.5) * 0.52);
      if (radial.lengthSq() < 0.0001) {
        radial.set(random() - 0.5, 0, random() - 0.5);
      }
      radial.normalize();
      const direction = new THREE.Vector3(radial.x, 0.28 + random() * 0.44, radial.z).normalize();
      return {
        direction,
        spread: 2.4 + random() * 2.8,
        lift: 0.55 + random() * 0.95,
        spinX: (random() - 0.5) * 1.45,
        spinY: (random() - 0.5) * 1.9,
      };
    });
  }, [bricks]);

  const emitIglooInteraction = (detail: { type: 'hover' | 'burst'; active?: boolean; strength?: number }) => {
    window.dispatchEvent(new CustomEvent('gdbb:igloo-interaction', { detail }));
  };

  const triggerExplosion = () => {
    const nowSeconds = performance.now() * 0.001;
    const rapidClick = nowSeconds - explosionStartRef.current < 0.42;
    explosionStrengthRef.current = rapidClick ? Math.min(1.95, explosionStrengthRef.current + 0.25) : 1;
    explosionStartRef.current = nowSeconds;
    emitIglooInteraction({ type: 'burst', strength: explosionStrengthRef.current });

    const AudioContextCtor =
      window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    let context = explosionAudioRef.current;
    if (!context || context.state === 'closed') {
      context = new AudioContextCtor();
      explosionAudioRef.current = context;
    }
    void context.resume();

    const now = context.currentTime;
    const strength = explosionStrengthRef.current;

    const master = context.createGain();
    master.connect(context.destination);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.26 * strength, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.18);

    const noiseLength = Math.floor(context.sampleRate * 0.56);
    const noiseBuffer = context.createBuffer(1, noiseLength, context.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLength; i += 1) {
      const envelope = 1 - i / noiseLength;
      noiseData[i] = (Math.random() * 2 - 1) * envelope * envelope;
    }

    const noise = context.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 380;
    noiseFilter.Q.value = 0.7;
    const noiseGain = context.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.56 * strength, now + 0.02);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.64);
    noise.connect(noiseFilter).connect(noiseGain).connect(master);
    noise.start(now);
    noise.stop(now + 0.62);

    const thumpOsc = context.createOscillator();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(98, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(35, now + 0.55);
    const thumpGain = context.createGain();
    thumpGain.gain.setValueAtTime(0.001, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.52 * strength, now + 0.015);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.74);
    thumpOsc.connect(thumpGain).connect(master);
    thumpOsc.start(now);
    thumpOsc.stop(now + 0.78);

    const crackOsc = context.createOscillator();
    crackOsc.type = 'triangle';
    crackOsc.frequency.setValueAtTime(1400, now);
    crackOsc.frequency.exponentialRampToValueAtTime(410, now + 0.22);
    const crackGain = context.createGain();
    crackGain.gain.setValueAtTime(0.001, now);
    crackGain.gain.exponentialRampToValueAtTime(0.14 * strength, now + 0.01);
    crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    crackOsc.connect(crackGain).connect(master);
    crackOsc.start(now);
    crackOsc.stop(now + 0.26);
  };

  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('gdbb:igloo-interaction', { detail: { type: 'hover', active: false } }));
      brickMaterial.dispose();
      seamMaterial.dispose();
      brickGeometry.dispose();
      brickEdgeGeometry.dispose();
      ballMaterial.dispose();
      ballGeometry.dispose();
      if (explosionAudioRef.current) {
        void explosionAudioRef.current.close();
        explosionAudioRef.current = null;
      }
    };
  }, [ballGeometry, ballMaterial, brickEdgeGeometry, brickGeometry, brickMaterial, seamMaterial]);

  useFrame((state, delta) => {
    const p = scrollProgress.current;
    const transition = smoothstep(0.02, 0.98, p);
    const ringIn = 0.2 + transition * 0.55;
    const chapterScale = 1 + p * 9;
    const expansionPhase = smoothstep(1.0, 9.1, chapterScale);
    const revealForward = smoothstep(8.0, 10.0, chapterScale);
    const revealBackward = smoothstep(2.0, 10.0, chapterScale);
    const backward = chapterScale < previousChapterScaleRef.current - 0.0005;
    const revealTarget = backward ? revealBackward : revealForward;
    const revealRate = backward ? 1.05 : 3.2;
    revealPhaseRef.current = THREE.MathUtils.damp(revealPhaseRef.current, revealTarget, revealRate, delta);
    const revealPhase = revealPhaseRef.current;
    previousChapterScaleRef.current = chapterScale;
    const burstPhase = Math.pow(expansionPhase, 1.18);
    const textPhase = revealPhase;
    const iglooVisibility = THREE.MathUtils.clamp(1 - revealPhase * 0.76, 0.22, 1);
    cursorInfluenceRef.current = THREE.MathUtils.damp(cursorInfluenceRef.current, cursorHoverRef.current ? 1 : 0, 7.2, delta);
    const explosionTime = Math.max(0, performance.now() * 0.001 - explosionStartRef.current);
    const explosionEnvelope =
      smoothstep(0.0, 0.05, explosionTime) * (1 - smoothstep(1.12, 1.95, explosionTime)) * explosionStrengthRef.current;
    const explosionTravel = smoothstep(0.03, 0.98, explosionTime);
    const gravityDrop = Math.max(0, explosionTime - 0.18);

    if (groupRef.current) {
      const baseSpin = THREE.MathUtils.lerp(0.075, 0.018, burstPhase);
      groupRef.current.rotation.y += delta * baseSpin;
      groupRef.current.rotation.y += pointer.current.x * delta * 0.28 * (1 - textPhase);
      if (textPhase > 0.12) {
        groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, 0, 5.2, delta);
        groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, 0, 5.2, delta);
      }
      if (textPhase <= 0.12) {
        groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, pointer.current.y * 0.06, 3, delta);
      }
      const bob = Math.sin(state.clock.elapsedTime * 0.35) * 0.045;
      groupRef.current.position.x = THREE.MathUtils.damp(
        groupRef.current.position.x,
        basePosition.x + pointer.current.x * 0.09 * (1 - textPhase * 0.7),
        4.3,
        delta,
      );
      groupRef.current.position.y = THREE.MathUtils.damp(
        groupRef.current.position.y,
        basePosition.y + bob + pointer.current.y * 0.05 * (1 - textPhase * 0.5),
        4.2,
        delta,
      );
      groupRef.current.position.z = THREE.MathUtils.damp(
        groupRef.current.position.z,
        basePosition.z + pointer.current.y * 0.04,
        4.2,
        delta,
      );

      const scaleTarget = 1.08 + transition * 0.08 + burstPhase * 0.04;
      groupRef.current.scale.setScalar(THREE.MathUtils.damp(groupRef.current.scale.x, scaleTarget, 4.2, delta));
    }

    brickMaterial.emissiveIntensity = 0.18 + Math.sin(state.clock.elapsedTime * 0.5) * 0.035;
    brickMaterial.opacity = THREE.MathUtils.damp(brickMaterial.opacity, iglooVisibility, 6.4, delta);
    seamMaterial.opacity = (0.4 + Math.sin(state.clock.elapsedTime * 0.36) * 0.06) * iglooVisibility;

    if (innerShellRef.current) {
      const shellMaterial = innerShellRef.current.material as THREE.MeshStandardMaterial;
      shellMaterial.opacity = THREE.MathUtils.damp(shellMaterial.opacity, 0.06 * iglooVisibility, 4.5, delta);
    }

    if (doorGlowRef.current) {
      const glowMaterial = doorGlowRef.current.material as THREE.MeshBasicMaterial;
      glowMaterial.opacity = 0.13 * iglooVisibility;
    }

    brickRefs.current.forEach((mesh, index) => {
      const brick = bricks[index];
      if (!mesh || !brick) return;

      const hovered = hoveredBrickRef.current === index ? 1 : 0;
      const explosion = explosionVectors[index];
      const breathe = Math.sin(state.clock.elapsedTime * 1.8 + index * 0.11) * 0.012;
      const burstScale = burstPhase * (0.18 + burstPhase * 3.05);
      let tx = brick.base.x + brick.offset.x * burstScale + pointer.current.x * hovered * 0.12;
      let ty = brick.base.y + breathe + brick.offset.y * burstScale + hovered * 0.12 + pointer.current.y * hovered * 0.05;
      let tz = brick.base.z + brick.offset.z * burstScale + pointer.current.y * hovered * 0.09;

      if (explosion && explosionEnvelope > 0.001) {
        const outward = explosionTravel * explosion.spread * explosionEnvelope;
        tx += explosion.direction.x * outward;
        ty += explosion.direction.y * outward + explosion.lift * explosionEnvelope - gravityDrop * gravityDrop * 0.95 * explosionEnvelope;
        tz += explosion.direction.z * outward;
      }

      const proximityDistance = tempTarget.set(tx, ty, tz).distanceTo(cursorLocalPointRef.current);
      const cursorProximity = cursorInfluenceRef.current * smoothstep(1.2, 0.04, proximityDistance);
      if (cursorProximity > 0.001) {
        tempPush.set(tx, ty * 0.36, tz);
        if (tempPush.lengthSq() > 0.0001) {
          tempPush.normalize().multiplyScalar(cursorProximity * 0.28);
          tx += tempPush.x;
          ty += tempPush.y;
          tz += tempPush.z;
        }
      }

      mesh.position.x = THREE.MathUtils.damp(mesh.position.x, tx, 6.2, delta);
      mesh.position.y = THREE.MathUtils.damp(mesh.position.y, ty, 6.2, delta);
      mesh.position.z = THREE.MathUtils.damp(mesh.position.z, tz, 6.2, delta);
      mesh.rotation.y = THREE.MathUtils.damp(
        mesh.rotation.y,
        brick.rotY + hovered * 0.1 + burstPhase * 0.12 + (explosion?.spinY ?? 0) * explosionEnvelope * 0.78,
        5.5,
        delta,
      );
      mesh.rotation.x = THREE.MathUtils.damp(
        mesh.rotation.x,
        hovered * 0.08 + burstPhase * 0.1 + (explosion?.spinX ?? 0) * explosionEnvelope * 0.74,
        5.5,
        delta,
      );
      const targetScale = (0.74 + iglooVisibility * 0.26) * (1 + hovered * 0.16 * iglooVisibility + cursorProximity * 0.32);
      mesh.scale.setScalar(THREE.MathUtils.damp(mesh.scale.x, targetScale, 7.8, delta));
    });

    if (ballMeshRef.current) {
      const mesh = ballMeshRef.current;
      const emergencePhase = smoothstep(0.0, 1.0, textPhase);
      const visibilityPhase = smoothstep(7.25, 10.0, chapterScale);
      const showBalls = visibilityPhase;
      const targetOpacity = showBalls > 0.01 ? 0.98 : 0;
      const opacityRate = targetOpacity > ballMaterial.opacity ? 6.0 : 0.45;
      ballMaterial.opacity = THREE.MathUtils.damp(ballMaterial.opacity, targetOpacity, opacityRate, delta);
      mesh.visible = showBalls > 0.01 || ballMaterial.opacity > 0.015;
      ballCursorTarget.set(-0.64 + pointer.current.x * 1.95, 0.98 + pointer.current.y * 1.15, 0.86);

      for (let i = 0; i < BALL_COUNT; i += 1) {
        const source = ballSource[i] ?? ballOrigin[i] ?? new THREE.Vector3();
        const gdbbPoint = gdbbPoints[i] ?? source;
        const localDelay = ballDelay[i] ?? 0;
        const localPhase = smoothstep(localDelay, 1.0, emergencePhase);
        const scatter = ballScatter[i] ?? new THREE.Vector3();
        const mixed = ballPos.copy(source).lerp(gdbbPoint, localPhase);
        const arcLift = (1 - localPhase) * localPhase * 0.52;
        mixed.y += arcLift;
        const scatterWeight = showBalls * (1 - localPhase) * 0.18;
        mixed.x += scatter.x * scatterWeight;
        mixed.y += scatter.y * scatterWeight;
        mixed.z += scatter.z * scatterWeight;

        ballCursorDir.copy(mixed).sub(ballCursorTarget);
        const distSq = Math.max(0.0001, ballCursorDir.lengthSq());
        const cursorForce = Math.exp(-distSq * 1.6) * showBalls;
        ballCursorDir.normalize();
        mixed.addScaledVector(ballCursorDir, cursorForce * 0.22);
        mixed.z += cursorForce * 0.08;

        const pulse = 0.58 + localPhase * 0.36 + Math.sin(state.clock.elapsedTime * 1.6 + i * 0.34) * 0.025;
        const shape = ballShape[i] ?? new THREE.Vector3(1, 1, 1);
        const cursorScale = 1 + cursorForce * 0.35;
        ballDummy.position.copy(mixed);
        ballScaleVec.set(shape.x * pulse * cursorScale, shape.y * pulse * cursorScale, shape.z * pulse * cursorScale);
        ballDummy.scale.copy(ballScaleVec);
        ballDummy.updateMatrix();
        mesh.setMatrixAt(i, ballDummy.matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
    }

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
      (ringARef.current.material as THREE.MeshBasicMaterial).opacity = (0.04 + ringIn * 0.14) * iglooVisibility;
      (ringBRef.current.material as THREE.MeshBasicMaterial).opacity = (0.03 + ringIn * 0.11) * iglooVisibility;
      (ringCRef.current.material as THREE.MeshBasicMaterial).opacity = (0.02 + ringIn * 0.08) * iglooVisibility;
    }
  });

  return (
    <group ref={groupRef} position={[1.45, -0.78, -3.06]} rotation={[0, 0.34, 0]} scale={[1.08, 1.08, 1.08]}>
      <mesh
        ref={interactionAnchorRef}
        onPointerMove={(event) => {
          event.stopPropagation();
          cursorHoverRef.current = true;
          if (!groupRef.current) return;
          const localPoint = groupRef.current.worldToLocal(event.point.clone());
          cursorLocalPointRef.current.copy(localPoint);
        }}
        onPointerEnter={(event) => {
          event.stopPropagation();
          cursorHoverRef.current = true;
          emitIglooInteraction({ type: 'hover', active: true });
        }}
        onPointerLeave={(event) => {
          event.stopPropagation();
          cursorHoverRef.current = false;
          emitIglooInteraction({ type: 'hover', active: false });
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
          cursorHoverRef.current = true;
          triggerExplosion();
        }}
      >
        <sphereGeometry args={[3.2, 18, 14]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} color="#ffffff" />
      </mesh>

      <mesh ref={innerShellRef} position={[0, 0.04, 0]} scale={[1, 0.94, 1]}>
        <sphereGeometry args={[1.05, 36, 28, 0, Math.PI * 2, 0, Math.PI * 0.94]} />
        <meshStandardMaterial
          color="#d3e0ef"
          emissive="#9eb8d5"
          emissiveIntensity={0.14}
          roughness={0.45}
          metalness={0.08}
          transparent
          opacity={0.08}
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
            cursorHoverRef.current = true;
            emitIglooInteraction({ type: 'hover', active: true });
            if (groupRef.current) {
              cursorLocalPointRef.current.copy(groupRef.current.worldToLocal(event.point.clone()));
            }
          }}
          onPointerOut={(event) => {
            event.stopPropagation();
            if (hoveredBrickRef.current === index) hoveredBrickRef.current = null;
            cursorHoverRef.current = false;
            emitIglooInteraction({ type: 'hover', active: false });
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
            hoveredBrickRef.current = index;
            cursorHoverRef.current = true;
            if (groupRef.current) {
              cursorLocalPointRef.current.copy(groupRef.current.worldToLocal(event.point.clone()));
            }
            triggerExplosion();
          }}
        >
            <primitive object={brickGeometry} attach="geometry" />
            <lineSegments geometry={brickEdgeGeometry} material={seamMaterial} />
          </mesh>
        ))}
      </group>

      <instancedMesh ref={ballMeshRef} args={[ballGeometry, ballMaterial, BALL_COUNT]} visible={false} />

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
        <pointLight intensity={0.36} position={[1.18, 0.68, 2.08]} color="#d4e8ff" distance={6.8} decay={2} />
        <pointLight intensity={0.9} position={[1.62, -0.22, 0.56]} color="#ffd8a8" distance={4.8} decay={2} />

        <CameraRig pointer={pointerRef} scrollProgress={scrollProgressRef} />
        <IceTerrain />
        <MistBands />
        <BlinkingStars density={quality.particleCount} />
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
