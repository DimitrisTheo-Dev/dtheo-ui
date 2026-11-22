'use client';

import * as React from 'react';
import { Progress as ProgressPrimitive } from '@base-ui/react/progress';
import { Meter as MeterPrimitive } from '@base-ui/react/meter';
import { cn } from '../lib/utils';

// Values render on the server too, so they use one locale everywhere: with the browser's locale a German visitor
// gets "64 %" where the server wrote "64%" and React discards the server HTML. Pass `locale` to change it; the value
// shown with a `unit` follows it too.
const formats = new Map<string, Intl.NumberFormat>();
function valueFormat(locale: Intl.LocalesArgument) {
  const key = String(locale);
  let format = formats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
    formats.set(key, format);
  }
  return format;
}

/** Task completion. Pass `value={null}` for indeterminate work; never fake a percentage. */
export function Progress({
  className,
  label,
  showValue = false,
  unit,
  locale = 'en-US',
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  label?: React.ReactNode;
  showValue?: boolean;
  /** Appended to the shown value for units Intl cannot format (A, N·m). */
  unit?: string;
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn('grid w-full grid-cols-[1fr_auto] gap-x-3 gap-y-1.5', className)}
      locale={locale}
      {...props}
    >
      {label ? <ProgressPrimitive.Label className="text-label">{label}</ProgressPrimitive.Label> : null}
      {showValue ? (
        <ProgressPrimitive.Value className="col-start-2 text-label text-muted-foreground tabular-nums">
          {unit
            ? (_, value) => (value === null ? '' : `${valueFormat(locale).format(value)} ${unit}`)
            : undefined}
        </ProgressPrimitive.Value>
      ) : null}
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className="col-span-2 h-1.5 overflow-hidden rounded-full bg-secondary"
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="h-full rounded-full bg-primary transition-[width] duration-400 ease-out data-indeterminate:w-1/3 data-indeterminate:animate-[dtheo-indeterminate_1.4s_var(--ease-in-out)_infinite]"
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export type MeterTone = 'neutral' | 'primary' | 'success' | 'warning' | 'destructive';

/**
 * A measurement within a known range (load, temperature, a value against its limit).
 * `limit` draws a tick; the fill carries severity through `tone`.
 */
export function Meter({
  className,
  label,
  tone = 'primary',
  limit,
  max = 100,
  min = 0,
  showValue = false,
  unit,
  locale = 'en-US',
  ...props
}: React.ComponentProps<typeof MeterPrimitive.Root> & {
  label?: React.ReactNode;
  tone?: MeterTone;
  limit?: number;
  showValue?: boolean;
  /** Appended to the shown value for units Intl cannot format (A, N·m). */
  unit?: string;
}) {
  const fill = {
    neutral: 'bg-chart-muted',
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    destructive: 'bg-destructive-foreground',
  }[tone];
  const tick = limit === undefined ? null : ((limit - min) / (max - min)) * 100;
  return (
    <MeterPrimitive.Root
      data-slot="meter"
      className={cn('grid w-full grid-cols-[1fr_auto] gap-x-3 gap-y-1.5', className)}
      max={max}
      min={min}
      locale={locale}
      {...props}
    >
      {label ? <MeterPrimitive.Label className="text-label">{label}</MeterPrimitive.Label> : null}
      {showValue ? (
        <MeterPrimitive.Value className="col-start-2 text-label text-muted-foreground tabular-nums">
          {unit ? (_, value) => `${valueFormat(locale).format(value)} ${unit}` : undefined}
        </MeterPrimitive.Value>
      ) : null}
      <MeterPrimitive.Track
        data-slot="meter-track"
        className="relative col-span-2 h-1 rounded-full bg-secondary"
      >
        <MeterPrimitive.Indicator data-slot="meter-indicator" className={cn('h-full rounded-full', fill)} />
        {tick === null ? null : (
          <span
            aria-hidden="true"
            data-slot="meter-limit"
            className="absolute -top-0.75 -bottom-0.75 w-0.5 -translate-x-1/2 rounded-full bg-muted-foreground shadow-[0_0_0_2px_var(--card)]"
            style={{ left: `${Math.min(100, Math.max(0, tick))}%` }}
          />
        )}
      </MeterPrimitive.Track>
    </MeterPrimitive.Root>
  );
}
