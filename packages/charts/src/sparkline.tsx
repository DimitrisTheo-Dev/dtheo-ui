'use client';

import * as React from 'react';
import { scaleLinear } from 'd3-scale';
import { toneFill, toneStroke, useWidth, type Tone } from './core';

/** Index ranges of finite values. A NaN (a dropout) ends a range, and the line breaks there. */
function finiteRuns(values: number[]) {
  const runs: Array<[number, number]> = [];
  let start = -1;
  for (let i = 0; i <= values.length; i++) {
    const ok = i < values.length && Number.isFinite(values[i]!);
    if (ok && start < 0) start = i;
    if (!ok && start >= 0) {
      runs.push([start, i - 1]);
      start = -1;
    }
  }
  return runs;
}

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
  const finite = values.filter((v) => Number.isFinite(v));
  const [min, max] = domain ?? (finite.length ? [Math.min(...finite), Math.max(...finite)] : [0, 1]);
  const sx = scaleLinear()
    .domain([0, values.length - 1])
    .range([pad, Math.max(pad, w - pad)]);
  const sy = scaleLinear()
    .domain([min, max === min ? min + 1 : max])
    .range([height - pad, pad]);
  const runs = finiteRuns(values);
  const segment = ([a, b]: [number, number]) => {
    let d = '';
    for (let i = a; i <= b; i++) d += `${i > a ? 'L' : 'M'}${sx(i).toFixed(1)} ${sy(values[i]!).toFixed(1)}`;
    return d;
  };
  const line = runs.map(segment).join('');
  // Each run closes its own area down to the baseline, so a gap stays empty.
  const fill = runs.map((r) => `${segment(r)}L${sx(r[1])} ${height}L${sx(r[0])} ${height}Z`).join('');
  const last = runs.at(-1)?.[1];
  return (
    <div
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      className={`w-full ${className ?? ''}`}
      style={{ height }}
    >
      {w && last !== undefined ? (
        <svg width={w} height={height} aria-hidden="true" className="block overflow-visible">
          {area ? <path d={fill} className={`${toneFill[tone]} opacity-10`} /> : null}
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
