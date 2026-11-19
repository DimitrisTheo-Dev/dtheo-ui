import * as React from 'react';
import { cn } from '../lib/utils';

/**
 * A grouped surface. Depth comes from a lighter fill and a hairline, not a heavy shadow.
 * Don't nest cards; use a Separator or spacing inside one instead.
 */
export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'flex min-w-0 flex-col rounded-card border border-border bg-card text-card-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'flex flex-wrap items-start gap-x-3 gap-y-2 px-4 pt-4 [&+[data-slot=card-content]]:pt-3',
        className,
      )}
      {...props}
    />
  );
}

/**
 * The card's heading. It is an h3 by default, which fits cards inside a section with an h2. Cards that sit
 * directly under the page's h1 (a dashboard grid) take `level={2}` so the outline never skips a level.
 */
export function CardTitle({
  level = 3,
  className,
  ...props
}: React.ComponentProps<'h3'> & { level?: 2 | 3 | 4 }) {
  const Heading = `h${level}` as const;
  return <Heading data-slot="card-title" className={cn('text-headline', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p data-slot="card-description" className={cn('text-body text-muted-foreground', className)} {...props} />
  );
}

/** Trailing controls in a card header (a segmented control, a menu). */
export function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-action" className={cn('ml-auto flex items-center gap-2', className)} {...props} />
  );
}

export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-4 py-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center gap-2 border-t border-border px-4 py-3 text-caption text-subtle-foreground',
        className,
      )}
      {...props}
    />
  );
}
