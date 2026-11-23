import { categories, components } from '@dtheo/ui/meta';
import { docsPath } from './paths';

export interface NavItem {
  title: string;
  href: string;
  description?: string;
  badge?: string;
  /** Words people search for that the title and description do not say. Used by ⌘K search, never shown. */
  keywords?: string[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const getStarted: NavItem[] = [
  {
    title: 'Introduction',
    href: '/docs',
    description: 'Pick what you are building and who writes the code, then copy the commands.',
    keywords: ['get started', 'overview', 'quick start', 'principles', 'what is in the box'],
  },
  {
    title: 'Components',
    href: '/docs/components',
    description: 'Every component, live, on one page.',
    keywords: ['all components', 'gallery', 'catalog', 'index'],
  },
  {
    title: 'Installation',
    href: '/docs/installation',
    description: 'Add dtheo/ui to a Next.js or Vite app.',
    keywords: ['install', 'setup', 'init', 'npx', 'Tailwind CSS v4', 'shadcn', 'registry', 'providers'],
  },
  {
    title: 'Theming',
    href: '/docs/theming',
    description: 'Presets, light and dark, scoped themes.',
    keywords: [
      'dark mode',
      'light mode',
      'Graphite',
      'Flight deck',
      'Deep space',
      'ThemeScope',
      'tokens',
      'CSS variables',
      'React Native',
      'Expo',
    ],
  },
  {
    title: 'For agents',
    href: '/docs/agents',
    description: 'MCP server, llms.txt, Markdown pages and the CLI.',
    keywords: [
      'MCP',
      'Model Context Protocol',
      'AI',
      'LLM',
      'Claude Code',
      'Cursor',
      'VS Code',
      'Codex',
      'prompt',
    ],
  },
  {
    title: 'CLI',
    href: '/docs/cli',
    description: 'Add components and check UI code.',
    keywords: [
      'dtheo',
      'npx',
      'command line',
      'terminal',
      'design check',
      'linter',
      'lint',
      'CI',
      'MCP config',
    ],
  },
  {
    title: 'Atomic design',
    href: '/docs/atomic-design',
    description: 'How the system is layered, and what uses what.',
    keywords: ['atoms', 'molecules', 'organisms', 'templates', 'Brad Frost', 'used in', 'dependencies'],
  },
];

export const foundations: NavItem[] = [
  {
    title: 'Color',
    href: '/docs/foundations/color',
    description: 'OKLCH roles, presets and measured contrast.',
    keywords: [
      'tokens',
      'WCAG',
      'accessibility',
      'palette',
      'color roles',
      'status colors',
      'dark mode',
      'light mode',
    ],
  },
  {
    title: 'Typography',
    href: '/docs/foundations/typography',
    description: 'System fonts, roles and size-specific tracking.',
    keywords: ['tokens', 'type scale', 'font size', 'text roles', 'SF Pro', 'tabular figures', 'line height'],
  },
  {
    title: 'Geometry',
    href: '/docs/foundations/geometry',
    description: 'Control heights, concentric radii, borders and elevation.',
    keywords: [
      'tokens',
      'radius',
      'rounded corners',
      'spacing',
      'shadows',
      'focus ring',
      'touch targets',
      'density',
    ],
  },
  {
    title: 'Motion',
    href: '/docs/foundations/motion',
    description: 'Curves, durations and when not to animate.',
    keywords: ['tokens', 'animation', 'easing', 'transitions', 'reduced motion'],
  },
  {
    title: 'Engineering data',
    href: '/docs/foundations/engineering-data',
    description: 'Units, precision, limits, status and the words for them.',
    keywords: [
      'units',
      'SI',
      'decimals',
      'significant figures',
      'number format',
      'percentage points',
      'minus sign',
      'missing data',
      'terminology',
      'glossary',
      'CSV',
      'Quantity',
    ],
  },
];

export const patterns: NavItem[] = [
  {
    title: 'Data table',
    href: '/docs/patterns/data-table',
    description: 'Search, filter, sort, select and recover.',
    keywords: ['toolbar', 'pagination', 'bulk actions', 'row actions', 'selection'],
  },
  {
    title: 'Forms',
    href: '/docs/patterns/forms',
    description: 'Validation, dirty state and a failed save.',
    keywords: ['fields', 'labels', 'errors', 'required', 'unsaved changes', 'save'],
  },
  {
    title: 'States',
    href: '/docs/patterns/states',
    description: 'Loading, empty, no results, no permission, error.',
    keywords: ['empty state', 'skeleton', 'spinner', 'retry', 'error message'],
  },
];

export const examples: NavItem[] = [
  {
    title: 'Run history',
    href: '/examples/run-history',
    description: 'Every run in one table: filters, presets, limits and compare.',
    keywords: [
      'data table',
      'virtualized',
      'filters',
      'column presets',
      'compare runs',
      'test log',
      'faceted search',
    ],
  },
  {
    title: 'Run review',
    href: '/examples/run-review',
    description: 'Actuator step response: what failed and what to do next.',
    keywords: ['overshoot', 'limit', 'settling time', 'R-0412', 'test run', 'dashboard'],
  },
  {
    title: 'Motor map',
    href: '/examples/motor-map',
    description: 'Efficiency over speed and torque, with an operating point.',
    keywords: ['efficiency map', 'heatmap', 'envelope', 'traction motor', 'Flight deck'],
  },
  {
    title: 'Loop tuning',
    href: '/examples/tuning',
    description: 'Live telemetry, a Bode plot, a spectrum and 412 runs.',
    keywords: [
      'gain margin',
      'phase margin',
      'vibration',
      'Cpk',
      'histogram',
      'scatter',
      'PID',
      'control loop',
    ],
  },
  {
    title: 'Lab assistant',
    href: '/examples/assistant',
    description: 'A chat that answers with tables and charts.',
    keywords: ['AI', 'LLM', 'chatbot', 'conversation', 'Deep space'],
  },
];

const componentItems = (category: string): NavItem[] =>
  components
    .filter((c) => c.category === category)
    .map((c) => ({
      title: c.title,
      href: docsPath(c),
      description: c.description,
      // The contract already says what each one is for and what it exports; search reads the same words.
      keywords: [c.category, ...c.use, ...c.exports],
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
