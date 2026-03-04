import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: 'var(--bg-void)',
        nebula: 'var(--bg-nebula)',
        neural: 'var(--accent-neural)',
        dp: 'var(--accent-dp)',
        bb: 'var(--accent-bb)',
        sigma: 'var(--accent-sigma)',
      },
      boxShadow: {
        glow: '0 0 40px rgba(0, 212, 255, 0.25)',
      },
      backgroundImage: {
        cosmos:
          'radial-gradient(circle at 20% 20%, rgba(0, 212, 255, 0.10), transparent 40%), radial-gradient(circle at 80% 10%, rgba(123, 47, 190, 0.12), transparent 35%), radial-gradient(circle at 50% 100%, rgba(255, 107, 53, 0.09), transparent 45%)',
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)'],
        body: ['var(--font-inter)'],
        mono: ['var(--font-jetbrains-mono)'],
      },
    },
  },
  plugins: [],
};

export default config;
