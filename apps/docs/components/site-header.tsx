'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpenIcon,
  BotIcon,
  ChartLineIcon,
  LayoutGridIcon,
  SearchIcon,
  ShapesIcon,
  SquareTerminalIcon,
} from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { Kbd } from '@dtheo/ui/components/kbd';
import { CommandDialog, type CommandItemData } from '@dtheo/ui/components/command';
import { ThemeToggle } from './theme-controls';
import { GithubLink } from './github-link';
import { Logo } from './logo';
import { allPages } from '@/lib/nav';

const top = [
  { title: 'Docs', href: '/docs' },
  { title: 'Components', href: '/docs/components' },
  { title: 'Examples', href: '/examples/run-review' },
  { title: 'Agents', href: '/docs/agents' },
];

/** Dispatch on window to open the header's search from anywhere on the page. */
export const OPEN_SEARCH_EVENT = 'dtheo:open-search';

const sectionIcon: Record<string, React.ReactNode> = {
  'Get started': <BookOpenIcon />,
  Foundations: <ShapesIcon />,
  Charts: <ChartLineIcon />,
  Examples: <LayoutGridIcon />,
};

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  // Other parts of the page (the 404's "Search the docs") open the same search without owning a second dialog.
  React.useEffect(() => {
    const openSearch = () => setOpen(true);
    window.addEventListener(OPEN_SEARCH_EVENT, openSearch);
    return () => window.removeEventListener(OPEN_SEARCH_EVENT, openSearch);
  }, []);
  const items: CommandItemData[] = React.useMemo(
    () => [
      ...allPages.map((p) => ({
        value: p.href,
        label: p.title,
        group: p.section,
        hint: p.description,
        keywords: p.keywords,
        icon: sectionIcon[p.section] ?? <SquareTerminalIcon />,
        onSelect: () => router.push(p.href),
      })),
      {
        value: 'llms',
        label: 'llms.txt',
        group: 'For agents',
        hint: 'The index agents read first',
        keywords: ['AI', 'LLM', 'Markdown'],
        icon: <BotIcon />,
        onSelect: () => router.push('/llms.txt'),
      },
    ],
    [router],
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 pt-[env(safe-area-inset-top,0px)] backdrop-blur-material backdrop-saturate-150">
      <div className="mx-auto flex h-12 max-w-screen-2xl items-center gap-2 pr-[max(1rem,env(safe-area-inset-right,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="-ml-1 flex items-center gap-2 rounded-control px-1 py-1"
          aria-label="dtheo/ui home"
        >
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-0.5 md:flex">
          {top.map((t) => {
            const active =
              t.href === '/docs'
                ? pathname === '/docs' ||
                  /^\/docs\/(installation|theming|agents|cli|atomic-design|foundations|patterns)/.test(
                    pathname,
                  )
                : t.href === '/docs/components'
                  ? /^\/docs\/(components|charts)/.test(pathname)
                  : pathname.startsWith(t.href.split('/').slice(0, 3).join('/'));
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className="rounded-control px-2.5 py-1 text-body text-muted-foreground transition-colors duration-150 hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:font-medium"
              >
                {t.title}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          {/* Named by its visible words (WCAG 2.5.3), so "click Search docs" works by voice. The shortcut is
              announced through aria-keyshortcuts rather than read out as "command K". */}
          <Button
            variant="outline"
            className="h-8 w-9 justify-center gap-2 px-0 text-muted-foreground sm:w-56 sm:justify-start sm:px-2.5"
            onClick={() => setOpen(true)}
            aria-keyshortcuts="Meta+K Control+K"
          >
            <SearchIcon aria-hidden="true" />
            <span className="sr-only sm:not-sr-only sm:flex-1 sm:text-left sm:font-normal">Search docs…</span>
            <Kbd aria-hidden="true" className="hidden sm:inline-flex">
              ⌘K
            </Kbd>
          </Button>
          <GithubLink />
          <ThemeToggle />
        </div>
      </div>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        items={items}
        placeholder="Search components, foundations and examples…"
        emptyMessage={
          <>
            <p>No pages match. Try a component name, or a topic such as limits, Bode or contrast.</p>
            <Button
              size="sm"
              onClick={() => {
                setOpen(false);
                router.push('/docs/components');
              }}
            >
              Browse all components
            </Button>
          </>
        }
      />
    </header>
  );
}
