import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import 'katex/dist/katex.min.css';
import { Navbar } from '@/components/layout/Navbar';
import { PhaseLegend } from '@/components/layout/PhaseLegend';
import { ScrollProgress } from '@/components/layout/ScrollProgress';
import { FloatingChatButton } from '@/components/layout/FloatingChatButton';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });

export const metadata: Metadata = {
  title: 'GDBB - Unified Hybrid Optimization Algorithm',
  description:
    'Interactive showcase of GDBB combining Greedy, Dynamic Programming, and Branch-and-Bound.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  keywords: [
    'hybrid optimization',
    'branch and bound',
    'dynamic programming',
    'vehicle routing',
    'NP-hard',
    'combinatorial optimization',
    'GDBB',
  ],
  openGraph: {
    title: 'GDBB Algorithm - Interactive Research Platform',
    description: 'Explore, run, and visualize a unified optimization algorithm in 3D',
    images: '/og-image.png',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${display.variable}`}>
      <body className="min-h-screen bg-cosmos text-[var(--text-primary)]">
        <Providers>
          <div className="no-print">
            <ScrollProgress />
          </div>
          <div className="no-print">
            <Navbar />
          </div>
          <main className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-32 lg:px-8">{children}</main>
          <div className="no-print">
            <PhaseLegend />
          </div>
          <div className="no-print">
            <FloatingChatButton />
          </div>
        </Providers>
      </body>
    </html>
  );
}

