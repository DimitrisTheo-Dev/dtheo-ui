'use client';

import * as React from 'react';
import { scaleLinear } from 'd3-scale';
import { toneFill, toneStroke, useWidth, type Tone } from './core';

/** A word-sized trend: one 1.5px line, a faint area and an emphasized endpoint. No axes, no hover. */
export function Sparkline({
  values,
  tone = 'primary',
  height = 28,
  area = true,
  domain,
  ariaLabel,
  className,
}: {
  values: number[];
  /** A shared [min, max] so sparklines in one table are comparable. Defaults to this series' own range. */
  domain?: [number, number];
  tone?: Tone;
  height?: number;
  area?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const w = width ?? 0;
  const pad = 3;
  const [min, max] = domain ?? [Math.min(...values), Math.max(...values)];
  const sx = scaleLinear()
    .domain([0, values.length - 1])
    .range([pad, Math.max(pad, w - pad)]);
  const sy = scaleLinear()
    .domain([min, max === min ? min + 1 : max])
    .range([height - pad, pad]);
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join('');
  const last = values.length - 1;
  return (
    <div
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      className={`w-full ${className ?? ''}`}
      style={{ height }}
    >
      {w ? (
        <svg width={w} height={height} aria-hidden="true" className="block overflow-visible">
          {area ? (
            <path
              d={`${line}L${sx(last)} ${height}L${sx(0)} ${height}Z`}
              className={`${toneFill[tone]} opacity-10`}
            />
          ) : null}
          <path
            d={line}
            fill="none"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            className={toneStroke[tone]}
          />
          <circle
            cx={sx(last)}
            cy={sy(values[last]!)}
            r={2.5}
            strokeWidth={1.5}
            className={`${toneFill[tone]} stroke-card`}
          />
        </svg>
      ) : null}
    </div>
  );
}
