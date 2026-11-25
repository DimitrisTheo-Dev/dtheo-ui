'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions -- the chart is a focusable reading region: arrow keys move between bins and the bin is announced through aria-live. */

import * as React from 'react';
import { thresholdFreedmanDiaconis, tickStep } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import {
  CAPTION_CHAR_W,
  ChartEmpty,
  TITLED_AXIS_PAD,
  capabilityLevel,
  axisGutter,
  capability,
  crisp,
  finiteExtent,
  formatNumber,
  haloText,
  stepIndex,
  tickFormat,
  toneFill,
  useClipId,
  useWidth,
} from './core';

export interface HistogramProps {
  /**
   * Raw measurements, one per run or part, in run order: Cpk estimates the short-term spread from neighboring values
   * (or from consecutive subgroups, see `subgroupSize`). A non-finite value (NaN for a missing reading) is left out of
   * the bins and every statistic.
   */
  values: number[];
  /** The x range. Defaults to the range of the data and the limit, target and marker lines, widened to whole bins. */
  domain?: [number, number];
  /**
   * Bin width in the values' unit. Defaults to a round width (1, 2 or 5 × 10ⁿ) near the Freedman–Diaconis rule. At
   * most 200 bins are drawn: a narrower width is widened to a whole multiple of itself that fits.
   */
  binWidth?: number;
  /**
   * How many consecutive values form one rational subgroup, for Cpk. Leave it out (or 1) for individual readings: σ
   * within is then the average moving range over d₂ (MR̄ / 1.128). Above 1, σ within is the pooled standard deviation
   * of consecutive groups of this many values. Ppk always uses the overall σ.
   */
  subgroupSize?: number;
  /**
   * Specification limits. Values past them count as out of spec and draw critical, the side past each limit is
   * shaded, and Cpk and Ppk are computed from them.
   */
  lower?: number;
  upper?: number;
  /** Where the process should sit. */
  target?: number;
  /** Call out one value, such as the run under review. */
  marker?: { value: number; label: string };
  /** Overlay the normal curve with the sample's mean and standard deviation. */
  normal?: boolean;
  /**
   * Show Cpk and Ppk. Turn it off when a limit is a budget rather than a process specification, such as test
   * durations: the lines then read "Limit" instead of LSL and USL, and the readout says "over limit". Values past a
   * limit still draw critical.
   */
  capability?: boolean;
  xLabel: string;
  unit?: string;
  digits?: number;
  height?: number;
  ariaLabel: string;
  className?: string;
}

const M = { top: 18, right: 16, bottom: 40 };
/** Spacing of the limit-label rows, so labels that would touch stack instead of overlapping. */
const LABEL_ROW = 12;
/** At most this many bins, whatever the width asked for: past it, bars are thinner than a pixel. */
const MAX_BINS = 200;

/** Cpk carries a word next to its number (see capabilityLevel), in the status color that word stands for. */
const levelClass = {
  capable: 'text-success-foreground',
  marginal: 'text-warning-foreground',
  'not capable': 'text-destructive-foreground',
} as const;
function cpkStatus(cpk: number) {
  const word = capabilityLevel(cpk);
  return { word, className: levelClass[word] };
}

interface HistogramBin {
  x0: number;
  x1: number;
  count: number;
  /** Values in this bin past a specification limit. */
  out: number;
}

/** The bin width: `binWidth`, or a round step near the Freedman–Diaconis width (5–60 bins). */
function binStep(finite: number[], [d0, d1]: [number, number], binWidth?: number) {
  let step = binWidth !== undefined && binWidth > 0 && Number.isFinite(binWidth) ? binWidth : 0;
  if (!step && d1 > d0) {
    const count = Math.min(60, Math.max(5, thresholdFreedmanDiaconis(finite, d0, d1) || 10));
    step = tickStep(d0, d1, count);
  }
  // One value, or every value the same: a round width a tenth of its magnitude, one bin around it.
  if (!(step > 0) || !Number.isFinite(step)) step = d0 ? 10 ** Math.floor(Math.log10(Math.abs(d0))) / 10 : 1;
  return step;
}

/**
 * Whole-width bins on round edges (multiples of the width) over the domain widened to whole bins, so no bin at
 * either end is cut short; never more than MAX_BINS. Each bin holds [x0, x1), the last one its end too. A value
 * past a limit counts as out of spec and one exactly on it does not, so the critical part of each bar holds exactly
 * the values past the limits; a bin a limit cuts through keeps both counts.
 */
function computeBins(
  finite: number[],
  [d0, d1]: [number, number],
  { binWidth, lower, upper }: { binWidth?: number; lower?: number; upper?: number },
) {
  let step = binStep(finite, [d0, d1], binWidth);
  const span = (s: number) => {
    const k0 = Math.floor(d0 / s + 1e-9);
    return { k0, k1: Math.max(k0 + 1, Math.ceil(d1 / s - 1e-9)) };
  };
  let { k0, k1 } = span(step);
  if (k1 - k0 > MAX_BINS) {
    step *= Math.ceil((k1 - k0) / MAX_BINS);
    ({ k0, k1 } = span(step));
  }
  const n = k1 - k0;
  // Round each edge, so 0.1 × 3 is an edge at 0.3, not 0.30000000000000004.
  const edge = (k: number) => Number((k * step).toPrecision(15));
  const bins: HistogramBin[] = Array.from({ length: n }, (_, i) => ({
    x0: edge(k0 + i),
    x1: edge(k0 + i + 1),
    count: 0,
    out: 0,
  }));
  const start = bins[0]!.x0;
  const end = bins[n - 1]!.x1;
  for (const v of finite) {
    if (v < start || v > end) continue;
    const bin = bins[Math.min(n - 1, Math.floor((v - start) / step + 1e-9))]!;
    bin.count++;
    if ((upper !== undefined && v > upper) || (lower !== undefined && v < lower)) bin.out++;
  }
  return { bins, step, domain: [start, end] as [number, number] };
}

type Scale = (v: number) => number;

const validDomain = (r?: [number, number]): r is [number, number] =>
  r !== undefined && Number.isFinite(r[0]) && Number.isFinite(r[1]) && r[1] >= r[0];

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

interface Stats {
  n: number;
  mu: number;
  sigma: number;
  cpk?: number;
  ppk?: number;
}

function HistogramStats({ n, mu, sigma, cpk, ppk, fmt }: Stats & { fmt: (v: number) => string }) {
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

interface VLineSpec {
  value: number;
  label: string;
  dash?: string;
  /** The called-out value: a heavier line, a bold label, and a label row of its own below the limits. */
  strong?: boolean;
}

/**
 * Rows for the line labels: each label sits right of its line (left of it near the right edge), on the first row
 * where it doesn't touch a label already placed, so USL, Target and the called-out run stay readable on a phone.
 * The called-out value starts two rows down, under the limits.
 */
function labelRows(lines: VLineSpec[], f: Frame) {
  const placed: Array<{ row: number; a: number; b: number }> = [];
  return lines.map((l) => {
    const x = f.sx(l.value);
    const w = l.label.length * CAPTION_CHAR_W;
    const flip = x > f.left + f.plotW - w - 12;
    const a = flip ? x - 6 - w : x + 6;
    const b = a + w;
    let row = l.strong ? 2 : 0;
    while (placed.some((p) => p.row === row && a < p.b + 6 && b > p.a - 6)) row++;
    placed.push({ row, a, b });
    return { ...l, x, flip, row };
  });
}

/** A vertical line with a label that flips to the left near the right edge. */
function VLine({
  f,
  x,
  label,
  dash,
  strong,
  flip,
  row = 0,
}: {
  f: Frame;
  x: number;
  label: string;
  dash?: string;
  strong?: boolean;
  flip: boolean;
  row?: number;
}) {
  return (
    <g>
      <line
        x1={crisp(x)}
        x2={crisp(x)}
        y1={strong ? M.top + 4 + (row - 1) * LABEL_ROW : M.top - 6}
        y2={f.plotB}
        strokeDasharray={dash}
        strokeWidth={strong ? 2 : 1}
        className={strong ? 'stroke-foreground' : 'stroke-subtle-foreground'}
      />
      <text
        x={x + (flip ? -6 : 6)}
        y={M.top + 4 + row * LABEL_ROW}
        textAnchor={flip ? 'end' : 'start'}
        className={`text-caption tabular-nums ${strong ? 'fill-foreground font-semibold' : 'fill-muted-foreground'} ${haloText}`}
      >
        {label}
      </text>
    </g>
  );
}

/** A bar from `bottom` up to `top`, rounded at the data end only when it is the top of the stack. */
function barPath(x: number, w: number, top: number, bottom: number, round: boolean) {
  const r = round ? Math.min(2, w / 2, bottom - top) : 0;
  return `M${x} ${bottom}V${top + r}Q${x} ${top} ${x + r} ${top}H${x + w - r}Q${x + w} ${top} ${x + w} ${top + r}V${bottom}Z`;
}

function BinBars({
  bins,
  f,
  active,
  animate,
  onEnter,
}: {
  bins: HistogramBin[];
  f: Frame;
  active: number | null;
  /** Fade the dimming for the pointer; arrow-key steps change it at once. */
  animate: boolean;
  onEnter: (i: number) => void;
}) {
  const fade = animate ? 'transition-opacity duration-150' : '';
  return bins.map((b, i) => {
    const x0 = f.sx(b.x0) + 1;
    const bw = Math.max(1, f.sx(b.x1) - f.sx(b.x0) - 2);
    const inSpec = b.count - b.out;
    const dim = active !== null && active !== i ? 'opacity-45' : '';
    return (
      <g key={b.x0} onPointerEnter={() => onEnter(i)} onPointerDown={() => onEnter(i)}>
        <rect x={x0 - 1} y={M.top} width={bw + 2} height={f.plotB - M.top} fill="transparent" />
        {inSpec ? (
          <path
            d={barPath(x0, bw, f.sy(inSpec), f.plotB, !b.out)}
            className={`${toneFill.primary} ${fade} ${dim}`}
          />
        ) : null}
        {/* Out-of-spec values stack on top in the critical color, so the red area counts exactly the runs past a limit. */}
        {b.out ? (
          <path
            d={barPath(x0, bw, f.sy(b.count), f.sy(inSpec), true)}
            className={`${toneFill.critical} ${fade} ${dim}`}
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
  const fx = tickFormat(xTicks);
  const fy = tickFormat(yTicks);
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
            {fy(t)}
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
          {fx(t)}
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
 * A distribution of measurements against specification limits, for test results and quality data. Values past a
 * limit draw in the critical color over a shaded side; the summary states n, mean, standard deviation, Cpk with a
 * word, and Ppk (without the last two when `capability` is off).
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
  capability: showCapability = true,
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
  const [byKeys, setByKeys] = React.useState(false);
  const [announce, setAnnounce] = React.useState('');
  const descId = React.useId();
  const clipId = useClipId();
  const w = width ?? 0;

  // Everything that walks the data is memoized on it, so hovering a bin never reads the values again.
  const finite = React.useMemo(() => values.filter((v) => Number.isFinite(v)), [values]);
  // The default range covers the data and every line drawn over it, so a limit outside the data stays on the plot.
  const markerValue = marker?.value;
  const extent = React.useMemo(
    () => finiteExtent([...finite, ...[lower, upper, target, markerValue].filter((v) => v !== undefined)]),
    [finite, lower, upper, target, markerValue],
  );
  const hasData = finite.length > 0;
  const [r0, r1] = validDomain(domain) ? domain : (extent ?? [0, 1]);
  const {
    bins,
    step,
    domain: [d0, d1],
  } = React.useMemo(
    () => computeBins(finite, [r0, r1], { binWidth, lower, upper }),
    [finite, r0, r1, binWidth, lower, upper],
  );
  const stats = React.useMemo<Stats>(() => {
    const c = capability(values, lower, upper, subgroupSize);
    const sigma = c.n > 1 ? c.sigmaOverall : Number.NaN;
    if (!showCapability) return { n: c.n, mu: c.mean, sigma };
    return { n: c.n, mu: c.mean, sigma, cpk: c.cpk, ppk: c.ppk };
  }, [values, lower, upper, subgroupSize, showCapability]);

  let tallest = 1;
  for (const b of bins) tallest = Math.max(tallest, b.count);
  const yMax = scaleLinear()
    .domain([0, tallest * 1.12])
    .nice()
    .domain()[1]!;
  const yt = scaleLinear().domain([0, yMax]).ticks(4);
  const left = axisGutter(yt.map(tickFormat(yt)), TITLED_AXIS_PAD);
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

  const fmt = (v: number) =>
    Number.isFinite(v) ? `${formatNumber(v, digits)}${unit ? ` ${unit}` : ''}` : '–';
  const describe = (i: number) => {
    const b = bins[i]!;
    const past = showCapability ? 'out of spec' : 'over limit';
    const spec = !b.out ? '' : b.out === b.count ? `, ${past}` : `, ${b.out} ${past}`;
    return `${formatNumber(b.x0, digits)} to ${fmt(b.x1)}: ${b.count} ${b.count === 1 ? 'value' : 'values'}${spec}`;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const next = stepIndex(e.key, e.shiftKey, active, hasData ? bins.length : 0);
    if (next === undefined) return;
    e.preventDefault();
    setByKeys(true);
    setActive(next);
    if (next !== null) setAnnounce(describe(next));
  };
  const onPointerBin = (i: number) => {
    setByKeys(false);
    setActive(i);
  };

  const curve =
    normal && stats.sigma && Number.isFinite(stats.sigma) && plotW
      ? normalCurvePath(stats, step, [d0, d1], f.sx, f.sy)
      : '';
  const lines = labelRows(
    [
      ...[
        ...(lower !== undefined
          ? [{ value: lower, label: `${showCapability ? 'LSL' : 'Limit'} ${fmt(lower)}`, dash: '3 3' }]
          : []),
        ...(upper !== undefined
          ? [{ value: upper, label: `${showCapability ? 'USL' : 'Limit'} ${fmt(upper)}`, dash: '3 3' }]
          : []),
        ...(target !== undefined ? [{ value: target, label: `Target ${fmt(target)}`, dash: '1 3' }] : []),
      ].sort((a, b) => a.value - b.value),
      ...(marker
        ? [{ value: marker.value, label: `${marker.label} ${fmt(marker.value)}`, strong: true }]
        : []),
    ],
    f,
  );
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
      onPointerLeave={(e) => {
        if (e.pointerType !== 'touch') setActive(null);
      }}
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
            {/* The side past each limit is shaded, so a single value out there still reads. */}
            <g clipPath={`url(#${clipId})`} aria-hidden="true">
              {lower !== undefined ? (
                <rect
                  x={left}
                  width={Math.max(0, f.sx(lower) - left)}
                  y={M.top}
                  height={f.plotB - M.top}
                  className={`${toneFill.critical} opacity-10`}
                />
              ) : null}
              {upper !== undefined ? (
                <rect
                  x={f.sx(upper)}
                  width={Math.max(0, left + plotW - f.sx(upper))}
                  y={M.top}
                  height={f.plotB - M.top}
                  className={`${toneFill.critical} opacity-10`}
                />
              ) : null}
            </g>
            <BinBars bins={bins} f={f} active={active} animate={!byKeys} onEnter={onPointerBin} />
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
            {ab ? (
              <text
                x={f.sx((ab.x0 + ab.x1) / 2)}
                y={f.sy(ab.count) - 6}
                textAnchor="middle"
                className={`fill-foreground text-caption font-semibold tabular-nums ${haloText}`}
              >
                {ab.count}
              </text>
            ) : null}
          </svg>
        ) : null}
        {hasData ? null : <ChartEmpty />}
      </div>
    </div>
  );
}
