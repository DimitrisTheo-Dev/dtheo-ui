'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions -- the chart is a focusable reading region: arrow keys move between points and the point is announced through aria-live. */

import * as React from 'react';
import { scaleLinear } from 'd3-scale';
import {
  axisGutter,
  createColorReader,
  crisp,
  fitCanvas,
  formatNumber,
  haloText,
  observeTheme,
  stepIndex,
  toneBg,
  tickFormat,
  toneVar,
  useTooltipPlacement,
  useWidth,
  type Tone,
} from './core';

export interface ScatterGroup {
  id: string;
  label: string;
  tone?: Tone;
}

export interface ScatterPoint {
  x: number;
  y: number;
  /** Which group the point belongs to; colors and the legend follow the group. */
  group?: string;
  /** Shown in the readout, e.g. a run id. */
  label?: string;
}

export interface ScatterLimit {
  axis: 'x' | 'y';
  value: number;
  label?: string;
  /** The side that is out of spec gets a faint critical wash. */
  direction?: 'above' | 'below';
}

export interface ScatterChartProps {
  points: ScatterPoint[];
  groups?: ScatterGroup[];
  xDomain: [number, number];
  yDomain: [number, number];
  xTicks?: number[];
  yTicks?: number[];
  xLabel: string;
  yLabel: string;
  xUnit?: string;
  yUnit?: string;
  xDigits?: number;
  yDigits?: number;
  limits?: ScatterLimit[];
  /** Call out one point by its label, such as the run under review. */
  highlight?: string;
  /** Draw a least-squares line and its r². */
  fit?: boolean;
  height?: number;
  ariaLabel: string;
  className?: string;
}

const M = { top: 12, right: 16, bottom: 40 };
const defaultGroups: ScatterGroup[] = [{ id: 'all', label: 'Points', tone: 'primary' }];
const noLimits: ScatterLimit[] = [];

type Scale = (v: number) => number;

const groupOf = (p: ScatterPoint, groups: ScatterGroup[]) => p.group ?? groups[0]!.id;

/** Least squares: y = a + b·x, and how much of y it explains. */
function linearFit(points: ScatterPoint[]) {
  const n = points.length;
  if (n < 3) return null;
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  const mx = sx / n;
  const my = sy / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    sxy += (p.x - mx) * (p.y - my);
    syy += (p.y - my) ** 2;
  }
  if (!sxx || !syy) return null;
  const b = sxy / sxx;
  return { a: my - b * mx, b, r2: (sxy * sxy) / (sxx * syy) };
}

/** The point nearest the pointer, within 18 px, or -1. */
function nearestPoint(points: ScatterPoint[], sx: Scale, sy: Scale, mx: number, my: number) {
  let best = -1;
  let bestD = 18 * 18;
  for (let i = 0; i < points.length; i++) {
    const dx = sx(points[i]!.x) - mx;
    const dy = sy(points[i]!.y) - my;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Draws every point on the canvas in its group's token color, and again whenever the theme changes. */
function useScatterCanvas({
  canvasRef,
  hostRef,
  points,
  groups,
  sx,
  sy,
  width,
  height,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  hostRef: React.RefObject<HTMLDivElement | null>;
  points: ScatterPoint[];
  groups: ScatterGroup[];
  sx: Scale;
  sy: Scale;
  width: number;
  height: number;
}) {
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host || !width) return;
    const draw = () => {
      const ctx = fitCanvas(canvas, width, height);
      if (!ctx) return;
      const colors = createColorReader(host);
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;
      ctx.strokeStyle = colors.get('--card');
      // Draw the first group last, so the group that matters (listed first) sits on top.
      for (const g of groups.toReversed()) {
        ctx.fillStyle = colors.get(toneVar[g.tone ?? 'primary']);
        for (const p of points) {
          if (groupOf(p, groups) !== g.id) continue;
          ctx.beginPath();
          ctx.arc(sx(p.x), sy(p.y), 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    };
    draw();
    return observeTheme(host, draw);
  }, [canvasRef, hostRef, points, groups, sx, sy, width, height]);
}

interface Geometry {
  sx: Scale;
  sy: Scale;
  left: number;
  plotW: number;
  plotB: number;
  width: number;
  height: number;
}

function LimitWash({ l, g }: { l: ScatterLimit; g: Geometry }) {
  const isX = l.axis === 'x';
  const v = isX ? g.sx(l.value) : g.sy(l.value);
  const above = (l.direction ?? 'above') === 'above';
  const right = g.left + g.plotW;
  const rect = isX
    ? { x: above ? v : g.left, y: M.top, width: above ? right - v : v - g.left, height: g.plotB - M.top }
    : { x: g.left, y: above ? M.top : v, width: g.plotW, height: above ? v - M.top : g.plotB - v };
  return <rect {...rect} className="fill-destructive-foreground/5" />;
}

function LimitLine({ l, g }: { l: ScatterLimit; g: Geometry }) {
  const isX = l.axis === 'x';
  const v = crisp(isX ? g.sx(l.value) : g.sy(l.value));
  return (
    <g>
      <line
        x1={isX ? v : g.left}
        x2={isX ? v : g.left + g.plotW}
        y1={isX ? M.top : v}
        y2={isX ? g.plotB : v}
        strokeDasharray="3 3"
        className="stroke-subtle-foreground/80"
      />
      {l.label ? (
        <text
          x={isX ? v + 4 : g.left + 4}
          y={isX ? M.top + 10 : v - 5}
          className={`fill-subtle-foreground text-caption ${haloText}`}
        >
          {l.label}
        </text>
      ) : null}
    </g>
  );
}

/** Everything vector: the out-of-spec wash, grid, ticks, axis titles, limits, the fit and the called-out point. */
function ScatterOverlay({
  g,
  xTicks,
  yTicks,
  xTitle,
  yTitle,
  limits,
  fit,
  xDomain,
  called,
  active,
}: {
  g: Geometry;
  xTicks: number[];
  yTicks: number[];
  xTitle: string;
  yTitle: string;
  limits: ScatterLimit[];
  fit: ReturnType<typeof linearFit>;
  xDomain: [number, number];
  called?: { point: ScatterPoint; label: string };
  active?: ScatterPoint;
}) {
  const right = g.left + g.plotW;
  return (
    <svg
      width={g.width}
      height={g.height}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-visible"
    >
      {limits.map((l) => (
        <LimitWash key={`w${l.axis}${l.value}`} l={l} g={g} />
      ))}
      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line
            x1={g.left}
            x2={right}
            y1={crisp(g.sy(t))}
            y2={crisp(g.sy(t))}
            className="stroke-chart-grid"
          />
          <text
            x={g.left - 10}
            y={g.sy(t) + 3.5}
            textAnchor="end"
            className="fill-subtle-foreground text-caption tabular-nums"
          >
            {tickFormat(yTicks)(t)}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text
          key={`x${t}`}
          x={g.sx(t)}
          y={g.plotB + 16}
          textAnchor="middle"
          className="fill-subtle-foreground text-caption tabular-nums"
        >
          {tickFormat(xTicks)(t)}
        </text>
      ))}
      <line x1={g.left} x2={right} y1={crisp(g.plotB)} y2={crisp(g.plotB)} className="stroke-chart-axis" />
      <text
        x={g.left + g.plotW / 2}
        y={g.height - 4}
        textAnchor="middle"
        className="fill-muted-foreground text-caption"
      >
        {xTitle}
      </text>
      <text
        transform={`translate(12 ${(M.top + g.plotB) / 2}) rotate(-90)`}
        textAnchor="middle"
        className="fill-muted-foreground text-caption"
      >
        {yTitle}
      </text>
      {limits.map((l) => (
        <LimitLine key={`l${l.axis}${l.value}`} l={l} g={g} />
      ))}
      {fit ? (
        <g>
          <line
            x1={g.sx(xDomain[0])}
            x2={g.sx(xDomain[1])}
            y1={g.sy(fit.a + fit.b * xDomain[0])}
            y2={g.sy(fit.a + fit.b * xDomain[1])}
            strokeWidth={1.5}
            strokeDasharray="6 4"
            className="stroke-foreground/60"
          />
          <text
            x={right - 4}
            y={M.top + 10}
            textAnchor="end"
            className={`fill-muted-foreground text-caption tabular-nums ${haloText}`}
          >
            Fit r² {formatNumber(fit.r2, 2)}
          </text>
        </g>
      ) : null}
      {called ? (
        <g>
          <circle
            cx={g.sx(called.point.x)}
            cy={g.sy(called.point.y)}
            r={7}
            fill="none"
            strokeWidth={2}
            className="stroke-foreground"
          />
          <text
            x={g.sx(called.point.x) - 11}
            y={g.sy(called.point.y) + 4}
            textAnchor="end"
            className={`fill-foreground text-caption font-semibold ${haloText}`}
          >
            {called.label}
          </text>
        </g>
      ) : null}
      {active ? (
        <circle
          cx={g.sx(active.x)}
          cy={g.sy(active.y)}
          r={6}
          fill="none"
          strokeWidth={2}
          className="stroke-muted-foreground"
        />
      ) : null}
    </svg>
  );
}

function ScatterLegend({ groups, points }: { groups: ScatterGroup[]; points: ScatterPoint[] }) {
  const counts = new Map<string, number>();
  for (const p of points) counts.set(groupOf(p, groups), (counts.get(groupOf(p, groups)) ?? 0) + 1);
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 pb-2 text-label font-normal text-muted-foreground">
      {groups.map((g) => (
        <li key={g.id} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={`size-2 rounded-full ${toneBg[g.tone ?? 'primary']}`} />
          {g.label}
          <span className="text-subtle-foreground tabular-nums">{counts.get(g.id) ?? 0}</span>
        </li>
      ))}
    </ul>
  );
}

function ScatterTooltip({
  point,
  group,
  g,
  rows,
}: {
  point: ScatterPoint;
  group?: ScatterGroup;
  g: Geometry;
  rows: Array<[string, string]>;
}) {
  const ref = useTooltipPlacement<HTMLDivElement>(g.sx(point.x), g.width);
  return (
    <div
      ref={ref}
      data-slot="scatter-tooltip"
      className="pointer-events-none absolute z-10 max-w-full min-w-36 rounded-popover border border-border bg-popover/95 px-3 py-2 text-label shadow-popover backdrop-blur-material"
      style={{ top: Math.max(0, g.sy(point.y) - 70) }}
    >
      {point.label ? <div className="mb-1 font-semibold text-foreground">{point.label}</div> : null}
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 leading-5">
          <span className="font-normal text-muted-foreground">{k}</span>
          <span className="font-semibold text-foreground tabular-nums">{v}</span>
        </div>
      ))}
      {group ? (
        <div className="mt-1 flex items-center gap-1.5 font-normal text-muted-foreground">
          <span aria-hidden="true" className={`size-2 rounded-full ${toneBg[group.tone ?? 'primary']}`} />
          {group.label}
        </div>
      ) : null}
    </div>
  );
}

const withUnit = (v: number, digits: number, unit: string) =>
  `${formatNumber(v, digits)}${unit ? ` ${unit}` : ''}`;

/**
 * A scatter for relationships between two measurements, such as gain against overshoot across hundreds of runs.
 * Points are drawn on a canvas so thousands stay fast; limits, the fit and the highlighted point are vector.
 */
export function ScatterChart({
  points,
  groups = defaultGroups,
  xDomain,
  yDomain,
  xTicks,
  yTicks,
  xLabel,
  yLabel,
  xUnit = '',
  yUnit = '',
  xDigits = 2,
  yDigits = 1,
  limits = noLimits,
  highlight,
  fit = false,
  height = 280,
  ariaLabel,
  className,
}: ScatterChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  // The scales are relative to the plot box, which sits below the legend, so the pointer is measured from it.
  const plotRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState<number | null>(null);
  const [announce, setAnnounce] = React.useState('');
  const descId = React.useId();
  const w = width ?? 0;

  const yt = yTicks ?? scaleLinear().domain(yDomain).ticks(5);
  const left = axisGutter(yt.map(tickFormat(yt)), 28);
  const plotW = Math.max(0, w - left - M.right);
  const plotB = height - M.bottom;
  const sx = React.useMemo(
    () =>
      scaleLinear()
        .domain(xDomain)
        .range([left, left + plotW]),
    [xDomain, left, plotW],
  );
  const sy = React.useMemo(() => scaleLinear().domain(yDomain).range([plotB, M.top]), [yDomain, plotB]);
  const g: Geometry = { sx, sy, left, plotW, plotB, width: w, height };

  // Points in x order, so the arrow keys walk across the chart.
  const order = React.useMemo(
    () => points.map((_, i) => i).sort((a, b) => points[a]!.x - points[b]!.x),
    [points],
  );
  const line = React.useMemo(() => (fit ? linearFit(points) : null), [fit, points]);
  useScatterCanvas({ canvasRef, hostRef: ref, points, groups, sx, sy, width: w, height });

  const rowsFor = (p: ScatterPoint): Array<[string, string]> => [
    [xLabel, withUnit(p.x, xDigits, xUnit)],
    [yLabel, withUnit(p.y, yDigits, yUnit)],
  ];
  const groupFor = (p: ScatterPoint) =>
    groups.length > 1 ? groups.find((q) => q.id === groupOf(p, groups)) : undefined;

  const onKeyDown = (e: React.KeyboardEvent) => {
    const next = stepIndex(e.key, e.shiftKey, active == null ? null : order.indexOf(active), order.length);
    if (next === undefined) return;
    e.preventDefault();
    const i = next === null ? null : order[next]!;
    setActive(i);
    if (i == null) return;
    const p = points[i]!;
    const parts = [...rowsFor(p).map(([k, v]) => `${k} ${v}`), groupFor(p)?.label].filter(Boolean);
    setAnnounce(`${p.label ? `${p.label}: ` : ''}${parts.join(', ')}`);
  };

  const hi = highlight ? points.find((p) => p.label === highlight) : undefined;
  const ap = active != null ? points[active] : undefined;

  return (
    <div
      ref={ref}
      data-slot="scatter-chart"
      role="group"
      aria-label={ariaLabel}
      aria-describedby={descId}
      tabIndex={0}
      className={`relative w-full touch-pan-y rounded-control select-none ${className ?? ''}`}
      onPointerDown={(e) => {
        const rect = plotRef.current?.getBoundingClientRect();
        if (!rect) return;
        const i = nearestPoint(points, sx, sy, e.clientX - rect.left, e.clientY - rect.top);
        setActive(i < 0 ? null : i);
      }}
      onPointerMove={(e) => {
        const rect = plotRef.current?.getBoundingClientRect();
        if (!rect) return;
        const i = nearestPoint(points, sx, sy, e.clientX - rect.left, e.clientY - rect.top);
        setActive(i < 0 ? null : i);
      }}
      onPointerLeave={(e) => {
        // A tap ends with the finger leaving: keep its point until the next tap or until focus moves on.
        if (e.pointerType !== 'touch') setActive(null);
      }}
      onBlur={() => setActive(null)}
      onKeyDown={onKeyDown}
    >
      <span id={descId} className="sr-only">
        Use the arrow keys to move between points from left to right. Hold Shift for larger steps.
      </span>
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
      {groups.length > 1 ? <ScatterLegend groups={groups} points={points} /> : null}
      <div ref={plotRef} className="relative" style={{ height }}>
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 size-full" />
        {w ? (
          <ScatterOverlay
            g={g}
            xTicks={xTicks ?? sx.ticks(Math.max(3, Math.floor(plotW / 80)))}
            yTicks={yt}
            xTitle={`${xLabel}${xUnit ? ` (${xUnit})` : ''}`}
            yTitle={`${yLabel}${yUnit ? ` (${yUnit})` : ''}`}
            limits={limits}
            fit={line}
            xDomain={xDomain}
            called={hi && highlight ? { point: hi, label: highlight } : undefined}
            active={ap}
          />
        ) : null}
        {ap ? <ScatterTooltip point={ap} group={groupFor(ap)} g={g} rows={rowsFor(ap)} /> : null}
      </div>
    </div>
  );
}
