'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions -- the chart is a focusable reading region: arrow keys move the readout and it is announced through aria-live. */

import * as React from 'react';
import { scaleLinear, scaleLog, type ScaleLinear, type ScaleLogarithmic } from 'd3-scale';
import {
  CAPTION_CHAR_W,
  ChartEmpty,
  axisGutter,
  createLinePath,
  crisp,
  formatNumber,
  haloText,
  hasFinite,
  nearestIndex,
  stepIndex,
  tickFormat,
  toneBg,
  toneFill,
  toneStroke,
  useClipId,
  useTooltipPlacement,
  useWidth,
  type Tone,
} from './core';

export interface FrequencySeries {
  id: string;
  label: string;
  /** One value per frequency: dB for magnitude, degrees for phase. */
  values: ArrayLike<number>;
  tone?: Tone;
  width?: 1 | 1.5 | 2;
}

/** A labeled point on the magnitude pane: a resonance, a peak in a spectrum. */
export interface FrequencyPeak {
  frequency: number;
  value: number;
  label: string;
}

/** A vertical span between a value and a reference, such as a gain or phase margin. */
export interface FrequencySpan {
  pane: 'magnitude' | 'phase';
  frequency: number;
  from: number;
  to: number;
  label: string;
}

export interface FrequencyChartProps {
  /**
   * Frequencies in Hz, ascending. Plotted on a log axis, so samples at or below zero (an FFT's 0 Hz bin) are left
   * out of the plot and the readout.
   */
  frequency: ArrayLike<number>;
  magnitude: FrequencySeries[];
  magnitudeDomain: [number, number];
  magnitudeTicks?: number[];
  magnitudeUnit?: string;
  /** Add a phase pane under the magnitude pane: a Bode plot. Leave it out for a spectrum. */
  phase?: FrequencySeries[];
  phaseDomain?: [number, number];
  phaseTicks?: number[];
  /** Horizontal reference lines, such as 0 dB and −180°. */
  references?: { magnitude?: number[]; phase?: number[] };
  /** Vertical lines across both panes, such as a crossover or the −3 dB bandwidth. */
  markers?: Array<{ frequency: number; label: string }>;
  peaks?: FrequencyPeak[];
  spans?: FrequencySpan[];
  /** Height of each pane, in pixels. */
  paneHeight?: number;
  /** One sentence that states the takeaway, for screen readers. */
  ariaLabel: string;
  className?: string;
}

const M = { top: 22, right: 16, bottom: 6, axis: 22 };
const none: never[] = [];

type XScale = ScaleLogarithmic<number, number>;
type YScale = ScaleLinear<number, number>;

/**
 * 0.01, 0.1, 1, 10, 100, 1k, 1M: decades are labeled (see axisLabels for narrow ranges), the steps between them are
 * faint grid lines. Below 1 Hz a
 * value keeps two significant digits (0.25, 0.01); from 1 kHz it is in k, from 1 MHz in M.
 */
function formatHz(f: number) {
  const a = Math.abs(f);
  if (a >= 999_950) return `${formatNumber(f / 1e6, f % 1e6 ? 1 : 0)}M`;
  if (a >= 1000) return `${formatNumber(f / 1000, f % 1000 ? 1 : 0)}k`;
  if (a >= 1 || !Number.isFinite(a) || a === 0) return formatNumber(f, a < 10 && f % 1 ? 1 : 0);
  return formatNumber(f, 1 - Math.floor(Math.log10(a)))
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
}

/** A frequency with its unit, in kHz from 1,000 Hz and MHz from 1 MHz: "7.4 Hz", "0.25 Hz", "1 kHz", never "1k Hz". */
function withHz(f: number) {
  const label = formatHz(f);
  if (label.endsWith('M')) return `${label.slice(0, -1)} MHz`;
  if (label.endsWith('k')) return `${label.slice(0, -1)} kHz`;
  return `${label} Hz`;
}

/** Decade and minor grid lines between two positive frequencies; none for a range a log axis cannot show. */
function logGrid(min: number, max: number) {
  const decades: number[] = [];
  const minors: number[] = [];
  if (!(min > 0) || !(max >= min) || !Number.isFinite(max)) return { decades, minors };
  for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) {
    const d = 10 ** e;
    if (d >= min && d <= max) decades.push(d);
    for (let k = 2; k < 10; k++) if (d * k >= min && d * k <= max) minors.push(d * k);
  }
  return { decades, minors };
}

/** The leading digit of a grid frequency: 2 for 0.2, 20 and 2k. */
const leadingDigit = (f: number) => Math.round(f / 10 ** Math.floor(Math.log10(f) + 1e-9));

/**
 * The frequencies the axis labels: every decade when two or more are in view; otherwise the 1, 2 and 5 steps, so a
 * 20–80 Hz axis still reads 20 and 50 Hz; otherwise every grid line; and for a range with fewer than two grid lines
 * (21–29 Hz), its two ends.
 */
function axisLabels(min: number, max: number, decades: number[], minors: number[]) {
  if (decades.length >= 2) return decades;
  const lines = [...decades, ...minors].sort((a, b) => a - b);
  const steps = lines.filter((f) => [1, 2, 5].includes(leadingDigit(f)));
  if (steps.length >= 2) return steps;
  if (lines.length >= 2) return lines;
  return min > 0 && max > min ? [min, max] : lines;
}

/** A frequency a log axis can place. */
const plottable = (f: number) => f > 0 && Number.isFinite(f);

/** First and last index of a frequency the log axis can show; [-1, -1] when there is none. */
function validRange(freq: ArrayLike<number>): [number, number] {
  let first = -1;
  let last = -1;
  for (let i = 0; i < freq.length; i++) {
    if (!plottable(freq[i]!)) continue;
    if (first < 0) first = i;
    last = i;
  }
  return [first, last];
}

function linePath(freq: ArrayLike<number>, values: ArrayLike<number>, sx: XScale, sy: YScale) {
  const path = createLinePath(1);
  for (let i = 0; i < freq.length; i++) {
    const v = values[i]!;
    const f = freq[i]!;
    if (Number.isFinite(v) && plottable(f)) path.to(sx(f), sy(v));
    else path.gap();
  }
  return path.done();
}

/** Space a clipped trace keeps around its pane, so a 2 px stroke on the edge is never cut. */
const CLIP_PAD = 2;

interface PaneProps {
  kind: 'magnitude' | 'phase';
  title: string;
  series: FrequencySeries[];
  freq: ArrayLike<number>;
  sx: XScale;
  domain: [number, number];
  ticks?: number[];
  unit: string;
  references: number[];
  markers: Array<{ frequency: number; label: string }>;
  peaks: FrequencyPeak[];
  spans: FrequencySpan[];
  width: number;
  height: number;
  left: number;
  xAxis: boolean;
  cursor: number | null;
}

function Pane({
  kind,
  title,
  series,
  freq,
  sx,
  domain,
  ticks,
  unit,
  references,
  markers,
  peaks,
  spans,
  width,
  height,
  left,
  xAxis,
  cursor,
}: PaneProps) {
  const plotBottom = height - M.bottom - (xAxis ? M.axis : 0);
  const [d0, d1] = domain;
  const sy = React.useMemo(
    () => scaleLinear().domain([d0, d1]).range([plotBottom, M.top]),
    [d0, d1, plotBottom],
  );
  const yTicks = ticks ?? sy.ticks(4);
  const fy = tickFormat(yTicks);
  const [f0, f1] = sx.domain() as [number, number];
  const { decades, minors } = React.useMemo(() => logGrid(f0, f1), [f0, f1]);
  const labels = React.useMemo(() => axisLabels(f0, f1, decades, minors), [f0, f1, decades, minors]);
  const right = width - M.right;
  // Paths depend on the data and the scales, not on the cursor, so moving the pointer never rebuilds them.
  const paths = React.useMemo(
    () => series.map((s) => ({ s, d: linePath(freq, s.values, sx, sy) })),
    [series, freq, sx, sy],
  );
  const clipId = useClipId();
  return (
    <svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
      <defs>
        <clipPath id={clipId}>
          <rect
            x={left - CLIP_PAD}
            y={M.top - CLIP_PAD}
            width={Math.max(0, right - left) + 2 * CLIP_PAD}
            height={plotBottom - M.top + 2 * CLIP_PAD}
          />
        </clipPath>
      </defs>
      <text x={left} y={12} className="fill-muted-foreground text-caption">
        {title}
      </text>
      {minors.map((f) => (
        <line
          key={`m${f}`}
          x1={crisp(sx(f))}
          x2={crisp(sx(f))}
          y1={M.top}
          y2={plotBottom}
          className="stroke-chart-grid/50"
        />
      ))}
      {decades.map((f) => (
        <line
          key={`d${f}`}
          x1={crisp(sx(f))}
          x2={crisp(sx(f))}
          y1={M.top}
          y2={plotBottom}
          className="stroke-chart-grid"
        />
      ))}
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={left} x2={right} y1={crisp(sy(t))} y2={crisp(sy(t))} className="stroke-chart-grid" />
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
      {references.map((r) => (
        <line
          key={r}
          x1={left}
          x2={right}
          y1={crisp(sy(r))}
          y2={crisp(sy(r))}
          strokeDasharray="3 3"
          className="stroke-subtle-foreground/80"
        />
      ))}
      {markers
        .filter((m) => plottable(m.frequency))
        .map((m) => (
          <g key={m.label}>
            <line
              x1={crisp(sx(m.frequency))}
              x2={crisp(sx(m.frequency))}
              y1={M.top}
              y2={plotBottom}
              strokeDasharray="2 3"
              className="stroke-muted-foreground/60"
            />
            {kind === 'magnitude' ? (
              <text
                x={sx(m.frequency) + 5}
                y={M.top + 10}
                className={`fill-muted-foreground text-caption ${haloText}`}
              >
                {m.label}
              </text>
            ) : null}
          </g>
        ))}
      <g clipPath={`url(#${clipId})`}>
        {paths.map(({ s, d }) => (
          <path
            key={s.id}
            d={d}
            fill="none"
            strokeWidth={s.width ?? 2}
            strokeLinejoin="round"
            strokeLinecap="round"
            className={toneStroke[s.tone ?? 'primary']}
          />
        ))}
      </g>
      {spans
        .filter((sp) => sp.pane === kind && plottable(sp.frequency))
        .map((sp) => {
          const x = sx(sp.frequency);
          const y0 = sy(sp.from);
          const y1 = sy(sp.to);
          const up = y1 < y0;
          return (
            <g key={sp.label}>
              <line x1={x} x2={x} y1={y0} y2={y1} strokeWidth={1.5} className="stroke-foreground" />
              <path
                d={`M${x - 3.5} ${y1 + (up ? 5 : -5)}L${x} ${y1}L${x + 3.5} ${y1 + (up ? 5 : -5)}`}
                fill="none"
                strokeWidth={1.5}
                className="stroke-foreground"
              />
              {/* A chip behind the label, so a trace passing through never makes it unreadable. */}
              <rect
                x={x + 6}
                y={(y0 + y1) / 2 - 9}
                width={sp.label.length * CAPTION_CHAR_W + 10}
                height={18}
                rx={4}
                className="fill-card stroke-border"
              />
              <text
                x={x + 11}
                y={(y0 + y1) / 2 + 4}
                className="fill-foreground text-caption font-semibold tabular-nums"
              >
                {sp.label}
              </text>
            </g>
          );
        })}
      {kind === 'magnitude'
        ? peaks
            .filter((p) => plottable(p.frequency) && Number.isFinite(p.value))
            .map((p) => (
              <g key={p.label}>
                <circle
                  cx={sx(p.frequency)}
                  cy={sy(p.value)}
                  r={3.5}
                  strokeWidth={2}
                  className="fill-foreground stroke-card"
                />
                <text
                  x={sx(p.frequency)}
                  y={sy(p.value) - 9}
                  textAnchor="middle"
                  className={`fill-foreground text-caption font-semibold tabular-nums ${haloText}`}
                >
                  {p.label}
                </text>
              </g>
            ))
        : null}
      {cursor != null ? (
        <g>
          <line
            x1={crisp(sx(freq[cursor]!))}
            x2={crisp(sx(freq[cursor]!))}
            y1={M.top}
            y2={plotBottom}
            className="stroke-muted-foreground/50"
          />
          {series.map((s) =>
            Number.isFinite(s.values[cursor]!) ? (
              <circle
                key={s.id}
                cx={sx(freq[cursor]!)}
                cy={sy(s.values[cursor]!)}
                r={4}
                strokeWidth={2}
                className={`${toneFill[s.tone ?? 'primary']} stroke-card`}
              />
            ) : null,
          )}
        </g>
      ) : null}
      <line
        x1={left}
        x2={right}
        y1={crisp(plotBottom)}
        y2={crisp(plotBottom)}
        className="stroke-chart-axis"
      />
      {xAxis
        ? labels.map((f, k) => (
            <text
              key={f}
              x={sx(f)}
              y={plotBottom + 16}
              textAnchor={k === labels.length - 1 && right - sx(f) < 30 ? 'end' : 'middle'}
              className="fill-subtle-foreground text-caption tabular-nums"
            >
              {k === labels.length - 1 ? withHz(f) : formatHz(f)}
            </text>
          ))
        : null}
      <text x={right} y={12} textAnchor="end" className="fill-subtle-foreground text-caption">
        {unit}
      </text>
    </svg>
  );
}

interface Row {
  key: string;
  label: string;
  value: string;
  tone?: Tone;
}

/** Every series' value at one frequency. Magnitude and phase rows of the same run share a label, so keys differ. */
function readoutRows(
  i: number,
  magnitude: FrequencySeries[],
  phase: FrequencySeries[] | undefined,
  unit: string,
): Row[] {
  return [
    ...magnitude.map((s) => ({
      key: `m-${s.id}`,
      label: s.label,
      value: `${formatNumber(s.values[i]!, 1)} ${unit}`,
      tone: s.tone,
    })),
    ...(phase ?? []).map((s) => ({
      key: `p-${s.id}`,
      label: s.label,
      value: `${formatNumber(s.values[i]!, 0)}°`,
      tone: s.tone,
    })),
  ];
}

function FrequencyReadout({ title, rows, x, width }: { title: string; rows: Row[]; x: number; width: number }) {
  const ref = useTooltipPlacement<HTMLDivElement>(x, width);
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute top-6 z-10 max-w-full min-w-40 rounded-popover border border-border bg-popover/95 px-3 py-2.5 text-label shadow-popover backdrop-blur-material"
    >
      <div className="mb-1.5 font-semibold text-foreground tabular-nums">{title}</div>
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-[12px_auto_1fr] items-center gap-2 leading-6">
          <span aria-hidden="true" className={`h-0.5 w-3 rounded-full ${toneBg[r.tone ?? 'primary']}`} />
          <span className="text-right font-semibold text-foreground tabular-nums">{r.value}</span>
          <span className="truncate font-normal text-muted-foreground">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Frequency response on a log axis. Magnitude alone is a spectrum; add phase for a Bode plot with gain and phase
 * margins drawn where they are measured. Both panes share one crosshair; arrow keys step through frequencies.
 */
export function FrequencyChart({
  frequency,
  magnitude,
  magnitudeDomain,
  magnitudeTicks,
  magnitudeUnit = 'dB',
  phase,
  phaseDomain = [-270, 0],
  phaseTicks,
  references,
  markers = none,
  peaks = none,
  spans = none,
  paneHeight = 180,
  ariaLabel,
  className,
}: FrequencyChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [cursor, setCursor] = React.useState<number | null>(null);
  const [announce, setAnnounce] = React.useState('');
  const descId = React.useId();
  const w = width ?? 0;
  const allTicks = [
    ...(magnitudeTicks ?? scaleLinear().domain(magnitudeDomain).ticks(4)),
    ...(phase ? (phaseTicks ?? scaleLinear().domain(phaseDomain).ticks(4)) : []),
  ];
  const left = axisGutter(allTicks.map(tickFormat(allTicks)));
  // A log axis starts above zero: an FFT's 0 Hz bin, or any frequency at or below zero, is left out.
  const [first, last] = React.useMemo(() => validRange(frequency), [frequency]);
  const f0 = first < 0 ? 1 : frequency[first]!;
  const f1 = first < 0 ? 10 : frequency[last]!;
  const sx = React.useMemo(
    () =>
      scaleLog()
        .domain([f0, f1])
        .range([left, Math.max(left, w - M.right)]),
    [f0, f1, left, w],
  );
  const hasPhase = Boolean(phase?.length);
  const total = paneHeight + (hasPhase ? paneHeight : 0) + M.axis;
  const hasData = React.useMemo(
    () => first >= 0 && [...magnitude, ...(phase ?? [])].some((s) => hasFinite(s.values, first, last)),
    [first, last, magnitude, phase],
  );
  const count = hasData ? last - first + 1 : 0;

  const readout = (i: number) => readoutRows(i, magnitude, phase, magnitudeUnit);

  /** The sample nearest the pointer, for a mouse moving over the chart or a finger tapping it. */
  const readAt = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!w || !hasData) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const f = sx.invert(Math.min(w - M.right, Math.max(left, e.clientX - rect.left)));
    setCursor(Math.min(last, Math.max(first, nearestIndex(frequency, f))));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = stepIndex(e.key, e.shiftKey, cursor == null ? null : cursor - first, count);
    if (step === undefined) return;
    e.preventDefault();
    const next = step === null ? null : first + step;
    setCursor(next);
    if (next === null) return;
    setAnnounce(
      `${withHz(frequency[next]!)}: ${readout(next)
        .map((r) => `${r.label} ${r.value}`)
        .join(', ')}`,
    );
  };

  const cx = cursor != null ? sx(frequency[cursor]!) : 0;
  const shared = { freq: frequency, sx, width: w, left, markers, peaks, spans, cursor };

  return (
    <div
      ref={ref}
      data-slot="frequency-chart"
      role="group"
      aria-label={ariaLabel}
      aria-describedby={descId}
      tabIndex={0}
      className={`relative w-full touch-pan-y rounded-control select-none ${className ?? ''}`}
      style={{ height: total }}
      onPointerDown={(e) => readAt(e)}
      onPointerMove={(e) => readAt(e)}
      onPointerLeave={(e) => {
        // A tap ends with the finger leaving: keep its reading until the next tap or until focus moves on.
        if (e.pointerType !== 'touch') setCursor(null);
      }}
      onBlur={() => setCursor(null)}
      onKeyDown={onKeyDown}
    >
      <span id={descId} className="sr-only">
        Use the left and right arrow keys to read values by frequency. Hold Shift for larger steps.
      </span>
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
      {w ? (
        <>
          <Pane
            {...shared}
            kind="magnitude"
            title="Magnitude"
            series={magnitude}
            domain={magnitudeDomain}
            ticks={magnitudeTicks}
            unit={magnitudeUnit}
            references={references?.magnitude ?? []}
            height={paneHeight + (hasPhase ? 0 : M.axis)}
            xAxis={!hasPhase}
          />
          {hasPhase ? (
            <Pane
              {...shared}
              kind="phase"
              title="Phase"
              series={phase!}
              domain={phaseDomain}
              ticks={phaseTicks}
              unit="°"
              references={references?.phase ?? []}
              height={paneHeight + M.axis}
              xAxis
            />
          ) : null}
        </>
      ) : null}
      {cursor != null && w ? (
        <FrequencyReadout title={withHz(frequency[cursor]!)} rows={readout(cursor)} x={cx} width={w} />
      ) : null}
      {hasData ? null : <ChartEmpty />}
    </div>
  );
}
