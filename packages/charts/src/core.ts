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

/**
 * Largest-Triangle-Three-Buckets downsampling. Keeps the visual shape of a dense trace (peaks included)
 * with roughly `threshold` points, so a 100k-sample capture renders as fast as a 1k one.
 */
export function lttb(xs: ArrayLike<number>, ys: ArrayLike<number>, threshold: number): number[] {
  const n = xs.length;
  if (threshold >= n || threshold < 3) return Array.from({ length: n }, (_, i) => i);
  const out: number[] = [0];
  const every = (n - 2) / (threshold - 2);
  let a = 0;
  for (let i = 0; i < threshold - 2; i++) {
    const start = Math.floor((i + 1) * every) + 1;
    const end = Math.min(Math.floor((i + 2) * every) + 1, n);
    let avgX = 0;
    let avgY = 0;
    for (let j = start; j < end; j++) {
      avgX += xs[j]!;
      avgY += ys[j]!;
    }
    const len = Math.max(1, end - start);
    avgX /= len;
    avgY /= len;
    const rStart = Math.floor(i * every) + 1;
    const rEnd = Math.floor((i + 1) * every) + 1;
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
  out.push(n - 1);
  return out;
}

/** Index of the sample nearest to `x` in a sorted array. */
export function nearestIndex(xs: ArrayLike<number>, x: number): number {
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

export function formatNumber(value: number, digits = 1) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
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

/** Arrow-key stepping shared by the reading charts: returns the next index, or undefined for other keys. */
export function stepIndex(key: string, shift: boolean, index: number | null, count: number) {
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
