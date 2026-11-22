import * as React from 'react';

/** Series and mark colors map to design tokens, so charts follow the theme and preset automatically. */
export type Tone =
  | 'primary'
  | 'muted'
  | 'faint'
  | 'chart-2'
  | 'chart-3'
  | 'chart-4'
  | 'chart-5'
  | 'success'
  | 'warning'
  | 'critical';

export const toneStroke: Record<Tone, string> = {
  primary: 'stroke-chart-1',
  muted: 'stroke-chart-muted',
  faint: 'stroke-subtle-foreground',
  'chart-2': 'stroke-chart-2',
  'chart-3': 'stroke-chart-3',
  'chart-4': 'stroke-chart-4',
  'chart-5': 'stroke-chart-5',
  success: 'stroke-success',
  warning: 'stroke-warning',
  critical: 'stroke-destructive-foreground',
};

export const toneFill: Record<Tone, string> = {
  primary: 'fill-chart-1',
  muted: 'fill-chart-muted',
  faint: 'fill-subtle-foreground',
  'chart-2': 'fill-chart-2',
  'chart-3': 'fill-chart-3',
  'chart-4': 'fill-chart-4',
  'chart-5': 'fill-chart-5',
  success: 'fill-success',
  warning: 'fill-warning',
  critical: 'fill-destructive-foreground',
};

export const toneBg: Record<Tone, string> = {
  primary: 'bg-chart-1',
  muted: 'bg-chart-muted',
  faint: 'bg-subtle-foreground',
  'chart-2': 'bg-chart-2',
  'chart-3': 'bg-chart-3',
  'chart-4': 'bg-chart-4',
  'chart-5': 'bg-chart-5',
  success: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-destructive-foreground',
};

/** Measure an element's content width; null until the first measurement so SSR renders a stable box. */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number | null] {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState<number | null>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry?.contentRect.width ?? 0);
      setWidth((prev) => (prev === w ? prev : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Snap a coordinate to the pixel grid so 1px lines stay crisp. */
export const crisp = (v: number) => Math.round(v) + 0.5;

/** The surface every chart tooltip sits on: a translucent popover over the plot that never takes the pointer. */
export const tooltipSurface =
  'pointer-events-none absolute z-10 max-w-full rounded-popover border border-border bg-popover/95 text-label shadow-popover backdrop-blur-material';

/** A label over data: a card-colored stroke painted under the glyphs keeps it readable where a trace passes. */
export const haloText = '[paint-order:stroke] stroke-card [stroke-width:3px]';

/**
 * The advance of one caption character (11 px; tabular digits measure about 6.8 px), rounded up so gutters and
 * label-collision checks err toward room. Charts use it instead of measuring text, which SSR cannot do.
 */
export const CAPTION_CHAR_W = 7;

/** Digits that write `value` exactly, up to `max`: 0 for 4000, 1 for 0.5, 2 for 0.25. */
function exactDigits(value: number, max: number) {
  for (let d = 0; d < max; d++) {
    const scaled = Math.abs(value) * 10 ** d;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-6 * Math.max(1, scaled)) return d;
  }
  return max;
}

/** The smallest gap between neighboring ticks; for a single value, the value itself (a sample period). */
function tickStep(ticks: readonly number[]) {
  let step = Infinity;
  for (let i = 1; i < ticks.length; i++) {
    const d = Math.abs(ticks[i]! - ticks[i - 1]!);
    if (d > 0 && d < step) step = d;
  }
  return Number.isFinite(step) ? step : Math.abs(ticks.find((t) => t !== 0) ?? 1);
}

/**
 * Tick labels through the same formatter as every readout: thousands separators, a true minus sign, and one digit
 * count for the whole axis, so the axis reads "−2" where the tooltip reads "−2.00", never "-2", and 0.5, 1.0, 1.5
 * line up. The count is the most any tick needs to be written exactly (up to four for everyday axes, more when the
 * spacing is finer), and never fewer than the spacing needs, so neighbors never read alike: ticks 5 µs apart read
 * 0.000005, and ticks 0.00001 apart near 12 read 12.00001, 12.00002.
 */
export function tickFormat(ticks: readonly number[]) {
  const step = tickStep(ticks);
  const spacing = Math.ceil(-Math.log10(step) - 1e-9);
  const max = Math.min(15, Math.max(4, spacing + 1));
  const exact = ticks.reduce((d, t) => Math.max(d, exactDigits(t, max)), 0);
  const digits = Math.min(15, Math.max(exact, spacing, 0));
  return (t: number) => formatNumber(t, digits);
}

/** The `axisGutter` pad when a rotated y-axis title sits left of the ticks (drawn at x = 12). */
export const TITLED_AXIS_PAD = 28;

/** Left gutter for a y-axis: room for the widest tick label plus `pad`. */
export function axisGutter(labels: readonly string[], pad = 12) {
  return pad + labels.reduce((w, l) => Math.max(w, l.length), 1) * CAPTION_CHAR_W;
}

/** The unit every series with a unit shares, for the axis; none when they disagree. */
export function sharedUnit(series: ReadonlyArray<{ unit?: string }>) {
  const units = new Set(series.flatMap((s) => (s.unit ? [s.unit] : [])));
  return units.size === 1 ? [...units][0]! : '';
}

/**
 * Places a chart tooltip beside the cursor: right of it while it fits, left of it when it would cross the chart's
 * right edge, and clamped inside the chart when neither side has room, as in a phone-width card. It reads the
 * tooltip's real width after layout, so long rows never run off the card. Attach the returned ref to the tooltip
 * and leave `left` and `right` out of its style.
 */
export function useTooltipPlacement<T extends HTMLElement>(x: number | null, width: number, gap = 12) {
  const ref = React.useRef<T>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || x == null) return;
    const tw = el.offsetWidth;
    let left = x + gap;
    if (left + tw > width) left = x - gap - tw;
    if (left < 0) left = Math.max(0, Math.min(width - tw, x - tw / 2));
    el.style.left = `${Math.round(left)}px`;
  });
  return ref;
}

// ---------- Process capability ----------

/** Cpk at or above 1.33 is the usual bar for a capable process: four standard deviations to the nearer limit. */
export const CAPABLE = 1.33;

/** What a Cpk says about a process: capable from 1.33 (CAPABLE), marginal from 1, not capable below. */
export function capabilityLevel(cpk: number): 'capable' | 'marginal' | 'not capable' {
  return cpk >= CAPABLE ? 'capable' : cpk >= 1 ? 'marginal' : 'not capable';
}

export interface Capability {
  n: number;
  mean: number;
  /** Short-term σ from the average moving range of consecutive values: MR̄ / 1.128 (d₂ for ranges of two). */
  sigmaWithin: number;
  /** The overall sample standard deviation. */
  sigmaOverall: number;
  /** Capability, from σ within: what the process holds run to run. Undefined without a limit. */
  cpk?: number;
  /** Performance, from σ overall: what it delivered, drift between runs included. Undefined without a limit. */
  ppk?: number;
}

/** d₂ for subgroups of two, which turns an average moving range into a standard deviation. */
const D2_MOVING_RANGE = 1.128;

/** The pooled σ of consecutive subgroups of `k` values, √(Σ(nᵢ−1)sᵢ² / Σ(nᵢ−1)); a group of fewer than two is skipped. */
function pooledSigma(values: ArrayLike<number>, k: number) {
  let ss = 0;
  let df = 0;
  for (let start = 0; start < values.length; start += k) {
    const group: number[] = [];
    for (let i = start; i < Math.min(values.length, start + k); i++)
      if (Number.isFinite(values[i]!)) group.push(values[i]!);
    if (group.length < 2) continue;
    const m = group.reduce((a, b) => a + b, 0) / group.length;
    for (const v of group) ss += (v - m) ** 2;
    df += group.length - 1;
  }
  return df ? Math.sqrt(ss / df) : 0;
}

/**
 * Cpk and Ppk against specification limits. They differ only in σ: Cpk takes the short-term σ within the process,
 * Ppk the overall σ, so when the process drifts between runs Ppk falls below Cpk. For individual readings σ within
 * is the average moving range of consecutive values over d₂ (MR̄ / 1.128), so `values` must be in run order. With
 * `subgroupSize` above 1, consecutive groups of that many values are rational subgroups and σ within is their pooled
 * standard deviation (without the c₄ unbiasing constant). Non-finite values are skipped.
 */
export function capability(
  values: ArrayLike<number>,
  lower?: number,
  upper?: number,
  subgroupSize?: number,
): Capability {
  const v = Array.from(values).filter((x) => Number.isFinite(x));
  const n = v.length;
  const mean = n ? v.reduce((a, b) => a + b, 0) / n : Number.NaN;
  let squares = 0;
  let ranges = 0;
  for (let i = 0; i < n; i++) {
    squares += (v[i]! - mean) ** 2;
    if (i) ranges += Math.abs(v[i]! - v[i - 1]!);
  }
  const k = Math.floor(subgroupSize ?? 1);
  const sigmaOverall = n > 1 ? Math.sqrt(squares / (n - 1)) : 0;
  const sigmaWithin = k > 1 ? pooledSigma(values, k) : n > 1 ? ranges / (n - 1) / D2_MOVING_RANGE : 0;
  const index = (sigma: number) =>
    !sigma || (lower === undefined && upper === undefined)
      ? undefined
      : Math.min(
          upper === undefined ? Infinity : (upper - mean) / (3 * sigma),
          lower === undefined ? Infinity : (mean - lower) / (3 * sigma),
        );
  return { n, mean, sigmaWithin, sigmaOverall, cpk: index(sigmaWithin), ppk: index(sigmaOverall) };
}

/**
 * Largest-Triangle-Three-Buckets downsampling. Keeps the visual shape of a dense trace (peaks included)
 * with roughly `threshold` points, so a 100k-sample capture renders as fast as a 1k one.
 *
 * A non-finite y (NaN for a dropout) is a gap: each stretch between gaps is downsampled on its own share of the
 * points, and the first index of every gap is kept, so a line drawn from the result lifts the pen there. A stretch
 * keeps at least its two ends and its most prominent sample, so a capture riddled with dropouts can come back with
 * more than `threshold` points: every gap stays visible, which matters more here than the point budget.
 *
 * `from` and `to` pick the samples [from, to) to downsample, so a zoomed view reads the visible part of a typed
 * array in place instead of copying it; the returned indices point into the full arrays.
 */
export function lttb(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  threshold: number,
  from = 0,
  to = xs.length,
): number[] {
  const n = to - from;
  if (threshold >= n || threshold < 3) return Array.from({ length: Math.max(0, n) }, (_, i) => from + i);
  let finite = 0;
  for (let i = from; i < to; i++) if (Number.isFinite(ys[i]!)) finite++;
  if (finite === n) return lttbRun(xs, ys, from, to, threshold);
  const out: number[] = [];
  for (let i = from; i < to;) {
    if (!Number.isFinite(ys[i]!)) {
      out.push(i);
      while (i < to && !Number.isFinite(ys[i]!)) i++;
      continue;
    }
    let end = i;
    while (end < to && Number.isFinite(ys[end]!)) end++;
    const share = Math.max(3, Math.round((threshold * (end - i)) / finite));
    for (const k of lttbRun(xs, ys, i, end, share)) out.push(k);
    i = end;
  }
  return out;
}

/** LTTB over the samples in [from, to), all finite. */
function lttbRun(xs: ArrayLike<number>, ys: ArrayLike<number>, from: number, to: number, threshold: number) {
  const n = to - from;
  if (threshold >= n) return Array.from({ length: n }, (_, i) => from + i);
  const out: number[] = [from];
  const every = (n - 2) / (threshold - 2);
  let a = from;
  for (let i = 0; i < threshold - 2; i++) {
    const start = from + Math.floor((i + 1) * every) + 1;
    const end = from + Math.min(Math.floor((i + 2) * every) + 1, n);
    let avgX = 0;
    let avgY = 0;
    for (let j = start; j < end; j++) {
      avgX += xs[j]!;
      avgY += ys[j]!;
    }
    const len = Math.max(1, end - start);
    avgX /= len;
    avgY /= len;
    const rStart = from + Math.floor(i * every) + 1;
    const rEnd = from + Math.floor((i + 1) * every) + 1;
    let maxArea = -1;
    let next = rStart;
    for (let j = rStart; j < rEnd; j++) {
      const area = Math.abs((xs[a]! - avgX) * (ys[j]! - ys[a]!) - (xs[a]! - xs[j]!) * (avgY - ys[a]!));
      if (area > maxArea) {
        maxArea = area;
        next = j;
      }
    }
    out.push(next);
    a = next;
  }
  out.push(to - 1);
  return out;
}

/** Index of the sample nearest to `x` in a sorted array, or -1 when the array is empty. */
export function nearestIndex(xs: ArrayLike<number>, x: number): number {
  if (!xs.length) return -1;
  let lo = 0;
  let hi = xs.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid]! < x) lo = mid;
    else hi = mid;
  }
  return Math.abs(xs[lo]! - x) <= Math.abs(xs[hi]! - x) ? lo : hi;
}

// ---------- Synced crosshair ----------
type Listener = () => void;
const cursors = new Map<string, number | null>();
const listeners = new Map<string, Set<Listener>>();

function emit(group: string) {
  listeners.get(group)?.forEach((l) => l());
}

/**
 * Charts with the same `syncId` share one crosshair: hover torque and the current chart below
 * shows the same instant. Without an id the cursor is local.
 */
export function useSyncedCursor(syncId?: string): [number | null, (x: number | null) => void] {
  const local = React.useState<number | null>(null);
  const subscribe = React.useCallback(
    (l: Listener) => {
      if (!syncId) return () => {};
      const set = listeners.get(syncId) ?? new Set();
      set.add(l);
      listeners.set(syncId, set);
      return () => set.delete(l);
    },
    [syncId],
  );
  const shared = React.useSyncExternalStore(
    subscribe,
    () => (syncId ? (cursors.get(syncId) ?? null) : null),
    () => null,
  );
  const setShared = React.useCallback(
    (x: number | null) => {
      if (!syncId) return;
      cursors.set(syncId, x);
      emit(syncId);
    },
    [syncId],
  );
  return syncId ? [shared, setShared] : local;
}

const numberFormats = new Map<number, Intl.NumberFormat>();

/**
 * Formats a reading with fixed digits in one locale, so the server and every browser print the same text; with the
 * browser's locale a German visitor gets "5,6" where the server wrote "5.6" and React discards the server HTML.
 * Negatives take a true minus sign (U+2212), a value that rounds to zero carries no sign, and a missing value
 * (NaN, ±Infinity) reads "–".
 */
export function formatNumber(value: number, digits = 1) {
  if (!Number.isFinite(value)) return '–';
  let nf = numberFormats.get(digits);
  if (!nf) {
    nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    numberFormats.set(digits, nf);
  }
  const text = nf.format(value);
  if (!text.startsWith('-')) return text;
  return /[1-9]/.test(text) ? `−${text.slice(1)}` : text.slice(1);
}

// ---------- Canvas charts ----------

/** The CSS variable behind each tone, for charts that draw on a canvas and cannot use classes. */
export const toneVar: Record<Tone, string> = {
  primary: '--chart-1',
  muted: '--chart-muted',
  faint: '--subtle-foreground',
  'chart-2': '--chart-2',
  'chart-3': '--chart-3',
  'chart-4': '--chart-4',
  'chart-5': '--chart-5',
  success: '--success',
  warning: '--warning',
  critical: '--destructive-foreground',
};

/**
 * Reads token colors where the chart sits, so a canvas follows light and dark, the preset and any ThemeScope.
 * Values are cached; call `refresh()` when the theme may have changed (cheap enough to do every half second).
 */
export function createColorReader(el: HTMLElement) {
  const cache = new Map<string, string>();
  return {
    get(name: string, fallback = 'gray') {
      let v = cache.get(name);
      if (v === undefined) {
        v = getComputedStyle(el).getPropertyValue(name).trim() || fallback;
        cache.set(name, v);
      }
      return v;
    },
    refresh() {
      cache.clear();
    },
  };
}

/** Size a canvas for its CSS box at the device pixel ratio (capped at 2) and return a context in CSS pixels. */
export function fitCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(width * dpr);
  const h = Math.round(height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/** True while the element is on screen, so live charts stop drawing when nobody can see them. */
export function useInView<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  const [inView, setInView] = React.useState(true);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? true));
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}

const stepKeys = new Set(['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'Home', 'End', 'Escape']);

/**
 * Arrow-key stepping shared by the reading charts: returns the next index, null to clear the reading (Escape, or any
 * stepping key when there is nothing to read), or undefined for other keys.
 */
export function stepIndex(key: string, shift: boolean, index: number | null, count: number) {
  if (count <= 0) return stepKeys.has(key) ? null : undefined;
  const step = shift ? Math.max(1, Math.round(count / 10)) : 1;
  const from = index ?? -1;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return Math.min(count - 1, from + step);
    case 'ArrowLeft':
    case 'ArrowDown':
      return Math.max(0, (index ?? count) - step);
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    case 'Escape':
      return null;
    default:
      return undefined;
  }
}

/**
 * Calls `onChange` when the mode or preset changes on the element or any ancestor (the page, or a ThemeScope),
 * so canvas charts can redraw in the new colors. Returns a cleanup function.
 */
export function observeTheme(el: HTMLElement, onChange: () => void) {
  const mo = new MutationObserver(onChange);
  for (let node: HTMLElement | null = el; node; node = node.parentElement)
    mo.observe(node, { attributes: true, attributeFilter: ['class', 'data-preset'] });
  return () => mo.disconnect();
}

/** The smallest and largest finite value, without spreading the data into arguments; undefined when none is finite. */
export function finiteExtent(values: ArrayLike<number>): [number, number] | undefined {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    if (!Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return lo <= hi ? [lo, hi] : undefined;
}

/** True when any value is finite. */
export function hasFinite(values: ArrayLike<number>, from = 0, to = values.length - 1) {
  for (let i = Math.max(0, from); i <= to && i < values.length; i++)
    if (Number.isFinite(values[i]!)) return true;
  return false;
}

/**
 * Builds an SVG line path point by point. `gap()` lifts the pen. A run of one point, a sample alone between two
 * gaps, gets a zero-length segment, so a line drawn with round caps shows it as a dot instead of dropping it.
 */
export function createLinePath(digits: number) {
  let d = '';
  let run = 0;
  let last = '';
  const lift = () => {
    if (run === 1) d += `L${last}`;
    run = 0;
  };
  return {
    to(x: number, y: number) {
      last = `${x.toFixed(digits)} ${y.toFixed(digits)}`;
      d += `${run ? 'L' : 'M'}${last}`;
      run++;
    },
    gap: lift,
    done() {
      lift();
      return d;
    },
  };
}

/** A document-unique id for a clipPath, safe inside `url(#…)`. */
export function useClipId() {
  return `clip${React.useId().replace(/[^\w-]/g, '')}`;
}

/** What an empty chart says, in words, where the plot would be. */
export function ChartEmpty() {
  return React.createElement(
    'p',
    {
      'data-slot': 'chart-empty',
      className:
        'pointer-events-none absolute inset-0 m-0 flex items-center justify-center text-label font-normal text-muted-foreground',
    },
    'No data',
  );
}

/** The label of a chart drawn as one image, with the empty state stated, since an image hides its children. */
export const imageLabel = (label: string, empty: boolean) => (empty ? `${label} (no data)` : label);
