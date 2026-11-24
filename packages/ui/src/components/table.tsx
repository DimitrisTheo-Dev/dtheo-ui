'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

/**
 * Whether the container scrolls sideways right now, and what to call it. A region that scrolls must be reachable
 * by keyboard, so it becomes a focusable, named region only while its table is wider than the space it has.
 */
function useScrollRegion(ref: React.RefObject<HTMLDivElement | null>) {
  const [label, setLabel] = React.useState<string | null>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const scrolls = el.scrollWidth > el.clientWidth + 1;
      const caption = el
        .querySelector('caption')
        ?.textContent?.trim()
        .replace(/[\s.]+$/, '');
      setLabel(scrolls ? `${caption || 'Table'}, scrolls sideways` : null);
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const table = el.querySelector('table');
    if (table) ro.observe(table);
    return () => ro.disconnect();
  }, [ref]);
  return label;
}

/**
 * A plain, semantic data table. Numbers right-align with tabular figures (`numeric` on cells and heads).
 * Wide tables scroll inside their own container, never the page, and that container joins the tab order only
 * while it scrolls.
 */
export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  const ref = React.useRef<HTMLDivElement>(null);
  const scrollLabel = useScrollRegion(ref);
  return (
    <div
      ref={ref}
      data-slot="table-container"
      role={scrollLabel ? 'region' : undefined}
      aria-label={scrollLabel ?? undefined}
      tabIndex={scrollLabel ? 0 : undefined}
      className="relative w-full overflow-x-auto [--focus-offset:-2px]"
    >
      <table
        data-slot="table"
        className={cn('w-full caption-bottom border-collapse text-body', className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('[&_tr]:border-b [&_tr]:border-border', className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('border-t border-border bg-muted font-medium', className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b border-border transition-colors duration-150 hover:bg-accent/60',
        'aria-selected:bg-selection data-[state=selected]:bg-selection',
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  numeric,
  ...props
}: React.ComponentProps<'th'> & { numeric?: boolean }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-8 px-3 text-left align-middle text-label font-medium whitespace-nowrap text-subtle-foreground first:pl-4 last:pr-4',
        numeric && 'text-right',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  numeric,
  ...props
}: React.ComponentProps<'td'> & { numeric?: boolean }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'h-9 px-3 align-middle whitespace-nowrap text-foreground first:pl-4 last:pr-4',
        numeric && 'text-right tabular-nums',
        className,
      )}
      {...props}
    />
  );
}

export function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('px-4 py-3 text-left text-caption text-subtle-foreground', className)}
      {...props}
    />
  );
}
