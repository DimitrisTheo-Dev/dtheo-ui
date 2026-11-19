'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions -- the chart is a focusable reading region: arrow keys move between bins and the bin is announced through aria-live. */

import * as React from 'react';
import { bin, deviation, mean, thresholdFreedmanDiaconis, type Bin } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { crisp, formatNumber, stepIndex, toneFill, useWidth } from './core';

export interface HistogramProps {
  /** Raw measurements, one per run or part. */
  values: number[];
  /** The x range. Defaults to the data's range. */
  domain?: [number, number];
  /** Bin width in the values' unit. Defaults to the Freedman–Diaconis rule. */
  binWidth?: number;
  /** Specification limits. Bins outside them turn critical, and Cpk is computed from them. */
  lower?: number;
  upper?: number;
  /** Where the process should sit. */
  target?: number;
  /** Call out one value, such as the run under review. */
  marker?: { value: number; label: string };
  /** Overlay the normal curve with the sample's mean and standard deviation. */
  normal?: boolean;
  xLabel: string;
  unit?: string;
  digits?: number;
  height?: number;
  ariaLabel: string;
  className?: string;
}

const M = { top: 18, right: 16, bottom: 40 };
const haloText = '[paint-order:stroke] stroke-card [stroke-width:3px]';

/** Process capability: how many standard deviations fit between the mean and the nearer limit, over three. */
function capability(mu: number, sigma: number, lower?: number, upper?: number) {
  if (!sigma || (lower === undefined && upper === undefined)) return undefined;
  const sides = [
    upper === undefined ? Infinity : (upper - mu) / (3 * sigma),
    lower === undefined ? Infinity : (mu - lower) / (3 * sigma),
  ];
  return Math.min(...sides);
}

/** 1.33 is the usual bar for a capable process; under 1 the process makes out-of-spec parts by design. */
function cpkStatus(cpk: number) {
  if (cpk >= 1.33) return { word: 'capable', className: 'text-success-foreground' };
  if (cpk >= 1) return { word: 'marginal', className: 'text-warning-foreground' };
  return { word: 'not capable', className: 'text-destructive-foreground' };
}

type Bins = Array<Bin<number, number>>;
type Scale = (v: number) => number;

/** Bins on round edges. Freedman–Diaconis picks a count that adapts to spread and sample size, kept to 5–60. */
function computeBins(values: number[], d0: number, d1: number, binWidth?: number): Bins {
  const count = Math.min(60, Math.max(5, thresholdFreedmanDiaconis(values, d0, d1) || 10));
  const step = binWidth ?? (d1 - d0) / count;
  const edges: number[] = [];
  for (let e = Math.ceil(d0 / step) * step; e < d1; e += step) edges.push(Number(e.toFixed(10)));
  return bin<number, number>().domain([d0, d1]).thresholds(edges)(values);
}

/** The normal curve with the sample's mean and deviation, scaled to counts per bin. Eighty points is smooth. */
function normalCurvePath(
  { n, mu, sigma }: { n: number; mu: number; sigma: number },
  step: number,
  [d0, d1]: [number, number],
  sx: Scale,
  sy: Scale,
) {
  let d = '';
  for (let k = 0; k <= 80; k++) {
    const x = d0 + ((d1 - d0) * k) / 80;
    const pdf = Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
    d += `${k ? 'L' : 'M'}${sx(x).toFixed(1)} ${sy(pdf * n * step).toFixed(1)}`;
  }
  return d;
}

function HistogramStats({
  n,
  mu,
  sigma,
  cpk,
  fmt,
}: {
  n: number;
  mu: number;
  sigma: number;
  cpk?: number;
  fmt: (v: number) => string;
}) {
  const status = cpk === undefined ? undefined : cpkStatus(cpk);
  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-1 text-label">
      {[
        ['n', String(n)],
        ['Mean', fmt(mu)],
        ['σ', fmt(sigma)],
      ].map(([k, v]) => (
        <div key={k} className="flex items-baseline gap-1.5">
          <dt className="font-normal text-muted-foreground">{k}</dt>
          <dd className="font-semibold text-foreground tabular-nums">{v}</dd>
        </div>
      ))}
      {status && cpk !== undefined ? (
        <div className="flex items-baseline gap-1.5">
          <dt className="font-normal text-muted-foreground">Cpk</dt>
          <dd className={`font-semibold tabular-nums ${status.className}`}>
            {formatNumber(cpk, 2)} · {status.word}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

interface Frame {
  sx: Scale;
  sy: Scale;
  left: number;
  plotW: number;
  plotB: number;
}

/** A vertical line with a label that flips to the left near the right edge. */
function VLine({
  f,
  value,
  label,
  dash,
  strong,
}: {
  f: Frame;
  value: number;
  label: string;
  dash?: string;
  strong?: boolean;
}) {
  const x = f.sx(value);
  const flip = x > f.left + f.plotW - 90;
  return (
    <g>
      <line
        x1={crisp(x)}
        x2={crisp(x)}
        y1={strong ? M.top + 14 : M.top - 6}
        y2={f.plotB}
        strokeDasharray={dash}
        strokeWidth={strong ? 2 : 1}
        className={strong ? 'stroke-foreground' : 'stroke-subtle-foreground'}
      />
      <text
        x={x + (flip ? -6 : 6)}
        y={strong ? M.top + 26 : M.top + 4}
        textAnchor={flip ? 'end' : 'start'}
        className={`text-caption tabular-nums ${strong ? 'fill-foreground font-semibold' : 'fill-muted-foreground'} ${haloText}`}
      >
        {label}
      </text>
    </g>
  );
}

function BinBars({
  bins,
  f,
  active,
  outside,
  onEnter,
}: {
  bins: Bins;
  f: Frame;
  active: number | null;
  outside: (x0: number, x1: number) => boolean;
  onEnter: (i: number) => void;
}) {
  return bins.map((b, i) => {
    const x0 = f.sx(b.x0!) + 1;
    const bw = Math.max(1, f.sx(b.x1!) - f.sx(b.x0!) - 2);
    const y = f.sy(b.length);
    const r = Math.min(2, bw / 2);
    const tone = outside(b.x0!, b.x1!) ? 'critical' : 'primary';
    const dim = active !== null && active !== i;
    return (
      <g key={b.x0} onPointerEnter={() => onEnter(i)}>
        <rect x={x0 - 1} y={M.top} width={bw + 2} height={f.plotB - M.top} fill="transparent" />
        {b.length ? (
          <path
            d={`M${x0} ${f.plotB}V${y + r}Q${x0} ${y} ${x0 + r} ${y}H${x0 + bw - r}Q${x0 + bw} ${y} ${x0 + bw} ${y + r}V${f.plotB}Z`}
            className={`${toneFill[tone]} transition-opacity duration-150 ${dim ? 'opacity-45' : ''}`}
          />
        ) : null}
      </g>
    );
  });
}

function Axes({
  f,
  xTicks,
  yTicks,
  xTitle,
  height,
}: {
  f: Frame;
  xTicks: number[];
  yTicks: number[];
  xTitle: string;
  height: number;
}) {
  const right = f.left + f.plotW;
  return (
    <>
      {yTicks.map((t) => (
        <g key={t}>
          {t ? (
            <line
              x1={f.left}
              x2={right}
              y1={crisp(f.sy(t))}
              y2={crisp(f.sy(t))}
              className="stroke-chart-grid"
            />
          ) : null}
          <text
            x={f.left - 10}
            y={f.sy(t) + 3.5}
            textAnchor="end"
            className="fill-subtle-foreground text-caption tabular-nums"
          >
            {t}
          </text>
        </g>
      ))}
      <line x1={f.left} x2={right} y1={crisp(f.plotB)} y2={crisp(f.plotB)} className="stroke-chart-axis" />
      {xTicks.map((t) => (
        <text
          key={t}
          x={f.sx(t)}
          y={f.plotB + 16}
          textAnchor="middle"
          className="fill-subtle-foreground text-caption tabular-nums"
        >
          {t}
        </text>
      ))}
      <text
        x={f.left + f.plotW / 2}
        y={height - 4}
        textAnchor="middle"
        className="fill-muted-foreground text-caption"
      >
        {xTitle}
      </text>
      <text
        transform={`translate(12 ${(M.top + f.plotB) / 2}) rotate(-90)`}
        textAnchor="middle"
        className="fill-muted-foreground text-caption"
      >
        Count
      </text>
    </>
  );
}

/**
 * A distribution of measurements against specification limits, for test results and quality data. Bins outside
 * the limits turn critical; the summary states n, mean, standard deviation and Cpk in words, not color alone.
 */
export function Histogram({
  values,
  domain,
  binWidth,
  lower,
  upper,
  target,
  marker,
  normal = false,
  xLabel,
  unit = '',
  digits = 1,
  height = 240,
  ariaLabel,
  className,
}: HistogramProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = React.useState<number | null>(null);
  const [announce, setAnnounce] = React.useState('');
  const descId = React.useId();
  const w = width ?? 0;

  const [d0, d1] = domain ?? [Math.min(...values), Math.max(...values)];
  const bins = React.useMemo(() => computeBins(values, d0, d1, binWidth), [values, d0, d1, binWidth]);
  const stats = React.useMemo(() => {
    const mu = mean(values) ?? 0;
    const sigma = deviation(values) ?? 0;
    return { n: values.length, mu, sigma, cpk: capability(mu, sigma, lower, upper) };
  }, [values, lower, upper]);

  const yMax = scaleLinear()
    .domain([0, Math.max(1, ...bins.map((b) => b.length)) * 1.12])
    .nice()
    .domain()[1]!;
  const yt = scaleLinear().domain([0, yMax]).ticks(4);
  const left = 28 + Math.max(...yt.map((t) => String(t).length)) * 7;
  const plotW = Math.max(0, w - left - M.right);
  const plotB = height - M.bottom;
  const f: Frame = {
    sx: scaleLinear()
      .domain([d0, d1])
      .range([left, left + plotW]),
    sy: scaleLinear().domain([0, yMax]).range([plotB, M.top]),
    left,
    plotW,
    plotB,
  };

  const outside = (x0: number, x1: number) =>
    (upper !== undefined && (x0 + x1) / 2 > upper) || (lower !== undefined && (x0 + x1) / 2 < lower);
  const fmt = (v: number) => `${formatNumber(v, digits)}${unit ? ` ${unit}` : ''}`;
  const describe = (i: number) => {
    const b = bins[i]!;
    return `${formatNumber(b.x0!, digits)} to ${fmt(b.x1!)}: ${b.length} ${b.length === 1 ? 'value' : 'values'}${outside(b.x0!, b.x1!) ? ', out of spec' : ''}`;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const next = stepIndex(e.key, e.shiftKey, active, bins.length);
    if (next === undefined) return;
    e.preventDefault();
    setActive(next);
    if (next !== null) setAnnounce(describe(next));
  };

  const step = bins[0] ? bins[0].x1! - bins[0].x0! : 1;
  const curve = normal && stats.sigma && plotW ? normalCurvePath(stats, step, [d0, d1], f.sx, f.sy) : '';
  const lines = [
    ...(lower !== undefined ? [{ value: lower, label: `LSL ${fmt(lower)}`, dash: '3 3' }] : []),
    ...(upper !== undefined ? [{ value: upper, label: `USL ${fmt(upper)}`, dash: '3 3' }] : []),
    ...(target !== undefined ? [{ value: target, label: `Target ${fmt(target)}`, dash: '1 3' }] : []),
  ];
  const ab = active !== null ? bins[active] : undefined;

  return (
    <div
      ref={ref}
      data-slot="histogram"
      role="group"
      aria-label={ariaLabel}
      aria-describedby={descId}
      tabIndex={0}
      className={`relative w-full touch-pan-y rounded-control select-none ${className ?? ''}`}
      onPointerLeave={() => setActive(null)}
      onBlur={() => setActive(null)}
      onKeyDown={onKeyDown}
    >
      <span id={descId} className="sr-only">
        Use the arrow keys to move between bins. Hold Shift for larger steps.
      </span>
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-2">
        <HistogramStats {...stats} fmt={fmt} />
        {active !== null && ab ? (
          <p className="text-label font-normal text-muted-foreground tabular-nums">{describe(active)}</p>
        ) : null}
      </div>
      <div className="relative" style={{ height }}>
        {w ? (
          <svg width={w} height={height} aria-hidden="true" className="block overflow-visible">
            <Axes
              f={f}
              xTicks={scaleLinear()
                .domain([d0, d1])
                .ticks(Math.max(3, Math.floor(plotW / 80)))}
              yTicks={yt}
              xTitle={`${xLabel}${unit ? ` (${unit})` : ''}`}
              height={height}
            />
            <BinBars bins={bins} f={f} active={active} outside={outside} onEnter={setActive} />
            {curve ? (
              <path
                d={curve}
                fill="none"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                className="stroke-foreground/55"
              />
            ) : null}
            {lines.map((l) => (
              <VLine key={l.label} f={f} {...l} />
            ))}
            {marker ? (
              <VLine f={f} value={marker.value} label={`${marker.label} ${fmt(marker.value)}`} strong />
            ) : null}
            {ab ? (
              <text
                x={f.sx((ab.x0! + ab.x1!) / 2)}
                y={f.sy(ab.length) - 6}
                textAnchor="middle"
                className={`fill-foreground text-caption font-semibold tabular-nums ${haloText}`}
              >
                {ab.length}
              </text>
            ) : null}
          </svg>
        ) : null}
      </div>
    </div>
  );
}
