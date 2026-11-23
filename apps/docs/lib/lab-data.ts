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
/** R-0412's winding temperature at the end of the capture, in °C. Fixed, not computed by the step model. */
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
  ki: number;
  kd: number;
  /** % over the command. */
  overshoot: number;
  /** ms after the step. */
  settle: number;
  /** 10 to 90 % rise time, ms. */
  rise: number;
  /** Peak phase current, A. */
  current: number;
  /** Winding temperature, °C. */
  temp: number;
  result: 'fail' | 'review' | 'pass';
  /** As people read it: "18 Nov, 14:32". */
  started: string;
  /** Lab local time, for sorting and ranges: "2026-11-18T14:32". */
  startedAt: string;
  bench: string;
  firmware: string;
  operator: string;
}

// ---------- What if: the same step at another proportional gain ----------

/** The gains the what-if covers: slow enough at one end to fail rise time, lively enough at the other to ring. */
export const KP_RANGE = [1.6, 4.6] as const;

/**
 * Damping and natural frequency at a proportional gain: a curve through the two measured tunes (R-0409 at Kp 2.80
 * and R-0412 at 4.20) and the damping the 412-run population shows at 3.60. More gain makes a faster, less damped loop.
 */
function tuneAt(kp: number) {
  const [x0, x1, x2] = [referenceGains.kp, 3.6, gains.kp];
  const [y0, y1, y2] = [nominal.zeta, 0.615, highGain.zeta];
  const zeta =
    (y0 * (kp - x1) * (kp - x2)) / ((x0 - x1) * (x0 - x2)) +
    (y1 * (kp - x0) * (kp - x2)) / ((x1 - x0) * (x1 - x2)) +
    (y2 * (kp - x0) * (kp - x1)) / ((x2 - x0) * (x2 - x1));
  const wn = nominal.wn + ((kp - x0) / (x2 - x0)) * (highGain.wn - nominal.wn);
  return { zeta, wn };
}

/**
 * The step response and its checks at a gain, with R-0412's sensor noise, so a trace changes shape, not grain, as
 * the gain moves. At R-0412's own gain this is the measured run, number for number.
 */
export function responseAt(kp: number): { trace: Trace; metrics: RunMetrics } {
  if (kp === gains.kp) return { trace: measured, metrics: measuredMetrics };
  const { zeta, wn } = tuneAt(kp);
  const trace = simulate(zeta, wn, 11);
  return { trace, metrics: metrics(trace) };
}

/** RA-14 has run three firmware lines since 4.16; R-0412 ran on 4.18.2. */
export function firmwareOf(n: number) {
  if (n <= 140) return n <= 60 ? '4.16.2' : '4.16.3';
  if (n <= 290) return n <= 215 ? '4.17.0' : '4.17.1';
  return n <= 360 ? '4.18.0' : n <= 409 ? '4.18.1' : '4.18.2';
}

/** The acceptance checks every run is held to, in the order the run review shows them. */
export const runChecks = [
  { key: 'overshoot', label: 'Overshoot', unit: '%', limit: OVERSHOOT_LIMIT },
  { key: 'current', label: 'Peak current', unit: 'A', limit: CURRENT_LIMIT },
  { key: 'settle', label: 'Settling, 2 %', unit: 'ms', limit: SETTLE_LIMIT },
  { key: 'rise', label: 'Rise, 10–90 %', unit: 'ms', limit: RISE_LIMIT },
  { key: 'temp', label: 'Winding temp', unit: '°C', limit: TEMP_LIMIT },
] as const satisfies ReadonlyArray<{ key: keyof RunRow; label: string; unit: string; limit: number }>;

export type RunCheck = (typeof runChecks)[number]['key'];

/** A run fails when any check fails, and needs review when any check is near its limit. */
function resultOf(run: Omit<RunRow, 'result'>): RunRow['result'] {
  const checks = runChecks.map((c) => checkStatus(run[c.key], c.limit));
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
      ki: gains.ki,
      kd: gains.kd,
      overshoot: M.overshoot,
      settle: M.settle,
      rise: M.rise,
      current: M.peakCurrent,
      temp: WINDING_TEMP,
      started: '18 Nov, 14:32',
      startedAt: '2026-11-18T14:32',
      bench: 'Bench 3',
      firmware: firmwareOf(412),
      operator: 'Lena Varga',
    },
    {
      id: 'R-0411',
      profile: 'High-gain step',
      note: 'Kd 0.04',
      kp: gains.kp,
      ki: 0.8,
      kd: 0.04,
      overshoot: 21.3,
      settle: 248,
      rise: 42,
      current: 31.6,
      temp: 74.0,
      started: '18 Nov, 13:05',
      startedAt: '2026-11-18T13:05',
      bench: 'Bench 3',
      firmware: firmwareOf(411),
      operator: 'Lena Varga',
    },
    {
      id: 'R-0410',
      profile: 'Mid-gain step',
      kp: 3.4,
      ki: 0.8,
      kd: 0.06,
      overshoot: 9.1,
      settle: 176,
      rise: 51,
      current: 29.4,
      temp: 68.5,
      started: '18 Nov, 11:47',
      startedAt: '2026-11-18T11:47',
      bench: 'Bench 3',
      firmware: firmwareOf(410),
      operator: 'Tomás Ruiz',
    },
    {
      id: 'R-0409',
      profile: 'Nominal step',
      note: 'reference',
      kp: referenceGains.kp,
      ki: referenceGains.ki,
      kd: referenceGains.kd,
      overshoot: R.overshoot,
      settle: R.settle,
      rise: R.rise,
      current: R.peakCurrent,
      temp: 62.1,
      started: '17 Nov, 16:20',
      startedAt: '2026-11-17T16:20',
      bench: 'Bench 3',
      firmware: firmwareOf(409),
      operator: 'Lena Varga',
    },
    {
      id: 'R-0408',
      profile: 'Damped step',
      kp: 2.8,
      ki: 0.8,
      kd: 0.09,
      overshoot: 1.2,
      settle: 214,
      rise: 66,
      current: 25.1,
      temp: 60.4,
      started: '17 Nov, 15:02',
      startedAt: '2026-11-17T15:02',
      bench: 'Bench 3',
      firmware: firmwareOf(408),
      operator: 'Aiko Tanaka',
    },
    {
      id: 'R-0407',
      profile: 'Fast rise',
      kp: 3.9,
      ki: 0.8,
      kd: 0.06,
      overshoot: 12.4,
      settle: 231,
      rise: 47,
      current: 30.2,
      temp: 70.3,
      started: '17 Nov, 10:41',
      startedAt: '2026-11-17T10:41',
      bench: 'Bench 1',
      firmware: firmwareOf(407),
      operator: 'Tomás Ruiz',
    },
    {
      id: 'R-0406',
      profile: 'Thermal soak, 20 min',
      note: 'winding 84 °C',
      kp: 2.8,
      ki: 0.8,
      kd: 0.06,
      overshoot: 3.9,
      settle: 163,
      rise: 62,
      current: 26.0,
      temp: 84.0,
      started: '16 Nov, 17:55',
      startedAt: '2026-11-16T17:55',
      bench: 'Bench 5',
      firmware: firmwareOf(406),
      operator: 'Maria Silva',
    },
    {
      id: 'R-0405',
      profile: 'Nominal step',
      kp: 2.8,
      ki: 0.8,
      kd: 0.06,
      overshoot: 3.6,
      settle: 160,
      rise: 63,
      current: 26.3,
      temp: 58.2,
      started: '16 Nov, 09:12',
      startedAt: '2026-11-16T09:12',
      bench: 'Bench 3',
      firmware: firmwareOf(405),
      operator: 'Aiko Tanaka',
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

/**
 * The phase margin where the magnitude crosses 0 dB and the gain margin where the phase crosses −180°. Each crossing
 * is interpolated between the two grid samples around it (linear in log frequency), so the stated decimals are the
 * curve's, not the next grid point's.
 */
function marginsOf(frequency: number[], { magnitude, phase }: { magnitude: number[]; phase: number[] }) {
  const gc = magnitude.findIndex((m, i) => i > 0 && magnitude[i - 1]! >= 0 && m < 0);
  const pc = phase.findIndex((p, i) => i > 0 && phase[i - 1]! > -180 && p <= -180);
  const between = (i: number, values: number[], level: number) => {
    const t = (level - values[i - 1]!) / (values[i]! - values[i - 1]!);
    const lerp = (v: number[]) => v[i - 1]! + t * (v[i]! - v[i - 1]!);
    const f = Math.exp(Math.log(frequency[i - 1]!) + t * Math.log(frequency[i]! / frequency[i - 1]!));
    return { f, magnitude: lerp(magnitude), phase: lerp(phase) };
  };
  const g = between(gc, magnitude, 0);
  const p = between(pc, phase, -180);
  return {
    gainCrossover: g.f,
    phaseMargin: 180 + g.phase,
    phaseAtCrossover: g.phase,
    phaseCrossover: p.f,
    gainMargin: -p.magnitude,
    magnitudeAtPhaseCrossover: p.magnitude,
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = (n: number) => String(n).padStart(2, '0');
/** Lab local times, kept as UTC so the same run reads the same in every time zone. */
const stamp = (d: Date) => ({
  startedAt: `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`,
  started: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`,
});

const labUserName = 'Lena Varga';
const operators = [labUserName, 'Tomás Ruiz', 'Aiko Tanaka', 'Maria Silva'];
const notes = [
  'Retest',
  'After encoder recalibration',
  'Load cell swapped',
  'Ambient 28 °C',
  'Cable reseated',
];

/**
 * Every run on RA-14 since firmware 4.16, newest first, with all five checks: what the run history lists. Gain and
 * overshoot come from the 412-run population above, the history keeps its own runs, and the rest is drawn from a
 * separate seed so the histogram and its Cpk never move when this changes. Benches run weekdays, 08:00 to 19:00.
 */
export const runLog: RunRow[] = (() => {
  const rand = seeded(1604);
  const g = () => gaussian(rand);
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)]!;
  const known = new Map(runHistory.map((r) => [r.id, r]));
  const oldest = runHistory.at(-1)!;
  let t = Date.parse(`${oldest.startedAt}Z`);
  const out: RunRow[] = [...runHistory];
  for (let n = Number(oldest.id.slice(2)) - 1; n >= 1; n--) {
    // Step back to the run before: an hour or four, skipping nights and weekends.
    t -= (50 + 190 * rand()) * 60_000;
    let d = new Date(t);
    if (d.getUTCHours() < 8) {
      d = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - 1, 18, Math.floor(50 * rand())),
      );
    }
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d = new Date(d.getTime() - 86_400_000);
    t = d.getTime();

    const { id, kp, overshoot } = runs[n - 1]!;
    if (known.has(id)) continue;
    const thermal = rand() < 0.07;
    const damped = !thermal && kp < 3.3 && rand() < 0.2;
    const profile = thermal
      ? 'Thermal soak, 20 min'
      : damped
        ? 'Damped step'
        : kp >= 3.8
          ? 'High-gain step'
          : kp >= 3.3
            ? rand() < 0.5
              ? 'Mid-gain step'
              : 'Fast rise'
            : 'Nominal step';
    const kd = damped ? pick([0.08, 0.09]) : profile === 'High-gain step' ? pick([0.04, 0.05, 0.06]) : 0.06;
    const run: Omit<RunRow, 'result'> = {
      id,
      profile,
      note: damped && rand() < 0.4 ? `Kd ${kd}` : rand() < 0.05 ? pick(notes) : undefined,
      kp,
      ki: rand() < 0.85 ? 0.8 : pick([0.6, 1.0]),
      kd,
      overshoot,
      settle: Math.round(Math.min(330, Math.max(110, 140 + 5.2 * overshoot + 22 * g()))),
      rise: Math.round(Math.min(95, Math.max(34, 98 - 13 * kp + 4 * g()))),
      // A load bump now and then pushes the current up, as on the live bench.
      current: Number((20 + 2.3 * kp + 0.1 * overshoot + g() + (rand() < 0.03 ? 3.5 : 0)).toFixed(1)),
      temp: Number(
        (thermal ? 81 + 5 * rand() + (rand() < 0.25 ? 7 : 0) : 55 + 9 * rand() + 1.5 * kp).toFixed(1),
      ),
      ...stamp(d),
      bench: thermal ? 'Bench 5' : rand() < 0.62 ? 'Bench 3' : rand() < 0.6 ? 'Bench 1' : 'Bench 2',
      firmware: firmwareOf(n),
      operator: rand() < 0.4 ? labUserName : pick(operators),
    };
    if (run.note === undefined) delete run.note;
    out.push({ ...run, result: resultOf(run) });
  }
  return out;
})();

/**
 * Overshoot statistics across all runs: the numbers the histogram states, for metrics elsewhere on the page.
 */
export const overshootStats = (() => {
  const o = runs.map((r) => r.overshoot);
  const mean = o.reduce((a, b) => a + b, 0) / o.length;
  const sd = Math.sqrt(o.reduce((a, b) => a + (b - mean) ** 2, 0) / (o.length - 1));
  // Cpk uses the within-process spread: the average moving range between consecutive runs over d₂ (1.128). Ppk uses
  // the overall deviation, which also holds the drift between runs. This is the Histogram's capability() written
  // out, so the file installs on its own (dtheo add lab-data); a test keeps the two equal.
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
