'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SceneShell } from './SceneShell';
import { useDeltaTime } from '@/lib/hooks/useDeltaTime';

type NodeInfo = {
  id: number;
  pos: [number, number, number];
  pruned: boolean;
  optimal: boolean;
};

function ProofTree({ color }: { color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const prunedRefs = useRef<Array<THREE.Mesh | null>>([]);
  const optimalRef = useRef<THREE.Mesh>(null);

  const { nodes, edges } = useMemo(() => {
    const levels = 4;
    const treeNodes: NodeInfo[] = [];
    const lineCoords: number[] = [];

    let id = 0;
    for (let level = 0; level < levels; level += 1) {
      const count = 2 ** level;
      for (let i = 0; i < count; i += 1) {
        const x = ((i + 0.5) / count - 0.5) * (3.8 - level * 0.5);
        const y = 1.7 - level * 1.05;
        const pruned = level >= 2 && i % 3 === 1;
        const optimal = level === levels - 1 && i === count - 2;
        treeNodes.push({ id, pos: [x, y, 0], pruned, optimal });
        id += 1;
      }
    }

    let offset = 0;
    for (let level = 0; level < levels - 1; level += 1) {
      const count = 2 ** level;
      const nextOffset = offset + count;
      for (let i = 0; i < count; i += 1) {
        const parentNode = treeNodes[offset + i];
        const leftNode = treeNodes[nextOffset + i * 2];
        const rightNode = treeNodes[nextOffset + i * 2 + 1];
        if (!parentNode || !leftNode || !rightNode) continue;
        const parent = parentNode.pos;
        const left = leftNode.pos;
        const right = rightNode.pos;
        lineCoords.push(parent[0], parent[1], parent[2], left[0], left[1], left[2]);
        lineCoords.push(parent[0], parent[1], parent[2], right[0], right[1], right[2]);
      }
      offset = nextOffset;
    }

    return {
      nodes: treeNodes,
      edges: new Float32Array(lineCoords),
    };
  }, []);

  useDeltaTime((delta, elapsed) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(elapsed * 0.35) * 0.2;
    }
    prunedRefs.current.forEach((mesh, idx) => {
      if (!mesh) return;
      const pulse = 0.22 + (Math.sin(elapsed * 1.5 + idx) * 0.5 + 0.5) * 0.18;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = pulse;
    });
    if (optimalRef.current) {
      optimalRef.current.scale.setScalar(1 + Math.sin(elapsed * 2.2) * 0.16);
      optimalRef.current.rotation.y += delta * 1.2;
    }
  });

  return (
    <group ref={groupRef}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[edges, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#9fc5ff" transparent opacity={0.45} />
      </lineSegments>

      {nodes.map((node, idx) => {
        if (node.pruned) {
          return (
            <mesh
              key={node.id}
              position={node.pos}
              ref={(mesh) => {
                prunedRefs.current[idx] = mesh;
              }}
            >
              <sphereGeometry args={[0.085, 12, 12]} />
              <meshStandardMaterial color="#ff8f5d" emissive="#ff6b35" emissiveIntensity={0.55} transparent />
            </mesh>
          );
        }
        if (node.optimal) {
          return (
            <mesh key={node.id} position={node.pos} ref={optimalRef}>
              <icosahedronGeometry args={[0.12, 1]} />
              <meshStandardMaterial color="#f8d375" emissive="#ffd36e" emissiveIntensity={1} />
            </mesh>
          );
        }
        return (
          <mesh key={node.id} position={node.pos}>
            <sphereGeometry args={[0.075, 12, 12]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} />
          </mesh>
        );
      })}
    </group>
  );
}

export function TheoryProofScene({ color = '#00d4ff' }: { color?: string }) {
  return (
    <SceneShell label="Search-tree theorem proof scene" showNebula showStars={false}>
      <ProofTree color={color} />
    </SceneShell>
  );
}
