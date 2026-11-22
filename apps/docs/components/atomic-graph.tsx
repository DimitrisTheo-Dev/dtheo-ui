'use client';

import * as React from 'react';
import Link from 'next/link';
import { components } from '@dtheo/ui/meta';
import { pageUsage } from '@/lib/usage';
import { docsPath } from '@/lib/paths';

type Node = { id: string; title: string; href: string; column: number };

const columns = ['Atoms', 'Molecules', 'Organisms', 'Templates', 'Pages'] as const;
const levelColumn = { atom: 0, molecule: 1, organism: 2, template: 3 } as const;

const nodes: Node[] = [
  ...components.map((c) => ({
    id: c.slug,
    title: c.title
      .replace(' and segmented control', '')
      .replace(' and meter', '')
      .replace(' and skeleton', ''),
    href: docsPath(c),
    column: levelColumn[c.level],
  })),
  ...Object.entries(pageUsage).map(([id, p]) => ({
    id: `page:${id}`,
    title: p.title,
    href: p.href,
    column: p.level === 'page' ? 4 : 3,
  })),
];

/** Edges: a page uses components; a component composes its registry dependencies. Undirected for highlighting. */
const edges = new Map<string, Set<string>>();
const link = (a: string, b: string) => {
  edges.set(a, (edges.get(a) ?? new Set()).add(b));
  edges.set(b, (edges.get(b) ?? new Set()).add(a));
};
for (const [id, p] of Object.entries(pageUsage)) for (const u of p.uses) link(`page:${id}`, u);
for (const c of components) for (const d of c.registryDependencies) if (d !== 'utils') link(c.slug, d);

/**
 * The system as layers. Hover or focus anything to see what it touches: the pages a component appears in,
 * or the components a page is built from.
 */
export function AtomicGraph() {
  const [active, setActive] = React.useState<string | null>(null);
  const related = active ? (edges.get(active) ?? new Set<string>()) : null;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 rounded-card border border-border bg-card p-4 sm:grid-cols-3 lg:grid-cols-5">
        {columns.map((label, col) => {
          const items = nodes.filter((n) => n.column === col);
          return (
            <div key={label} className="flex min-w-0 flex-col gap-2">
              <h3 className="flex items-baseline justify-between text-label text-muted-foreground">
                {label}
                <span className="text-caption text-subtle-foreground tabular-nums">{items.length}</span>
              </h3>
              <ul className="flex flex-col gap-1">
                {items.map((n) => {
                  const state = !active
                    ? 'idle'
                    : n.id === active
                      ? 'active'
                      : related?.has(n.id)
                        ? 'related'
                        : 'dim';
                  return (
                    <li key={n.id}>
                      <Link
                        href={n.href}
                        onPointerEnter={() => setActive(n.id)}
                        onPointerLeave={() => setActive(null)}
                        onFocus={() => setActive(n.id)}
                        onBlur={() => setActive(null)}
                        className={[
                          'block truncate rounded-control border px-2 py-1 text-label font-normal transition-[opacity,background-color,border-color] duration-150',
                          state === 'active' && 'border-primary bg-primary text-primary-foreground',
                          state === 'related' && 'border-primary/50 bg-selection text-foreground',
                          state === 'dim' && 'border-transparent opacity-35',
                          state === 'idle' &&
                            'border-border bg-background text-foreground hover:border-border-strong',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {n.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="text-label font-normal text-subtle-foreground" aria-live="polite">
        {active
          ? `${nodes.find((n) => n.id === active)?.title} connects to ${related?.size ?? 0} ${related?.size === 1 ? 'item' : 'items'}.`
          : 'Hover or focus an item to see what it connects to.'}
      </p>
    </div>
  );
}
