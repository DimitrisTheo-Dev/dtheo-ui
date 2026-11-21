'use client';

import * as React from 'react';
import { scaleLinear } from 'd3-scale';
import {
  ChartEmpty,
  axisGutter,
  createColorReader,
  crisp,
  fitCanvas,
  formatNumber,
  haloText,
  observeTheme,
  sharedUnit,
  tickFormat,
  toneBg,
  toneVar,
  useInView,
  useWidth,
  type Tone,
} from './core';
import { createStream, type Stream } from './stream';

// ---------- The chart ----------

export interface StreamSeries {
  /** The channel name in the stream. */
  channel: string;
  label: string;
  tone?: Tone;
  width?: 1 | 1.5 | 2;
  unit?: string;
  digits?: number;
}

export interface StreamLimit {
  value: number;
  label?: string;
  /** The part of this channel's trace past the limit is drawn in the critical color. */
  channel?: string;
  direction?: 'above' | 'below';
}

export interface StreamChartProps {
  stream: Stream;
  series: StreamSeries[];
  yDomain: [number, number];
  yTicks?: number[];
  /** The y-axis unit, written above its ticks. Defaults to the unit the series share; pass '' for none. */
  yUnit?: string;
  /**
   * How much history is on screen, in milliseconds. The stream's capacity must hold at least rate × window
   * samples (20,000 by default: 10 s at 2 kHz), or the oldest part of the window is empty.
   */
  window?: number;
  limits?: StreamLimit[];
  /**
   * Freeze the view at the moment it pauses; samples keep buffering and the chart catches up on resume. The frozen
   * view survives theme changes, resizes and scrolling out of view and back.
   */
  paused?: boolean;
  height?: number;
  /** What the chart shows, for screen readers. Limit crossings are announced separately. */
  ariaLabel: string;
  className?: string;
}

const M = { top: 10, right: 14, bottom: 22 };
/** Extra room above the plot for the y-axis unit. */
const UNIT_ROW = 12;
const noLimits: StreamLimit[] = [];

interface Latest {
  values: number[];
  /** Past a limit, and which way: 'above' over an upper limit, 'below' under a lower one. */
  past: Array<'above' | 'below' | null>;
  /** True when the window drew no finite sample at all. */
  empty: boolean;
}

const isOver = (l: StreamLimit, v: number) =>
  (l.direction ?? 'above') === 'above' ? v > l.value : v < l.value;

/** A copy of everything the stream holds, so a paused chart keeps the view it paused on while new samples arrive. */
function snapshot(stream: Stream): Stream {
  const copy = createStream(stream.channels, Math.max(1, stream.size));
  const row: number[] = Array.from({ length: stream.channels.length }, () => Number.NaN);
  for (let i = 0; i < stream.size; i++) {
    for (let c = 0; c < row.length; c++) row[c] = stream.value(c, i);
    copy.push(stream.time(i), row);
  }
  return copy;
}

/**
 * Draws one series as a canvas path. When there are more samples than pixels, each pixel column keeps its first,
 * lowest, highest and last sample (M4 aggregation), so spikes survive at any rate. A non-finite sample (NaN for a
 * dropout) lifts the pen: the trace breaks there instead of drawing a straight line across the gap.
 */
function seriesPath(
  stream: Stream,
  channel: number,
  i0: number,
  tEnd: number,
  span: number,
  left: number,
  plotW: number,
  sy: (v: number) => number,
) {
  const path = new Path2D();
  let drawn = 0;
  const n = stream.size - i0;
  const px = (t: number) => left + plotW * (1 - (tEnd - t) / span);
  let pen = false;
  const to = (x: number, y: number) => {
    if (pen) path.lineTo(x, y);
    else path.moveTo(x, y);
    pen = true;
    drawn++;
  };
  if (n <= plotW * 1.5) {
    for (let i = i0; i < stream.size; i++) {
      const v = stream.value(channel, i);
      if (Number.isFinite(v)) to(px(stream.time(i)), sy(v));
      else pen = false;
    }
    return { path, drawn };
  }
  let col = -1;
  let filled = false;
  let first = 0;
  let last = 0;
  let lo = 0;
  let hi = 0;
  const flush = () => {
    if (!filled) return;
    const x = left + col + 0.5;
    to(x, sy(first));
    path.lineTo(x, sy(lo));
    path.lineTo(x, sy(hi));
    path.lineTo(x, sy(last));
    filled = false;
  };
  for (let i = i0; i < stream.size; i++) {
    const c = Math.floor(px(stream.time(i)) - left);
    const v = stream.value(channel, i);
    if (c !== col) {
      flush();
      col = c;
    }
    if (!Number.isFinite(v)) {
      // Draw what the column had before the gap, then lift the pen.
      flush();
      pen = false;
    } else if (!filled) {
      first = lo = hi = last = v;
      filled = true;
    } else {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
      last = v;
    }
  }
  flush();
  return { path, drawn };
}

interface DrawProps {
  series: StreamSeries[];
  limits: StreamLimit[];
  span: number;
  sy: (v: number) => number;
  left: number;
  top: number;
  plotW: number;
  plotH: number;
}

const warned = new Set<string>();

/** Each series' channel index in the stream, or -1 for a name the stream doesn't have (warned once, then skipped). */
function channelIndices(stream: Stream, series: StreamSeries[]) {
  return series.map((s) => {
    const c = stream.channels.indexOf(s.channel);
    if (c < 0 && !warned.has(s.channel)) {
      warned.add(s.channel);
      console.warn(`StreamChart: no channel "${s.channel}" in the stream (${stream.channels.join(', ')}).`);
    }
    return c;
  });
}

/**
 * The draw loop, outside React: one canvas draw per animation frame when the stream has new samples, a readout
 * eight times a second, and a theme observer. Returns a cleanup function.
 */
function startDrawing({
  canvas,
  host,
  stream,
  width,
  height,
  live,
  read,
  onReadout,
  onAnnounce,
}: {
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  stream: Stream;
  width: number;
  height: number;
  live: boolean;
  read: () => DrawProps;
  onReadout: (latest: Latest) => void;
  onAnnounce: (text: string) => void;
}) {
  const colors = createColorReader(host);
  const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let raf = 0;
  let drawnVersion = -1;
  let lastDraw = 0;
  let lastReadout = 0;
  let lastAnnounce = -Infinity;
  let wasOver: boolean[] = [];

  const draw = (now: number) => {
    const p = read();
    const ctx = fitCanvas(canvas, width, height);
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (!stream.size) {
      onReadout({ values: p.series.map(() => Number.NaN), past: p.series.map(() => null), empty: true });
      return;
    }
    let drawn = 0;
    const channels = channelIndices(stream, p.series);
    const tEnd = stream.time(stream.size - 1);
    const i0 = Math.max(0, stream.indexAt(tEnd - p.span) - 1);
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.left, p.top - 2, p.plotW, p.plotH + 4);
    ctx.clip();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const [k, s] of p.series.entries()) {
      const c = channels[k]!;
      if (c < 0) continue;
      const trace = seriesPath(stream, c, i0, tEnd, p.span, p.left, p.plotW, p.sy);
      const path = trace.path;
      drawn += trace.drawn;
      ctx.lineWidth = s.width ?? 2;
      ctx.strokeStyle = colors.get(toneVar[s.tone ?? 'primary']);
      ctx.stroke(path);
      for (const l of p.limits) {
        if (l.channel !== s.channel) continue;
        const y = p.sy(l.value);
        ctx.save();
        ctx.beginPath();
        if ((l.direction ?? 'above') === 'above') ctx.rect(p.left, 0, p.plotW, y);
        else ctx.rect(p.left, y, p.plotW, height - y);
        ctx.clip();
        ctx.strokeStyle = colors.get(toneVar.critical);
        ctx.stroke(path);
        ctx.restore();
      }
    }
    ctx.restore();

    // The readout above the plot updates eight times a second: fast enough to feel live, slow enough to read.
    if (now - lastReadout > 125) {
      lastReadout = now;
      const last = stream.size - 1;
      // A series whose channel the stream does not have reads as missing, like a dropout.
      const values = channels.map((c) => (c < 0 ? Number.NaN : stream.value(c, last)));
      const past = p.series.map((s, k) => {
        const hit = p.limits.find((l) => l.channel === s.channel && isOver(l, values[k]!));
        return hit ? (hit.direction ?? 'above') : null;
      });
      onReadout({ values, past, empty: drawn === 0 });
      const crossed = past.findIndex((o, k) => o !== null && !wasOver[k]);
      // At most one announcement every ten seconds: a live feed must not talk over everything else.
      if (crossed >= 0 && now - lastAnnounce > 10_000) {
        lastAnnounce = now;
        const s = p.series[crossed]!;
        const side = past[crossed] === 'below' ? 'below' : 'over';
        onAnnounce(
          `${s.label} is ${side} its limit: ${formatNumber(values[crossed]!, s.digits ?? 1)}${s.unit ? ` ${s.unit}` : ''}.`,
        );
      }
      wasOver = past.map((o) => o !== null);
    }
  };

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    if (reduce && now - lastDraw < 250) return;
    // Nothing new, nothing to draw: a theme change redraws through the observer below.
    if (stream.version === drawnVersion) return;
    drawnVersion = stream.version;
    lastDraw = now;
    draw(now);
  };

  const redraw = () => {
    colors.refresh();
    draw(performance.now());
  };
  const stopObserving = observeTheme(host, redraw);
  if (!live) {
    draw(performance.now());
    return stopObserving;
  }
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    stopObserving();
  };
}

/**
 * A live time series for telemetry: the newest sample at the right edge, a fixed window of history, limits drawn
 * as dashed lines and anything past a limit drawn in the critical color. Renders on a canvas, stops drawing when
 * off screen, and steps instead of gliding when reduced motion is on.
 */
export function StreamChart({
  stream,
  series,
  yDomain,
  yTicks,
  yUnit: yUnitProp,
  window: span = 10_000,
  limits = noLimits,
  paused = false,
  height = 220,
  ariaLabel,
  className,
}: StreamChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const inView = useInView(ref);
  const [latest, setLatest] = React.useState<Latest | null>(null);
  const [announce, setAnnounce] = React.useState('');
  const descId = React.useId();

  const w = width ?? 0;
  const yUnit = yUnitProp ?? sharedUnit(series);
  const ticks = yTicks ?? scaleLinear().domain(yDomain).ticks(4);
  const fy = tickFormat(ticks);
  const left = axisGutter([...ticks.map(fy), yUnit]);
  const top = M.top + (yUnit ? UNIT_ROW : 0);
  const plotW = Math.max(0, w - left - M.right);
  const plotH = height - top - M.bottom;
  const sy = React.useMemo(
    () =>
      scaleLinear()
        .domain(yDomain)
        .range([top + plotH, top]),
    [yDomain, top, plotH],
  );
  // Each reading keeps the width of the widest value it can show, so the row never rewraps as digits change.
  const valueChars = series.map((s) =>
    Math.max(...yDomain.map((v) => formatNumber(v, s.digits ?? 1).length), formatNumber(0, s.digits ?? 1).length),
  );
  const seconds = span / 1000;
  const xTicks = React.useMemo(() => {
    const step = seconds <= 5 ? 1 : seconds <= 20 ? 2 : seconds <= 60 ? 10 : 30;
    return Array.from({ length: Math.floor(seconds / step) + 1 }, (_, k) => k * step);
  }, [seconds]);

  // The draw loop lives in an effect and reads props through a ref, so a new prop never restarts it.
  const props = React.useRef({ series, limits, span, sy, left, top, plotW, plotH });
  React.useLayoutEffect(() => {
    props.current = { series, limits, span, sy, left, top, plotW, plotH };
  });

  // While paused, the chart draws from a copy taken the moment it paused, so redraws (a theme change, a resize,
  // scrolling back into view) keep that view instead of jumping to samples that arrived since.
  const frozen = React.useRef<{ source: Stream; copy: Stream } | null>(null);

  React.useEffect(() => {
    if (!paused) frozen.current = null;
    else if (frozen.current?.source !== stream) frozen.current = { source: stream, copy: snapshot(stream) };
    const canvas = canvasRef.current;
    const host = ref.current;
    if (!canvas || !host || !w) return;
    return startDrawing({
      canvas,
      host,
      stream: frozen.current?.copy ?? stream,
      width: w,
      height,
      live: !paused && inView,
      read: () => props.current,
      onReadout: setLatest,
      onAnnounce: setAnnounce,
    });
  }, [stream, w, height, paused, inView, ref, props]);

  return (
    <div
      ref={ref}
      data-slot="stream-chart"
      role="group"
      aria-label={ariaLabel}
      aria-describedby={descId}
      className={`relative w-full ${className ?? ''}`}
    >
      <span id={descId} className="sr-only">
        A live chart. The latest values are listed above it; crossing a limit is announced.
      </span>
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
      <div className="flex items-baseline gap-3 pb-2">
        <dl className="flex flex-1 flex-wrap items-baseline gap-x-5 gap-y-1 text-label">
          {series.map((s, k) => {
            const v = latest?.values[k];
            const past = latest?.past[k] ?? null;
            const over = past !== null;
            const own = limits.filter((l) => l.channel === s.channel);
            // The word the hidden placeholder keeps room for: the one this series' limits can show.
            const word =
              past === 'below' || (!over && own.length > 0 && own.every((l) => l.direction === 'below'))
                ? 'below limit'
                : 'over limit';
            return (
              <div key={s.channel} className="flex items-baseline gap-2 whitespace-nowrap">
                <dt className="inline-flex items-center gap-1.5 font-normal text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className={`h-0.5 w-3 rounded-full ${toneBg[s.tone ?? 'primary']}`}
                  />
                  {s.label}
                </dt>
                <dd
                  className={`font-semibold tabular-nums ${over ? 'text-destructive-foreground' : 'text-foreground'}`}
                >
                  <span className="inline-block text-right" style={{ minWidth: `${valueChars[k]}ch` }}>
                    {v === undefined || !Number.isFinite(v) ? '–' : formatNumber(v, s.digits ?? 1)}
                  </span>
                  {s.unit ? <span className="font-normal text-muted-foreground"> {s.unit}</span> : null}
                  {/* Space for the warning is kept while it is hidden, so the row never jumps when it appears. */}
                  {own.length ? (
                    <span className={`ml-1.5 font-semibold ${over ? '' : 'invisible'}`}>{word}</span>
                  ) : null}
                </dd>
              </div>
            );
          })}
        </dl>
        {paused ? <span className="text-caption text-muted-foreground">Paused</span> : null}
      </div>
      <div className="relative" style={{ height }}>
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 size-full" />
        {w ? (
          <svg
            width={w}
            height={height}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-visible"
          >
            {yUnit ? (
              <text
                x={left - 10}
                y={top - UNIT_ROW + 2}
                textAnchor="end"
                className="fill-subtle-foreground text-caption"
              >
                {yUnit}
              </text>
            ) : null}
            {ticks.map((t) =>
              t === yDomain[0] ? null : (
                <line
                  key={`g${t}`}
                  x1={left}
                  x2={left + plotW}
                  y1={crisp(sy(t))}
                  y2={crisp(sy(t))}
                  className="stroke-chart-grid"
                />
              ),
            )}
            {/* The baseline is drawn whether or not a tick sits on it. */}
            <line
              x1={left}
              x2={left + plotW}
              y1={crisp(sy(yDomain[0]))}
              y2={crisp(sy(yDomain[0]))}
              className="stroke-chart-axis"
            />
            {ticks.map((t) => (
              <text
                key={t}
                x={left - 10}
                y={sy(t) + 3.5}
                textAnchor="end"
                className="fill-subtle-foreground text-caption tabular-nums"
              >
                {fy(t)}
              </text>
            ))}
            {xTicks.map((s) => {
              const x = left + plotW * (1 - s / seconds);
              return (
                <text
                  key={s}
                  x={x}
                  y={height - 6}
                  textAnchor={s === 0 ? 'end' : s === xTicks.at(-1) ? 'start' : 'middle'}
                  className="fill-subtle-foreground text-caption tabular-nums"
                >
                  {s === 0 ? 'now' : `−${s} s`}
                </text>
              );
            })}
            {limits.map((l) => (
              <g key={`${l.value}-${l.channel ?? ''}`}>
                <line
                  x1={left}
                  x2={left + plotW}
                  y1={crisp(sy(l.value))}
                  y2={crisp(sy(l.value))}
                  strokeDasharray="3 3"
                  className="stroke-subtle-foreground/80"
                />
                {l.label ? (
                  <text
                    x={left + 4}
                    y={sy(l.value) - 5}
                    className={`fill-subtle-foreground text-caption ${haloText}`}
                  >
                    {l.label}
                  </text>
                ) : null}
              </g>
            ))}
          </svg>
        ) : null}
        {latest?.empty ? <ChartEmpty /> : null}
      </div>
    </div>
  );
}
