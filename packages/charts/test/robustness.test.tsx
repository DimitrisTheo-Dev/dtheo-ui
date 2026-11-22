// @vitest-environment jsdom
import * as React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  BarChart,
  FrequencyChart,
  Heatmap,
  Histogram,
  LineChart,
  ScatterChart,
  Sparkline,
  StreamChart,
  createStream,
  lttb,
  nearestIndex,
} from '../src/index';
import { stepIndex } from '../src/core';

// jsdom has no layout, canvas, observers or animation frames. These stand-ins give every chart a box of `boxWidth`
// pixels, record what canvas charts draw, and let a test resize, scroll out of view and run frames by hand.
type Op = [op: 'moveTo' | 'lineTo', x: number, y: number];
let boxWidth = 400;
const resizers = new Set<(w: number) => void>();
const viewers = new Set<(inView: boolean) => void>();
let frames: FrameRequestCallback[] = [];
let strokes: Op[][] = [];
let canvasLog: string[] = [];
let observersMade = 0;

beforeAll(() => {
  globalThis.ResizeObserver = class {
    private report: (w: number) => void;
    constructor(cb: ResizeObserverCallback) {
      this.report = (w) =>
        cb([{ contentRect: { width: w } } as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    observe() {
      resizers.add(this.report);
      this.report(boxWidth);
    }
    unobserve() {}
    disconnect() {
      resizers.delete(this.report);
    }
  };
  globalThis.IntersectionObserver = class {
    private report: (v: boolean) => void;
    constructor(cb: IntersectionObserverCallback) {
      this.report = (v) =>
        cb([{ isIntersecting: v } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    observe() {
      viewers.add(this.report);
    }
    unobserve() {}
    disconnect() {
      viewers.delete(this.report);
    }
  } as unknown as typeof IntersectionObserver;
  globalThis.Path2D = class {
    ops: Op[] = [];
    moveTo(x: number, y: number) {
      this.ops.push(['moveTo', x, y]);
    }
    lineTo(x: number, y: number) {
      this.ops.push(['lineTo', x, y]);
    }
  } as unknown as typeof Path2D;
  const Real = globalThis.MutationObserver;
  globalThis.MutationObserver = class extends Real {
    constructor(cb: MutationCallback) {
      super(cb);
      observersMade++;
    }
  };
  globalThis.requestAnimationFrame = (cb) => frames.push(cb);
  globalThis.cancelAnimationFrame = () => {};
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  const ctx = {
    setTransform: noop,
    clearRect: noop,
    save: noop,
    restore: noop,
    beginPath: noop,
    fill: noop,
    rect: (...a: number[]) => canvasLog.push(`rect ${a.join(' ')}`),
    clip: () => canvasLog.push('clip'),
    arc: (x: number, y: number) => canvasLog.push(`arc ${x} ${y}`),
    stroke: (path?: { ops: Op[] }) => {
      if (path) strokes.push(path.ops);
    },
  };
  HTMLCanvasElement.prototype.getContext = (() => ctx) as unknown as HTMLCanvasElement['getContext'];
});

beforeEach(() => {
  boxWidth = 400;
  frames = [];
  strokes = [];
  canvasLog = [];
});

afterEach(() => {
  cleanup();
  document.documentElement.className = '';
});

const resizeTo = (w: number) =>
  act(() => {
    boxWidth = w;
    for (const r of resizers) r(w);
  });
const scrollInView = (v: boolean) =>
  act(() => {
    for (const r of viewers) r(v);
  });
const runFrame = () =>
  act(() => {
    const due = frames;
    frames = [];
    for (const cb of due) cb(performance.now() + 1000);
  });
const toggleTheme = () =>
  act(async () => {
    document.documentElement.classList.toggle('dark');
    await Promise.resolve();
  });

const live = (c: HTMLElement) => c.querySelector('[aria-live]')?.textContent ?? '';
const key = (el: Element, k: string, shiftKey = false) => fireEvent.keyDown(el, { key: k, shiftKey });
const noBadNumbers = (c: HTMLElement) => expect(c.innerHTML).not.toMatch(/NaN|Infinity/);
/** The dd next to a dt, in a chart's summary. */
const stat = (c: HTMLElement, name: string) =>
  [...c.querySelectorAll('dt')].find((dt) => dt.textContent === name)?.nextElementSibling?.textContent;
/** A short fingerprint of rendered geometry, to prove valid data renders exactly as it did before these fixes. */
const fnv = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
};
const noop = () => {};
/** A number as a chart prints it: thousands commas and a true minus sign. */
const printed = (s: string) => Number(s.replace(/,/g, '').replace('−', '-'));
/** The y of every point a canvas path visits. */
const ysOf = (ops: Op[]) => ops.map(([, , y]) => y);
/** Where a bar path ends: the y it runs to from the zero line. */
const barEnd = (d: string) => Number(/V([\d.]+)/.exec(d)![1]);
const arcCount = () => canvasLog.filter((l) => l.startsWith('arc')).length;
/** True when a path has a zero-length segment: a dot with round caps. */
const hasDot = (d: string) => /M(-?[\d.]+ -?[\d.]+)L\1(?![\d.])/.test(d);

/** Counts reads of numeric indices, to show what a hover walks through. */
function counted<T>(arr: T[], counter: { reads: number }): T[] {
  return new Proxy(arr, {
    get(t, k, r) {
      if (typeof k === 'string' && /^\d+$/.test(k)) counter.reads++;
      return Reflect.get(t, k, r);
    },
  });
}
/** A repeatable bell-shaped sample: the sum of three uniforms from a fixed seed. */
function sample(n: number, center = 5, spread = 2) {
  let s = 1;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: n }, () => center + (rnd() + rnd() + rnd() - 1.5) * spread);
}
const meanOf = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const sdOf = (v: number[]) => {
  const m = meanOf(v);
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
};

// ---------------------------------------------------------------------------------------------------------------

describe('core: empty data', () => {
  it('stepIndex clears the reading instead of returning -1 when there is nothing to read', () => {
    for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'])
      expect(stepIndex(k, false, null, 0)).toBeNull();
    expect(stepIndex('a', false, null, 0)).toBeUndefined();
    expect(stepIndex('End', false, null, 5)).toBe(4);
  });

  it('nearestIndex says -1 for an empty array, and the charts never use it as an index', () => {
    expect(nearestIndex([], 3)).toBe(-1);
    expect(nearestIndex([7], 3)).toBe(0);
  });
});

describe('FrequencyChart with frequencies at or below zero', () => {
  it('leaves out an FFT 0 Hz bin instead of looping forever', () => {
    const { container } = render(
      <FrequencyChart
        frequency={[0, 1, 10, 100]}
        magnitude={[{ id: 'm', label: 'Gain', values: [9, 1, 2, 3] }]}
        magnitudeDomain={[-10, 10]}
        ariaLabel="Spectrum"
      />,
    );
    expect(decadeLabels(container)).toEqual(['1', '10', '100 Hz']);
    expect(container.querySelector('path.stroke-chart-1')!.getAttribute('d')!.match(/[ML]/g)).toHaveLength(3);
    noBadNumbers(container);
  });

  it('leaves out a 0 Hz bin and negative frequencies, and plots the positive part', () => {
    const { container, getByRole } = render(
      <FrequencyChart
        frequency={[-5, 0, 1, 10, 100]}
        magnitude={[{ id: 'm', label: 'Gain', values: [1, 2, 3, 4, 5] }]}
        magnitudeDomain={[-10, 10]}
        ariaLabel="Spectrum"
      />,
    );
    const d = container.querySelector('path.stroke-chart-1')!.getAttribute('d')!;
    expect(d.match(/[ML]/g)).toHaveLength(3);
    noBadNumbers(container);
    expect(decadeLabels(container)).toEqual(['1', '10', '100 Hz']);
    key(getByRole('group'), 'Home');
    expect(live(container)).toBe('1 Hz: Gain 3.0 dB');
    key(getByRole('group'), 'ArrowLeft');
    expect(live(container)).toBe('1 Hz: Gain 3.0 dB');
  });
});

/** The labelled decades under the bottom pane. */
function decadeLabels(c: HTMLElement) {
  const svg = [...c.querySelectorAll('svg')].at(-1)!;
  const texts = [...svg.querySelectorAll('text')];
  const bottom = Math.max(...texts.map((t) => Number(t.getAttribute('y'))));
  return texts.filter((t) => Number(t.getAttribute('y')) === bottom).map((t) => t.textContent);
}

describe('FrequencyChart labels', () => {
  it('labels sub-Hz and MHz decades readably', () => {
    const f = Array.from({ length: 91 }, (_, i) => 10 ** (-3 + i / 10));
    const { container } = render(
      <FrequencyChart
        frequency={f}
        magnitude={[{ id: 'm', label: 'Gain', values: f.map(() => 0) }]}
        magnitudeDomain={[-10, 10]}
        ariaLabel="Response"
      />,
    );
    expect(decadeLabels(container)).toEqual([
      '0.001',
      '0.01',
      '0.1',
      '1',
      '10',
      '100',
      '1k',
      '10k',
      '100k',
      '1 MHz',
    ]);
  });

  it('reads frequencies with two significant digits below 1 Hz and in M above 1 MHz', () => {
    const { container, getByRole } = render(
      <FrequencyChart
        frequency={[0.0234, 0.25, 1500, 2.5e6]}
        magnitude={[{ id: 'm', label: 'Gain', values: [0, 0, 0, 0] }]}
        magnitudeDomain={[-10, 10]}
        ariaLabel="Response"
      />,
    );
    const chart = getByRole('group');
    const heard = ['Home', 'ArrowRight', 'ArrowRight', 'ArrowRight'].map((k) => {
      key(chart, k);
      return live(container).split(':')[0];
    });
    expect(heard).toEqual(['0.023 Hz', '0.25 Hz', '1.5 kHz', '2.5 MHz']);
  });
});

// ---------------------------------------------------------------------------------------------------------------

/** Every bin, read with the keyboard: [from, to, count]. */
function readBins(c: HTMLElement) {
  const chart = c.querySelector('[data-slot="histogram"]')!;
  const bins: Array<[number, number, number]> = [];
  key(chart, 'Home');
  for (let guard = 0; guard < 500; guard++) {
    const m = /^(−?[\d,.]+) to (−?[\d,.]+)[^:]*: (\d+)/.exec(live(c))!;
    const bin: [number, number, number] = [printed(m[1]!), printed(m[2]!), Number(m[3])];
    if (bins.length && bins.at(-1)![0] === bin[0]) break;
    bins.push(bin);
    key(chart, 'ArrowRight');
  }
  return bins;
}

describe('Histogram spec limits', () => {
  // The tuning example said "14 of 412 over limit" beside red bars holding 16 runs: two runs sat exactly on the
  // 10 % limit, inside a bin whose middle was past it. Only values past a limit are critical; one on it is in spec.
  it('turns only the values past a limit critical, and counts them in the readout', () => {
    const values = [9.5, 10, 10, 10.4, 10.6, 11.2];
    const { container } = render(
      <Histogram values={values} binWidth={1} upper={10} xLabel="Overshoot" unit="%" ariaLabel="h" />,
    );
    const bins = readBins(container);
    expect(bins.map(([from, , n]) => [from, n])).toEqual([
      [9, 1],
      [10, 4],
      [11, 1],
    ]);
    const chart = container.querySelector('[data-slot="histogram"]')!;
    key(chart, 'Home');
    expect(live(container)).not.toMatch(/out of spec/);
    key(chart, 'ArrowRight');
    expect(live(container)).toMatch(/4 values, 2 out of spec$/);
    key(chart, 'ArrowRight');
    expect(live(container)).toMatch(/1 value, out of spec$/);
    // Two critical shapes (the top of the straddling bin and the bin past the limit), two primary ones.
    expect(container.querySelectorAll('path.fill-chart-1')).toHaveLength(2);
    expect(container.querySelectorAll('path.fill-destructive-foreground')).toHaveLength(2);
  });
});

describe('Histogram binning', () => {
  it('uses whole-width bins on round edges that cover every value', () => {
    const values = sample(400);
    const { container } = render(<Histogram values={values} digits={2} xLabel="Overshoot" ariaLabel="h" />);
    const bins = readBins(container);
    const step = bins[0]![1] - bins[0]![0];
    expect([0.1, 0.2, 0.25, 0.5, 1, 2]).toContain(Number(step.toFixed(6)));
    for (const [from, to] of bins) {
      expect(to - from).toBeCloseTo(step, 9);
      expect(Math.abs(from / step - Math.round(from / step))).toBeLessThan(1e-6);
    }
    expect(bins.reduce((a, b) => a + b[2], 0)).toBe(400);
    expect(bins[0]![0]).toBeLessThanOrEqual(Math.min(...values));
    expect(bins.at(-1)![1]).toBeGreaterThanOrEqual(Math.max(...values));
  });

  it('scales the normal curve to n × bin width', () => {
    const values = sample(400);
    const { container } = render(<Histogram values={values} digits={2} normal xLabel="x" ariaLabel="h" />);
    const bins = readBins(container);
    // The width of a bin in the middle: a cut-short end bin must not set the scale.
    const middle = bins[bins.length >> 1]!;
    const step = middle[1] - middle[0];
    const [d0, d1] = [bins[0]![0], bins.at(-1)![1]];
    // Map pixels back to counts from two y-axis ticks.
    const ticks = [...container.querySelectorAll('svg text[text-anchor="end"]')].map(
      (t) => [Number(t.textContent), Number(t.getAttribute('y')) - 3.5] as const,
    );
    const [[c0, y0], [c1, y1]] = [ticks[0]!, ticks.at(-1)!];
    const countAt = (y: number) => c0 + ((y - y0) * (c1 - c0)) / (y1 - y0);
    const curve = container.querySelector('path[stroke-dasharray="4 3"]')!.getAttribute('d')!;
    const peak = countAt(Math.min(...[...curve.matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((m) => Number(m[1]))));
    const mu = meanOf(values);
    const sigma = sdOf(values);
    let expected = 0;
    for (let k = 0; k <= 80; k++) {
      const x = d0 + ((d1 - d0) * k) / 80;
      expected = Math.max(
        expected,
        (400 * step * Math.exp(-0.5 * ((x - mu) / sigma) ** 2)) / (sigma * Math.sqrt(2 * Math.PI)),
      );
    }
    expect(peak / expected).toBeGreaterThan(0.98);
    expect(peak / expected).toBeLessThan(1.02);
  });

  it('keeps a width that would make too many bins to at most 200, on multiples of the width', () => {
    const values = Array.from({ length: 101 }, (_, i) => i);
    const { container } = render(<Histogram values={values} binWidth={0.0001} xLabel="x" ariaLabel="h" />);
    expect(container.querySelectorAll('rect[fill="transparent"]')).toHaveLength(200);
    const bins = readBins(container);
    expect(bins).toHaveLength(200);
    expect(bins[0]![1] - bins[0]![0]).toBeCloseTo(0.5, 9);
  });

  it('renders the aligned bins and curve of valid data exactly as before', () => {
    const values = Array.from({ length: 120 }, (_, i) => ((i * 37) % 23) + 0.5);
    const { container } = render(
      <Histogram
        values={values}
        domain={[0, 25]}
        binWidth={1}
        upper={20}
        normal
        xLabel="x"
        unit="%"
        ariaLabel="h"
      />,
    );
    const bars = [...container.querySelectorAll('path.fill-chart-1, path.fill-destructive-foreground')];
    expect(bars).toHaveLength(23);
    expect(fnv(bars.map((p) => p.getAttribute('d')).join('|'))).toBe('4c35ae2b');
    expect(fnv(container.querySelector('path[stroke-dasharray="4 3"]')!.getAttribute('d')!)).toBe('2c630ec8');
  });

  it('leaves non-finite values out of n, mean, σ and the bins', () => {
    const { container } = render(
      <Histogram values={[1, 2, Number.NaN, 3, Infinity, -Infinity, 4]} xLabel="x" ariaLabel="h" />,
    );
    expect(stat(container, 'n')).toBe('4');
    expect(stat(container, 'Mean')).toBe('2.5');
    expect(stat(container, 'σ')).toBe('1.3');
    noBadNumbers(container);
    expect(readBins(container).reduce((a, b) => a + b[2], 0)).toBe(4);
  });

  it('puts every value in one bin when they are all the same, with the limits still in range', () => {
    const { container } = render(
      <Histogram values={[5, 5, 5, 5]} lower={4} upper={6} xLabel="x" ariaLabel="h" />,
    );
    noBadNumbers(container);
    expect(readBins(container)).toEqual([
      [4, 4.5, 0],
      [4.5, 5, 0],
      [5, 5.5, 4],
      [5.5, 6, 0],
    ]);
  });
});

describe('Histogram capability', () => {
  // A drifting process: neighbours sit close together, the whole run spreads wide. Cpk (within) is high, Ppk low.
  const drift = Array.from({ length: 40 }, (_, i) => 10 + 0.05 * i + (i % 2 ? 0.02 : -0.02));
  const lower = 9;
  const upper = 13;
  const cap = (mu: number, s: number) => Math.min((upper - mu) / (3 * s), (mu - lower) / (3 * s));

  it('computes Cpk from the moving range of individuals and Ppk from the overall σ', () => {
    const mu = meanOf(drift);
    let mr = 0;
    for (let i = 1; i < drift.length; i++) mr += Math.abs(drift[i]! - drift[i - 1]!);
    const within = mr / (drift.length - 1) / 1.128;
    const cpk = cap(mu, within);
    const ppk = cap(mu, sdOf(drift));
    expect(cpk).toBeGreaterThan(1.33);
    expect(ppk).toBeLessThan(1.33);
    const { container } = render(
      <Histogram values={drift} lower={lower} upper={upper} xLabel="x" ariaLabel="h" />,
    );
    // The status word follows Cpk.
    expect(stat(container, 'Cpk')).toBe(`${cpk.toFixed(2)} · capable`);
    expect(stat(container, 'Ppk')).toBe(ppk.toFixed(2));
  });

  it('uses the pooled σ of consecutive subgroups when subgroupSize is set', () => {
    const mu = meanOf(drift);
    let ss = 0;
    let df = 0;
    for (let s = 0; s < drift.length; s += 4) {
      const g = drift.slice(s, s + 4);
      const m = meanOf(g);
      ss += g.reduce((a, b) => a + (b - m) ** 2, 0);
      df += g.length - 1;
    }
    const cpk = cap(mu, Math.sqrt(ss / df));
    const { container } = render(
      <Histogram values={drift} subgroupSize={4} lower={lower} upper={upper} xLabel="x" ariaLabel="h" />,
    );
    expect(stat(container, 'Cpk')).toMatch(new RegExp(`^${cpk.toFixed(2)} · `));
    expect(stat(container, 'Ppk')).toBe(cap(mu, sdOf(drift)).toFixed(2));
  });

  it('does not walk the values again when a bin is hovered', () => {
    const counter = { reads: 0 };
    const values = counted(sample(300), counter);
    const { container } = render(<Histogram values={values} lower={3} upper={7} xLabel="x" ariaLabel="h" />);
    counter.reads = 0;
    fireEvent.pointerEnter(container.querySelectorAll('rect[fill="transparent"]')[3]!.parentElement!);
    expect(container.textContent).toMatch(/: \d+ values?/);
    expect(counter.reads).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('StreamChart', () => {
  const series = [{ channel: 'i', label: 'Current', unit: 'A' }];

  it('reads a missing channel as – instead of crashing', () => {
    const stream = createStream(['i'], 100);
    for (let k = 0; k < 100; k++) stream.push(k, [k]);
    const { container } = render(
      <StreamChart
        stream={stream}
        series={[...series, { channel: 'typo', label: 'Torque' }]}
        yDomain={[0, 100]}
        paused
        ariaLabel="s"
      />,
    );
    expect(stat(container, 'Torque')).toBe('–');
    expect(stat(container, 'Current')).toBe('99.0 A');
  });

  it('keeps the view it paused on across theme changes, resizes and scrolling; resuming goes live', async () => {
    const stream = createStream(['i'], 5000);
    for (let k = 0; k < 100; k++) stream.push(k, [10]);
    const props = { stream, series, yDomain: [0, 100] as [number, number], window: 1000, ariaLabel: 's' };
    const { container, rerender } = render(<StreamChart {...props} paused />);
    const frozen = ysOf(strokes.at(-1)!);
    expect(frozen).toHaveLength(100);
    // New samples arrive while paused.
    for (let k = 100; k < 700; k++) stream.push(k, [60]);
    await toggleTheme();
    expect(ysOf(strokes.at(-1)!)).toEqual(frozen);
    resizeTo(300);
    expect(ysOf(strokes.at(-1)!)).toEqual(frozen);
    scrollInView(false);
    scrollInView(true);
    expect(ysOf(strokes.at(-1)!)).toEqual(frozen);
    expect(stat(container, 'Current')).toBe('10.0 A');
    rerender(<StreamChart {...props} paused={false} />);
    runFrame();
    const resumed = ysOf(strokes.at(-1)!);
    expect(resumed.at(-1)).not.toBe(frozen.at(-1));
  });

  it('announces a crossing of a lower limit as below it, not over it', () => {
    const stream = createStream(['i'], 100);
    for (let k = 0; k < 100; k++) stream.push(k, [k < 90 ? 20 : 2]);
    const { container } = render(
      <StreamChart
        stream={stream}
        series={series}
        yDomain={[0, 30]}
        limits={[{ value: 5, channel: 'i', direction: 'below', label: 'Minimum' }]}
        paused
        ariaLabel="s"
      />,
    );
    expect(live(container)).toBe('Current is below its limit: 2.0 A.');
    expect(stat(container, 'Current')).toMatch(/below limit$/);
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('BarChart', () => {
  // With a unit, the plot starts one 12 px row lower, under the unit written above the axis.
  it('renders positive bars exactly as before, under the unit row', () => {
    const { container } = render(
      <BarChart
        bars={[
          { id: 'a', label: 'A', value: 3 },
          { id: 'b', label: 'B', value: 7, current: true },
          { id: 'c', label: 'C', value: 12 },
        ]}
        limit={10}
        limitLabel="Limit"
        unit="%"
        ariaLabel="b"
      />,
    );
    expect([...container.querySelectorAll('path')].map((p) => p.getAttribute('d'))).toEqual([
      'M77 172V144.71428571428572Q77 140.71428571428572 81 140.71428571428572H97Q101 140.71428571428572 101 144.71428571428572V172Z',
      'M197 172V103Q197 99 201 99H217Q221 99 221 103V172Z',
      'M317 172V50.85714285714286Q317 46.85714285714286 321 46.85714285714286H337Q341 46.85714285714286 341 50.85714285714286V172Z',
    ]);
    expect(
      [...container.querySelectorAll('line')].map((l) => [l.getAttribute('y1'), l.getAttribute('class')]),
    ).toEqual([
      ['120.5', 'stroke-chart-grid'],
      ['68.5', 'stroke-chart-grid'],
      ['172.5', 'stroke-chart-axis'],
      ['68.5', 'stroke-subtle-foreground/80'],
    ]);
  });

  it('grows negative bars down from a zero line', () => {
    const { container } = render(
      <BarChart
        bars={[
          { id: 'a', label: 'A', value: -5 },
          { id: 'b', label: 'B', value: 3 },
          { id: 'c', label: 'C', value: -2 },
        ]}
        ariaLabel="Offset per run"
      />,
    );
    const paths = [...container.querySelectorAll('path')].map((p) => p.getAttribute('d')!);
    expect(paths).toHaveLength(3);
    // Every bar starts on one zero line, above the bottom of the plot, and the axis is drawn there.
    const starts = paths.map((d) => Number(/^M[\d.]+ ([\d.]+)/.exec(d)![1]));
    const zero = starts[0]!;
    for (const y of starts) expect(y).toBeCloseTo(zero, 9);
    expect(zero).toBeLessThan(200 - 28 - 20);
    expect(container.querySelector('line.stroke-chart-axis')!.getAttribute('y1')).toBe(
      String(Math.round(zero) + 0.5),
    );
    expect(barEnd(paths[0]!)).toBeGreaterThan(zero);
    expect(barEnd(paths[1]!)).toBeLessThan(zero);
    expect(barEnd(paths[2]!)).toBeGreaterThan(zero);
    noBadNumbers(container);
  });

  it('puts the axis at the bottom when every bar is zero', () => {
    const { container } = render(<BarChart bars={[{ id: 'a', label: 'A', value: 0 }]} ariaLabel="b" />);
    noBadNumbers(container);
    expect(container.querySelector('line.stroke-chart-axis')!.getAttribute('y1')).toBe(
      String(200 - 28 + 0.5),
    );
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('no spreading data into Math.min / Math.max', () => {
  it('renders 300,000 values in a histogram, a sparkline and a heatmap row', () => {
    const many = Array.from({ length: 300_000 }, (_, i) => Math.sin(i / 1000));
    expect(() => render(<Histogram values={many} xLabel="x" ariaLabel="h" />)).not.toThrow();
    cleanup();
    expect(() => render(<Sparkline values={many} area={false} ariaLabel="s" />)).not.toThrow();
    cleanup();
    const row = many.map((v, i) => (i % 1000 ? Number.NaN : v));
    const { container } = render(
      <Heatmap
        xValues={row.map((_, i) => i)}
        yValues={[0]}
        values={[row]}
        xTicks={[]}
        xLabel="x"
        yLabel="y"
        valueLabel="v"
        ariaLabel="h"
      />,
    );
    expect(container.textContent).toContain('1.0');
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('Heatmap', () => {
  // Tick labels go through the shared formatter, so 1000 reads "1,000"; positions are unchanged.
  it('places uniform ticks and the marker where they were', () => {
    const xs = [500, 750, 1000, 1250, 1500];
    const { container } = render(
      <Heatmap
        xValues={xs}
        yValues={[1, 2, 3]}
        values={[
          [1, 2, 3, 4, 5],
          [2, 3, 4, 5, 6],
          [3, 4, 5, 6, 7],
        ]}
        xTicks={xs}
        yTicks={[1, 2, 3]}
        marker={{ x: 900, y: 2.5, label: 'Op' }}
        xLabel="x"
        yLabel="y"
        valueLabel="v"
        ariaLabel="h"
      />,
    );
    const ticks = [...container.querySelectorAll('text')]
      .slice(0, 8)
      .map((t) => [t.textContent, Number(t.getAttribute('x')), Number(t.getAttribute('y'))] as const);
    const before = [
      ['500', 78.4, 276],
      ['750', 147.2, 276],
      ['1,000', 216, 276],
      ['1,250', 284.79999999999995, 276],
      ['1,500', 353.59999999999997, 276],
      ['1', 36, 221.5],
      ['2', 36, 137.5],
      ['3', 36, 53.5],
    ] as const;
    ticks.forEach(([label, x, y], i) => {
      expect(label).toBe(before[i]![0]);
      expect(x).toBeCloseTo(before[i]![1], 9);
      expect(y).toBeCloseTo(before[i]![2], 9);
    });
    const dot = container.querySelector('circle')!;
    expect(Number(dot.getAttribute('cx'))).toBeCloseTo(188.48, 9);
    expect(Number(dot.getAttribute('cy'))).toBeCloseTo(92, 9);
  });

  it('centres each tick on its cell when the grid is not evenly spaced', () => {
    const xs = [0, 1, 10, 100];
    const { container } = render(
      <Heatmap
        xValues={xs}
        yValues={[0, 1]}
        values={[
          [1, 2, 3, 4],
          [1, 2, 3, 4],
        ]}
        xTicks={xs}
        xLabel="x"
        yLabel="y"
        valueLabel="v"
        ariaLabel="h"
      />,
    );
    const cells = [...container.querySelectorAll('rect.fill-chart-1')].slice(0, 4);
    const ticks = [...container.querySelectorAll('text')].slice(0, 4);
    cells.forEach((cell, i) => {
      const centre = Number(cell.getAttribute('x')) - 0.5 + (Number(cell.getAttribute('width')) + 1) / 2;
      expect(Number(ticks[i]!.getAttribute('x'))).toBeCloseTo(centre, 6);
    });
  });

  it('draws a single row and column without NaN', () => {
    const { container } = render(
      <Heatmap
        xValues={[100]}
        yValues={[1]}
        values={[[3]]}
        marker={{ x: 100, y: 1, label: 'Op' }}
        xLabel="x"
        yLabel="y"
        valueLabel="v"
        ariaLabel="h"
      />,
    );
    noBadNumbers(container);
    expect(container.querySelectorAll('rect.fill-chart-1')).toHaveLength(1);
  });

  it('does not re-render the cells or rescan the values on hover', () => {
    const counter = { reads: 0 };
    const values = Array.from({ length: 20 }, (_row, r) =>
      counted(
        Array.from({ length: 30 }, (_, c) => r + c),
        counter,
      ),
    );
    const { container } = render(
      <Heatmap
        xValues={Array.from({ length: 30 }, (_, i) => i)}
        yValues={Array.from({ length: 20 }, (_, i) => i)}
        values={values}
        xLabel="x"
        yLabel="y"
        valueLabel="v"
        ariaLabel="h"
      />,
    );
    counter.reads = 0;
    fireEvent.pointerEnter(container.querySelectorAll('rect.fill-chart-1')[42]!);
    expect(container.textContent).toMatch(/at 12, 1/);
    expect(counter.reads).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('empty and all-missing data', () => {
  const xs = Array.from({ length: 10 }, (_, i) => i);
  const nan = xs.map(() => Number.NaN);
  const stream = createStream(['i'], 10);
  const cases: Array<[string, () => React.ReactElement]> = [
    [
      'LineChart, no samples',
      () => (
        <LineChart x={[]} series={[{ id: 'a', label: 'A', values: [] }]} yDomain={[0, 1]} ariaLabel="c" />
      ),
    ],
    [
      'LineChart, all NaN',
      () => (
        <LineChart x={xs} series={[{ id: 'a', label: 'A', values: nan }]} yDomain={[0, 1]} ariaLabel="c" />
      ),
    ],
    ['Histogram, no values', () => <Histogram values={[]} xLabel="x" ariaLabel="c" />],
    [
      'Histogram, all NaN',
      () => <Histogram values={nan} lower={0} upper={1} normal xLabel="x" ariaLabel="c" />,
    ],
    [
      'ScatterChart, no points',
      () => (
        <ScatterChart points={[]} xDomain={[0, 1]} yDomain={[0, 1]} fit xLabel="x" yLabel="y" ariaLabel="c" />
      ),
    ],
    [
      'ScatterChart, NaN points',
      () => (
        <ScatterChart
          points={[{ x: Number.NaN, y: 1, label: 'R' }]}
          highlight="R"
          xDomain={[0, 1]}
          yDomain={[0, 1]}
          xLabel="x"
          yLabel="y"
          ariaLabel="c"
        />
      ),
    ],
    [
      'FrequencyChart, no frequencies',
      () => (
        <FrequencyChart
          frequency={[]}
          magnitude={[{ id: 'm', label: 'M', values: [] }]}
          magnitudeDomain={[-1, 1]}
          ariaLabel="c"
        />
      ),
    ],
    [
      'FrequencyChart, all NaN',
      () => (
        <FrequencyChart
          frequency={[1, 10]}
          magnitude={[{ id: 'm', label: 'M', values: [Number.NaN, Number.NaN] }]}
          magnitudeDomain={[-1, 1]}
          ariaLabel="c"
        />
      ),
    ],
    [
      'FrequencyChart, nothing above 0 Hz',
      () => (
        <FrequencyChart
          frequency={[-1, 0]}
          magnitude={[{ id: 'm', label: 'M', values: [1, 2] }]}
          magnitudeDomain={[-1, 1]}
          ariaLabel="c"
        />
      ),
    ],
    [
      'StreamChart, empty stream',
      () => (
        <StreamChart
          stream={stream}
          series={[{ channel: 'i', label: 'I' }]}
          yDomain={[0, 1]}
          paused
          ariaLabel="c"
        />
      ),
    ],
  ];
  for (const [name, el] of cases) {
    it(`${name}: an empty plot that says so, and keys do nothing`, () => {
      const { container } = render(el());
      expect(container.querySelector('[data-slot="chart-empty"]')?.textContent).toBe('No data');
      const group = container.querySelector('[role="group"]')!;
      for (const k of ['ArrowRight', 'End', 'Home', 'ArrowLeft', 'Escape']) key(group, k);
      fireEvent.focus(group);
      noBadNumbers(container);
    });
  }

  const images: Array<[string, () => React.ReactElement]> = [
    ['BarChart, no bars', () => <BarChart bars={[]} ariaLabel="Overshoot" />],
    [
      'BarChart, NaN bars',
      () => <BarChart bars={[{ id: 'a', label: 'A', value: Number.NaN }]} limit={1} ariaLabel="Overshoot" />,
    ],
    [
      'Heatmap, no cells',
      () => (
        <Heatmap
          xValues={[]}
          yValues={[]}
          values={[]}
          xLabel="x"
          yLabel="y"
          valueLabel="v"
          ariaLabel="Overshoot"
        />
      ),
    ],
    [
      'Heatmap, NaN cells',
      () => (
        <Heatmap
          xValues={[1, 2]}
          yValues={[1]}
          values={[[Number.NaN, Number.NaN]]}
          marker={{ x: 1, y: 1, label: 'Op' }}
          xLabel="x"
          yLabel="y"
          valueLabel="v"
          ariaLabel="Overshoot"
        />
      ),
    ],
    ['Sparkline, no values', () => <Sparkline values={[]} ariaLabel="Overshoot" />],
    ['Sparkline, all NaN', () => <Sparkline values={[Number.NaN, Number.NaN]} ariaLabel="Overshoot" />],
  ];
  for (const [name, el] of images) {
    it(`${name}: the image's name says there is no data`, () => {
      const { container } = render(el());
      expect(container.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('Overshoot (no data)');
      noBadNumbers(container);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------

/** The clip rectangle an element (or its group) is drawn through. */
function clipOf(el: Element) {
  const ref = (el.getAttribute('clip-path') ?? el.closest('[clip-path]')?.getAttribute('clip-path'))!;
  const id = /url\(#(.+)\)/.exec(ref)![1]!;
  const rect = el.ownerDocument.getElementById(id)!.querySelector('rect')!;
  const [x, y, w, h] = ['x', 'y', 'width', 'height'].map((a) => Number(rect.getAttribute(a)));
  return [x!, y!, w!, h!] as const;
}

describe('clipping to the plot', () => {
  it('LineChart clips series and their shading to the plot, with an id per chart', () => {
    const x = Array.from({ length: 50 }, (_, i) => i);
    const series = [{ id: 'a', label: 'A', values: x.map((i) => (i === 25 ? 40 : 1)) }];
    const el = (
      <LineChart
        x={x}
        series={series}
        yDomain={[0, 2]}
        thresholds={[{ value: 1.5, shadeSeries: 'a' }]}
        height={200}
        ariaLabel="c"
      />
    );
    const { container } = render(
      <>
        {el}
        {el}
      </>,
    );
    const lines = container.querySelectorAll('path.stroke-chart-1');
    const [cx, cy, cw, ch] = clipOf(lines[0]!);
    const plotLeft = Number(container.querySelector('clipPath rect')!.getAttribute('x')) + 2;
    expect([cx, cy, ch]).toEqual([plotLeft - 2, 12 - 2, 200 - 36 + 4]);
    expect(cw).toBe(400 - plotLeft - 14 + 4);
    expect(clipOf(container.querySelector('path.fill-destructive-foreground')!)).toEqual([cx, cy, cw, ch]);
    const ids = [...container.querySelectorAll('clipPath')].map((c) => c.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('FrequencyChart clips each pane on its own', () => {
    const f = [1, 10, 100];
    const { container } = render(
      <FrequencyChart
        frequency={f}
        magnitude={[{ id: 'm', label: 'M', values: [0, 50, 0] }]}
        magnitudeDomain={[-10, 10]}
        phase={[{ id: 'p', label: 'P', values: [-90, -400, -180] }]}
        phaseDomain={[-270, 0]}
        paneHeight={180}
        ariaLabel="c"
      />,
    );
    const [mag, ph] = [...container.querySelectorAll('path.stroke-chart-1')];
    expect(clipOf(mag!)[1]).toBe(22 - 2);
    expect(clipOf(mag!)[3]).toBe(180 - 6 - 22 + 4);
    expect(clipOf(ph!)[3]).toBe(180 + 22 - 6 - 22 - 22 + 4);
    expect(mag!.closest('[clip-path]')).not.toBe(ph!.closest('[clip-path]'));
  });

  it('Histogram clips the normal curve to the plot', () => {
    const { container } = render(<Histogram values={sample(100)} normal xLabel="x" ariaLabel="h" />);
    const curve = container.querySelector('path[stroke-dasharray="4 3"]')!;
    expect(clipOf(curve)[1]).toBe(18 - 2);
  });

  it('ScatterChart clips the canvas and the fit line, keeping a dot on the edge whole', () => {
    const points = Array.from({ length: 10 }, (_, i) => ({ x: i / 9, y: i / 9 + (i === 9 ? 5 : 0) }));
    const { container } = render(
      <ScatterChart
        points={points}
        xDomain={[0, 1]}
        yDomain={[0, 1]}
        fit
        xLabel="x"
        yLabel="y"
        ariaLabel="c"
      />,
    );
    const clip = canvasLog
      .find((l) => l.startsWith('rect '))!
      .split(' ')
      .slice(1)
      .map(Number);
    const fit = container.querySelector('line[stroke-dasharray="6 4"]')!;
    const [fx, fy, fw, fh] = clipOf(fit);
    expect(clip).toEqual([fx - 3, fy - 3, fw + 6, fh + 6]);
    expect(canvasLog.indexOf('clip')).toBeLessThan(canvasLog.findIndex((l) => l.startsWith('arc')));
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('performance', () => {
  const points = Array.from({ length: 200 }, (_, i) => ({ x: i / 200, y: ((i * 7919) % 200) / 200 }));

  const literals = () => (
    <ScatterChart
      points={points}
      groups={[{ id: 'all', label: 'Runs' }]}
      xDomain={[0, 1]}
      yDomain={[0, 1]}
      xLabel="x"
      yLabel="y"
      ariaLabel="c"
    />
  );
  const withPoints = (pts: typeof points) => (
    <ScatterChart points={pts} xDomain={[0, 1]} yDomain={[0, 1]} xLabel="x" yLabel="y" ariaLabel="c" />
  );

  it('ScatterChart does not redraw for domain and group literals that are equal by value', () => {
    const { rerender } = render(literals());
    expect(arcCount()).toBe(200);
    rerender(literals());
    rerender(literals());
    expect(arcCount()).toBe(200);
  });

  it('ScatterChart keeps one theme observer across redraws, and redraws on a theme change', async () => {
    observersMade = 0;
    const { rerender } = render(withPoints(points));
    rerender(withPoints([...points]));
    rerender(withPoints([...points]));
    expect(arcCount()).toBe(600);
    expect(observersMade).toBe(1);
    await toggleTheme();
    expect(arcCount()).toBe(800);
  });

  it('FrequencyChart does not rebuild its paths when the pointer moves', () => {
    const counter = { reads: 0 };
    const f = Array.from({ length: 500 }, (_, i) => 1 + i);
    const values = counted(
      f.map((v) => -20 * Math.log10(v)),
      counter,
    );
    const { getByRole } = render(
      <FrequencyChart
        frequency={f}
        magnitude={[{ id: 'm', label: 'M', values }]}
        magnitudeDomain={[-60, 10]}
        ariaLabel="c"
      />,
    );
    counter.reads = 0;
    fireEvent.pointerMove(getByRole('group'), { clientX: 200 });
    fireEvent.pointerMove(getByRole('group'), { clientX: 220 });
    expect(counter.reads).toBeGreaterThan(0);
    expect(counter.reads).toBeLessThan(20);
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('LineChart keyboard', () => {
  it('steps one point, a tenth with Shift, and jumps to the ends; up and down stay with the page', () => {
    const x = Array.from({ length: 50 }, (_, i) => i);
    const { container, getByRole } = render(
      <LineChart
        x={x}
        series={[{ id: 'a', label: 'A', values: x, digits: 0 }]}
        yDomain={[0, 50]}
        ariaLabel="c"
      />,
    );
    const chart = getByRole('group');
    fireEvent.focus(chart);
    const press = (k: string, shift = false) => {
      key(chart, k, shift);
      return live(container);
    };
    // Focus puts the cursor in the middle (sample 24); the arrows move one sample from there.
    expect(press('ArrowRight')).toBe('25: A 25');
    expect(press('ArrowLeft')).toBe('24: A 24');
    expect(press('Home')).toBe('0: A 0');
    expect(press('ArrowRight', true)).toBe('5: A 5');
    expect(press('End')).toBe('49: A 49');
    expect(press('ArrowRight')).toBe('49: A 49');
    expect(press('ArrowLeft', true)).toBe('44: A 44');
    expect(fireEvent.keyDown(chart, { key: 'ArrowUp' })).toBe(true);
    key(chart, 'Escape');
    expect(container.querySelector('circle')).toBeNull();
  });

  it('steps through the points drawn after downsampling', () => {
    const x = Array.from({ length: 2000 }, (_, i) => i / 100);
    const values = x.map((t) => Math.sin(t * 3) + Math.sin(t * 17) / 3);
    const { container, getByRole } = render(
      <LineChart
        x={x}
        series={[{ id: 'a', label: 'A', values }]}
        yDomain={[-2, 2]}
        formatX={(v) => v.toFixed(2)}
        ariaLabel="c"
      />,
    );
    const plotW = Number(container.querySelector('clipPath rect')!.getAttribute('width')) - 4;
    const kept = lttb(x, values, Math.max(64, Math.round(plotW * 2)));
    expect(kept.length).toBeLessThan(x.length);
    const chart = getByRole('group');
    const at = () => Number(live(container).split(':')[0]);
    key(chart, 'Home');
    const visited = [at()];
    for (let k = 0; k < 6; k++) {
      key(chart, 'ArrowRight');
      visited.push(at());
    }
    expect(visited).toEqual(kept.slice(0, 7).map((i) => Number(x[i]!.toFixed(2))));
    key(chart, 'End');
    expect(at()).toBe(Number(x[kept.at(-1)!]!.toFixed(2)));
  });

  it('renders a line of valid data exactly as before', () => {
    const x = Array.from({ length: 300 }, (_, i) => i / 10);
    const { container } = render(
      <LineChart
        x={x}
        series={[{ id: 'a', label: 'A', values: x.map((t) => Math.sin(t)) }]}
        yDomain={[-1.5, 1.5]}
        ariaLabel="l"
      />,
    );
    expect(fnv(container.querySelector('path.stroke-chart-1')!.getAttribute('d')!)).toBe('e31fe9e5');
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('a sample alone between two gaps', () => {
  it('is a dot on a LineChart, a FrequencyChart and a Sparkline', () => {
    const values = [1, 2, Number.NaN, 3, Number.NaN, 4, 5];
    const x = values.map((_, i) => i);
    const line = render(
      <LineChart x={x} series={[{ id: 'a', label: 'A', values }]} yDomain={[0, 6]} ariaLabel="c" />,
    );
    expect(hasDot(line.container.querySelector('path.stroke-chart-1')!.getAttribute('d')!)).toBe(true);
    cleanup();
    const freq = render(
      <FrequencyChart
        frequency={x.map((i) => i + 1)}
        magnitude={[{ id: 'm', label: 'M', values }]}
        magnitudeDomain={[0, 6]}
        ariaLabel="c"
      />,
    );
    expect(hasDot(freq.container.querySelector('path.stroke-chart-1')!.getAttribute('d')!)).toBe(true);
    cleanup();
    const spark = render(<Sparkline values={values} ariaLabel="c" />);
    expect(hasDot(spark.container.querySelector('path[fill="none"]')!.getAttribute('d')!)).toBe(true);
  });

  it('leaves longer runs as they were', () => {
    const { container } = render(<Sparkline values={[3, 4, Number.NaN, 5, 6]} ariaLabel="c" />);
    expect(hasDot(container.querySelector('path[fill="none"]')!.getAttribute('d')!)).toBe(false);
  });
});
