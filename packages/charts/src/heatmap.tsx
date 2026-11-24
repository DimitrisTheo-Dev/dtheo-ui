'use client';

import * as React from 'react';
import { scaleLinear } from 'd3-scale';
import {
  ChartEmpty,
  crisp,
  formatNumber,
  haloText,
  imageLabel,
  tickFormat,
  tooltipSurface,
  useWidth,
} from './core';

export interface HeatmapProps {
  xValues: number[];
  yValues: number[];
  /** values[row][col], row follows yValues (bottom to top), col follows xValues. NaN leaves a cell empty. */
  values: number[][];
  xLabel: string;
  yLabel: string;
  /** Units for the axes: written in the axis titles and in the hover readout. */
  xUnit?: string;
  yUnit?: string;
  valueLabel: string;
  valueUnit?: string;
  digits?: number;
  /**
   * The value range the color spans. Defaults to the data's range. Values outside it take the end color, and the
   * legend says so ("≤ 86.0 %").
   */
  domain?: [number, number];
  /**
   * Band edges in the value's unit, ascending: [90, 92, 94, 95, 96] for efficiency. Each band gets its own shade,
   * evenly stepped however close its edges are, so values crowded near the top still read apart, as on an
   * iso-efficiency map; the legend shows the bands. Without bands the shade follows the value across `domain`.
   */
  bands?: number[];
  /** An operating point to mark on the map. */
  marker?: { x: number; y: number; label: string };
  /** Axis tick values; any value inside the axis range, such as round numbers between grid points. */
  xTicks?: number[];
  yTicks?: number[];
  height?: number;
  ariaLabel: string;
  className?: string;
}

/**
 * The lowest value's opacity. High enough that the lowest cell still reads as a cell with a value, never as an
 * empty one (an empty cell, NaN, draws nothing).
 */
const FLOOR = 0.15;

const withUnit = (text: string, unit: string) => (unit ? `${text} ${unit}` : text);

/**
 * Where a value sits along a grid, in cells: its index, or between two indices for a value between grid values,
 * extended past either end. Cells are evenly spaced whatever the values, so ticks and the marker use this too.
 */
function gridPosition(grid: number[], v: number) {
  const n = grid.length;
  if (n < 2) return 0;
  const ascending = grid[n - 1]! >= grid[0]!;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (grid[mid]! <= v === ascending) lo = mid;
    else hi = mid;
  }
  const a = grid[lo]!;
  const b = grid[hi]!;
  return b === a ? lo : lo + (v - a) / (b - a);
}

/**
 * A cell's opacity for its value: stepped by band when there are band edges (below the first edge is the floor, at or
 * above the last is full), otherwise linear across [vmin, vmax].
 */
function shadeScale(vmin: number, vmax: number, edges: readonly number[]): (v: number) => number {
  if (edges.length) {
    return (v) => {
      let k = 0;
      while (k < edges.length && v >= edges[k]!) k++;
      return FLOOR + ((1 - FLOOR) * k) / edges.length;
    };
  }
  const t = scaleLinear().domain([vmin, vmax]).range([FLOOR, 1]).clamp(true);
  return (v) => t(v);
}

/** Every cell. Memoized, so hovering one cell redraws the outline, not the whole map. */
const HeatmapCells = React.memo(function HeatmapCells({
  values,
  shade,
  left,
  top,
  plotH,
  cw,
  ch,
  onHover,
}: {
  values: number[][];
  shade: (v: number) => number;
  left: number;
  top: number;
  plotH: number;
  cw: number;
  ch: number;
  onHover: (cell: { r: number; c: number }) => void;
}) {
  return values.map((row, r) =>
    row.map((v, c) =>
      Number.isFinite(v) ? (
        <rect
          key={`${r}-${c}`}
          x={left + c * cw + 0.5}
          y={top + plotH - (r + 1) * ch + 0.5}
          width={Math.max(0, cw - 1)}
          height={Math.max(0, ch - 1)}
          rx={1.5}
          className="fill-chart-1"
          fillOpacity={shade(v)}
          onPointerEnter={() => onHover({ r, c })}
          onPointerDown={() => onHover({ r, c })}
        />
      ) : null,
    ),
  );
});
const title = (label: string, unit: string) => (unit ? `${label} (${unit})` : label);

/** One band in the legend, shaded like its cells. */
function BandSwatch({ opacity }: { opacity: number }) {
  return (
    <svg aria-hidden="true" width="16" height="8" className="shrink-0">
      <rect width="16" height="8" rx="2" className="fill-chart-1" fillOpacity={opacity} />
    </svg>
  );
}

/**
 * A sequential map over two axes, such as motor efficiency over speed and torque. One hue, light to strong,
 * built from the primary series color's opacity, so it stays monotonic in both themes. Hover a cell to read it.
 */
export function Heatmap({
  xValues,
  yValues,
  values,
  xLabel,
  yLabel,
  xUnit = '',
  yUnit = '',
  valueLabel,
  valueUnit = '',
  digits = 1,
  domain,
  bands,
  marker,
  xTicks: xTickValues,
  yTicks: yTickValues,
  height = 300,
  ariaLabel,
  className,
}: HeatmapProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = React.useState<{ r: number; c: number } | null>(null);
  const w = width ?? 0;
  // The value range walks every cell (without spreading them into Math.min/max), so it follows the data, not the
  // pointer.
  const extent = React.useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const row of values)
      for (const v of row) {
        if (!Number.isFinite(v)) continue;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    return lo <= hi ? ([lo, hi] as [number, number]) : undefined;
  }, [values]);
  const hasData = extent !== undefined && xValues.length > 0 && yValues.length > 0;
  const [dataMin, dataMax] = extent ?? [Number.NaN, Number.NaN];
  const [vmin, vmax] = domain ?? [dataMin, dataMax];
  const bandKey = bands?.join(',') ?? '';
  const edges = React.useMemo(
    () =>
      bandKey
        ? bandKey
            .split(',')
            .map(Number)
            .filter(Number.isFinite)
            .sort((a, b) => a - b)
        : [],
    [bandKey],
  );
  const shade = React.useMemo(() => shadeScale(vmin, vmax, edges), [vmin, vmax, edges]);
  // Band edges read like axis ticks: every edge exactly, with one digit count (90, 92, 94.25 → 90.00, 92.00, 94.25).
  const edgeLabel = React.useMemo(() => tickFormat(edges), [edges]);
  const left = 44;
  const right = 12;
  const top = 8;
  const bottom = 40;
  const plotW = Math.max(0, w - left - right);
  const plotH = height - top - bottom;
  const cw = xValues.length ? plotW / xValues.length : 0;
  const ch = yValues.length ? plotH / yValues.length : 0;
  const [x0, x1] = [xValues[0] ?? 0, xValues.at(-1) ?? 0];
  const [y0, y1] = [yValues[0] ?? 0, yValues.at(-1) ?? 0];
  // Thin ticks evenly to what fits (about one label per 64px); never force the last one in, which spaces them unevenly.
  const maxXTicks = Math.max(2, Math.floor(plotW / 64));
  const xTickBase = (xTickValues ?? xValues.filter((_, i) => i % Math.ceil(xValues.length / 6) === 0)).filter(
    (v) => v >= Math.min(x0, x1) && v <= Math.max(x0, x1),
  );
  const xTicks = xTickBase.filter(
    (_, i, a) => a.length <= maxXTicks || i % Math.ceil(a.length / maxXTicks) === 0,
  );
  const yTicks = (yTickValues ?? yValues.filter((_, i) => i % Math.ceil(yValues.length / 5) === 0)).filter(
    (v) => v >= Math.min(y0, y1) && v <= Math.max(y0, y1),
  );
  const fx = tickFormat(xTicks);
  const fy = tickFormat(yTicks);
  const readX = tickFormat(xValues);
  const readY = tickFormat(yValues);
  // Cell centers sit at the grid values, so a tick between grid values falls between their cells, on the same index
  // basis as the cells even when the grid is not evenly spaced.
  const sx = (v: number) => left + (gridPosition(xValues, v) + 0.5) * cw;
  const sy = (v: number) => top + plotH - (gridPosition(yValues, v) + 0.5) * ch;
  const hv = hover ? values[hover.r]?.[hover.c] : undefined;

  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      <div
        ref={ref}
        role="img"
        aria-label={imageLabel(ariaLabel, !hasData)}
        className="relative w-full"
        style={{ height }}
      >
        {w ? (
          <svg
            width={w}
            height={height}
            aria-hidden="true"
            className="block overflow-visible"
            onPointerLeave={(e) => {
              if (e.pointerType !== 'touch') setHover(null);
            }}
          >
            {hasData ? (
              <HeatmapCells
                values={values}
                shade={shade}
                left={left}
                top={top}
                plotH={plotH}
                cw={cw}
                ch={ch}
                onHover={setHover}
              />
            ) : null}
            {hover ? (
              <rect
                x={left + hover.c * cw}
                y={top + plotH - (hover.r + 1) * ch}
                width={cw}
                height={ch}
                rx={2}
                fill="none"
                strokeWidth={1.5}
                className="pointer-events-none stroke-foreground"
              />
            ) : null}
            {xTicks.map((v) => (
              <text
                key={v}
                x={sx(v)}
                y={top + plotH + 16}
                textAnchor="middle"
                className="fill-subtle-foreground text-caption tabular-nums"
              >
                {fx(v)}
              </text>
            ))}
            {yTicks.map((v) => (
              <text
                key={v}
                x={left - 8}
                y={sy(v) + 3.5}
                textAnchor="end"
                className="fill-subtle-foreground text-caption tabular-nums"
              >
                {fy(v)}
              </text>
            ))}
            <text
              x={left + plotW / 2}
              y={height - 4}
              textAnchor="middle"
              className="fill-muted-foreground text-caption"
            >
              {title(xLabel, xUnit)}
            </text>
            <text
              x={12}
              y={top + plotH / 2}
              textAnchor="middle"
              transform={`rotate(-90 12 ${top + plotH / 2})`}
              className="fill-muted-foreground text-caption"
            >
              {title(yLabel, yUnit)}
            </text>
            {marker && hasData ? (
              <g className="pointer-events-none">
                <circle
                  cx={sx(marker.x)}
                  cy={sy(marker.y)}
                  r={5}
                  strokeWidth={2}
                  className="fill-foreground stroke-card"
                />
                <text
                  x={sx(marker.x) + 9}
                  y={sy(marker.y) + 4}
                  className={`fill-foreground text-label font-semibold ${haloText}`}
                >
                  {marker.label}
                </text>
              </g>
            ) : null}
            <line
              x1={left}
              x2={left + plotW}
              y1={crisp(top + plotH)}
              y2={crisp(top + plotH)}
              className="stroke-chart-axis"
            />
          </svg>
        ) : null}
        {hasData ? null : <ChartEmpty />}
        {hover && hv !== undefined && Number.isFinite(hv) ? (
          <div className={`${tooltipSurface} top-1 right-1 px-2.5 py-1.5 whitespace-nowrap`}>
            <span className="font-semibold tabular-nums">
              {withUnit(formatNumber(hv, digits), valueUnit)}
            </span>{' '}
            <span className="text-muted-foreground tabular-nums">
              at {withUnit(readX(xValues[hover.c]!), xUnit)}, {withUnit(readY(yValues[hover.r]!), yUnit)}
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-11 text-caption whitespace-nowrap text-subtle-foreground">
        <span>{valueLabel}</span>
        {edges.length ? (
          // A swatch per band with the edges between them: ▮ 90 ▮ 92 ▮ 94 … the way the cells are shaded.
          <span className={`flex items-center gap-1.5 tabular-nums ${hasData ? '' : 'invisible'}`}>
            {edges.map((e, k) => (
              <React.Fragment key={e}>
                <BandSwatch opacity={shade(k ? edges[k - 1]! : e - 1)} />
                <span>{edgeLabel(e)}</span>
              </React.Fragment>
            ))}
            <BandSwatch opacity={1} />
            {valueUnit ? <span>{valueUnit}</span> : null}
          </span>
        ) : (
          <span className={`flex items-center gap-3 ${hasData || domain ? '' : 'invisible'}`}>
            <span className="tabular-nums">
              {dataMin < vmin ? '≤ ' : ''}
              {formatNumber(vmin, digits)}
            </span>
            <span
              aria-hidden="true"
              className="h-2 w-32 rounded-full bg-[linear-gradient(to_right,color-mix(in_oklch,var(--chart-1)_15%,transparent),var(--chart-1))]"
            />
            <span className="tabular-nums">
              {dataMax > vmax ? '≥ ' : ''}
              {withUnit(formatNumber(vmax, digits), valueUnit)}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
