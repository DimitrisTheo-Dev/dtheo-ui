'use client';

import * as React from 'react';
import { scaleLinear } from 'd3-scale';
import { ChartEmpty, crisp, formatNumber, imageLabel, useWidth } from './core';

/**
 * Where a value sits along a grid, in cells: its index, or between two indices for a value between grid values,
 * extended past either end. Cells are evenly spaced whatever the values, so ticks and the marker use this too.
 */
function gridPosition(grid: number[], v: number) {
  const n = grid.length;
  if (n < 2) return 0;
  const ascending = grid[n - 1]! >= grid[0]!;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (grid[mid]! <= v === ascending) lo = mid;
    else hi = mid;
  }
  const a = grid[lo]!;
  const b = grid[hi]!;
  return b === a ? lo : lo + (v - a) / (b - a);
}

/** Every cell. Memoized, so hovering one cell redraws the outline, not the whole map. */
const HeatmapCells = React.memo(function HeatmapCells({
  values,
  vmin,
  vmax,
  left,
  top,
  plotH,
  cw,
  ch,
  onHover,
}: {
  values: number[][];
  vmin: number;
  vmax: number;
  left: number;
  top: number;
  plotH: number;
  cw: number;
  ch: number;
  onHover: (cell: { r: number; c: number }) => void;
}) {
  const t = scaleLinear().domain([vmin, vmax]).range([0.06, 1]).clamp(true);
  return values.map((row, r) =>
    row.map((v, c) =>
      Number.isFinite(v) ? (
        <rect
          key={`${r}-${c}`}
          x={left + c * cw + 0.5}
          y={top + plotH - (r + 1) * ch + 0.5}
          width={Math.max(0, cw - 1)}
          height={Math.max(0, ch - 1)}
          rx={1.5}
          className="fill-chart-1"
          fillOpacity={t(v)}
          onPointerEnter={() => onHover({ r, c })}
        />
      ) : null,
    ),
  );
});

/**
 * A sequential map over two axes, such as motor efficiency over speed and torque. One hue, light to strong,
 * built from the primary series color's opacity, so it stays monotonic in both themes. Hover a cell to read it.
 */
export function Heatmap({
  xValues,
  yValues,
  values,
  xLabel,
  yLabel,
  valueLabel,
  valueUnit = '',
  digits = 1,
  domain,
  marker,
  xTicks: xTickValues,
  yTicks: yTickValues,
  height = 300,
  ariaLabel,
  className,
}: {
  xValues: number[];
  yValues: number[];
  /** values[row][col], row follows yValues (bottom to top), col follows xValues. NaN leaves a cell empty. */
  values: number[][];
  xLabel: string;
  yLabel: string;
  valueLabel: string;
  valueUnit?: string;
  digits?: number;
  domain?: [number, number];
  /** An operating point to mark on the map. */
  marker?: { x: number; y: number; label: string };
  /** Tick values to label (they must be members of xValues / yValues). */
  xTicks?: number[];
  yTicks?: number[];
  height?: number;
  ariaLabel: string;
  className?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = React.useState<{ r: number; c: number } | null>(null);
  const w = width ?? 0;
  // The value range walks every cell, so it follows the data, not the pointer.
  const extent = React.useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const row of values)
      for (const v of row) {
        if (!Number.isFinite(v)) continue;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    return lo <= hi ? ([lo, hi] as [number, number]) : undefined;
  }, [values]);
  const hasData = extent !== undefined && xValues.length > 0 && yValues.length > 0;
  const [vmin, vmax] = domain ?? extent ?? [Number.NaN, Number.NaN];
  const left = 44;
  const right = 12;
  const top = 8;
  const bottom = 40;
  const plotW = Math.max(0, w - left - right);
  const plotH = height - top - bottom;
  const cw = xValues.length ? plotW / xValues.length : 0;
  const ch = yValues.length ? plotH / yValues.length : 0;
  // Thin ticks evenly to what fits (about one label per 64px); never force the last one in, which spaces them unevenly.
  const maxXTicks = Math.max(2, Math.floor(plotW / 64));
  const xTickBase = xTickValues ?? xValues.filter((_, i) => i % Math.ceil(xValues.length / 6) === 0);
  const xTicks = xTickBase.filter(
    (_, i, a) => a.length <= maxXTicks || i % Math.ceil(a.length / maxXTicks) === 0,
  );
  const yTicks = yTickValues ?? yValues.filter((_, i) => i % Math.ceil(yValues.length / 5) === 0);
  // The centre of the cell a value falls in, on the same index basis as the cells.
  const sx = (v: number) => left + (gridPosition(xValues, v) + 0.5) * cw;
  const sy = (v: number) => top + plotH - (gridPosition(yValues, v) + 0.5) * ch;
  const hv = hover ? values[hover.r]?.[hover.c] : undefined;

  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      <div
        ref={ref}
        role="img"
        aria-label={imageLabel(ariaLabel, !hasData)}
        className="relative w-full"
        style={{ height }}
      >
        {w ? (
          <svg
            width={w}
            height={height}
            aria-hidden="true"
            className="block overflow-visible"
            onPointerLeave={() => setHover(null)}
          >
            {hasData ? (
              <HeatmapCells
                values={values}
                vmin={vmin}
                vmax={vmax}
                left={left}
                top={top}
                plotH={plotH}
                cw={cw}
                ch={ch}
                onHover={setHover}
              />
            ) : null}
            {hover ? (
              <rect
                x={left + hover.c * cw}
                y={top + plotH - (hover.r + 1) * ch}
                width={cw}
                height={ch}
                rx={2}
                fill="none"
                strokeWidth={1.5}
                className="pointer-events-none stroke-foreground"
              />
            ) : null}
            {xTicks.map((v) => (
              <text
                key={v}
                x={sx(v)}
                y={top + plotH + 16}
                textAnchor="middle"
                className="fill-subtle-foreground text-caption tabular-nums"
              >
                {v}
              </text>
            ))}
            {yTicks.map((v) => (
              <text
                key={v}
                x={left - 8}
                y={sy(v) + 3.5}
                textAnchor="end"
                className="fill-subtle-foreground text-caption tabular-nums"
              >
                {v}
              </text>
            ))}
            <text
              x={left + plotW / 2}
              y={height - 4}
              textAnchor="middle"
              className="fill-muted-foreground text-caption"
            >
              {xLabel}
            </text>
            <text
              x={12}
              y={top + plotH / 2}
              textAnchor="middle"
              transform={`rotate(-90 12 ${top + plotH / 2})`}
              className="fill-muted-foreground text-caption"
            >
              {yLabel}
            </text>
            {marker && hasData ? (
              <g className="pointer-events-none">
                <circle
                  cx={sx(marker.x)}
                  cy={sy(marker.y)}
                  r={5}
                  strokeWidth={2}
                  className="fill-foreground stroke-card"
                />
                <text
                  x={sx(marker.x) + 9}
                  y={sy(marker.y) + 4}
                  className="fill-foreground text-label font-semibold [paint-order:stroke] stroke-card [stroke-width:3px]"
                >
                  {marker.label}
                </text>
              </g>
            ) : null}
            <line
              x1={left}
              x2={left + plotW}
              y1={crisp(top + plotH)}
              y2={crisp(top + plotH)}
              className="stroke-chart-axis"
            />
          </svg>
        ) : null}
        {hasData ? null : <ChartEmpty />}
        {hover && hv !== undefined && Number.isFinite(hv) ? (
          <div className="pointer-events-none absolute top-1 right-1 rounded-popover border border-border bg-popover/95 px-2.5 py-1.5 text-label shadow-popover backdrop-blur-material">
            <span className="font-semibold tabular-nums">
              {formatNumber(hv, digits)} {valueUnit}
            </span>{' '}
            <span className="text-muted-foreground">
              at {xValues[hover.c]} · {yValues[hover.r]}
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3 pl-11 text-caption text-subtle-foreground">
        <span>{valueLabel}</span>
        <span className="tabular-nums">{formatNumber(vmin, digits)}</span>
        <span
          aria-hidden="true"
          className="h-2 w-32 rounded-full bg-[linear-gradient(to_right,color-mix(in_oklch,var(--chart-1)_6%,transparent),var(--chart-1))]"
        />
        <span className="tabular-nums">
          {formatNumber(vmax, digits)} {valueUnit}
        </span>
      </div>
    </div>
  );
}
