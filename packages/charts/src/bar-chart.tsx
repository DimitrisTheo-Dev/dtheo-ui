'use client';

import * as React from 'react';
import { scaleBand, scaleLinear } from 'd3-scale';
import {
  ChartEmpty,
  axisGutter,
  crisp,
  finiteExtent,
  formatNumber,
  haloText,
  imageLabel,
  tickFormat,
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

export interface BarChartProps {
  bars: Bar[];
  /** Bars past this value turn critical. */
  limit?: number;
  limitLabel?: string;
  /** Defaults to zero (or the lowest negative value) up to 15 % above the highest bar or the limit. */
  yDomain?: [number, number];
  /** The values' unit: written above the y-axis and after each value label. */
  unit?: string;
  digits?: number;
  height?: number;
  ariaLabel: string;
  className?: string;
}

const TOP = 14;
const UNIT_ROW = 12;

/** A bar from the zero line to its value, rounded only at the data end (the top, or the bottom for a negative). */
function barPath(x: number, w: number, zero: number, y: number, r: number) {
  if (y > zero) {
    return `M${x} ${zero}V${y - r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y - r}V${zero}Z`;
  }
  return `M${x} ${zero}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${zero}Z`;
}

/**
 * Comparison across a handful of categories (runs, actuators). Bars are thin, rounded only at the data end,
 * separated by air; bars past `limit` turn critical so the outlier reads first. Negative values hang below zero.
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
}: BarChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = React.useState<string | null>(null);
  const w = width ?? 0;
  const top = TOP + (unit ? UNIT_ROW : 0);
  // Without spreading the values into Math.min/max, and leaving out a missing (NaN) value.
  const extent = React.useMemo(() => finiteExtent(bars.map((b) => b.value)), [bars]);
  const hasData = extent !== undefined;
  const low = Math.min(limit ?? 0, extent?.[0] ?? 0);
  const lo = yDomain?.[0] ?? (low < 0 ? low * 1.15 : 0);
  let hi = yDomain?.[1] ?? Math.max(limit ?? 0, extent?.[1] ?? 0) * 1.15;
  // Nothing above zero (no data, or every bar at zero): a unit range, so the axis sits at the bottom, not mid-air.
  if (!(hi > lo)) hi = lo + 1;
  const sy = scaleLinear()
    .domain([lo, hi])
    .nice()
    .range([height - 28, top]);
  const ticks = sy.ticks(4);
  const fy = tickFormat(ticks);
  const left = axisGutter([...ticks.map(fy), unit]);
  const sx = scaleBand<string>()
    .domain(bars.map((b) => b.id))
    .range([left, Math.max(left, w - 8)])
    .paddingInner(0.35)
    .paddingOuter(0.2);
  const bw = Math.min(24, sx.bandwidth());
  const r = Math.min(4, bw / 2);
  const [d0, d1] = sy.domain() as [number, number];
  const zero = sy(Math.min(d1, Math.max(d0, 0)));
  const value = (v: number) => `${formatNumber(v, digits)}${unit ? ` ${unit}` : ''}`;

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
          {unit ? (
            <text
              x={left - 10}
              y={top - UNIT_ROW + 2}
              textAnchor="end"
              className="fill-subtle-foreground text-caption"
            >
              {unit}
            </text>
          ) : null}
          {ticks.map((t) => (
            <g key={t}>
              {crisp(sy(t)) !== crisp(zero) ? (
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
                {fy(t)}
              </text>
            </g>
          ))}
          <line x1={left} x2={w - 8} y1={crisp(zero)} y2={crisp(zero)} className="stroke-chart-axis" />
          {bars.map((b) => {
            const x = (sx(b.id) ?? 0) + (sx.bandwidth() - bw) / 2;
            const finite = Number.isFinite(b.value);
            const y = finite ? sy(b.value) : zero;
            const over = limit !== undefined && b.value > limit;
            const tone: Tone = b.tone ?? (over ? 'critical' : b.current ? 'primary' : 'muted');
            const h = Math.abs(zero - y);
            return (
              <g
                key={b.id}
                onPointerEnter={() => setHover(b.id)}
                onPointerDown={() => setHover(b.id)}
                onPointerLeave={(e) => {
                  if (e.pointerType !== 'touch') setHover(null);
                }}
                className="cursor-default"
              >
                <rect x={sx(b.id)} y={top} width={sx.bandwidth()} height={height - 28 - top} fill="transparent" />
                {h > 0 ? (
                  <path
                    d={barPath(x, bw, zero, y, Math.min(r, h))}
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
                    y={b.value < 0 ? y + 14 : y - 6}
                    textAnchor="middle"
                    className={`fill-foreground text-caption font-semibold tabular-nums ${haloText}`}
                  >
                    {value(b.value)}
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
                  className={`fill-subtle-foreground text-caption ${haloText}`}
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
