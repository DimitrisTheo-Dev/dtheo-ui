'use client';

import { toneBg, tooltipSurface, useTooltipPlacement, type Tone } from './core';

export interface ReadoutTooltipRow {
  /** Defaults to the label; give one when two rows share a label (magnitude and phase of one series). */
  key?: string;
  label: string;
  value: string;
  tone?: Tone;
  /** A word that judges the value, such as "over limit": shown after the label in the critical color. */
  status?: string;
}

/**
 * The reading at a chart's cursor: the x value as its title, then one row per series with its swatch, value and
 * label. It sits beside the cursor and flips to the other side near the right edge (useTooltipPlacement).
 */
export function ReadoutTooltip({
  title,
  rows,
  x,
  width,
  className,
}: {
  title: string;
  rows: ReadoutTooltipRow[];
  /** The cursor's x in the chart, in px. */
  x: number;
  /** The chart's width, in px. */
  width: number;
  /** Where it sits vertically: `top-2`, or lower to clear a pane title. */
  className: string;
}) {
  const ref = useTooltipPlacement<HTMLDivElement>(x, width);
  return (
    <div ref={ref} className={`${tooltipSurface} min-w-40 px-3 py-2.5 ${className}`}>
      <div className="mb-1.5 font-semibold text-foreground tabular-nums">{title}</div>
      {rows.map((r) => (
        <div key={r.key ?? r.label} className="grid grid-cols-[12px_auto_1fr] items-center gap-2 leading-6">
          <span aria-hidden="true" className={`h-0.5 w-3 rounded-full ${toneBg[r.tone ?? 'primary']}`} />
          <span className="text-right font-semibold text-foreground tabular-nums">{r.value}</span>
          <span className="truncate font-normal text-muted-foreground">
            {r.label}
            {r.status ? (
              <span className="ml-1.5 inline-flex items-center gap-1 font-semibold text-destructive-foreground">
                <span aria-hidden="true">▲</span>
                {r.status}
              </span>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}
