'use client';

import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { Vector2 } from 'three';
import { useAdaptiveQuality } from '@/lib/hooks/useAdaptiveQuality';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { NebulaSky } from './NebulaSky';

function CanvasFallback({ label }: { label: string }) {
  return (
    <div
      className="grid h-[360px] place-items-center rounded-2xl border border-white/10 bg-black/40"
      aria-label={`${label} 2D fallback`}
    >
      <div className="text-center">
        <p className="font-display text-xl text-neural">GDBB 2D Mode</p>
        <p className="text-sm text-[var(--text-secondary)]">Adaptive fallback for mobile/performance</p>
      </div>
    </div>
  );
}

export function SceneShell({
  label,
  children,
  dramatic = false,
  showStars = true,
  showNebula = true,
}: {
  label: string;
  children: React.ReactNode;
  dramatic?: boolean;
  showStars?: boolean;
  showNebula?: boolean;
}) {
  const quality = useAdaptiveQuality();
  const reducedMotion = useReducedMotion();

  if (quality.mobileFallback) {
    return <CanvasFallback label={label} />;
  }

  return (
    <div className="h-[58vh] min-h-[340px] overflow-hidden rounded-2xl border border-white/10 bg-black/35">
      <Canvas
        dpr={[1, quality.dprMax]}
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ antialias: quality.antialias, powerPreference: 'high-performance' }}
        performance={{ min: 0.5 }}
        aria-label={label}
      >
        <color attach="background" args={['#020412']} />
        <ambientLight intensity={0.42} />
        <directionalLight intensity={0.74} position={[5, 5, 5]} />
        {showNebula && (
          <NebulaSky particleCount={quality.particleCount} showStars={!reducedMotion && showStars} />
        )}
        {!showNebula && !reducedMotion && showStars && (
          <Stars radius={120} depth={50} count={quality.particleCount / 90} factor={2.6} fade />
        )}
        {children}
        {!reducedMotion && quality.bloomEnabled && dramatic && (
          <EffectComposer>
            <Bloom luminanceThreshold={0.34} luminanceSmoothing={0.86} intensity={0.82} radius={0.55} />
            <ChromaticAberration
              offset={new Vector2(0.0011, 0.0011)}
              radialModulation={false}
              modulationOffset={0}
            />
            <Vignette eskil={false} offset={0.1} darkness={0.4} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}


