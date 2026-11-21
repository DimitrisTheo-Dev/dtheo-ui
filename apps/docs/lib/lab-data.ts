/**
 * Synthetic lab data for the examples: the RA-14 hip-pitch actuator on Bench 3. Not real measurements.
 *
 * This file is the single source for every number the examples state. R-0412's checks, trace and events are
 * computed from one simulated step response; the run history, the 412-run population and the live bench are built
 * on the same run, so a value reads the same wherever it appears. R-0412 runs the loop at 1.5× the gain of the
 * R-0409 reference (Kp 4.20 against 2.80), which costs phase margin and shows up as overshoot.
 */

// ---------- A seeded random source, so every visit shows the same data ----------

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const TAU = 2 * Math.PI;

/** Standard normal from two uniforms (Box–Muller). */
function gaussian(rand: () => number) {
  return Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(TAU * rand());
}

export const fmt = {
  n0: new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }),
  n1: new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  n2: new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};

// ---------- The step test and its acceptance limits ----------

export const TARGET = 12; // N·m, the step command
export const DELAY = 20; // ms, when the step is applied
export const SAMPLES = 1001; // 0 to 1000 ms at 1 kHz

export const OVERSHOOT_LIMIT = 10; // %, peak above the command
export const SETTLE_LIMIT = 250; // ms after the step, until torque stays inside ±2 % of the command
export const RISE_LIMIT = 80; // ms, 10 to 90 % of the command
export const CURRENT_LIMIT = 32; // A, peak phase current
export const TEMP_LIMIT = 90; // °C, winding
/** The overshoot limit as a torque: 13.2 N·m on the 12 N·m step. */
export const TORQUE_LIMIT = TARGET * (1 + OVERSHOOT_LIMIT / 100);
/** The overshoot limit under its process-capability name, for the histogram and the scatter. */
export const OVERSHOOT_USL = OVERSHOOT_LIMIT;

export type CheckStatus = 'fail' | 'warn' | 'pass';

/** One rule for every check: over the limit fails; above 90 % of it is near the limit. */
export function checkStatus(value: number, limit: number): CheckStatus {
  return value > limit ? 'fail' : value > 0.9 * limit ? 'warn' : 'pass';
}

// ---------- R-0412 against R-0409: a step response sampled at 1 kHz ----------

/** Controller gains. R-0412 raised Kp by 50 % over the R-0409 reference; Ki and Kd are unchanged. */
export const gains = { kp: 4.2, ki: 0.8, kd: 0.06 };
export const referenceGains = { kp: 2.8, ki: 0.8, kd: 0.06 };
/** R-0412's winding temperature at the end of the capture, in °C. Read from the bench, not simulated. */
export const WINDING_TEMP = 71.2;

const KT = 0.46; // output N·m per phase A, through the reducer
const KD_I = 0.012; // current needed to accelerate the load, per N·m/s

/** Closed-loop damping and natural frequency (rad/s): the high-gain loop and the reference tune. */
const highGain = { zeta: 0.485, wn: 40 };
const nominal = { zeta: 0.72, wn: 34 };

const step = (tms: number, z: number, wn: number) => {
  if (tms < DELAY) return 0;
  const t = (tms - DELAY) / 1000;
  const s = Math.sqrt(1 - z * z);
  return 1 - (Math.exp(-z * wn * t) / s) * Math.sin(wn * s * t + Math.acos(z));
};

const noise = (seed: number, amp: number) => {
  const r = seeded(seed);
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

/** A second-order step response with deterministic sensor noise, and the phase current it draws. */
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

/** What the acceptance checks read from a trace. Times are ms from the start of the capture unless noted. */
export interface RunMetrics {
  peak: number;
  peakAt: number;
  overshoot: number;
  /** When torque first reaches 10 % and 90 % of the command. */
  t10: number;
  t90: number;
  /** 10 to 90 % rise time, ms. */
  rise: number;
  /** ms after the step until torque stays inside ±2 % of the command. */
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
    t10,
    t90,
    rise: t90 - t10,
    settle: last + 1 - DELAY,
    peakCurrent,
    peakCurrentAt,
  };
}

export const command = Array.from({ length: SAMPLES }, (_, i) => (i >= DELAY ? TARGET : 0));

/** R-0412: high proportional gain, underdamped. R-0409: the last passing run, used as the reference. */
export const measured = simulate(highGain.zeta, highGain.wn, 11);
export const reference = simulate(nominal.zeta, nominal.wn, 29);
export const measuredMetrics = metrics(measured);
export const referenceMetrics = metrics(reference);

// ---------- Run history: R-0412 and the seven runs before it ----------

export interface RunRow {
  id: string;
  profile: string;
  note?: string;
  kp: number;
  kd: number;
  /** % over the command. */
  overshoot: number;
  /** ms after the step. */
  settle: number;
  /** Peak phase current, A. */
  current: number;
  /** Winding temperature, °C. */
  temp: number;
  result: 'fail' | 'review' | 'pass';
  started: string;
}

/** A run fails when any check fails, and needs review when any check is near its limit. */
function resultOf(run: Omit<RunRow, 'result'>): RunRow['result'] {
  const checks = [
    checkStatus(run.overshoot, OVERSHOOT_LIMIT),
    checkStatus(run.settle, SETTLE_LIMIT),
    checkStatus(run.current, CURRENT_LIMIT),
    checkStatus(run.temp, TEMP_LIMIT),
  ];
  return checks.includes('fail') ? 'fail' : checks.includes('warn') ? 'review' : 'pass';
}

const M = measuredMetrics;
const R = referenceMetrics;

export const runHistory: RunRow[] = (
  [
    {
      id: 'R-0412',
      profile: 'High-gain step',
      kp: gains.kp,
      kd: gains.kd,
      overshoot: M.overshoot,
      settle: M.settle,
      current: M.peakCurrent,
      temp: WINDING_TEMP,
      started: '18 Nov, 14:32',
    },
    {
      id: 'R-0411',
      profile: 'High-gain step',
      note: 'Kd 0.04',
      kp: gains.kp,
      kd: 0.04,
      overshoot: 21.3,
      settle: 248,
      current: 31.6,
      temp: 74.0,
      started: '18 Nov, 13:05',
    },
    {
      id: 'R-0410',
      profile: 'Mid-gain step',
      kp: 3.4,
      kd: 0.06,
      overshoot: 9.1,
      settle: 176,
      current: 29.4,
      temp: 68.5,
      started: '18 Nov, 11:47',
    },
    {
      id: 'R-0409',
      profile: 'Nominal step',
      note: 'reference',
      kp: referenceGains.kp,
      kd: referenceGains.kd,
      overshoot: R.overshoot,
      settle: R.settle,
      current: R.peakCurrent,
      temp: 62.1,
      started: '17 Nov, 16:20',
    },
    {
      id: 'R-0408',
      profile: 'Damped step',
      kp: 2.8,
      kd: 0.09,
      overshoot: 1.2,
      settle: 214,
      current: 25.1,
      temp: 60.4,
      started: '17 Nov, 15:02',
    },
    {
      id: 'R-0407',
      profile: 'Fast rise',
      kp: 3.9,
      kd: 0.06,
      overshoot: 12.4,
      settle: 231,
      current: 30.2,
      temp: 70.3,
      started: '17 Nov, 10:41',
    },
    {
      id: 'R-0406',
      profile: 'Thermal soak, 20 min',
      note: 'winding 84 °C',
      kp: 2.8,
      kd: 0.06,
      overshoot: 3.9,
      settle: 163,
      current: 26.0,
      temp: 84.0,
      started: '16 Nov, 17:55',
    },
    {
      id: 'R-0405',
      profile: 'Nominal step',
      kp: 2.8,
      kd: 0.06,
      overshoot: 3.6,
      settle: 160,
      current: 26.3,
      temp: 58.2,
      started: '16 Nov, 09:12',
    },
  ] satisfies Array<Omit<RunRow, 'result'>>
).map((run) => ({ ...run, result: resultOf(run) }));

// ---------- Frequency response ----------

interface Complex {
  re: number;
  im: number;
}
const cx = (re: number, im = 0): Complex => ({ re, im });
const mul = (a: Complex, b: Complex) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const div = (a: Complex, b: Complex) => {
  const d = b.re * b.re + b.im * b.im;
  return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
};

/** The plant: an integrator, the load's mechanical pole, the current loop, a gearbox resonance and the sample delay. */
const plant = { mech: 9, current: 300, resonance: 182, antiResonance: 150, zr: 0.06, zz: 0.1, delay: 0.0004 };

/** Open-loop response L(jω) = K·G(jω) at f Hz. */
function loop(f: number, gain: number) {
  const s = cx(0, TAU * f);
  let g = div(cx(gain), mul(s, cx(1, f / plant.mech)));
  g = div(g, cx(1, f / plant.current));
  const wr = plant.resonance;
  const wz = plant.antiResonance;
  g = mul(
    g,
    div(
      cx(1 - (f * f) / (wz * wz), (2 * plant.zz * f) / wz),
      cx(1 - (f * f) / (wr * wr), (2 * plant.zr * f) / wr),
    ),
  );
  return mul(g, cx(Math.cos(-TAU * f * plant.delay), Math.sin(-TAU * f * plant.delay)));
}

const logSpace = (from: number, to: number, n: number) =>
  Array.from(
    { length: n },
    (_, i) => 10 ** (Math.log10(from) + (i / (n - 1)) * (Math.log10(to) - Math.log10(from))),
  );

function bodeOf(frequency: number[], gain: number) {
  const magnitude: number[] = [];
  const phase: number[] = [];
  let unwrap = 0;
  for (const f of frequency) {
    const g = loop(f, gain);
    magnitude.push(20 * Math.log10(Math.hypot(g.re, g.im)));
    let ph = (Math.atan2(g.im, g.re) * 180) / Math.PI + unwrap;
    const prev = phase.at(-1);
    if (prev !== undefined) {
      while (ph - prev > 180) {
        ph -= 360;
        unwrap -= 360;
      }
      while (ph - prev < -180) {
        ph += 360;
        unwrap += 360;
      }
    }
    phase.push(ph);
  }
  return { magnitude, phase };
}

/** Where the magnitude crosses 0 dB (phase margin) and where the phase crosses −180° (gain margin). */
function marginsOf(frequency: number[], { magnitude, phase }: { magnitude: number[]; phase: number[] }) {
  const gc = magnitude.findIndex((m, i) => i > 0 && magnitude[i - 1]! >= 0 && m < 0);
  const pc = phase.findIndex((p, i) => i > 0 && phase[i - 1]! > -180 && p <= -180);
  return {
    gainCrossover: frequency[gc]!,
    phaseMargin: 180 + phase[gc]!,
    phaseAtCrossover: phase[gc]!,
    phaseCrossover: frequency[pc]!,
    gainMargin: -magnitude[pc]!,
    magnitudeAtPhaseCrossover: magnitude[pc]!,
  };
}

const bodeFrequency = logSpace(1, 500, 260);
// Loop gain scales with Kp: R-0412 at 60 against 40 on the R-0409 reference.
const bodeCurrent = bodeOf(bodeFrequency, 60);
const bodeReference = bodeOf(bodeFrequency, 40);

export const bode = {
  frequency: bodeFrequency,
  current: bodeCurrent,
  reference: bodeReference,
  margins: marginsOf(bodeFrequency, bodeCurrent),
  referenceMargins: marginsOf(bodeFrequency, bodeReference),
};

// ---------- Vibration spectrum ----------

const spectrumFrequency = logSpace(5, 1000, 360);
const lines = [
  { f: 50, db: -54, width: 0.6, label: 'Mains 50 Hz' },
  { f: 96, db: -47, width: 2.5, label: 'Cogging 96 Hz' },
  { f: 182, db: -24, width: 6, label: 'Resonance 182 Hz' },
  { f: 364, db: -43, width: 8, label: '2× 364 Hz' },
];

export const spectrum = (() => {
  const rand = seeded(17);
  const magnitude = spectrumFrequency.map((f) => {
    const floor = -78 - 6 * Math.log10(f / 5);
    let power = 10 ** (floor / 10);
    for (const l of lines) power += 10 ** (l.db / 10) / (1 + ((f - l.f) / l.width) ** 2);
    return 10 * Math.log10(power) + 1.4 * gaussian(rand);
  });
  // Label each line at the measured peak near it, so the dot sits on the trace.
  const peaks = lines.map((l) => {
    let best = 0;
    spectrumFrequency.forEach((f, i) => {
      if (Math.abs(Math.log(f / l.f)) < 0.03 && magnitude[i]! > (magnitude[best] ?? -Infinity)) best = i;
    });
    return { frequency: spectrumFrequency[best]!, value: magnitude[best]!, label: l.label };
  });
  return { frequency: spectrumFrequency, magnitude, peaks };
})();

// ---------- 412 runs: gain against overshoot ----------

export interface LabRun {
  id: string;
  kp: number;
  overshoot: number;
}

/** Every step test since firmware 4.16. The runs in the history above keep their own values. */
export const runs: LabRun[] = (() => {
  const rand = seeded(412);
  const known = new Map(runHistory.map((r) => [r.id, r]));
  const out: LabRun[] = [];
  for (let n = 1; n <= 412; n++) {
    // Most runs sit near the nominal tune; a tail explores higher gains. Every run draws, so the generated runs
    // stay the same whichever ones the history replaces.
    const kp = Math.min(4.6, Math.max(1.6, 2.8 + 0.42 * gaussian(rand) + (rand() < 0.18 ? 0.9 * rand() : 0)));
    const overshoot = Math.max(0.4, 1.2 + 3.1 * (kp - 1.6) ** 1.25 + 1.3 * gaussian(rand));
    const id = `R-${String(n).padStart(4, '0')}`;
    const run = known.get(id);
    out.push({
      id,
      kp: Number((run?.kp ?? kp).toFixed(2)),
      overshoot: Number((run?.overshoot ?? overshoot).toFixed(1)),
    });
  }
  return out;
})();

/** Overshoot statistics across all runs: the numbers the histogram states, for metrics elsewhere on the page. */
export const overshootStats = (() => {
  const o = runs.map((r) => r.overshoot);
  const mean = o.reduce((a, b) => a + b, 0) / o.length;
  const sd = Math.sqrt(o.reduce((a, b) => a + (b - mean) ** 2, 0) / (o.length - 1));
  // Cpk uses the within-process spread: the average moving range between consecutive runs over d₂ (1.128), as the
  // Histogram computes it. Ppk uses the overall deviation, which also holds the drift between runs.
  let movingRange = 0;
  for (let i = 1; i < o.length; i++) movingRange += Math.abs(o[i]! - o[i - 1]!);
  const sdWithin = movingRange / (o.length - 1) / 1.128;
  const over = runs.filter((r) => r.overshoot > OVERSHOOT_USL);
  return {
    n: o.length,
    mean,
    sd,
    sdWithin,
    cpk: (OVERSHOOT_USL - mean) / (3 * sdWithin),
    ppk: (OVERSHOOT_USL - mean) / (3 * sd),
    over: over.length,
    max: Math.max(...o),
    /** The lowest gain among the runs over the limit. */
    minKpOver: Math.min(...over.map((r) => r.kp)),
  };
})();

// ---------- The live bench ----------

/**
 * A 1 kHz simulation of the bench running R-0412's loop: a 12 N·m step every 1.5 s, the response, and the phase
 * current it draws, with load bumps that sometimes push the current past its 32 A limit.
 */
export function createBench() {
  const rand = seeded(7);
  const { zeta, wn } = highGain;
  let t = 0;
  let pos = 0;
  let vel = 0;
  let bump = 0;
  return (dtMs: number) => {
    t += dtMs;
    const setpoint = Math.floor(t / 1500) % 2 ? TARGET : 0;
    const dt = dtMs / 1000;
    const acc = wn * wn * (setpoint - pos) - 2 * zeta * wn * vel;
    vel += acc * dt;
    pos += vel * dt;
    if (rand() < 0.0015) bump = 4 + 4 * rand();
    bump *= 0.985;
    const torque = pos + 0.05 * gaussian(rand);
    const phaseCurrent = 2.1 * Math.abs(pos) + 0.00015 * Math.abs(acc) + bump + 0.35 * gaussian(rand);
    return { t, command: setpoint, torque, current: Math.max(0, phaseCurrent) };
  };
}
