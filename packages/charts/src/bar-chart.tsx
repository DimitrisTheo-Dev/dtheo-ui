'use client';

import * as React from 'react';
import { scaleBand, scaleLinear } from 'd3-scale';
import {
  ChartEmpty,
  crisp,
  finiteExtent,
  formatNumber,
  imageLabel,
  longestLabel,
  toneFill,
  useWidth,
  type Tone,
} from './core';

export interface Bar {
  id: string;
  label: string;
  value: number;
  tone?: Tone;
  /** Highlight as the current item (bolder label). */
  current?: boolean;
}

/**
 * Comparison across a handful of categories (runs, actuators). Bars are thin, rounded only at the data end,
 * separated by air; bars past `limit` turn critical so the outlier reads first. Bars grow from zero, up for a
 * positive value and down for a negative one; with negatives the zero line is the axis.
 */
export function BarChart({
  bars,
  limit,
  limitLabel,
  yDomain,
  unit = '',
  digits = 1,
  height = 200,
  ariaLabel,
  className,
}: {
  bars: Bar[];
  limit?: number;
  limitLabel?: string;
  yDomain?: [number, number];
  unit?: string;
  digits?: number;
  height?: number;
  ariaLabel: string;
  className?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = React.useState<string | null>(null);
  const w = width ?? 0;
  const extent = React.useMemo(() => finiteExtent(bars.map((b) => b.value)), [bars]);
  const hasData = extent !== undefined;
  const top = Math.max(limit ?? 0, extent?.[1] ?? 0);
  const bottom = Math.min(limit ?? 0, extent?.[0] ?? 0);
  const lo = yDomain?.[0] ?? (bottom < 0 ? bottom * 1.15 : 0);
  let hi = yDomain?.[1] ?? top * 1.15;
  // Nothing above zero (no data, or every bar at zero): a unit range, so the axis sits at the bottom, not mid-air.
  if (!(hi > lo)) hi = lo + 1;
  const sy = scaleLinear()
    .domain([lo, hi])
    .nice()
    .range([height - 28, 14]);
  const ticks = sy.ticks(4);
  const left = 12 + longestLabel(ticks) * 7;
  const sx = scaleBand<string>()
    .domain(bars.map((b) => b.id))
    .range([left, Math.max(left, w - 8)])
    .paddingInner(0.35)
    .paddingOuter(0.2);
  const bw = Math.min(24, sx.bandwidth());
  const r = Math.min(4, bw / 2);
  // Bars grow from zero, or from the bottom of a domain that starts above zero.
  const [d0, d1] = sy.domain() as [number, number];
  const zero = Math.min(Math.max(0, d0), d1);
  const base = sy(zero);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={imageLabel(ariaLabel, !hasData)}
      className={`relative w-full ${className ?? ''}`}
      style={{ height }}
    >
      {w ? (
        <svg width={w} height={height} aria-hidden="true" className="block overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              {t !== zero ? (
                <line
                  x1={left}
                  x2={w - 8}
                  y1={crisp(sy(t))}
                  y2={crisp(sy(t))}
                  className="stroke-chart-grid"
                />
              ) : null}
              <text
                x={left - 10}
                y={sy(t) + 3.5}
                textAnchor="end"
                className="fill-subtle-foreground text-caption tabular-nums"
              >
                {t}
              </text>
            </g>
          ))}
          <line x1={left} x2={w - 8} y1={crisp(base)} y2={crisp(base)} className="stroke-chart-axis" />
          {bars.map((b) => {
            const x = (sx(b.id) ?? 0) + (sx.bandwidth() - bw) / 2;
            const finite = Number.isFinite(b.value);
            const y = finite ? sy(b.value) : base;
            const down = y > base;
            const over = limit !== undefined && b.value > limit;
            const tone: Tone = b.tone ?? (over ? 'critical' : b.current ? 'primary' : 'muted');
            const h = Math.abs(base - y);
            // Rounded only at the data end: the top of a bar going up, the bottom of one going down.
            const rd = Math.min(r, h);
            const d = down
              ? `M${x} ${base}V${y - rd}Q${x} ${y} ${x + rd} ${y}H${x + bw - rd}Q${x + bw} ${y} ${x + bw} ${y - rd}V${base}Z`
              : `M${x} ${base}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + bw - r}Q${x + bw} ${y} ${x + bw} ${y + r}V${base}Z`;
            return (
              <g
                key={b.id}
                onPointerEnter={() => setHover(b.id)}
                onPointerLeave={() => setHover(null)}
                className="cursor-default"
              >
                <rect x={sx(b.id)} y={14} width={sx.bandwidth()} height={height - 42} fill="transparent" />
                {h > 0 ? (
                  <path
                    d={d}
                    className={`${toneFill[tone]} transition-opacity duration-150 ${hover && hover !== b.id ? 'opacity-55' : ''}`}
                  />
                ) : null}
                <text
                  x={x + bw / 2}
                  y={height - 9}
                  textAnchor="middle"
                  className={`text-caption tabular-nums ${b.current ? 'fill-foreground font-semibold' : 'fill-subtle-foreground'}`}
                >
                  {b.label}
                </text>
                {finite && (hover === b.id || over || b.current) ? (
                  <text
                    x={x + bw / 2}
                    y={down ? y + 14 : y - 6}
                    textAnchor="middle"
                    className="fill-foreground text-caption font-semibold tabular-nums"
                  >
                    {formatNumber(b.value, digits)}
                    {unit}
                  </text>
                ) : null}
              </g>
            );
          })}
          {limit !== undefined ? (
            <g>
              <line
                x1={left}
                x2={w - 8}
                y1={crisp(sy(limit))}
                y2={crisp(sy(limit))}
                strokeDasharray="3 3"
                className="stroke-subtle-foreground/80"
              />
              {limitLabel ? (
                <text
                  x={left + 4}
                  y={sy(limit) - 6}
                  textAnchor="start"
                  className="fill-subtle-foreground text-caption [paint-order:stroke] stroke-card [stroke-width:3px]"
                >
                  {limitLabel}
                </text>
              ) : null}
            </g>
          ) : null}
        </svg>
      ) : null}
      {hasData ? null : <ChartEmpty />}
    </div>
  );
}
