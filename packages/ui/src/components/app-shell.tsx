'use client';

import * as React from 'react';
import { MenuIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './button';
import { ScrollArea } from './scroll-area';
import { Sheet, SheetContent, SheetTitle } from './sheet';

const MobileNavContext = React.createContext<{ open: boolean; setOpen: (open: boolean) => void }>({
  open: false,
  setOpen: () => {},
});

/**
 * The frame of a product: a translucent sidebar and a main column with a sticky toolbar.
 * Below 768px the sidebar moves into a sheet opened from the toolbar's menu button.
 * Set `embedded` to fill a fixed-height parent (a preview, a panel) instead of the viewport.
 * A full-page shell starts with a "Skip to content" link that moves focus past the sidebar and toolbar to the page's
 * `<main>` (or the main column, if there is none).
 */
export function AppShell({
  sidebar,
  children,
  className,
  embedded = false,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  embedded?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const value = React.useMemo(() => ({ open, setOpen }), [open]);
  const mainId = `${React.useId()}main`;
  const mainRef = React.useRef<HTMLDivElement>(null);
  // The link points at the main column, so it works before hydration; once hydrated it focuses the page's own
  // <main>, so the next Tab lands on the first control of the content, not in the toolbar.
  const skipToMain = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const column = mainRef.current;
    const target = column?.querySelector<HTMLElement>('main') ?? column;
    if (!target) return;
    e.preventDefault();
    if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
    target.focus();
  };
  return (
    <MobileNavContext.Provider value={value}>
      <div
        data-slot="app-shell"
        data-embedded={embedded || undefined}
        className={cn(
          'flex w-full bg-background',
          embedded ? 'h-full min-h-0' : 'min-h-dvh md:h-dvh',
          className,
        )}
      >
        {embedded ? null : (
          <a
            href={`#${mainId}`}
            onClick={skipToMain}
            className="sr-only z-50 rounded-control bg-primary px-3 py-2 text-body font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
          >
            Skip to content
          </a>
        )}
        <aside
          data-slot="sidebar"
          className={cn(
            'sticky top-0 hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground backdrop-blur-material backdrop-saturate-150 md:flex',
            embedded ? 'h-full' : 'h-dvh',
          )}
        >
          {sidebar}
        </aside>
        <Sheet side="left" open={open} onOpenChange={setOpen}>
          <SheetContent className="bg-sidebar backdrop-blur-material">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-full flex-col">{sidebar}</div>
          </SheetContent>
        </Sheet>
        <div
          ref={mainRef}
          id={mainId}
          data-slot="app-main"
          // Focused only by the skip link, as a fallback when the page has no <main>: draws no ring.
          data-focus="none"
          className={cn(
            // When this column scrolls (desktop), focus and anchors stop clear of the 48px sticky toolbar.
            'flex min-w-0 flex-1 scroll-pt-14 flex-col md:overflow-y-auto md:overscroll-contain',
            embedded && 'overflow-y-auto',
          )}
        >
          {children}
        </div>
      </div>
    </MobileNavContext.Provider>
  );
}

/** The sticky bar at the top of the main column: navigation context on the left, view actions on the right. */
export function AppToolbar({ className, children, ...props }: React.ComponentProps<'header'>) {
  const { setOpen } = React.useContext(MobileNavContext);
  return (
    <header
      data-slot="app-toolbar"
      className={cn(
        'sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-border px-4 sm:px-6',
        'bg-background/80 backdrop-blur-material backdrop-saturate-150',
        className,
      )}
      {...props}
    >
      <Button
        variant="ghost"
        size="icon"
        className="-ml-1.5 md:hidden"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <MenuIcon aria-hidden="true" />
      </Button>
      {children}
    </header>
  );
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 px-3 pt-3 pb-2', className)} {...props} />;
}

/** The scrolling middle of the sidebar. Long navigation fades at the edges instead of being cut off. */
export function SidebarContent({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div data-slot="sidebar-content" className={cn('flex flex-col gap-4 px-2 py-2', className)} {...props}>
        {children}
      </div>
    </ScrollArea>
  );
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('mt-auto flex items-center gap-2.5 border-t border-sidebar-border px-3 py-3', className)}
      {...props}
    />
  );
}

export function SidebarSection({
  title,
  className,
  children,
  ...props
}: React.ComponentProps<'nav'> & { title?: string }) {
  const id = React.useId();
  return (
    <nav
      aria-labelledby={title ? id : undefined}
      className={cn('flex flex-col gap-px', className)}
      {...props}
    >
      {title ? (
        <h2 id={id} className="px-2 pb-1 text-caption font-semibold text-subtle-foreground">
          {title}
        </h2>
      ) : null}
      {children}
    </nav>
  );
}

/**
 * A navigation row. Pass `render` to use your router's link. `active` marks the current page. `disabled` shows a
 * destination that exists in the product but can't be opened here: it stays in the list, dimmed, and isn't a link.
 */
export function SidebarItem({
  className,
  active,
  disabled,
  icon,
  count,
  children,
  render,
  href,
  ...props
}: React.ComponentProps<'a'> & {
  active?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  count?: React.ReactNode;
  render?: React.ReactElement<React.ComponentProps<'a'>>;
}) {
  const classes = cn(
    'flex h-7 items-center gap-2 rounded-control px-2 text-body text-sidebar-foreground select-none',
    'transition-colors duration-150 hover:bg-sidebar-accent pointer-coarse:h-10',
    '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-primary',
    active && 'bg-sidebar-accent font-medium',
    disabled && 'text-subtle-foreground hover:bg-transparent [&_svg]:text-subtle-foreground',
    className,
  );
  const content = (
    <>
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count !== undefined ? (
        <span className="text-caption text-subtle-foreground tabular-nums">{count}</span>
      ) : null}
    </>
  );
  const { setOpen } = React.useContext(MobileNavContext);
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    props.onClick?.(e);
    setOpen(false);
  };
  const shared = {
    'data-slot': 'sidebar-item',
    'aria-current': active ? ('page' as const) : undefined,
    className: classes,
  };
  // A link with no href and aria-disabled: read as an unavailable link, skipped by Tab, never a dead "#" jump.
  if (disabled)
    return (
      <a {...shared} {...props} aria-disabled="true" data-disabled="">
        {content}
      </a>
    );
  // Keep the href of a rendered link (a router <Link href>) unless one is passed here.
  if (render)
    return React.cloneElement(render, {
      ...shared,
      ...props,
      ...(href ? { href } : {}),
      onClick,
      children: content,
    });
  return (
    <a {...shared} {...props} href={href} onClick={onClick}>
      {content}
    </a>
  );
}

/** Page title block: optional eyebrow (breadcrumb), title, supporting line and actions. */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
  children,
  level = 1,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  /** Heading level of the title. Use 2 when the page already has an h1 (an embedded preview, a nested view). */
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <div
      data-slot="page-header"
      className={cn('flex flex-wrap items-start justify-between gap-x-6 gap-y-3', className)}
    >
      <div className="flex min-w-0 flex-1 basis-80 flex-col gap-1.5">
        {eyebrow ? <div className="text-label text-muted-foreground">{eyebrow}</div> : null}
        <Heading className="text-title-1 text-balance">{title}</Heading>
        {description ? (
          <div className="text-callout text-muted-foreground text-pretty">{description}</div>
        ) : null}
        {children}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
