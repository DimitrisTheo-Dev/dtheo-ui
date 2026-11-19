import { categories, components } from '@dtheo/ui/meta';

export interface NavItem {
  title: string;
  href: string;
  description?: string;
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const getStarted: NavItem[] = [
  { title: 'Introduction', href: '/docs', description: 'Pick what you are building, get one command.' },
  { title: 'Components', href: '/docs/components', description: 'Every component, live, on one page.' },
  {
    title: 'Installation',
    href: '/docs/installation',
    description: 'Add dtheo/ui to a Next.js or Vite app.',
  },
  { title: 'Theming', href: '/docs/theming', description: 'Presets, light and dark, scoped themes.' },
  {
    title: 'For agents',
    href: '/docs/agents',
    description: 'MCP server, llms.txt, Markdown pages and the CLI.',
  },
  { title: 'CLI', href: '/docs/cli', description: 'Add components and check UI code.' },
  {
    title: 'Atomic design',
    href: '/docs/atomic-design',
    description: 'How the system is layered, and what uses what.',
  },
];

export const foundations: NavItem[] = [
  {
    title: 'Color',
    href: '/docs/foundations/color',
    description: 'OKLCH roles, presets and measured contrast.',
  },
  {
    title: 'Typography',
    href: '/docs/foundations/typography',
    description: 'System fonts, roles and size-specific tracking.',
  },
  {
    title: 'Geometry',
    href: '/docs/foundations/geometry',
    description: 'Control heights, concentric radii, borders and elevation.',
  },
  {
    title: 'Motion',
    href: '/docs/foundations/motion',
    description: 'Curves, durations and when not to animate.',
  },
];

export const patterns: NavItem[] = [
  {
    title: 'Data table',
    href: '/docs/patterns/data-table',
    description: 'Search, filter, sort, select and recover.',
  },
  { title: 'Forms', href: '/docs/patterns/forms', description: 'Validation, dirty state and a failed save.' },
  {
    title: 'States',
    href: '/docs/patterns/states',
    description: 'Loading, empty, no results, no permission, error.',
  },
];

export const examples: NavItem[] = [
  {
    title: 'Run review',
    href: '/examples/run-review',
    description: 'Actuator step response: what failed and what to do next.',
  },
  {
    title: 'Motor map',
    href: '/examples/motor-map',
    description: 'Efficiency over speed and torque, with an operating point.',
  },
  {
    title: 'Loop tuning',
    href: '/examples/tuning',
    description: 'Live telemetry, a Bode plot, a spectrum and 412 runs.',
  },
  {
    title: 'Lab assistant',
    href: '/examples/assistant',
    description: 'A chat that answers with tables and charts.',
  },
];

const componentItems = (category: string): NavItem[] =>
  components
    .filter((c) => c.category === category)
    .map((c) => ({
      title: c.title,
      href: `/docs/${c.package === 'charts' ? 'charts' : 'components'}/${c.slug}`,
      description: c.description,
    }));

export const nav: NavSection[] = [
  { title: 'Get started', items: getStarted },
  { title: 'Foundations', items: foundations },
  ...categories.filter((c) => c !== 'Charts').map((c) => ({ title: c, items: componentItems(c) })),
  { title: 'Charts', items: componentItems('Charts') },
  { title: 'Patterns', items: patterns },
  { title: 'Examples', items: examples },
];

export const allPages: Array<NavItem & { section: string }> = nav.flatMap((s) =>
  s.items.map((i) => ({ ...i, section: s.title })),
);
