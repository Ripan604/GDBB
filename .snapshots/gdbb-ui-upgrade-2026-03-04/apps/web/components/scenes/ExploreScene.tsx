'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SceneShell } from './SceneShell';
import { useDeltaTime } from '@/lib/hooks/useDeltaTime';

function SigmaCore() {
  const ref = useRef<THREE.Mesh>(null);

  useDeltaTime((delta, elapsed) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.26;
    ref.current.scale.setScalar(1 + Math.sin(elapsed * 1.4) * 0.03);
  });

  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[0.74, 42, 42]} />
        <meshStandardMaterial color="#f9c850" emissive="#ffca3a" emissiveIntensity={1.2} roughness={0.25} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.02, 1.08, 140]} />
        <meshBasicMaterial color="#ffe8b5" transparent opacity={0.38} />
      </mesh>
    </group>
  );
}

function OrbitTrack({ radius, color }: { radius: number; color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius, radius + 0.012, 180]} />
      <meshBasicMaterial color={color} transparent opacity={0.24} />
    </mesh>
  );
}

function Planet({
  radius,
  size,
  color,
  speed,
  tilt,
}: {
  radius: number;
  size: number;
  color: string;
  speed: number;
  tilt: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  useDeltaTime((delta, elapsed) => {
    if (!groupRef.current || !haloRef.current) return;
    const x = Math.cos(elapsed * speed) * radius;
    const z = Math.sin(elapsed * speed + tilt) * radius;
    groupRef.current.position.set(x, Math.sin(elapsed * speed * 0.4) * 0.16, z);
    groupRef.current.rotation.y += delta * 0.45;
    haloRef.current.rotation.z += delta * 0.5;
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[size, 30, 30]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.62} roughness={0.5} />
      </mesh>
      <mesh ref={haloRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[size * 1.5, size * 1.72, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function DataStreams() {
  const pulses = useRef<Array<THREE.Mesh | null>>([]);
  const curves = useMemo(
    () => [
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.95, 0.38, 1.4),
        new THREE.Vector3(2.2, 0.05, 0.2),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-1.1, 0.42, 1.6),
        new THREE.Vector3(-3.2, 0.05, 0.2),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1.2, 0.28, -1.8),
        new THREE.Vector3(4.2, 0.05, 0.2),
      ]),
    ],
    [],
  );

  useDeltaTime((_, elapsed) => {
    curves.forEach((curve, idx) => {
      const mesh = pulses.current[idx];
      if (!mesh) return;
      const point = curve.getPointAt((elapsed * (0.11 + idx * 0.03)) % 1);
      mesh.position.copy(point);
    });
  });

  return (
    <group>
      {curves.map((curve, idx) => {
        const color = idx === 0 ? '#00d4ff' : idx === 1 ? '#7b2fbe' : '#ff8d4e';
        const positions = new Float32Array(curve.getPoints(56).flatMap((p) => [p.x, p.y, p.z]));
        return (
          <group key={idx}>
            <line>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
              </bufferGeometry>
              <lineBasicMaterial color={color} transparent opacity={0.38} />
            </line>
            <mesh
              ref={(mesh) => {
                pulses.current[idx] = mesh;
              }}
            >
              <sphereGeometry args={[0.07, 10, 10]} />
              <meshBasicMaterial color={color} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function ExploreScene() {
  return (
    <SceneShell label="GDBB explorer orbital scene" showStars showNebula>
      <SigmaCore />
      <OrbitTrack radius={2.2} color="#3db5ff" />
      <OrbitTrack radius={3.2} color="#8050ca" />
      <OrbitTrack radius={4.2} color="#ff9960" />
      <Planet radius={2.2} size={0.26} color="#00d4ff" speed={0.82} tilt={0.1} />
      <Planet radius={3.2} size={0.35} color="#7b2fbe" speed={0.58} tilt={0.7} />
      <Planet radius={4.2} size={0.43} color="#ff8d4e" speed={0.36} tilt={1.2} />
      <DataStreams />
    </SceneShell>
  );
}

