// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { LineChart, Sparkline, StreamChart, createStream, formatNumber, lttb } from '../src/index';

// jsdom has no layout, canvas or observers. Give every chart a 400 px box, and record what canvas charts draw.
type Op = [op: 'moveTo' | 'lineTo', x: number, y: number];
const strokes: Op[][] = [];
const noop = () => {};

beforeAll(() => {
  globalThis.ResizeObserver = class {
    constructor(private cb: ResizeObserverCallback) {}
    observe() {
      this.cb([{ contentRect: { width: 400 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  };
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
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
  const ctx = {
    setTransform: noop,
    clearRect: noop,
    save: noop,
    restore: noop,
    beginPath: noop,
    rect: noop,
    clip: noop,
    stroke: (path: { ops: Op[] }) => strokes.push(path.ops),
  };
  HTMLCanvasElement.prototype.getContext = (() => ctx) as unknown as HTMLCanvasElement['getContext'];
});

afterEach(() => {
  cleanup();
  strokes.length = 0;
});

const moves = (d: string | null) => (d ?? '').match(/M/g)?.length ?? 0;

describe('formatNumber', () => {
  it('prints the same digits in every locale, with a true minus sign', () => {
    expect(formatNumber(5.64, 1)).toBe('5.6');
    expect(formatNumber(17278.4, 0)).toBe('17,278');
    expect(formatNumber(-2.5, 2)).toBe('−2.50');
  });

  it('drops the sign of a value that rounds to zero and dashes a missing value', () => {
    expect(formatNumber(-0.004, 2)).toBe('0.00');
    expect(formatNumber(Number.NaN)).toBe('–');
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('–');
  });
});

describe('lttb', () => {
  const xs = Array.from({ length: 1000 }, (_, i) => i);
  const wave = xs.map((i) => Math.sin(i / 20));

  it('keeps the first and last sample and about `threshold` points', () => {
    const idx = lttb(xs, wave, 100);
    expect(idx).toHaveLength(100);
    expect(idx[0]).toBe(0);
    expect(idx.at(-1)).toBe(999);
  });

  it('keeps a gap through downsampling', () => {
    const gappy = wave.map((v, i) => (i >= 500 && i < 520 ? Number.NaN : v));
    const idx = lttb(xs, gappy, 100);
    const gaps = idx.filter((i) => Number.isNaN(gappy[i]!));
    expect(gaps).toEqual([500]);
    // The samples on either side of the gap are kept, so the line ends and resumes at the right place.
    expect(idx).toContain(499);
    expect(idx).toContain(520);
    expect(idx.at(-1)).toBe(999);
  });
});

describe('LineChart with a gap', () => {
  const x = Array.from({ length: 2000 }, (_, i) => i / 100);
  const values = x.map((t, i) => (i >= 900 && i < 1100 ? Number.NaN : Math.sin(t)));
  const series = [{ id: 'i', label: 'Phase current', values, unit: 'A', digits: 1 }];

  it('lifts the pen across the gap instead of crashing', () => {
    const { container } = render(<LineChart x={x} series={series} yDomain={[-2, 2]} ariaLabel="Current" />);
    const d = container.querySelector('path.stroke-chart-1')?.getAttribute('d') ?? null;
    expect(moves(d)).toBe(2);
    expect(d).not.toMatch(/NaN|undefined/);
  });

  it('reads a dash and draws no dot inside the gap', () => {
    const { container, getByRole } = render(
      <LineChart x={x} series={series} yDomain={[-2, 2]} ariaLabel="Current" />,
    );
    // Focus puts the readout at the middle of the range, inside the gap.
    fireEvent.focus(getByRole('group'));
    expect(container.querySelector('circle')).toBeNull();
    expect(container.textContent).toContain('Phase current');
    expect(container.textContent).toMatch(/–Phase current/);
  });
});

describe('Sparkline with a gap', () => {
  it('renders, breaks the line and keeps the endpoint', () => {
    const { container } = render(<Sparkline values={[3, 4, Number.NaN, 5, 6]} ariaLabel="Overshoot trend" />);
    const line = container.querySelector('path[fill="none"]')?.getAttribute('d') ?? null;
    expect(moves(line)).toBe(2);
    expect(line).not.toMatch(/NaN|undefined/);
    expect(container.querySelector('circle')).not.toBeNull();
  });

  it('renders nothing to draw when every value is missing', () => {
    const { container } = render(<Sparkline values={[Number.NaN, Number.NaN]} ariaLabel="No data" />);
    expect(container.querySelector('svg')).toBeNull();
  });
});

/** Draws a paused stream with a dropout in the middle and returns the path the canvas stroked. */
function drawStream(samples: number) {
  const stream = createStream(['i'], samples);
  for (let k = 0; k < samples; k++)
    stream.push(k, [k > samples * 0.45 && k < samples * 0.55 ? Number.NaN : 20 * Math.sin(k / 120)]);
  render(
    <StreamChart
      stream={stream}
      series={[{ channel: 'i', label: 'Current', unit: 'A' }]}
      yDomain={[-30, 30]}
      window={samples}
      paused
      ariaLabel="Current"
    />,
  );
  expect(strokes.length).toBeGreaterThan(0);
  return strokes[0]!;
}

describe('StreamChart with a dropout', () => {
  for (const [name, samples] of [
    ['fewer samples than pixels', 300],
    ['more samples than pixels (M4)', 4000],
  ] as const) {
    it(`breaks the path at the gap with ${name}`, () => {
      const ops = drawStream(samples);
      expect(ops.filter(([op]) => op === 'moveTo')).toHaveLength(2);
      expect(ops.every(([, x, y]) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
    });
  }
});
