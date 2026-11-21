'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions -- the chart is a focusable reading region: arrow keys move the readout and it is announced through aria-live. */

import * as React from 'react';
import { scaleLinear, type ScaleLinear } from 'd3-scale';
import {
  CAPTION_CHAR_W,
  axisGutter,
  crisp,
  formatNumber,
  haloText,
  lttb,
  nearestIndex,
  sharedUnit,
  tickFormat,
  toneBg,
  toneFill,
  toneStroke,
  useSyncedCursor,
  useTooltipPlacement,
  useWidth,
  type Tone,
} from './core';

export interface LineSeries {
  id: string;
  label: string;
  values: ArrayLike<number>;
  tone?: Tone;
  /** 2 for the series the story is about, 1.5 for references, 1 for commands and context. */
  width?: 1 | 1.5 | 2;
  unit?: string;
  digits?: number;
  /** Show a dot on this series under the crosshair. */
  dot?: boolean;
}

export interface Threshold {
  value: number;
  label?: string;
  shortLabel?: string;
  /** Shade where this series crosses the threshold. */
  shadeSeries?: string;
  direction?: 'above' | 'below';
  tone?: Tone;
}

export interface Band {
  from: number;
  to: number;
  /** Start the band at this x (e.g. after the step command). */
  fromX?: number;
}

export interface Marker {
  x: number;
  y: number;
  label: string;
  sublabel?: string;
  tone?: Tone;
  /** Put the label under the point when a line passes just above it. */
  placement?: 'above' | 'below';
}

export interface VerticalMarker {
  x: number;
  label: string;
}

export interface ReadoutRow {
  label: string;
  value: string;
  tone?: Tone;
  /** A word that judges the value, such as "over limit": shown after the label and read out with it. */
  status?: string;
}

export interface LineChartProps {
  /** Shared, sorted x values (time, speed). */
  x: ArrayLike<number>;
  series: LineSeries[];
  yDomain: [number, number];
  xDomain?: [number, number];
  yTicks?: number[];
  xTicks?: number[];
  xUnit?: string;
  /** The y-axis unit, written above its ticks. Defaults to the unit the series share; pass '' for none. */
  yUnit?: string;
  height?: number;
  thresholds?: Threshold[];
  bands?: Band[];
  markers?: Marker[];
  verticals?: VerticalMarker[];
  /** Charts with the same id share one crosshair. */
  syncId?: string;
  /** Extra rows for the tooltip at a given sample index (values from other charts, derived quantities). */
  extraReadout?: (index: number) => ReadoutRow[];
  formatX?: (x: number) => string;
  /** One sentence that states the takeaway for screen readers. */
  ariaLabel: string;
  className?: string;
}

const M = { top: 12, right: 14, bottom: 24 };
/** Extra room above the plot for the y-axis unit. */
const UNIT_ROW = 12;

type Scale = ScaleLinear<number, number>;

/** The plot's geometry, shared by every layer. */
interface Frame {
  sx: Scale;
  sy: Scale;
  left: number;
  /** The plot's top edge: below the y-axis unit when there is one. */
  top: number;
  plotW: number;
  plotH: number;
  height: number;
  x0: number;
  x1: number;
}

// Stable empty defaults: a fresh [] each render would defeat the memoized layout below.
const noThresholds: Threshold[] = [];
const noBands: Band[] = [];
const noMarkers: Marker[] = [];
const noVerticals: VerticalMarker[] = [];

/**
 * The last x tick carries the unit, so it is wider. True when it clears the tick before it. Otherwise automatic
 * ticks drop that tick, and ticks the caller chose all stay, with the unit written at the plot's lower right.
 */
function unitFits(ticks: number[], f: Frame, xUnit: string, label: (t: number) => string) {
  if (!xUnit || ticks.length < 2 || !f.plotW) return true;
  const last = ticks[ticks.length - 1]!;
  const lastLabel = `${label(last)} ${xUnit}`;
  const endAnchored = f.left + f.plotW - f.sx(last) < 30;
  const lastLeft = endAnchored
    ? f.sx(last) - lastLabel.length * CAPTION_CHAR_W
    : f.sx(last) - (lastLabel.length * CAPTION_CHAR_W) / 2;
  const prev = ticks[ticks.length - 2]!;
  const prevRight = f.sx(prev) + (label(prev).length * CAPTION_CHAR_W) / 2;
  return prevRight + 8 <= lastLeft;
}

/** Edge ticks hug the plot so their labels stay inside it. */
function tickAnchor(k: number, count: number, px: number, f: Frame) {
  if (k === 0 && px - f.left < 12) return 'start';
  if (k === count - 1 && f.left + f.plotW - px < 30) return 'end';
  return 'middle';
}

/** First index whose x is past `target` (≥ it, or > it when `strict`) in a sorted array; x.length when none. */
function bound(x: ArrayLike<number>, target: number, strict: boolean) {
  let lo = 0;
  let hi = x.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (strict ? x[mid]! <= target : x[mid]! < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** First and last sample index inside [x0, x1], by binary search: a 6M-sample capture costs about 23 reads. */
function visibleRange(x: ArrayLike<number>, x0: number, x1: number): [number, number] {
  return [Math.min(x.length - 1, bound(x, x0, false)), Math.max(0, bound(x, x1, true) - 1)];
}

/**
 * The samples a series draws: LTTB down to about two points per pixel, read in place from the visible range (no
 * copy of a typed array, which cost more than the downsampling itself on a 6M-sample capture).
 */
function downsample(x: ArrayLike<number>, values: ArrayLike<number>, i0: number, i1: number, f: Frame) {
  return lttb(x, values, Math.max(64, Math.round(f.plotW * 2)), i0, i1 + 1);
}

/**
 * A series as an SVG path through its downsampled samples. A non-finite value (NaN for a dropout) lifts the pen,
 * so a gap in the data is a gap in the line, never a straight line across it.
 */
function seriesPath(x: ArrayLike<number>, values: ArrayLike<number>, idx: number[], f: Frame) {
  let d = '';
  let pen = false;
  for (const j of idx) {
    const v = values[j]!;
    if (!Number.isFinite(v)) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${f.sx(x[j]!).toFixed(2)} ${f.sy(v).toFixed(2)}`;
    pen = true;
  }
  return d;
}

/**
 * The area between a threshold and the part of a series beyond it: the failure, visible before any number. It
 * follows the drawn (downsampled) line and starts and ends where that line crosses the threshold, interpolated
 * between samples, so the shading meets the trace exactly instead of stepping at the nearest sample.
 */
function exceedancePath(
  t: Threshold,
  values: ArrayLike<number>,
  x: ArrayLike<number>,
  idx: number[],
  f: Frame,
) {
  const beyond = (v: number) => (t.direction === 'below' ? v < t.value : v > t.value);
  const px = (v: number) => f.sx(v).toFixed(2);
  const base = f.sy(t.value).toFixed(2);
  /** Where the line from sample a to sample b crosses the threshold. */
  const cross = (a: number, b: number) => {
    const va = values[a]!;
    const vb = values[b]!;
    return x[a]! + ((t.value - va) / (vb - va)) * (x[b]! - x[a]!);
  };
  let d = '';
  let open = false;
  let prev = -1;
  for (const i of idx) {
    const v = values[i]!;
    if (!Number.isFinite(v)) {
      if (open) d += `L${px(x[prev]!)} ${base}Z`;
      open = false;
      prev = -1;
      continue;
    }
    if (beyond(v)) {
      if (!open) d += `M${px(prev >= 0 ? cross(prev, i) : x[i]!)} ${base}`;
      open = true;
      d += `L${px(x[i]!)} ${f.sy(v).toFixed(2)}`;
    } else if (open) {
      d += `L${px(cross(prev, i))} ${base}Z`;
      open = false;
    }
    prev = i;
  }
  if (open && prev >= 0) d += `L${px(x[prev]!)} ${base}Z`;
  return d;
}

/** Where a key moves the reading cursor: a value, null to clear, or undefined when the key is not ours. */
function stepCursor(key: string, shift: boolean, cursor: number | null, x0: number, x1: number) {
  const step = ((x1 - x0) / 100) * (shift ? 5 : 1);
  const from = cursor ?? (x0 + x1) / 2;
  let next: number;
  switch (key) {
    case 'ArrowRight':
      next = from + step;
      break;
    case 'ArrowLeft':
      next = from - step;
      break;
    case 'Home':
      next = x0;
      break;
    case 'End':
      next = x1;
      break;
    case 'Escape':
      return null;
    default:
      return undefined;
  }
  return Math.min(x1, Math.max(x0, next));
}

function AxesLayer({
  f,
  yTicks,
  xTicks,
  xUnit,
  yUnit,
}: {
  f: Frame;
  yTicks: number[];
  xTicks: number[];
  xUnit: string;
  yUnit: string;
}) {
  const [y0] = f.sy.domain() as [number, number];
  const fy = tickFormat(yTicks);
  const fx = tickFormat(xTicks);
  const unitOnTick = unitFits(xTicks, f, xUnit, fx);
  return (
    <>
      {yUnit ? (
        <text
          x={f.left - 10}
          y={f.top - UNIT_ROW + 2}
          textAnchor="end"
          className="fill-subtle-foreground text-caption"
        >
          {yUnit}
        </text>
      ) : null}
      {yTicks.map((t) => (
        <g key={t}>
          {t !== y0 ? (
            <line
              x1={f.left}
              x2={f.left + f.plotW}
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
      <line
        x1={f.left}
        x2={f.left + f.plotW}
        y1={crisp(f.sy(y0))}
        y2={crisp(f.sy(y0))}
        className="stroke-chart-axis"
      />
      {xTicks.map((t, k) => (
        <text
          key={t}
          x={f.sx(t)}
          y={f.height - 7}
          textAnchor={tickAnchor(k, xTicks.length, f.sx(t), f)}
          className="fill-subtle-foreground text-caption tabular-nums"
        >
          {k === xTicks.length - 1 && xUnit && unitOnTick ? `${fx(t)} ${xUnit}` : fx(t)}
        </text>
      ))}
      {xUnit && !unitOnTick ? (
        <text
          x={f.left + f.plotW}
          y={f.top + f.plotH - 6}
          textAnchor="end"
          className={`fill-subtle-foreground text-caption ${haloText}`}
        >
          {xUnit}
        </text>
      ) : null}
    </>
  );
}

/**
 * Threshold and vertical-marker labels, drawn after the series: a trace passing through a limit label must never
 * paint over the words a quality engineer reads first.
 */
function ContextLabels({
  f,
  thresholds,
  verticals,
  narrow,
}: {
  f: Frame;
  thresholds: Threshold[];
  verticals: VerticalMarker[];
  narrow: boolean;
}) {
  return (
    <>
      {thresholds.map((t) =>
        t.label ? (
          <text
            key={`${t.value}-${t.label}`}
            x={f.left + f.plotW}
            y={f.sy(t.value) - 6}
            textAnchor="end"
            className={`fill-subtle-foreground text-caption ${haloText}`}
          >
            {narrow ? (t.shortLabel ?? t.label) : t.label}
          </text>
        ) : null,
      )}
      {verticals
        .filter((v) => v.x >= f.x0 && v.x <= f.x1)
        .map((v) => (
          <text
            key={`${v.x}-${v.label}`}
            x={f.sx(v.x) + 6}
            y={f.top + f.plotH - 7}
            className={`fill-subtle-foreground text-caption ${haloText}`}
          >
            {v.label}
          </text>
        ))}
    </>
  );
}

/** Bands, shaded exceedances, threshold lines and vertical markers: the context a reading is judged against. */
function ContextLayer({
  f,
  bands,
  shades,
  thresholds,
  verticals,
}: {
  f: Frame;
  bands: Band[];
  shades: Array<{ key: string; d: string; tone: Tone }>;
  thresholds: Threshold[];
  verticals: VerticalMarker[];
}) {
  return (
    <>
      {bands.map((b) => {
        const from = f.sx(b.fromX ?? f.x0);
        return (
          <rect
            key={`${b.from}-${b.to}-${b.fromX ?? ''}`}
            x={from}
            width={f.left + f.plotW - from}
            y={f.sy(b.to)}
            height={f.sy(b.from) - f.sy(b.to)}
            className="fill-foreground/7 dark:fill-foreground/9"
          />
        );
      })}
      {shades.map((s) => (
        <path key={s.key} d={s.d} className={`${toneFill[s.tone]} opacity-30`} />
      ))}
      {thresholds.map((t) => (
        <g key={`${t.value}-${t.label ?? ''}`}>
          <line
            x1={f.left}
            x2={f.left + f.plotW}
            y1={crisp(f.sy(t.value))}
            y2={crisp(f.sy(t.value))}
            strokeDasharray="3 3"
            className="stroke-subtle-foreground/80"
          />
        </g>
      ))}
      {verticals
        .filter((v) => v.x >= f.x0 && v.x <= f.x1)
        .map((v) => (
          <line
            key={`${v.x}-${v.label}`}
            x1={crisp(f.sx(v.x))}
            x2={crisp(f.sx(v.x))}
            y1={f.top}
            y2={f.top + f.plotH}
            className="stroke-subtle-foreground/60"
          />
        ))}
    </>
  );
}

/** Labeled points: the peak, the extreme, the one value the story is about. */
function MarkerLayer({ f, markers }: { f: Frame; markers: Marker[] }) {
  return (
    <>
      {markers.map((m) => {
        const mx = f.sx(m.x);
        const my = f.sy(m.y);
        const right = mx < f.left + f.plotW - 150;
        return (
          <g key={`${m.x}-${m.y}-${m.label}`}>
            <circle
              cx={mx}
              cy={my}
              r={4.5}
              strokeWidth={2}
              className={`${toneFill[m.tone ?? 'critical']} stroke-card`}
            />
            <text
              x={right ? mx + 10 : mx - 10}
              y={m.placement === 'below' ? my + 17 : my - 7}
              textAnchor={right ? 'start' : 'end'}
              className={`text-label ${haloText}`}
            >
              <tspan className="fill-foreground font-semibold">{m.label}</tspan>
              {m.sublabel ? (
                <tspan dx={6} className="fill-muted-foreground font-normal">
                  {m.sublabel}
                </tspan>
              ) : null}
            </text>
          </g>
        );
      })}
    </>
  );
}

function Crosshair({ f, cx, series, index }: { f: Frame; cx: number; series: LineSeries[]; index: number }) {
  return (
    <g>
      <line
        x1={crisp(cx)}
        x2={crisp(cx)}
        y1={f.top}
        y2={f.top + f.plotH}
        className="stroke-muted-foreground/50"
      />
      {series
        // No dot where a series has no value (a gap): there is nothing to point at.
        .filter((s) => s.dot !== false && (s.width ?? 2) > 1 && Number.isFinite(s.values[index]!))
        .map((s) => (
          <circle
            key={s.id}
            cx={cx}
            cy={f.sy(s.values[index]!)}
            r={4}
            strokeWidth={2}
            className={`${toneFill[s.tone ?? 'primary']} stroke-card`}
          />
        ))}
    </g>
  );
}

function ReadoutTooltip({
  title,
  rows,
  x,
  width,
}: {
  title: string;
  rows: ReadoutRow[];
  x: number;
  width: number;
}) {
  const ref = useTooltipPlacement<HTMLDivElement>(x, width);
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute top-2 z-10 max-w-full min-w-40 rounded-popover border border-border bg-popover/95 px-3 py-2.5 text-label shadow-popover backdrop-blur-material"
    >
      <div className="mb-1.5 font-semibold text-foreground tabular-nums">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[12px_auto_1fr] items-center gap-2 leading-6">
          <span aria-hidden="true" className={`h-0.5 w-3 rounded-full ${toneBg[r.tone ?? 'primary']}`} />
          <span className="text-right font-semibold text-foreground tabular-nums">{r.value}</span>
          <span className="truncate font-normal text-muted-foreground">
            {r.label}
            {r.status ? (
              <span className="ml-1.5 inline-flex items-center gap-1 font-semibold text-destructive-foreground">
                <span aria-hidden="true">▲</span>
                {r.status}
              </span>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}

/** The plot's frame: domains, ticks and scales for the current width. */
function useChartFrame({
  x,
  xDomain,
  yDomain,
  yTicks,
  xTicks,
  xUnit,
  yUnit,
  width,
  height,
}: Pick<LineChartProps, 'x' | 'xDomain' | 'yDomain' | 'yTicks' | 'xTicks'> & {
  xUnit: string;
  yUnit: string;
  width: number | null;
  height: number;
}) {
  const [x0, x1] = xDomain ?? [x[0] ?? 0, x[x.length - 1] ?? 1];
  const [y0, y1] = yDomain;
  const w = width ?? 0;
  const narrow = w > 0 && w < 520;
  const yTickValues =
    yTicks ??
    scaleLinear()
      .domain([y0, y1])
      .ticks(narrow ? 4 : 5);
  const left = axisGutter([...yTickValues.map(tickFormat(yTickValues)), yUnit]);
  const top = M.top + (yUnit ? UNIT_ROW : 0);
  const plotW = Math.max(0, w - left - M.right);
  const plotH = height - top - M.bottom;
  const f = React.useMemo<Frame>(
    () => ({
      sx: scaleLinear()
        .domain([x0, x1])
        .range([left, left + plotW]),
      sy: scaleLinear()
        .domain([y0, y1])
        .range([top + plotH, top]),
      left,
      top,
      plotW,
      plotH,
      height,
      x0,
      x1,
    }),
    [x0, x1, y0, y1, left, top, plotW, plotH, height],
  );
  let xTickValues = xTicks ?? f.sx.ticks(narrow ? 4 : Math.max(4, Math.floor(plotW / 90)));
  // Automatic ticks make room for the unit on the last one; ticks the caller chose all stay.
  if (!xTicks && xTickValues.length >= 3 && !unitFits(xTickValues, f, xUnit, tickFormat(xTickValues)))
    xTickValues = xTickValues.filter((_, k) => k !== xTickValues.length - 2);
  return { f, w, narrow, yTickValues, xTickValues };
}

/**
 * Every series' value at one sample index, formatted for the tooltip and the live region. The series the story is
 * about (the heaviest line) reads first, and a value past a threshold that shades its series says so in words.
 */
function useReadout(
  series: LineSeries[],
  thresholds: Threshold[],
  extraReadout: LineChartProps['extraReadout'],
) {
  return React.useCallback(
    (i: number): ReadoutRow[] => [
      ...[...series]
        .sort((a, b) => (b.width ?? 2) - (a.width ?? 2))
        .map((s) => {
          const v = s.values[i]!;
          const past = thresholds.find(
            (t) =>
              t.shadeSeries === s.id &&
              Number.isFinite(v) &&
              (t.direction === 'below' ? v < t.value : v > t.value),
          );
          return {
            label: s.label,
            // A gap reads as a dash, without a unit.
            value: Number.isFinite(v) ? `${formatNumber(v, s.digits ?? 2)}${s.unit ? ` ${s.unit}` : ''}` : '–',
            tone: s.tone ?? 'primary',
            status: past ? (past.direction === 'below' ? 'under limit' : 'over limit') : undefined,
          };
        }),
      ...(extraReadout?.(i) ?? []),
    ],
    [series, thresholds, extraReadout],
  );
}

/**
 * A line chart for engineering traces. One y-axis, thin lines, recessive grid, color reserved for meaning.
 * Hover or focus it to read every series at one instant; arrow keys step through samples.
 */
export function LineChart({
  x,
  series,
  yDomain,
  xDomain,
  yTicks,
  xTicks,
  xUnit = '',
  yUnit: yUnitProp,
  height = 260,
  thresholds = noThresholds,
  bands = noBands,
  markers = noMarkers,
  verticals = noVerticals,
  syncId,
  extraReadout,
  formatX: formatXProp,
  ariaLabel,
  className,
}: LineChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [cursor, setCursor] = useSyncedCursor(syncId);
  const [owner, setOwner] = React.useState(false);
  const [announce, setAnnounce] = React.useState('');
  const descId = React.useId();
  // A press focuses the chart; the reading should start where the finger or pointer is, not at the midpoint.
  const pressed = React.useRef(false);
  const yUnit = yUnitProp ?? sharedUnit(series);
  // By default a reading of x shows the digits the sample spacing needs: 0 for 1 kHz in ms, 3 for 1 kHz in s.
  const formatX = React.useMemo(() => {
    if (formatXProp) return formatXProp;
    const digits = tickFormat([x.length > 1 ? x[1]! - x[0]! : 0]);
    return (v: number) => `${digits(v)}${xUnit ? ` ${xUnit}` : ''}`;
  }, [formatXProp, x, xUnit]);

  const { f, w, narrow, yTickValues, xTickValues } = useChartFrame({
    x,
    xDomain,
    yDomain,
    yTicks,
    xTicks,
    xUnit,
    yUnit,
    width,
    height,
  });
  const { x0, x1, plotW } = f;
  const [i0, i1] = React.useMemo(() => visibleRange(x, x0, x1), [x, x0, x1]);

  // Downsample each series once; its line and its shaded exceedance both follow the same samples.
  const sampled = React.useMemo(
    () => (plotW ? new Map(series.map((s) => [s.id, downsample(x, s.values, i0, i1, f)])) : null),
    [series, x, i0, i1, f, plotW],
  );
  const paths = React.useMemo(
    () => (sampled ? series.map((s) => ({ s, d: seriesPath(x, s.values, sampled.get(s.id)!, f) })) : []),
    [sampled, series, x, f],
  );
  const shades = React.useMemo(() => {
    if (!sampled) return [];
    return thresholds.flatMap((t) => {
      const s = t.shadeSeries ? series.find((q) => q.id === t.shadeSeries) : undefined;
      return s
        ? [
            {
              key: `${t.value}-${s.id}`,
              d: exceedancePath(t, s.values, x, sampled.get(s.id)!, f),
              tone: t.tone ?? ('critical' as Tone),
            },
          ]
        : [];
    });
  }, [thresholds, series, x, sampled, f]);

  const readout = useReadout(series, thresholds, extraReadout);

  const cursorIndex = cursor == null ? null : nearestIndex(x, cursor);
  const cx = cursorIndex != null ? f.sx(x[cursorIndex]!) : 0;
  const tooltipRows = owner && cursorIndex != null ? readout(cursorIndex) : null;

  const xFromPointer = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect();
    return Math.min(x1, Math.max(x0, f.sx.invert(clientX - rect.left)));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const next = stepCursor(e.key, e.shiftKey, cursor, x0, x1);
    if (next === undefined) return;
    e.preventDefault();
    setOwner(true);
    setCursor(next);
    if (next === null) return;
    const i = nearestIndex(x, next);
    const values = readout(i)
      .map((r) => `${r.label} ${r.value}${r.status ? `, ${r.status}` : ''}`)
      .join(', ');
    setAnnounce(`${formatX(x[i]!)}: ${values}`);
  };

  return (
    <div
      ref={ref}
      data-slot="line-chart"
      role="group"
      aria-label={ariaLabel}
      aria-describedby={descId}
      tabIndex={0}
      className={`relative w-full touch-pan-y rounded-control select-none ${className ?? ''}`}
      style={{ height }}
      onPointerDown={(e) => {
        if (!plotW) return;
        pressed.current = true;
        setOwner(true);
        setCursor(xFromPointer(e.clientX));
      }}
      onPointerMove={(e) => {
        if (!plotW) return;
        setOwner(true);
        setCursor(xFromPointer(e.clientX));
      }}
      onPointerLeave={(e) => {
        // A finger lifts off every time it taps: keep that reading until the next tap or until focus moves on.
        if (e.pointerType === 'touch') return;
        setOwner(false);
        setCursor(null);
      }}
      onFocus={() => {
        setOwner(true);
        if (!pressed.current && cursor == null) setCursor((x0 + x1) / 2);
        pressed.current = false;
      }}
      onBlur={() => {
        setOwner(false);
        setCursor(null);
      }}
      onKeyDown={onKeyDown}
    >
      <span id={descId} className="sr-only">
        Use the left and right arrow keys to read values. Hold Shift for larger steps.
      </span>
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
      {width ? (
        <svg
          width={w}
          height={height}
          viewBox={`0 0 ${w} ${height}`}
          aria-hidden="true"
          className="block overflow-visible"
        >
          <AxesLayer f={f} yTicks={yTickValues} xTicks={xTickValues} xUnit={xUnit} yUnit={yUnit} />
          <ContextLayer f={f} bands={bands} shades={shades} thresholds={thresholds} verticals={verticals} />
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
          <ContextLabels f={f} thresholds={thresholds} verticals={verticals} narrow={narrow} />
          <MarkerLayer f={f} markers={markers} />
          {cursorIndex != null ? <Crosshair f={f} cx={cx} series={series} index={cursorIndex} /> : null}
        </svg>
      ) : null}

      {tooltipRows && cursorIndex != null ? (
        <ReadoutTooltip title={formatX(x[cursorIndex]!)} rows={tooltipRows} x={cx} width={w} />
      ) : null}
    </div>
  );
}

/** Legend row for a chart: a line key per series, text in text colors (never the series color). */
export function ChartLegend({
  items,
  className,
}: {
  items: Array<{ label: string; tone?: Tone; kind?: 'line' | 'thin' | 'band' | 'area' }>;
  className?: string;
}) {
  return (
    <ul
      className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-label font-normal text-muted-foreground ${className ?? ''}`}
    >
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className={
              it.kind === 'band'
                ? 'h-2 w-4 rounded-[calc(var(--radius-item)/2)] bg-foreground/8 ring-1 ring-border'
                : it.kind === 'area'
                  ? `h-2 w-4 rounded-[calc(var(--radius-item)/2)] opacity-40 ${toneBg[it.tone ?? 'critical']}`
                  : `${it.kind === 'thin' ? 'h-px' : 'h-0.5'} w-4 rounded-full ${toneBg[it.tone ?? 'primary']}`
            }
          />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
