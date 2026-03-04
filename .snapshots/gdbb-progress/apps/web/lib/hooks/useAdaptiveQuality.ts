'use client';

import { useEffect, useState } from 'react';
import { getGPUTier } from 'detect-gpu';

export type QualityProfile = {
  particleCount: number;
  bloomEnabled: boolean;
  shadowsEnabled: boolean;
  mobileFallback: boolean;
  dprMax: number;
  antialias: boolean;
};

const defaultProfile: QualityProfile = {
  particleCount: 10_000,
  bloomEnabled: false,
  shadowsEnabled: false,
  mobileFallback: false,
  dprMax: 1.1,
  antialias: false,
};

export function useAdaptiveQuality(): QualityProfile {
  const [quality, setQuality] = useState<QualityProfile>(defaultProfile);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const width = window.innerWidth;
      const isMobile = width < 768;
      if (isMobile) {
        if (mounted) {
          setQuality({
            particleCount: 0,
            bloomEnabled: false,
            shadowsEnabled: false,
            mobileFallback: true,
            dprMax: 1,
            antialias: false,
          });
        }
        return;
      }

      const cores = navigator.hardwareConcurrency ?? 4;
      const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
      const constrainedCpu = cores <= 4 || memory <= 4;

      let gpuTier = 1;
      try {
        const gpu = await getGPUTier();
        gpuTier = gpu.tier ?? 1;
      } catch {
        gpuTier = 1;
      }

      if (!mounted) return;

      if (constrainedCpu && gpuTier <= 1) {
        setQuality({
          particleCount: 3_500,
          bloomEnabled: false,
          shadowsEnabled: false,
          mobileFallback: false,
          dprMax: 1,
          antialias: false,
        });
        return;
      }

      if (gpuTier >= 3) {
        setQuality({
          particleCount: 18_000,
          bloomEnabled: true,
          shadowsEnabled: true,
          mobileFallback: false,
          dprMax: 1.45,
          antialias: true,
        });
        return;
      }

      if (gpuTier >= 2) {
        setQuality({
          particleCount: 11_000,
          bloomEnabled: true,
          shadowsEnabled: true,
          mobileFallback: false,
          dprMax: 1.25,
          antialias: true,
        });
        return;
      }

      setQuality({
        particleCount: 6_000,
        bloomEnabled: false,
        shadowsEnabled: false,
        mobileFallback: false,
        dprMax: 1.1,
        antialias: false,
      });
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return quality;
}
