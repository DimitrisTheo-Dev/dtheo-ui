'use client';

import * as React from 'react';
import { scaleLinear } from 'd3-scale';
import { crisp, formatNumber, useWidth } from './core';

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
  const flat = values.flat().filter((v) => Number.isFinite(v));
  const [vmin, vmax] = domain ?? [Math.min(...flat), Math.max(...flat)];
  const left = 44;
  const right = 12;
  const top = 8;
  const bottom = 40;
  const plotW = Math.max(0, w - left - right);
  const plotH = height - top - bottom;
  const cw = plotW / xValues.length;
  const ch = plotH / yValues.length;
  const t = scaleLinear().domain([vmin, vmax]).range([0.06, 1]).clamp(true);
  // Thin ticks evenly to what fits (about one label per 64px); never force the last one in, which spaces them unevenly.
  const maxXTicks = Math.max(2, Math.floor(plotW / 64));
  const xTickBase = xTickValues ?? xValues.filter((_, i) => i % Math.ceil(xValues.length / 6) === 0);
  const xTicks = xTickBase.filter(
    (_, i, a) => a.length <= maxXTicks || i % Math.ceil(a.length / maxXTicks) === 0,
  );
  const yTicks = yTickValues ?? yValues.filter((_, i) => i % Math.ceil(yValues.length / 5) === 0);
  const sx = (v: number) =>
    left + ((v - xValues[0]!) / (xValues.at(-1)! - xValues[0]!)) * (plotW - cw) + cw / 2;
  const sy = (v: number) =>
    top + plotH - (((v - yValues[0]!) / (yValues.at(-1)! - yValues[0]!)) * (plotH - ch) + ch / 2);
  const hv = hover ? values[hover.r]?.[hover.c] : undefined;

  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      <div ref={ref} role="img" aria-label={ariaLabel} className="relative w-full" style={{ height }}>
        {w ? (
          <svg
            width={w}
            height={height}
            aria-hidden="true"
            className="block overflow-visible"
            onPointerLeave={() => setHover(null)}
          >
            {values.map((row, r) =>
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
                    onPointerEnter={() => setHover({ r, c })}
                  />
                ) : null,
              ),
            )}
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
            {marker ? (
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
