/**
 * Synthetic actuator bench data. A second-order step response with deterministic sensor noise, sampled at 1 kHz.
 * Every number shown in the examples is computed from these arrays, so charts, checks and copy always agree.
 */
export const TARGET = 12; // N·m command
export const DELAY = 20; // ms, step applied
export const SAMPLES = 1001; // 0..1000 ms
export const OVERSHOOT_LIMIT = 10; // %
export const CURRENT_LIMIT = 32; // A
export const SETTLE_LIMIT = 250; // ms
export const RISE_LIMIT = 80; // ms
const KT = 0.46; // output N·m per phase A, through the reducer
const KD_I = 0.012; // current needed to accelerate the load, per N·m/s

const step = (tms: number, z: number, wn: number) => {
  if (tms < DELAY) return 0;
  const t = (tms - DELAY) / 1000;
  const s = Math.sqrt(1 - z * z);
  return 1 - (Math.exp(-z * wn * t) / s) * Math.sin(wn * s * t + Math.acos(z));
};

const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
};

const noise = (seed: number, amp: number) => {
  const r = rng(seed);
  const raw = Array.from({ length: SAMPLES + 4 }, () => r() + r() + r() - 1.5);
  return Array.from(
    { length: SAMPLES },
    (_, i) => ((amp * (raw[i]! + raw[i + 1]! + raw[i + 2]! + raw[i + 3]! + raw[i + 4]!)) / 5) * 1.6,
  );
};

export interface Trace {
  t: number[];
  torque: number[];
  current: number[];
}

export function simulate(z: number, wn: number, seed: number): Trace {
  const nT = noise(seed, 0.045);
  const nI = noise(seed + 7, 0.22);
  const t = Array.from({ length: SAMPLES }, (_, i) => i);
  const ideal = t.map((i) => TARGET * step(i, z, wn));
  const torque = ideal.map((v, i) => v + (i >= DELAY ? nT[i]! : nT[i]! * 0.3));
  const current = ideal.map(
    (v, i) => v / KT + KD_I * (i > 0 ? (ideal[i]! - ideal[i - 1]!) * 1000 : 0) + nI[i]!,
  );
  return { t, torque, current };
}

export interface RunMetrics {
  peak: number;
  peakAt: number;
  overshoot: number;
  rise: number;
  settle: number;
  peakCurrent: number;
  peakCurrentAt: number;
}

export function metrics({ torque, current }: Trace): RunMetrics {
  let peak = -Infinity;
  let peakAt = 0;
  torque.forEach((v, i) => {
    if (v > peak) {
      peak = v;
      peakAt = i;
    }
  });
  let peakCurrent = -Infinity;
  let peakCurrentAt = 0;
  current.forEach((v, i) => {
    if (v > peakCurrent) {
      peakCurrent = v;
      peakCurrentAt = i;
    }
  });
  const t10 = torque.findIndex((v) => v >= 0.1 * TARGET);
  const t90 = torque.findIndex((v) => v >= 0.9 * TARGET);
  let last = 0;
  torque.forEach((v, i) => {
    if (i > DELAY && Math.abs(v - TARGET) > 0.02 * TARGET) last = i;
  });
  return {
    peak,
    peakAt,
    overshoot: ((peak - TARGET) / TARGET) * 100,
    rise: t90 - t10,
    settle: last + 1 - DELAY,
    peakCurrent,
    peakCurrentAt,
  };
}

export const command = Array.from({ length: SAMPLES }, (_, i) => (i >= DELAY ? TARGET : 0));

/** R-0412: high proportional gain, underdamped. R-0409: the last passing run, used as reference. */
export const measured = simulate(0.485, 40, 11);
export const reference = simulate(0.72, 34, 29);
export const measuredMetrics = metrics(measured);
export const referenceMetrics = metrics(reference);

export interface RunRow {
  id: string;
  profile: string;
  note?: string;
  kp: number;
  overshoot: number;
  settle: number;
  current: number;
  result: 'fail' | 'review' | 'pass';
  started: string;
}

export const runHistory: RunRow[] = [
  {
    id: 'R-0412',
    profile: 'High-gain step',
    kp: 4.2,
    overshoot: measuredMetrics.overshoot,
    settle: measuredMetrics.settle,
    current: measuredMetrics.peakCurrent,
    result: 'fail',
    started: '18 Nov, 14:32',
  },
  {
    id: 'R-0411',
    profile: 'High-gain step',
    note: 'Kd 0.04',
    kp: 4.2,
    overshoot: 21.3,
    settle: 248,
    current: 31.6,
    result: 'fail',
    started: '18 Nov, 13:05',
  },
  {
    id: 'R-0410',
    profile: 'Mid-gain step',
    kp: 3.4,
    overshoot: 9.1,
    settle: 176,
    current: 29.4,
    result: 'review',
    started: '18 Nov, 11:47',
  },
  {
    id: 'R-0409',
    profile: 'Nominal step',
    note: 'reference',
    kp: 2.8,
    overshoot: referenceMetrics.overshoot,
    settle: referenceMetrics.settle,
    current: referenceMetrics.peakCurrent,
    result: 'pass',
    started: '17 Nov, 16:20',
  },
  {
    id: 'R-0408',
    profile: 'Damped step',
    kp: 2.8,
    overshoot: 1.2,
    settle: 214,
    current: 25.1,
    result: 'pass',
    started: '17 Nov, 15:02',
  },
  {
    id: 'R-0407',
    profile: 'Fast rise',
    kp: 3.9,
    overshoot: 12.4,
    settle: 231,
    current: 30.2,
    result: 'fail',
    started: '17 Nov, 10:41',
  },
  {
    id: 'R-0406',
    profile: 'Thermal soak, 20 min',
    kp: 2.8,
    overshoot: 3.9,
    settle: 163,
    current: 26.0,
    result: 'review',
    started: '16 Nov, 17:55',
  },
  {
    id: 'R-0405',
    profile: 'Nominal step',
    kp: 2.8,
    overshoot: 3.6,
    settle: 160,
    current: 26.3,
    result: 'pass',
    started: '16 Nov, 09:12',
  },
];

export const fmt = {
  n1: new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  n2: new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  n0: new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }),
};
