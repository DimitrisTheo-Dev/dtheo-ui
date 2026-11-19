import * as React from 'react';
import { cn } from '../lib/utils';

/**
 * The state when there is nothing to show: no data yet, no results, no permission, or an error.
 * Each needs different words and a different next step. Name the reason and offer the action.
 */
export function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex min-w-0 flex-col items-center justify-center gap-3 rounded-card px-6 py-10 text-center text-balance',
        className,
      )}
      {...props}
    />
  );
}

export function EmptyMedia({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-media"
      className={cn(
        'mb-1 grid size-10 place-items-center rounded-card bg-secondary text-muted-foreground [&_svg:not([class*=size-])]:size-5',
        className,
      )}
      {...props}
    />
  );
}

/** The empty state's headline. Use `level={1}` when the empty state is the whole page (a 404). */
export function EmptyTitle({
  className,
  children,
  level = 3,
  ...props
}: React.ComponentProps<'h3'> & { level?: 1 | 2 | 3 }) {
  const Heading = `h${level}` as const;
  return (
    <Heading data-slot="empty-title" className={cn('text-headline', className)} {...props}>
      {children}
    </Heading>
  );
}

export function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="empty-description"
      className={cn('max-w-sm text-body text-muted-foreground', className)}
      {...props}
    />
  );
}

export function EmptyActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-actions"
      className={cn('mt-1 flex flex-wrap justify-center gap-2', className)}
      {...props}
    />
  );
}
