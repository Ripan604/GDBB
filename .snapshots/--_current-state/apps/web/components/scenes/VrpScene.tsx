'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useDeltaTime } from '@/lib/hooks/useDeltaTime';
import { SceneShell } from './SceneShell';

export type VrpNode = { id: string; x: number; y: number; demand: number };

type Props = {
  nodes: VrpNode[];
  depot?: { x: number; y: number };
};

function CityBackground() {
  const ringRef = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);

  const roadSegments = useMemo(() => {
    const coords: number[] = [];
    for (let x = -5; x <= 5; x += 1) {
      coords.push(x, -0.56, -5.5, x, -0.56, 5.5);
    }
    for (let z = -5; z <= 5; z += 1) {
      coords.push(-5.5, -0.56, z, 5.5, -0.56, z);
    }
    return new Float32Array(coords);
  }, []);

  useDeltaTime((delta, elapsed) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.22;
      const op = 0.18 + (Math.sin(elapsed * 0.9) * 0.5 + 0.5) * 0.18;
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = op;
    }

    if (ringRef2.current) {
      ringRef2.current.rotation.z -= delta * 0.16;
      const op = 0.12 + (Math.sin(elapsed * 0.7 + 1.4) * 0.5 + 0.5) * 0.15;
      const mat = ringRef2.current.material as THREE.MeshBasicMaterial;
      mat.opacity = op;
    }
  });

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
        <planeGeometry args={[13, 13]} />
        <meshStandardMaterial color="#111a2c" emissive="#091224" emissiveIntensity={0.28} />
      </mesh>

      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[roadSegments, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#3f6fa5" transparent opacity={0.42} />
      </lineSegments>

      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
        <ringGeometry args={[2.2, 2.32, 80]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.24} />
      </mesh>

      <mesh ref={ringRef2} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.548, 0]}>
        <ringGeometry args={[3.4, 3.48, 90]} />
        <meshBasicMaterial color="#ff9d5c" transparent opacity={0.2} />
      </mesh>
    </>
  );
}

type RoutePulseProps = {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  speed: number;
};

function RoutePulse({ from, to, color, speed }: RoutePulseProps) {
  const orbRef = useRef<THREE.Mesh>(null);
  const tRef = useRef(Math.random());

  const curve = useMemo(() => {
    const c1 = new THREE.Vector3((from[0] + to[0]) / 2, 0.42, (from[2] + to[2]) / 2);
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(from[0], from[1], from[2]),
      c1,
      new THREE.Vector3(to[0], to[1], to[2]),
    ]);
  }, [from, to]);

  const points = useMemo(() => curve.getPoints(46), [curve]);

  useDeltaTime((delta) => {
    tRef.current = (tRef.current + delta * speed) % 1;
    const p = curve.getPointAt(tRef.current);
    orbRef.current?.position.copy(p);
  });

  return (
    <>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(points.flatMap((p) => [p.x, p.y, p.z])), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={0.38} />
      </line>
      <mesh ref={orbRef}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </>
  );
}

function DepotCore({ depot }: { depot?: { x: number; y: number } }) {
  const depot3 = depot ? ([depot.x / 10 - 5, 0.16, depot.y / 10 - 5] as [number, number, number]) : null;
  const ringRef = useRef<THREE.Mesh>(null);

  useDeltaTime((delta) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z += delta * 0.9;
  });

  if (!depot3) return null;

  return (
    <group position={depot3}>
      <mesh>
        <octahedronGeometry args={[0.24]} />
        <meshStandardMaterial color="#ffd08f" emissive="#ffba60" emissiveIntensity={1} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.5, 64]} />
        <meshBasicMaterial color="#ffd08f" transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

function DemandNodes({ nodes }: { nodes: VrpNode[] }) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);

  useDeltaTime((_, elapsed) => {
    refs.current.forEach((mesh, idx) => {
      if (!mesh) return;
      const wave = 1 + Math.sin(elapsed * 2.0 + idx * 0.5) * 0.09;
      mesh.scale.set(wave, wave, wave);
    });
  });

  return (
    <>
      {nodes.map((node, idx) => {
        const pos: [number, number, number] = [node.x / 10 - 5, 0.05 + node.demand / 130, node.y / 10 - 5];
        const high = node.demand > 8;
        return (
          <mesh
            key={node.id}
            ref={(mesh) => {
              refs.current[idx] = mesh;
            }}
            position={pos}
          >
            <cylinderGeometry args={[0.07, 0.07, 0.24, 14]} />
            <meshStandardMaterial
              color={high ? '#ff9054' : '#5fd7ff'}
              emissive={high ? '#ff6b35' : '#00d4ff'}
              emissiveIntensity={0.5}
            />
          </mesh>
        );
      })}
    </>
  );
}

export function VrpScene({ nodes, depot }: Props) {
  const routeSeeds = useMemo(() => {
    if (!depot) return [];
    const depotPos: [number, number, number] = [depot.x / 10 - 5, 0.18, depot.y / 10 - 5];
    return nodes.slice(0, Math.min(nodes.length, 7)).map((node, idx) => ({
      from: depotPos,
      to: [node.x / 10 - 5, 0.12, node.y / 10 - 5] as [number, number, number],
      color: idx % 3 === 0 ? '#00d4ff' : idx % 3 === 1 ? '#7b2fbe' : '#ff8c42',
      speed: 0.14 + idx * 0.013,
    }));
  }, [depot, nodes]);

  return (
    <SceneShell label="CVRP dynamic city scene" showStars={true} showNebula>
      <CityBackground />
      <DepotCore depot={depot} />
      <DemandNodes nodes={nodes} />
      {routeSeeds.map((route) => (
        <RoutePulse
          key={`${route.to[0]}-${route.to[2]}`}
          from={route.from}
          to={route.to}
          color={route.color}
          speed={route.speed}
        />
      ))}
    </SceneShell>
  );
}
