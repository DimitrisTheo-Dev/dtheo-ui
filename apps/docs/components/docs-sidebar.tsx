'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AppWindowIcon,
  BlocksIcon,
  ChartLineIcon,
  ChevronRightIcon,
  LayoutTemplateIcon,
  PaletteIcon,
  RocketIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react';
import { categories, components } from '@dtheo/ui/meta';
import { Kbd } from '@dtheo/ui/components/kbd';
import { Button } from '@dtheo/ui/components/button';
import { Input } from '@dtheo/ui/components/input';
import { InputGroup, InputGroupAddon } from '@dtheo/ui/components/input-group';
import { examples, foundations, getStarted, patterns, type NavItem } from '@/lib/nav';
import { docsPath } from '@/lib/paths';

interface Group {
  title: string;
  /** A colored tile per section, like a settings sidebar: the color says which part of the docs you are in. */
  icon: React.ReactNode;
  tile: string;
  items?: NavItem[];
  /** Collapsible sub-groups, for the long component list. */
  folders?: Array<{ title: string; items: NavItem[] }>;
}

const href = (c: (typeof components)[number]) => docsPath(c);
const itemsOf = (category: string): NavItem[] =>
  components.filter((c) => c.category === category).map((c) => ({ title: c.title, href: href(c) }));

const groups: Group[] = [
  {
    title: 'Get started',
    icon: <RocketIcon />,
    tile: 'bg-chart-1',
    items: getStarted.filter((p) => p.href !== '/docs/components'),
  },
  { title: 'Foundations', icon: <PaletteIcon />, tile: 'bg-chart-4', items: foundations },
  {
    title: 'Components',
    icon: <BlocksIcon />,
    tile: 'bg-chart-2',
    items: [{ title: 'All components', href: '/docs/components' }],
    folders: categories.filter((c) => c !== 'Charts').map((c) => ({ title: c, items: itemsOf(c) })),
  },
  { title: 'Charts', icon: <ChartLineIcon />, tile: 'bg-chart-3', items: itemsOf('Charts') },
  { title: 'Patterns', icon: <LayoutTemplateIcon />, tile: 'bg-chart-5', items: patterns },
  { title: 'Examples', icon: <AppWindowIcon />, tile: 'bg-chart-muted', items: examples },
];

function Item({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className="flex h-7 items-center rounded-control px-2 text-body text-sidebar-foreground/75 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-foreground pointer-coarse:h-10"
    >
      <span className="truncate">{item.title}</span>
    </Link>
  );
}

function Folder({
  title,
  items,
  open,
  onToggle,
  pathname,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  open: boolean;
  onToggle: () => void;
  pathname: string;
  onNavigate?: () => void;
}) {
  const id = React.useId();
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className="flex h-7 w-full items-center gap-1.5 rounded-control px-2 text-left text-body text-sidebar-foreground/75 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground pointer-coarse:h-10"
      >
        <ChevronRightIcon
          aria-hidden="true"
          className={`size-3.5 shrink-0 text-subtle-foreground transition-transform duration-150 ease-out ${open ? 'rotate-90' : ''}`}
        />
        <span className="flex-1 truncate">{title}</span>
        {/* Seen as a bare number, heard as "Actions 2 items" rather than "Actions2". The name keeps the visible
            words in order, so voice control still finds it (WCAG 2.5.3). */}
        <span className="text-caption text-subtle-foreground tabular-nums">
          {items.length}
          <span className="sr-only"> {items.length === 1 ? 'item' : 'items'}</span>
        </span>
      </button>
      {/* Opens instantly: people toggle these often, and motion would only slow them down. */}
      <ul
        id={id}
        hidden={!open}
        className="ml-3.5 flex flex-col gap-px border-l border-sidebar-border py-0.5 pl-2"
      >
        {items.map((it) => (
          <li key={it.href}>
            <Item item={it} active={pathname === it.href} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </li>
  );
}

/**
 * The docs index. Six sections, each with its own colored tile so you can tell at a glance where you are; the long
 * component list folds into its categories, and `/` filters everything.
 */
export function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [query, setQuery] = React.useState('');
  const [toggled, setToggled] = React.useState<Record<string, boolean>>({});
  const filterRef = React.useRef<HTMLInputElement>(null);
  const navRef = React.useRef<HTMLElement>(null);
  // Group labels need ids that are unique on the page (the sheet and the sidebar can both be mounted) and valid as
  // an aria-labelledby IDREF, which cannot hold a space: "nav-Get started" pointed at two ids that do not exist.
  const idBase = React.useId();
  const groupId = (title: string) => `${idBase}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const q = query.trim().toLowerCase();

  // "/" jumps to the filter, unless you are already typing somewhere.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== '/' || t.closest('input, textarea, [contenteditable="true"]')) return;
      if (!filterRef.current?.offsetParent) return;
      e.preventDefault();
      filterRef.current.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Keep the current page in view when the sidebar first renders.
  React.useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
  }, []);

  const match = (it: NavItem) => !q || it.title.toLowerCase().includes(q);

  return (
    <div className="flex flex-col gap-4 pb-10">
      <InputGroup className="bg-background/60">
        <InputGroupAddon>
          <SearchIcon aria-hidden="true" />
        </InputGroupAddon>
        <Input
          ref={filterRef}
          type="search"
          value={query}
          onValueChange={setQuery}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setQuery('');
          }}
          placeholder="Filter"
          aria-label="Filter the docs"
        />
        {query ? (
          <Button variant="ghost" size="icon-xs" aria-label="Clear filter" onClick={() => setQuery('')}>
            <XIcon aria-hidden="true" />
          </Button>
        ) : (
          <InputGroupAddon className="pointer-coarse:hidden">
            <Kbd>/</Kbd>
          </InputGroupAddon>
        )}
      </InputGroup>

      <nav ref={navRef} aria-label="Documentation" className="flex flex-col gap-5">
        {groups.map((g) => {
          const items = g.items?.filter(match) ?? [];
          const folders = (g.folders ?? [])
            .map((f) => ({ ...f, items: f.items.filter(match) }))
            .filter((f) => f.items.length);
          if (!items.length && !folders.length) return null;
          // A labelled group, not a region or a heading: six landmarks and six h2s before the page's h1 made the
          // sidebar louder than the page for screen-reader users.
          return (
            <div
              key={g.title}
              role="group"
              aria-labelledby={groupId(g.title)}
              className="flex flex-col gap-1"
            >
              <div
                id={groupId(g.title)}
                className="flex items-center gap-2 px-2 pb-1 text-label font-semibold text-sidebar-foreground"
              >
                <span
                  aria-hidden="true"
                  className={`grid size-5 place-items-center rounded-item text-white shadow-raised [&_svg]:size-3 [&_svg]:stroke-[2.25] ${g.tile}`}
                >
                  {g.icon}
                </span>
                {g.title}
              </div>
              {items.length ? (
                <ul className="flex flex-col gap-px">
                  {items.map((it) => (
                    <li key={it.href}>
                      <Item item={it} active={pathname === it.href} onNavigate={onNavigate} />
                    </li>
                  ))}
                </ul>
              ) : null}
              {folders.length ? (
                <ul className="flex flex-col gap-px">
                  {folders.map((f) => {
                    const holdsCurrent = f.items.some((it) => it.href === pathname);
                    const open = Boolean(q) || (toggled[f.title] ?? holdsCurrent);
                    return (
                      <Folder
                        key={f.title}
                        title={f.title}
                        items={f.items}
                        open={open}
                        onToggle={() => setToggled((t) => ({ ...t, [f.title]: !open }))}
                        pathname={pathname}
                        onNavigate={onNavigate}
                      />
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
        {q && !groups.some((g) => g.items?.some(match) || g.folders?.some((f) => f.items.some(match))) ? (
          <p className="px-2 text-body text-muted-foreground">Nothing matches “{query.trim()}”.</p>
        ) : null}
      </nav>
    </div>
  );
}
