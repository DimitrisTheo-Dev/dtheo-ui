import * as React from 'react';
import { CircleCheckIcon, CircleXIcon, TriangleAlertIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export type MetricStatus = 'pass' | 'warn' | 'fail' | 'none';

const statusMeta = {
  pass: { Icon: CircleCheckIcon, word: 'Pass', text: 'text-success-foreground', fill: 'bg-chart-muted' },
  warn: { Icon: TriangleAlertIcon, word: 'Near limit', text: 'text-warning-foreground', fill: 'bg-warning' },
  fail: {
    Icon: CircleXIcon,
    word: 'Fail',
    text: 'text-destructive-foreground',
    fill: 'bg-destructive-foreground',
  },
} as const;

/**
 * A row of measurements sharing hairline dividers. Put failing checks first: the eye sweeps left to right
 * and should meet what needs attention before what passed.
 */
export function MetricGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="metric-group"
      className={cn(
        // Each cell draws its left and top hairline over the neighbor painted before it; the container clips the outer ones,
        // so an incomplete last row stays the card color instead of showing a gap.
        'grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] overflow-hidden rounded-card border border-border bg-card',
        className,
      )}
      {...props}
    />
  );
}

/**
 * One measurement: label, value with unit, and, when a limit applies, a meter against the limit plus a status
 * that pairs an icon with a word. Passing values stay neutral; only warn and fail get color.
 */
export function Metric({
  className,
  label,
  value,
  unit,
  status = 'none',
  limit,
  limitLabel,
  progress,
  hint,
  ...props
}: Omit<React.ComponentProps<'div'>, 'children'> & {
  label: string;
  value: React.ReactNode;
  unit?: string;
  status?: MetricStatus;
  /** Where the limit sits on the meter, 0 to 1. */
  limit?: number;
  limitLabel?: string;
  /** The value's position on the meter, 0 to 1. */
  progress?: number;
  hint?: string;
}) {
  const meta = status === 'none' ? null : statusMeta[status];
  return (
    <div
      data-slot="metric"
      data-status={status}
      className={cn(
        'flex min-w-0 flex-col gap-1.5 bg-card px-4 py-3.5 shadow-[-1px_0_0_0_var(--border),0_-1px_0_0_var(--border)]',
        className,
      )}
      {...props}
    >
      <span className="truncate text-label text-muted-foreground" title={hint}>
        {label}
      </span>
      <span className="text-title-2 leading-none font-semibold whitespace-nowrap">
        {value}
        {unit ? <span className="ml-0.75 text-body font-medium text-muted-foreground">{unit}</span> : null}
      </span>
      {progress !== undefined ? (
        <span className="relative mt-1 h-1 rounded-full bg-secondary" aria-hidden="true">
          <span
            className={cn('absolute inset-y-0 left-0 rounded-full', meta?.fill ?? 'bg-primary')}
            style={{ width: `${Math.min(1, Math.max(0, progress)) * 100}%` }}
          />
          {limit !== undefined ? (
            <span
              className="absolute -top-0.75 -bottom-0.75 w-0.5 -translate-x-1/2 rounded-full bg-muted-foreground shadow-[0_0_0_2px_var(--card)]"
              style={{ left: `${Math.min(1, Math.max(0, limit)) * 100}%` }}
            />
          ) : null}
        </span>
      ) : null}
      {meta || limitLabel ? (
        <span className="flex flex-col items-start gap-0.5">
          {meta ? (
            <span className={cn('inline-flex items-center gap-1 text-label font-semibold', meta.text)}>
              <meta.Icon className="size-3.5" strokeWidth={2} aria-hidden="true" />
              {meta.word}
            </span>
          ) : null}
          {limitLabel ? <span className="text-caption text-subtle-foreground">{limitLabel}</span> : null}
        </span>
      ) : null}
    </div>
  );
}
