/**
 * The component contract. One entry per component drives the docs page, the Markdown mirror, llms.txt,
 * the shadcn-compatible registry item, the MCP tools and the CLI. Change it here and every surface follows.
 */
export type AtomicLevel = 'atom' | 'molecule' | 'organism' | 'template';

/** The categories, in the order the docs list them. */
export const categories = [
  'Actions',
  'Inputs',
  'Selection',
  'Overlays',
  'Navigation',
  'Feedback',
  'Data display',
  'Layout',
  'Charts',
] as const;

export type Category = (typeof categories)[number];

export interface PropDoc {
  name: string;
  type: string;
  default?: string;
  /** The props type requires it; the contract test checks this against the source. */
  required?: boolean;
  description: string;
}

export interface ComponentMeta {
  slug: string;
  title: string;
  category: Category;
  level: AtomicLevel;
  /** One sentence: what it is for. */
  description: string;
  /** When it is the right choice. */
  use: string[];
  /** When to reach for something else, and what. */
  avoid?: string[];
  /** Source files, relative to the package's `src`. */
  files: string[];
  package: 'ui' | 'charts';
  /** Named exports a consumer imports. */
  exports: string[];
  dependencies: string[];
  /** Other registry items this one needs (copied alongside by the CLI). */
  registryDependencies: string[];
  /**
   * Other names the registry answers to: a file this item writes under another name (a pasted import says
   * `@/components/ui/toggle-group`) or a part people look for by name (skeleton). `dtheo add <alias>` adds this item.
   */
  aliases?: string[];
  /** Example ids rendered on the docs page; files live in apps/docs/examples. */
  examples: string[];
  keyboard?: Array<[keys: string, action: string]>;
  a11y?: string[];
  props?: PropDoc[];
  /** Base UI primitive this wraps, if any. */
  primitive?: string;
}
