import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

export const badgeVariants = cva(
  'inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-caption font-medium whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        neutral: 'bg-secondary text-secondary-foreground',
        outline: 'border border-border-strong text-muted-foreground',
        primary: 'bg-primary text-primary-foreground',
        info: 'bg-info/15 text-info-foreground',
        success: 'bg-success/15 text-success-foreground',
        warning: 'bg-warning/15 text-warning-foreground',
        destructive: 'bg-destructive/15 text-destructive-foreground',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

/**
 * A short status or category label. Status variants always carry a word (and ideally an icon),
 * never color alone: "Failed", not a red dot.
 */
export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** A small colored dot for dense lists. Pair it with a visible label. */
export function StatusDot({
  className,
  tone = 'neutral',
  ...props
}: React.ComponentProps<'span'> & { tone?: 'neutral' | 'success' | 'warning' | 'destructive' | 'info' }) {
  const color = {
    neutral: 'bg-chart-muted',
    success: 'bg-success',
    warning: 'bg-warning',
    destructive: 'bg-destructive-foreground',
    info: 'bg-info',
  }[tone];
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-2 shrink-0 rounded-full', color, className)}
      {...props}
    />
  );
}
