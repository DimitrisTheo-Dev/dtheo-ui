'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRightIcon, SearchIcon, XIcon } from 'lucide-react';
import { categories, components, type ComponentMeta } from '@dtheo/ui/meta';
import { InputGroup, InputGroupAddon } from '@dtheo/ui/components/input-group';
import { Input } from '@dtheo/ui/components/input';
import { Button } from '@dtheo/ui/components/button';
import { examples } from '@/examples';
import { countLabel } from '@/lib/counts';

/** Examples that need a wide stage to make sense: they span two columns in the grid. */
const wide = new Set([
  'app-shell',
  'table',
  'line-chart',
  'heatmap',
  'bar-chart',
  'metric',
  'card',
  'loading',
  'empty',
  'field-validation',
]);

const catId = (cat: string) => `cat-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

const href = (c: ComponentMeta) => `/docs/${c.package === 'charts' ? 'charts' : 'components'}/${c.slug}`;

const firstSentence = (text: string) => text.split(/(?<=\.)\s/)[0]!;

/**
 * One live tile per component: the component's first example, running, above its name. The preview stays
 * interactive (flip a switch, open a menu); the name below links to the page. Tiles grow to fit their example
 * rather than clip it, so nothing focusable is ever hidden.
 */
function Tile({ meta, height = 240 }: { meta: ComponentMeta; height?: number }) {
  const id = meta.examples[0];
  const Example = id ? examples[id] : undefined;
  return (
    <li
      className={`group flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card shadow-lift transition-[border-color] duration-150 hover:border-border-strong ${wide.has(meta.slug) ? 'md:col-span-2' : ''}`}
    >
      <div
        data-slot="preview"
        className="preview-grid relative flex min-w-0 flex-1 items-center justify-center p-5"
        style={{ minHeight: height }}
      >
        <div className="flex w-full min-w-0 justify-center">{Example ? <Example /> : null}</div>
      </div>
      <Link
        href={href(meta)}
        className="flex items-center gap-3 border-t border-border px-4 py-3 [--focus-offset:-2px]"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body font-medium">{meta.title}</span>
          {/* The first sentence only, never cut mid-word: the page has the rest. */}
          <span className="line-clamp-2 text-label font-normal text-pretty text-muted-foreground">
            {firstSentence(meta.description)}
          </span>
        </span>
        <ArrowUpRightIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-subtle-foreground transition-[color,translate] duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
        />
      </Link>
    </li>
  );
}

/** A fixed handful of tiles, for the landing page. */
export function ComponentTeaser({ slugs }: { slugs: string[] }) {
  const items = slugs.map((s) => components.find((c) => c.slug === s)).filter((c) => c !== undefined);
  return (
    <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <Tile key={c.slug} meta={c} height={200} />
      ))}
    </ul>
  );
}

/** Every component, live, grouped by the job it does, with a filter. */
export function ComponentGallery() {
  const [query, setQuery] = React.useState('');
  const q = query.trim().toLowerCase();
  const match = (c: ComponentMeta) =>
    !q || `${c.title} ${c.slug} ${c.category} ${c.description}`.toLowerCase().includes(q);
  const groups = categories
    .map((cat) => ({ cat, items: components.filter((c) => c.category === cat && match(c)) }))
    .filter((g) => g.items.length);
  const count = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center gap-3">
        <InputGroup className="w-full sm:max-w-xs">
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <Input
            type="search"
            aria-label="Filter components"
            placeholder="Filter: table, chart, toast…"
            value={query}
            onValueChange={setQuery}
          />
        </InputGroup>
        <p aria-live="polite" className="text-label font-normal text-muted-foreground tabular-nums">
          {q ? `${count} of ${components.length}` : countLabel}
        </p>
        <nav aria-label="Categories" className="flex w-full flex-wrap gap-1.5">
          {groups.map((g) => (
            <a
              key={g.cat}
              href={`#${catId(g.cat)}`}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-label font-normal text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              {g.cat}
              <span className="text-caption text-subtle-foreground tabular-nums">{g.items.length}</span>
            </a>
          ))}
        </nav>
      </div>

      {groups.map((g) => (
        <section key={g.cat} aria-labelledby={catId(g.cat)} className="flex scroll-mt-20 flex-col gap-3">
          <h2 id={catId(g.cat)} className="flex items-baseline gap-2 text-title-3">
            {g.cat}
            <span className="text-label font-normal text-subtle-foreground tabular-nums">
              {g.items.length}
            </span>
          </h2>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {g.items.map((c) => (
              <Tile key={c.slug} meta={c} />
            ))}
          </ul>
        </section>
      ))}

      {!count ? (
        <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-border-strong p-6">
          <p className="text-body">
            Nothing matches “{query.trim()}”. Try a job instead of a name, like “status” or “select”.
          </p>
          <Button size="sm" onClick={() => setQuery('')}>
            <XIcon aria-hidden="true" />
            Clear filter
          </Button>
        </div>
      ) : null}
    </div>
  );
}
