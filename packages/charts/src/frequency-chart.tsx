'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions -- the chart is a focusable reading region: arrow keys move the readout and it is announced through aria-live. */

import * as React from 'react';
import { scaleLinear, scaleLog, type ScaleLinear, type ScaleLogarithmic } from 'd3-scale';
import {
  CAPTION_CHAR_W,
  axisGutter,
  crisp,
  formatNumber,
  haloText,
  nearestIndex,
  stepIndex,
  toneBg,
  toneFill,
  toneStroke,
  tickFormat,
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
  /** Frequencies in Hz, ascending and above zero. Plotted on a log axis. */
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

/** 1, 10, 100, 1k, 10k: decades are labeled, the steps between them are faint grid lines. */
const formatHz = (f: number) =>
  f >= 1000 ? `${formatNumber(f / 1000, f % 1000 ? 1 : 0)}k` : formatNumber(f, f < 10 && f % 1 ? 1 : 0);

/** A frequency with its unit, in kHz from 1,000 Hz: "7.4 Hz", "182 Hz", "1 kHz", never "1k Hz". */
const withHz = (f: number) =>
  f >= 1000 ? `${formatNumber(f / 1000, f % 1000 ? 1 : 0)} kHz` : `${formatNumber(f, f < 10 && f % 1 ? 1 : 0)} Hz`;

function logGrid(min: number, max: number) {
  const decades: number[] = [];
  const minors: number[] = [];
  for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) {
    const d = 10 ** e;
    if (d >= min && d <= max) decades.push(d);
    for (let k = 2; k < 10; k++) if (d * k >= min && d * k <= max) minors.push(d * k);
  }
  return { decades, minors };
}

function linePath(freq: ArrayLike<number>, values: ArrayLike<number>, sx: XScale, sy: YScale) {
  let d = '';
  let pen = false;
  for (let i = 0; i < freq.length; i++) {
    const v = values[i]!;
    if (!Number.isFinite(v)) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${sx(freq[i]!).toFixed(1)} ${sy(v).toFixed(1)}`;
    pen = true;
  }
  return d;
}

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
  const sy = scaleLinear().domain(domain).range([plotBottom, M.top]);
  const yTicks = ticks ?? sy.ticks(4);
  const fy = tickFormat(yTicks);
  const [f0, f1] = sx.domain() as [number, number];
  const { decades, minors } = logGrid(f0, f1);
  const right = width - M.right;
  return (
    <svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
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
      {markers.map((m) => (
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
      {series.map((s) => (
        <path
          key={s.id}
          d={linePath(freq, s.values, sx, sy)}
          fill="none"
          strokeWidth={s.width ?? 2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className={toneStroke[s.tone ?? 'primary']}
        />
      ))}
      {spans
        .filter((sp) => sp.pane === kind)
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
        ? peaks.map((p) => (
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
        ? decades.map((f, k) => (
            <text
              key={f}
              x={sx(f)}
              y={plotBottom + 16}
              textAnchor={k === decades.length - 1 && right - sx(f) < 30 ? 'end' : 'middle'}
              className="fill-subtle-foreground text-caption tabular-nums"
            >
              {k === decades.length - 1 ? withHz(f) : formatHz(f)}
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
  const f0 = frequency[0] ?? 1;
  const f1 = frequency[frequency.length - 1] ?? 10;
  const sx = React.useMemo(
    () =>
      scaleLog()
        .domain([f0, f1])
        .range([left, Math.max(left, w - M.right)]),
    [f0, f1, left, w],
  );
  const hasPhase = Boolean(phase?.length);
  const total = paneHeight + (hasPhase ? paneHeight : 0) + M.axis;

  const readout = (i: number) => readoutRows(i, magnitude, phase, magnitudeUnit);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const next = stepIndex(e.key, e.shiftKey, cursor, frequency.length);
    if (next === undefined) return;
    e.preventDefault();
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
      onPointerDown={(e) => {
        if (!w) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setCursor(nearestIndex(frequency, sx.invert(Math.min(w - M.right, Math.max(left, e.clientX - rect.left)))));
      }}
      onPointerMove={(e) => {
        if (!w) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const f = sx.invert(Math.min(w - M.right, Math.max(left, e.clientX - rect.left)));
        setCursor(nearestIndex(frequency, f));
      }}
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
    </div>
  );
}
