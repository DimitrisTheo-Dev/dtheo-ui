'use client';

import * as React from 'react';
import { scaleLinear } from 'd3-scale';
import {
  createColorReader,
  crisp,
  fitCanvas,
  formatNumber,
  observeTheme,
  toneBg,
  toneVar,
  useInView,
  useWidth,
  type Tone,
} from './core';
import type { Stream } from './stream';

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
  /** How much history is on screen, in milliseconds. */
  window?: number;
  limits?: StreamLimit[];
  /** Freeze the view; samples keep buffering and the chart catches up on resume. */
  paused?: boolean;
  height?: number;
  /** What the chart shows, for screen readers. Limit crossings are announced separately. */
  ariaLabel: string;
  className?: string;
}

const M = { top: 10, right: 14, bottom: 22 };
const noLimits: StreamLimit[] = [];

interface Latest {
  values: number[];
  over: boolean[];
}

const isOver = (l: StreamLimit, v: number) =>
  (l.direction ?? 'above') === 'above' ? v > l.value : v < l.value;

/**
 * Draws one series as a canvas path. When there are more samples than pixels, each pixel column keeps its first,
 * lowest, highest and last sample (M4 aggregation), so spikes survive at any rate.
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
  const n = stream.size - i0;
  const px = (t: number) => left + plotW * (1 - (tEnd - t) / span);
  if (n <= plotW * 1.5) {
    for (let i = i0; i < stream.size; i++) {
      const x = px(stream.time(i));
      const y = sy(stream.value(channel, i));
      if (i === i0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    return path;
  }
  let col = -1;
  let first = 0;
  let last = 0;
  let lo = 0;
  let hi = 0;
  let started = false;
  const flush = () => {
    if (col < 0) return;
    const x = left + col + 0.5;
    if (!started) {
      path.moveTo(x, sy(first));
      started = true;
    } else path.lineTo(x, sy(first));
    path.lineTo(x, sy(lo));
    path.lineTo(x, sy(hi));
    path.lineTo(x, sy(last));
  };
  for (let i = i0; i < stream.size; i++) {
    const c = Math.floor(px(stream.time(i)) - left);
    const v = stream.value(channel, i);
    if (c !== col) {
      flush();
      col = c;
      first = lo = hi = last = v;
    } else {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
      last = v;
    }
  }
  flush();
  return path;
}

interface DrawProps {
  series: StreamSeries[];
  limits: StreamLimit[];
  span: number;
  sy: (v: number) => number;
  left: number;
  plotW: number;
  plotH: number;
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
  let frame = 0;
  let drawnVersion = -1;
  let lastDraw = 0;
  let lastReadout = 0;
  let lastAnnounce = -Infinity;
  let wasOver: boolean[] = [];

  const draw = (now: number) => {
    const p = read();
    const ctx = fitCanvas(canvas, width, height);
    if (!ctx) return;
    if (frame++ % 30 === 0) colors.refresh();
    ctx.clearRect(0, 0, width, height);
    if (!stream.size) return;
    const tEnd = stream.time(stream.size - 1);
    const i0 = Math.max(0, stream.indexAt(tEnd - p.span) - 1);
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.left, M.top - 2, p.plotW, p.plotH + 4);
    ctx.clip();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const s of p.series) {
      const c = stream.channels.indexOf(s.channel);
      if (c < 0) continue;
      const path = seriesPath(stream, c, i0, tEnd, p.span, p.left, p.plotW, p.sy);
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
      const values = p.series.map((s) => stream.value(stream.channels.indexOf(s.channel), last));
      const over = p.series.map((s, k) =>
        p.limits.some((l) => l.channel === s.channel && isOver(l, values[k]!)),
      );
      onReadout({ values, over });
      const crossed = over.findIndex((o, k) => o && !wasOver[k]);
      // At most one announcement every ten seconds: a live feed must not talk over everything else.
      if (crossed >= 0 && now - lastAnnounce > 10_000) {
        lastAnnounce = now;
        const s = p.series[crossed]!;
        onAnnounce(
          `${s.label} is over its limit: ${formatNumber(values[crossed]!, s.digits ?? 1)}${s.unit ? ` ${s.unit}` : ''}.`,
        );
      }
      wasOver = over;
    }
  };

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    if (reduce && now - lastDraw < 250) return;
    if (stream.version === drawnVersion && frame % 30 !== 0) return;
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
  const ticks = yTicks ?? scaleLinear().domain(yDomain).ticks(4);
  const left = 12 + Math.max(...ticks.map((t) => String(t).length)) * 7;
  const plotW = Math.max(0, w - left - M.right);
  const plotH = height - M.top - M.bottom;
  const sy = React.useMemo(
    () =>
      scaleLinear()
        .domain(yDomain)
        .range([M.top + plotH, M.top]),
    [yDomain, plotH],
  );
  const seconds = span / 1000;
  const xTicks = React.useMemo(() => {
    const step = seconds <= 5 ? 1 : seconds <= 20 ? 2 : seconds <= 60 ? 10 : 30;
    return Array.from({ length: Math.floor(seconds / step) + 1 }, (_, k) => k * step);
  }, [seconds]);

  // The draw loop lives in an effect and reads props through a ref, so a new prop never restarts it.
  const props = React.useRef({ series, limits, span, sy, left, plotW, plotH });
  React.useLayoutEffect(() => {
    props.current = { series, limits, span, sy, left, plotW, plotH };
  });

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const host = ref.current;
    if (!canvas || !host || !w) return;
    return startDrawing({
      canvas,
      host,
      stream,
      width: w,
      height,
      live: !paused && inView,
      read: () => props.current,
      onReadout: setLatest,
      onAnnounce: setAnnounce,
    });
  }, [stream, w, height, paused, inView, ref]);

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
            const over = latest?.over[k] ?? false;
            return (
              <div key={s.channel} className="flex items-baseline gap-2">
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
                  {v === undefined || Number.isNaN(v) ? '–' : formatNumber(v, s.digits ?? 1)}
                  {s.unit ? <span className="font-normal text-muted-foreground"> {s.unit}</span> : null}
                  {over ? <span className="ml-1.5 font-semibold">over limit</span> : null}
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
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={left}
                  x2={left + plotW}
                  y1={crisp(sy(t))}
                  y2={crisp(sy(t))}
                  className={t === yDomain[0] ? 'stroke-chart-axis' : 'stroke-chart-grid'}
                />
                <text
                  x={left - 10}
                  y={sy(t) + 3.5}
                  textAnchor="end"
                  className="fill-subtle-foreground text-caption tabular-nums"
                >
                  {t}
                </text>
              </g>
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
                    className="fill-subtle-foreground text-caption [paint-order:stroke] stroke-card [stroke-width:3px]"
                  >
                    {l.label}
                  </text>
                ) : null}
              </g>
            ))}
          </svg>
        ) : null}
      </div>
    </div>
  );
}
