export type NavItem = {
  href: string;
  label: string;
  sectionId: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', sectionId: 'topic-home' },
  { href: '/explore', label: 'Explore', sectionId: 'topic-explore' },
  { href: '/demo/vrp', label: 'CVRP Demo', sectionId: 'topic-vrp' },
  { href: '/theory', label: 'Theory', sectionId: 'topic-theory' },
  { href: '/benchmarks', label: 'Benchmarks', sectionId: 'topic-benchmarks' },
  { href: '/chat', label: 'Chat', sectionId: 'topic-chat' },
  { href: '/paper', label: 'Paper', sectionId: 'topic-paper' },
  { href: '/compare', label: 'Compare', sectionId: 'topic-compare' },
  { href: '/about', label: 'About', sectionId: 'topic-about' },
];

export const PHASE_COLORS = {
  GREEDY: 'var(--accent-neural)',
  DP: 'var(--accent-dp)',
  BB: 'var(--accent-bb)',
  SIGMA: 'var(--accent-sigma)',
} as const;

