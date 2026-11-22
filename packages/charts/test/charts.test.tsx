// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  BarChart,
  Histogram,
  LineChart,
  Sparkline,
  StreamChart,
  capability,
  createStream,
  formatNumber,
  lttb,
  tickFormat,
} from '../src/index';

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

const vertices = (d: string | null) => (d ?? '').match(/[ML]/g)?.length ?? 0;
const trace = (container: HTMLElement) => container.querySelector('path.stroke-chart-1')?.getAttribute('d') ?? null;

describe('LineChart zoomed in', () => {
  const x = Array.from({ length: 10 }, (_, i) => i);
  const series = [{ id: 'v', label: 'Torque', values: x.map((t) => t * 2), unit: 'N·m' }];

  it('runs the trace to both edges, through the samples just outside the range', () => {
    const { container } = render(<LineChart x={x} series={series} xDomain={[1.5, 3.5]} yDomain={[0, 20]} ariaLabel="Torque" />);
    // Samples 1 to 4: the two inside and one past each edge, clipped at the plot's edges.
    expect(vertices(trace(container))).toBe(4);
  });

  it('draws the segment when the range falls between two samples', () => {
    const { container } = render(<LineChart x={x} series={series} xDomain={[1.2, 1.8]} yDomain={[0, 20]} ariaLabel="Torque" />);
    expect(container.textContent).not.toContain('No data');
    expect(vertices(trace(container))).toBe(2);
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

describe('tickFormat', () => {
  it('writes ticks the way readouts write numbers: true minus, separators, one digit count per axis', () => {
    const minus = tickFormat([-60, -40, -20, 0]);
    expect([-60, 0].map(minus)).toEqual(['−60', '0']);
    expect([0, 0.5, 1].map(tickFormat([0, 0.5, 1]))).toEqual(['0.0', '0.5', '1.0']);
    expect(tickFormat([0, 4000, 8000, 12000])(12000)).toBe('12,000');
  });

  it('gives tiny ticks the digits they need, and keeps four as the cap for everyday ones', () => {
    const micro = tickFormat([-1e-5, -5e-6, 0, 5e-6, 1e-5]);
    expect([-1e-5, 5e-6].map(micro)).toEqual(['−0.000010', '0.000005']);
    // A 100 kHz sample period in seconds, as a line chart's default x readout uses it.
    expect(tickFormat([1e-5])(3e-5)).toBe('0.00003');
    expect(tickFormat([0, 1 / 3])(1 / 3)).toBe('0.3333');
  });
});

describe('lttb over a range', () => {
  it('downsamples [from, to) in place and returns indices into the full arrays', () => {
    const xs = new Float64Array(1000).map((_, i) => i);
    const ys = xs.map((i) => Math.sin(i / 20));
    const idx = lttb(xs, ys, 50, 100, 600);
    expect(idx).toHaveLength(50);
    expect(idx[0]).toBe(100);
    expect(idx.at(-1)).toBe(599);
    expect(idx.every((i) => i >= 100 && i < 600)).toBe(true);
  });
});

describe('capability', () => {
  // Five runs in order: mean 3, overall σ = √2.5 ≈ 1.581; the moving ranges are all 1, so σ within = 1 / 1.128.
  const values = [1, 2, 3, 4, 5];

  it('computes Cpk from the moving-range σ and Ppk from the overall σ', () => {
    const c = capability(values, undefined, 7);
    expect(c.sigmaWithin).toBeCloseTo(1 / 1.128, 6);
    expect(c.sigmaOverall).toBeCloseTo(Math.sqrt(2.5), 6);
    expect(c.cpk).toBeCloseTo(4 / (3 / 1.128), 6);
    expect(c.ppk).toBeCloseTo(4 / (3 * Math.sqrt(2.5)), 6);
  });

  it('takes the nearer limit, and has no index without one', () => {
    expect(capability(values, 2, 7).cpk).toBeCloseTo(1 / (3 / 1.128), 6);
    expect(capability(values).cpk).toBeUndefined();
  });
});

const critical = (c: HTMLElement) => c.querySelectorAll('path.fill-destructive-foreground').length;

describe('Histogram against a limit', () => {
  it('counts a value on the limit as in spec, so the red bars hold exactly the values past it', () => {
    const values = [9.5, 10, 10, 10.5, 11.2];
    const { container, getByRole } = render(
      <Histogram values={values} domain={[8, 12]} binWidth={1} upper={10} xLabel="Overshoot" unit="%" ariaLabel="x" />,
    );
    // Bins hold [x0, x1). The two 10.0s sit in [10, 11) as its in-spec part, under 10.5 in red; [11, 12] is all red.
    expect(critical(container)).toBe(2);
    const chart = getByRole('group');
    fireEvent.keyDown(chart, { key: 'Home' });
    expect(chart.textContent).toContain('8.0 to 9.0 %: 0 values');
    expect(chart.textContent).not.toMatch(/0 values, out of spec/);
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    expect(chart.textContent).toContain('9.0 to 10.0 %: 1 value');
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    expect(chart.textContent).toContain('10.0 to 11.0 %: 3 values, 1 out of spec');
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    expect(chart.textContent).toContain('11.0 to 12.0 %: 1 value, out of spec');
  });

  it('splits a bin the limit cuts through and says how many are out', () => {
    const { container, getByRole } = render(
      <Histogram values={[10.2, 10.8]} domain={[10, 11]} binWidth={1} upper={10.5} xLabel="x" ariaLabel="x" />,
    );
    expect(critical(container)).toBe(1);
    expect(container.querySelectorAll('path.fill-chart-1')).toHaveLength(1);
    const chart = getByRole('group');
    fireEvent.keyDown(chart, { key: 'Home' });
    expect(chart.textContent).toContain('10.0 to 11.0: 2 values, 1 out of spec');
  });

  it('widens its default range to the limits, so a limit outside the data stays on the plot', () => {
    const { getByRole } = render(
      <Histogram values={[9.8, 10, 10.2]} binWidth={0.5} lower={9} upper={11} xLabel="x" ariaLabel="x" />,
    );
    const chart = getByRole('group');
    fireEvent.keyDown(chart, { key: 'Home' });
    expect(chart.textContent).toContain('9.0 to 9.5: 0 values');
    fireEvent.keyDown(chart, { key: 'End' });
    expect(chart.textContent).toMatch(/10\.5 to 11\.0: 0 values|11\.0 to 11\.5: 0 values/);
  });

  it('dims bins at once for the arrow keys, and fades them for the pointer', () => {
    const { container, getByRole } = render(
      <Histogram values={[1, 2, 2, 3]} domain={[0, 4]} binWidth={1} xLabel="x" ariaLabel="x" />,
    );
    const fading = () => container.querySelectorAll('path.transition-opacity').length;
    fireEvent.keyDown(getByRole('group'), { key: 'Home' });
    expect(fading()).toBe(0);
    fireEvent.pointerEnter(container.querySelectorAll('[data-slot="histogram"] svg g > rect')[1]!.parentElement!);
    expect(fading()).toBeGreaterThan(0);
  });

  it('states Cpk with its word and Ppk beside it', () => {
    const { container } = render(
      <Histogram values={[1, 2, 3, 4, 5]} upper={7} xLabel="x" ariaLabel="x" />,
    );
    expect(container.textContent).toContain(`Cpk${formatNumber(4 / (3 / 1.128), 2)} · capable`);
    expect(container.textContent).toContain(`Ppk${formatNumber(4 / (3 * Math.sqrt(2.5)), 2)}`);
  });
});

describe('LineChart readout against a limit', () => {
  const x = Array.from({ length: 101 }, (_, i) => i);
  const torque = x.map((t) => 10 + 4 * Math.sin(t / 10));
  it('says when the series a limit shades is past it, and writes the unit above the y-axis', () => {
    const { container, getByRole } = render(
      <LineChart
        x={x}
        series={[{ id: 'tq', label: 'Torque', values: torque, unit: 'N·m' }]}
        yDomain={[0, 16]}
        thresholds={[{ value: 13.2, shadeSeries: 'tq' }]}
        ariaLabel="Torque"
      />,
    );
    const chart = getByRole('group');
    fireEvent.focus(chart);
    fireEvent.keyDown(chart, { key: 'Home' });
    for (let k = 0; k < 16; k++) fireEvent.keyDown(chart, { key: 'ArrowRight' });
    // At x = 16 the torque is 10 + 4 sin(1.6) ≈ 14.0 N·m, past 13.2.
    expect(chart.textContent).toMatch(/Torque 14\.00 N·m, over limit/);
    expect([...container.querySelectorAll('text')].map((t) => t.textContent)).toContain('N·m');
  });
});

describe('BarChart with negative values', () => {
  it('draws them below zero instead of dropping them', () => {
    const { container } = render(
      <BarChart
        bars={[
          { id: 'a', label: 'A', value: 4 },
          { id: 'b', label: 'B', value: -3 },
        ]}
        unit="A"
        ariaLabel="Regen current"
      />,
    );
    expect(container.querySelectorAll('path')).toHaveLength(2);
  });
});

describe('StreamChart with a channel the stream does not have', () => {
  it('skips it with one warning instead of throwing on every readout', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const stream = createStream(['i'], 100);
    for (let k = 0; k < 100; k++) stream.push(k, [Math.sin(k / 10)]);
    expect(() =>
      render(
        <StreamChart
          stream={stream}
          series={[{ channel: 'missing', label: 'Torque' }]}
          yDomain={[-1, 1]}
          paused
          ariaLabel="x"
        />,
      ),
    ).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('LineChart at capture scale', () => {
  it('draws a 6M-sample channel with a shaded limit in under 250 ms', () => {
    // 10 minutes at 10 kHz. The old path copied the visible range with Array.from before downsampling: ~350 ms
    // on an M-series laptop against ~40 ms now. The bound leaves room for a slower CI runner.
    const n = 6_000_000;
    const x = new Float64Array(n).map((_, i) => i / 10_000);
    const y = new Float32Array(n).map((_, i) => Math.sin(i / 5000) + (i % 997 === 0 ? 2 : 0));
    const t = performance.now();
    const { container } = render(
      <LineChart
        x={x}
        series={[{ id: 'iq', label: 'Iq', values: y, unit: 'A' }]}
        yDomain={[-3, 3]}
        thresholds={[{ value: 2, shadeSeries: 'iq' }]}
        ariaLabel="Iq"
      />,
    );
    expect(performance.now() - t).toBeLessThan(250);
    expect(container.querySelector('path.stroke-chart-1')?.getAttribute('d')).not.toMatch(/NaN|undefined/);
  });
});
