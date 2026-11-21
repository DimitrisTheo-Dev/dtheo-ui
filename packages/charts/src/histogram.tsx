'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions -- the chart is a focusable reading region: arrow keys move between bins and the bin is announced through aria-live. */

import * as React from 'react';
import { bin, deviation, mean, thresholdFreedmanDiaconis, tickStep, type Bin } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import {
  ChartEmpty,
  crisp,
  finiteExtent,
  formatNumber,
  longestLabel,
  stepIndex,
  toneFill,
  useClipId,
  useWidth,
} from './core';

export interface HistogramProps {
  /**
   * Raw measurements, one per run or part, in production order: the order matters, because Cpk estimates the
   * within-process spread from neighbouring values (or from consecutive subgroups, see `subgroupSize`). A
   * non-finite value (NaN for a missing reading) is left out of the bins and every statistic.
   */
  values: number[];
  /** The x range. Defaults to the data's range. Bins start and end on whole multiples of the bin width around it. */
  domain?: [number, number];
  /**
   * Bin width in the values' unit. Defaults to a round width (1, 2 or 5 × 10ⁿ) near the Freedman–Diaconis rule.
   * At most 200 bins are drawn: a narrower width is widened to a whole multiple of itself that fits.
   */
  binWidth?: number;
  /**
   * How many consecutive values form one rational subgroup, for Cpk. Leave it out (or 1) when every value is an
   * individual reading: σ within is then the average moving range over d₂ (MR̄ / 1.128). Above 1, consecutive groups
   * of this many values are subgroups and σ within is their pooled standard deviation, √(Σ(nᵢ−1)sᵢ² / Σ(nᵢ−1)),
   * without the c₄ unbiasing constant; a subgroup with fewer than two finite values is skipped. Ppk always uses the
   * overall sample standard deviation.
   */
  subgroupSize?: number;
  /** Specification limits. Values past them are drawn critical (a value on a limit is in spec); Cpk and Ppk use them. */
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

/** At most this many bins, whatever the width asked for: past it, bars are thinner than a pixel. */
const MAX_BINS = 200;
/** d₂ for subgroups of two, which turns an average moving range into a standard deviation. */
const D2_MOVING_RANGE = 1.128;

/** Process capability: how many standard deviations fit between the mean and the nearer limit, over three. */
function capability(mu: number, sigma: number, lower?: number, upper?: number) {
  if (!sigma || !Number.isFinite(sigma) || !Number.isFinite(mu)) return undefined;
  if (lower === undefined && upper === undefined) return undefined;
  return Math.min(
    upper === undefined ? Infinity : (upper - mu) / (3 * sigma),
    lower === undefined ? Infinity : (mu - lower) / (3 * sigma),
  );
}

/** 1.33 is the usual bar for a capable process; under 1 the process makes out-of-spec parts by design. */
function cpkStatus(cpk: number) {
  if (cpk >= 1.33) return { word: 'capable', className: 'text-success-foreground' };
  if (cpk >= 1) return { word: 'marginal', className: 'text-warning-foreground' };
  return { word: 'not capable', className: 'text-destructive-foreground' };
}

type Bins = Array<Bin<number, number>>;
type Scale = (v: number) => number;

/** The within-process spread Cpk uses: moving range for individuals, pooled deviation for subgroups. */
function sigmaWithin(values: number[], subgroupSize?: number) {
  const k = Math.floor(subgroupSize ?? 1);
  if (k > 1) {
    let ss = 0;
    let df = 0;
    for (let start = 0; start < values.length; start += k) {
      const group = values.slice(start, start + k).filter((v) => Number.isFinite(v));
      if (group.length < 2) continue;
      const m = group.reduce((a, b) => a + b, 0) / group.length;
      for (const v of group) ss += (v - m) ** 2;
      df += group.length - 1;
    }
    return df ? Math.sqrt(ss / df) : Number.NaN;
  }
  let sum = 0;
  let ranges = 0;
  let prev = Number.NaN;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (Number.isFinite(prev)) {
      sum += Math.abs(v - prev);
      ranges++;
    }
    prev = v;
  }
  return ranges ? sum / ranges / D2_MOVING_RANGE : Number.NaN;
}

/** Round a multiple of the bin width, so 0.1 × 3 is an edge at 0.3, not 0.30000000000000004. */
const edgeAt = (k: number, step: number) => Number((k * step).toPrecision(15));

const validDomain = (r?: [number, number]): r is [number, number] =>
  r !== undefined && Number.isFinite(r[0]) && Number.isFinite(r[1]) && r[1] >= r[0];

/**
 * Whole-width bins on round edges (multiples of the width) that cover the domain, so no bin at either end is cut
 * short. Without a width, Freedman–Diaconis suggests a count (kept to 5–60) and the width is the round step nearest
 * it. Never more than MAX_BINS bins.
 */
function binEdges(finite: number[], [d0, d1]: [number, number], binWidth?: number) {
  let step = binWidth !== undefined && binWidth > 0 && Number.isFinite(binWidth) ? binWidth : 0;
  if (!step && d1 > d0) {
    const count = Math.min(60, Math.max(5, thresholdFreedmanDiaconis(finite, d0, d1) || 10));
    step = tickStep(d0, d1, count);
  }
  // One value, or every value the same: a round width a tenth of its magnitude, one bin around it.
  if (!(step > 0) || !Number.isFinite(step)) step = d0 ? 10 ** Math.floor(Math.log10(Math.abs(d0))) / 10 : 1;
  const span = (from: number) => {
    const k0 = Math.floor(d0 / from + 1e-9);
    return { k0, k1: Math.max(k0 + 1, Math.ceil(d1 / from - 1e-9)) };
  };
  let { k0, k1 } = span(step);
  if (k1 - k0 > MAX_BINS) {
    step *= Math.ceil((k1 - k0) / MAX_BINS);
    ({ k0, k1 } = span(step));
  }
  const edges: number[] = [];
  for (let k = k0; k <= k1; k++) {
    const e = edgeAt(k, step);
    if (e !== edges.at(-1)) edges.push(e);
  }
  if (edges.length < 2) edges.push(edges[0]! + step);
  return { edges, step };
}

function computeBins(finite: number[], edges: number[]): Bins {
  return bin<number, number>()
    .domain([edges[0]!, edges.at(-1)!])
    .thresholds(edges.slice(1, -1))(finite);
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
  ppk,
  fmt,
}: {
  n: number;
  mu: number;
  sigma: number;
  cpk?: number;
  ppk?: number;
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
      {ppk !== undefined ? (
        <div className="flex items-baseline gap-1.5">
          <dt className="font-normal text-muted-foreground">Ppk</dt>
          <dd className="font-semibold text-foreground tabular-nums">{formatNumber(ppk, 2)}</dd>
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

/** A bar from `bottom` up to `top`, with its top corners rounded. */
const roundedBar = (x0: number, bw: number, bottom: number, top: number) => {
  const r = Math.min(2, bw / 2, bottom - top);
  return `M${x0} ${bottom}V${top + r}Q${x0} ${top} ${x0 + r} ${top}H${x0 + bw - r}Q${x0 + bw} ${top} ${x0 + bw} ${top + r}V${bottom}Z`;
};

/**
 * One bar per bin. The part of a bin that is out of spec is critical and the rest stays primary, so a bin that holds
 * values on both sides of a limit (or exactly on it, which is in spec) shows two tones: the red bars hold exactly the
 * values past the limits, the count the summary states.
 */
function BinBars({
  bins,
  f,
  active,
  outOfSpec,
  onEnter,
}: {
  bins: Bins;
  f: Frame;
  active: number | null;
  outOfSpec: (b: Bin<number, number>) => number;
  onEnter: (i: number) => void;
}) {
  return bins.map((b, i) => {
    const x0 = f.sx(b.x0!) + 1;
    const bw = Math.max(1, f.sx(b.x1!) - f.sx(b.x0!) - 2);
    const out = outOfSpec(b);
    const fade = `transition-opacity duration-150 ${active !== null && active !== i ? 'opacity-45' : ''}`;
    let bars: React.ReactNode = null;
    if (b.length && (out === 0 || out === b.length))
      bars = (
        <path
          d={roundedBar(x0, bw, f.plotB, f.sy(b.length))}
          className={`${toneFill[out ? 'critical' : 'primary']} ${fade}`}
        />
      );
    else if (b.length) {
      const yIn = f.sy(b.length - out);
      bars = (
        <>
          <path
            d={`M${x0} ${f.plotB}V${yIn}H${x0 + bw}V${f.plotB}Z`}
            className={`${toneFill.primary} ${fade}`}
          />
          <path d={roundedBar(x0, bw, yIn, f.sy(b.length))} className={`${toneFill.critical} ${fade}`} />
        </>
      );
    }
    return (
      <g key={b.x0} onPointerEnter={() => onEnter(i)}>
        <rect x={x0 - 1} y={M.top} width={bw + 2} height={f.plotB - M.top} fill="transparent" />
        {bars}
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
 * A distribution of measurements against specification limits, for test results and quality data. The part of each
 * bin past a limit turns critical; the summary states n, mean, standard deviation, Cpk and Ppk in words, not color
 * alone.
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
  subgroupSize,
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
  const clipId = useClipId();
  const w = width ?? 0;

  // Everything that walks the data is memoized on it, so hovering a bin never recomputes extents or statistics.
  const finite = React.useMemo(() => values.filter((v) => Number.isFinite(v)), [values]);
  const extent = React.useMemo(() => finiteExtent(finite), [finite]);
  const [r0, r1] = validDomain(domain) ? domain : (extent ?? [0, 1]);
  const { bins, step } = React.useMemo(() => {
    const layout = binEdges(finite, [r0, r1], binWidth);
    return { bins: computeBins(finite, layout.edges), step: layout.step };
  }, [finite, r0, r1, binWidth]);
  const d0 = bins[0]?.x0 ?? r0;
  const d1 = bins.at(-1)?.x1 ?? r1;
  const stats = React.useMemo(() => {
    const n = finite.length;
    const mu = n ? (mean(finite) ?? Number.NaN) : Number.NaN;
    const sigma = n > 1 ? (deviation(finite) ?? Number.NaN) : Number.NaN;
    return {
      n,
      mu,
      sigma,
      cpk: capability(mu, sigmaWithin(values, subgroupSize), lower, upper),
      ppk: capability(mu, sigma, lower, upper),
    };
  }, [finite, values, subgroupSize, lower, upper]);
  const hasData = finite.length > 0;

  let tallest = 1;
  for (const b of bins) tallest = Math.max(tallest, b.length);
  const yMax = scaleLinear()
    .domain([0, tallest * 1.12])
    .nice()
    .domain()[1]!;
  const yt = scaleLinear().domain([0, yMax]).ticks(4);
  const left = 28 + longestLabel(yt) * 7;
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

  // A value on a limit is in spec; past it is out.
  const outOfSpec = (b: Bin<number, number>) => {
    let n = 0;
    for (const v of b) if ((upper !== undefined && v > upper) || (lower !== undefined && v < lower)) n++;
    return n;
  };
  const fmt = (v: number) =>
    Number.isFinite(v) ? `${formatNumber(v, digits)}${unit ? ` ${unit}` : ''}` : '–';
  const describe = (i: number) => {
    const b = bins[i]!;
    const out = outOfSpec(b);
    const spec = out === 0 ? '' : out === b.length ? ', out of spec' : `, ${out} out of spec`;
    return `${formatNumber(b.x0!, digits)} to ${fmt(b.x1!)}: ${b.length} ${b.length === 1 ? 'value' : 'values'}${spec}`;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const next = stepIndex(e.key, e.shiftKey, active, hasData ? bins.length : 0);
    if (next === undefined) return;
    e.preventDefault();
    setActive(next);
    if (next !== null) setAnnounce(describe(next));
  };

  const curve =
    normal && stats.sigma && Number.isFinite(stats.sigma) && plotW
      ? normalCurvePath(stats, step, [d0, d1], f.sx, f.sy)
      : '';
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
            <defs>
              <clipPath id={clipId}>
                <rect x={left - 2} y={M.top - 2} width={plotW + 4} height={plotB - M.top + 4} />
              </clipPath>
            </defs>
            <Axes
              f={f}
              xTicks={scaleLinear()
                .domain([d0, d1])
                .ticks(Math.max(3, Math.floor(plotW / 80)))}
              yTicks={yt}
              xTitle={`${xLabel}${unit ? ` (${unit})` : ''}`}
              height={height}
            />
            <BinBars bins={bins} f={f} active={active} outOfSpec={outOfSpec} onEnter={setActive} />
            {curve ? (
              <path
                d={curve}
                fill="none"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                clipPath={`url(#${clipId})`}
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
        {hasData ? null : <ChartEmpty />}
      </div>
    </div>
  );
}
