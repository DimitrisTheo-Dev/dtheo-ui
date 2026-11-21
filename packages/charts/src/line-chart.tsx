'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions -- the chart is a focusable reading region: arrow keys move the readout and it is announced through aria-live. */

import * as React from 'react';
import { scaleLinear, type ScaleLinear } from 'd3-scale';
import {
  ChartEmpty,
  createLinePath,
  crisp,
  formatNumber,
  hasFinite,
  longestLabel,
  lttb,
  nearestIndex,
  stepIndex,
  toneBg,
  toneFill,
  toneStroke,
  useClipId,
  useSyncedCursor,
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

type Scale = ScaleLinear<number, number>;

/** The plot's geometry, shared by every layer. */
interface Frame {
  sx: Scale;
  sy: Scale;
  left: number;
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

/** Approximate width of a caption digit, for label collision checks without measuring text. */
const CHAR_W = 6.4;
const haloText = '[paint-order:stroke] stroke-card [stroke-width:3px]';

/** The last x tick carries the unit, so it is wider: drop the tick before it when the two labels would touch. */
function thinLastTick(candidates: number[], f: Frame, xUnit: string) {
  const ticks = [...candidates];
  if (ticks.length < 3 || !f.plotW) return ticks;
  const last = ticks[ticks.length - 1]!;
  const lastLabel = xUnit ? `${last} ${xUnit}` : String(last);
  const endAnchored = f.left + f.plotW - f.sx(last) < 30;
  const lastLeft = endAnchored
    ? f.sx(last) - lastLabel.length * CHAR_W
    : f.sx(last) - (lastLabel.length * CHAR_W) / 2;
  const prev = ticks[ticks.length - 2]!;
  const prevRight = f.sx(prev) + (String(prev).length * CHAR_W) / 2;
  if (prevRight + 8 > lastLeft) ticks.splice(ticks.length - 2, 1);
  return ticks;
}

/** Edge ticks hug the plot so their labels stay inside it. */
function tickAnchor(k: number, count: number, px: number, f: Frame) {
  if (k === 0 && px - f.left < 12) return 'start';
  if (k === count - 1 && f.left + f.plotW - px < 30) return 'end';
  return 'middle';
}

/** First and last sample index inside [x0, x1]. */
function visibleRange(x: ArrayLike<number>, x0: number, x1: number): [number, number] {
  let a = 0;
  while (a < x.length - 1 && x[a]! < x0) a++;
  let b = x.length - 1;
  while (b > 0 && x[b]! > x1) b--;
  return [a, b];
}

/**
 * A series as an SVG path, downsampled (LTTB) to about two points per pixel. A non-finite value (NaN for a dropout)
 * lifts the pen, so a gap in the data is a gap in the line, never a straight line across it. Returns the path and the
 * kept sample indices (relative to `i0`), which are the points the keyboard steps through.
 */
function seriesPath(x: ArrayLike<number>, values: ArrayLike<number>, i0: number, i1: number, f: Frame) {
  const xs = Array.from({ length: i1 - i0 + 1 }, (_, k) => x[i0 + k]!);
  const ys = Array.from({ length: i1 - i0 + 1 }, (_, k) => values[i0 + k]!);
  const idx = lttb(xs, ys, Math.max(64, Math.round(f.plotW * 2)));
  const path = createLinePath(2);
  for (const j of idx) {
    const v = ys[j]!;
    if (Number.isFinite(v)) path.to(f.sx(xs[j]!), f.sy(v));
    else path.gap();
  }
  return { d: path.done(), idx };
}

/** Space around the plot that a clipped line keeps, so a 2 px stroke with round caps on the edge is never cut. */
const CLIP_PAD = 2;

/** The area between a threshold and the part of a series beyond it: the failure, visible before any number. */
function exceedancePath(
  t: Threshold,
  values: ArrayLike<number>,
  x: ArrayLike<number>,
  i0: number,
  i1: number,
  f: Frame,
) {
  const beyond = (v: number) => (t.direction === 'below' ? v < t.value : v > t.value);
  const at = (i: number) => f.sx(x[i]!).toFixed(2);
  const base = f.sy(t.value).toFixed(2);
  let d = '';
  let open = false;
  for (let i = i0; i <= i1; i++) {
    const v = values[i]!;
    if (beyond(v)) {
      if (!open) d += `M${at(i)} ${base}`;
      open = true;
      d += `L${at(i)} ${f.sy(v).toFixed(2)}`;
    } else if (open) {
      d += `L${at(i)} ${base}Z`;
      open = false;
    }
  }
  if (open) d += `L${at(i1)} ${base}Z`;
  return d;
}

/** The keys that move the reading cursor. Up and down are left to the page, so it still scrolls. */
const readingKeys = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape']);

function AxesLayer({
  f,
  yTicks,
  xTicks,
  xUnit,
}: {
  f: Frame;
  yTicks: number[];
  xTicks: number[];
  xUnit: string;
}) {
  const [y0] = f.sy.domain() as [number, number];
  return (
    <>
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
            {t}
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
          {k === xTicks.length - 1 && xUnit ? `${t} ${xUnit}` : t}
        </text>
      ))}
    </>
  );
}

/** Bands, shaded exceedances, thresholds and vertical markers: the context a reading is judged against. */
function ContextLayer({
  f,
  bands,
  shades,
  thresholds,
  verticals,
  narrow,
  clip,
}: {
  f: Frame;
  bands: Band[];
  shades: Array<{ key: string; d: string; tone: Tone }>;
  thresholds: Threshold[];
  verticals: VerticalMarker[];
  narrow: boolean;
  clip: string;
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
      <g clipPath={clip}>
        {shades.map((s) => (
          <path key={s.key} d={s.d} className={`${toneFill[s.tone]} opacity-30`} />
        ))}
      </g>
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
          {t.label ? (
            <text
              x={f.left + f.plotW}
              y={f.sy(t.value) - 6}
              textAnchor="end"
              className={`fill-subtle-foreground text-caption ${haloText}`}
            >
              {narrow ? (t.shortLabel ?? t.label) : t.label}
            </text>
          ) : null}
        </g>
      ))}
      {verticals
        .filter((v) => v.x >= f.x0 && v.x <= f.x1)
        .map((v) => (
          <g key={`${v.x}-${v.label}`}>
            <line
              x1={crisp(f.sx(v.x))}
              x2={crisp(f.sx(v.x))}
              y1={M.top}
              y2={M.top + f.plotH}
              className="stroke-subtle-foreground/60"
            />
            <text
              x={f.sx(v.x) + 6}
              y={M.top + f.plotH - 7}
              className={`fill-subtle-foreground text-caption ${haloText}`}
            >
              {v.label}
            </text>
          </g>
        ))}
    </>
  );
}

/** Labelled points: the peak, the extreme, the one value the story is about. */
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
        y1={M.top}
        y2={M.top + f.plotH}
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
  style,
}: {
  title: string;
  rows: ReadoutRow[];
  style: React.CSSProperties;
}) {
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 min-w-44 rounded-popover border border-border bg-popover/95 px-3 py-2.5 text-label shadow-popover backdrop-blur-material"
      style={style}
    >
      <div className="mb-1.5 font-semibold text-foreground tabular-nums">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[12px_auto_1fr] items-center gap-2 leading-6">
          <span aria-hidden="true" className={`h-0.5 w-3 rounded-full ${toneBg[r.tone ?? 'primary']}`} />
          <span className="text-right font-semibold text-foreground tabular-nums">{r.value}</span>
          <span className="truncate font-normal text-muted-foreground">{r.label}</span>
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
  width,
  height,
}: Pick<LineChartProps, 'x' | 'xDomain' | 'yDomain' | 'yTicks' | 'xTicks'> & {
  xUnit: string;
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
  const left = 12 + longestLabel(yTickValues) * 7;
  const plotW = Math.max(0, w - left - M.right);
  const plotH = height - M.top - M.bottom;
  const f = React.useMemo<Frame>(
    () => ({
      sx: scaleLinear()
        .domain([x0, x1])
        .range([left, left + plotW]),
      sy: scaleLinear()
        .domain([y0, y1])
        .range([M.top + plotH, M.top]),
      left,
      plotW,
      plotH,
      height,
      x0,
      x1,
    }),
    [x0, x1, y0, y1, left, plotW, plotH, height],
  );
  const autoTicks = f.sx.ticks(narrow ? 4 : Math.max(4, Math.floor(plotW / 90)));
  const xTickValues = thinLastTick(xTicks ?? autoTicks, f, xUnit);
  return { f, w, narrow, yTickValues, xTickValues };
}

/** Every series' value at one sample index, formatted for the tooltip and the live region. */
function useReadout(series: LineSeries[], extraReadout: LineChartProps['extraReadout']) {
  return React.useCallback(
    (i: number): ReadoutRow[] => [
      ...series.map((s) => {
        const v = s.values[i]!;
        return {
          label: s.label,
          // A gap reads as a dash, without a unit.
          value: Number.isFinite(v) ? `${formatNumber(v, s.digits ?? 2)}${s.unit ? ` ${s.unit}` : ''}` : '–',
          tone: s.tone ?? 'primary',
        };
      }),
      ...(extraReadout?.(i) ?? []),
    ],
    [series, extraReadout],
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
  height = 260,
  thresholds = noThresholds,
  bands = noBands,
  markers = noMarkers,
  verticals = noVerticals,
  syncId,
  extraReadout,
  formatX = (v) => `${formatNumber(v, 0)}${xUnit ? ` ${xUnit}` : ''}`,
  ariaLabel,
  className,
}: LineChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [cursor, setCursor] = useSyncedCursor(syncId);
  const [owner, setOwner] = React.useState(false);
  const [announce, setAnnounce] = React.useState('');
  const descId = React.useId();
  const clipId = useClipId();

  const { f, w, narrow, yTickValues, xTickValues } = useChartFrame({
    x,
    xDomain,
    yDomain,
    yTicks,
    xTicks,
    xUnit,
    width,
    height,
  });
  const { x0, x1, left, plotW } = f;
  const [i0, i1] = React.useMemo(() => visibleRange(x, x0, x1), [x, x0, x1]);

  const hasData = React.useMemo(
    () => i1 >= i0 && series.some((s) => hasFinite(s.values, i0, i1)),
    [series, i0, i1],
  );

  // Every series as a path, and the points the keyboard reads: each sample some series draws a vertex at.
  const { paths, grid, gridX } = React.useMemo(() => {
    if (!plotW) return { paths: [], grid: [], gridX: new Float64Array(0) };
    const kept = new Uint8Array(Math.max(0, i1 - i0 + 1));
    const out = series.map((s) => {
      const { d, idx } = seriesPath(x, s.values, i0, i1, f);
      for (const j of idx) kept[j] = 1;
      return { s, d };
    });
    const points: number[] = [];
    for (let j = 0; j < kept.length; j++) if (kept[j]) points.push(i0 + j);
    return { paths: out, grid: points, gridX: Float64Array.from(points, (i) => x[i]!) };
  }, [series, x, i0, i1, f, plotW]);
  const shades = React.useMemo(() => {
    if (!plotW) return [];
    return thresholds.flatMap((t) => {
      const s = t.shadeSeries ? series.find((q) => q.id === t.shadeSeries) : undefined;
      return s
        ? [
            {
              key: `${t.value}-${s.id}`,
              d: exceedancePath(t, s.values, x, i0, i1, f),
              tone: t.tone ?? ('critical' as Tone),
            },
          ]
        : [];
    });
  }, [thresholds, series, x, i0, i1, f, plotW]);

  const readout = useReadout(series, extraReadout);

  const nearest = cursor == null || !hasData ? -1 : nearestIndex(x, cursor);
  const cursorIndex = nearest < 0 ? null : nearest;
  const cx = cursorIndex != null ? f.sx(x[cursorIndex]!) : 0;
  const tooltipRows = owner && cursorIndex != null ? readout(cursorIndex) : null;

  const xFromPointer = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect();
    return Math.min(x1, Math.max(x0, f.sx.invert(clientX - rect.left)));
  };

  // Arrows step one drawn point (a kept sample after downsampling), Shift steps a tenth of them.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!readingKeys.has(e.key)) return;
    const at = cursor == null || !hasData ? null : nearestIndex(gridX, cursor);
    const next = stepIndex(e.key, e.shiftKey, at === null || at < 0 ? null : at, hasData ? grid.length : 0);
    if (next === undefined) return;
    e.preventDefault();
    setOwner(true);
    if (next === null) {
      setCursor(null);
      return;
    }
    const i = grid[next]!;
    setCursor(x[i]!);
    const values = readout(i)
      .map((r) => `${r.label} ${r.value}`)
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
      onPointerMove={(e) => {
        if (!plotW) return;
        setOwner(true);
        setCursor(xFromPointer(e.clientX));
      }}
      onPointerLeave={() => {
        setOwner(false);
        setCursor(null);
      }}
      onFocus={() => {
        setOwner(true);
        if (cursor == null && hasData) setCursor((x0 + x1) / 2);
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
          <defs>
            <clipPath id={clipId}>
              <rect
                x={left - CLIP_PAD}
                y={M.top - CLIP_PAD}
                width={plotW + 2 * CLIP_PAD}
                height={f.plotH + 2 * CLIP_PAD}
              />
            </clipPath>
          </defs>
          <AxesLayer f={f} yTicks={yTickValues} xTicks={xTickValues} xUnit={xUnit} />
          <ContextLayer
            f={f}
            bands={bands}
            shades={shades}
            thresholds={thresholds}
            verticals={verticals}
            narrow={narrow}
            clip={`url(#${clipId})`}
          />
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
          <MarkerLayer f={f} markers={markers} />
          {cursorIndex != null ? <Crosshair f={f} cx={cx} series={series} index={cursorIndex} /> : null}
        </svg>
      ) : null}

      {tooltipRows && cursorIndex != null ? (
        <ReadoutTooltip
          title={formatX(x[cursorIndex]!)}
          rows={tooltipRows}
          style={cx > left + plotW * 0.62 ? { right: w - cx + 12 } : { left: cx + 12 }}
        />
      ) : null}
      {hasData ? null : <ChartEmpty />}
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
