/**
 * Synthetic lab data for the tuning examples. Everything is computed from small models, not typed in, so the
 * numbers agree with each other and with the run review: R-0412 runs the RA-14 hip-pitch loop at 1.5× the gain
 * of the R-0409 reference, which costs phase margin and shows up as overshoot.
 */

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
const TAU = 2 * Math.PI;

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
const current = bodeOf(bodeFrequency, 60);
const reference = bodeOf(bodeFrequency, 40);

export const bode = {
  frequency: bodeFrequency,
  current,
  reference,
  margins: marginsOf(bodeFrequency, current),
  referenceMargins: marginsOf(bodeFrequency, reference),
};

// ---------- A seeded random source, so every visit shows the same data ----------

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Standard normal from two uniforms (Box–Muller). */
function gaussian(rand: () => number) {
  return Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(TAU * rand());
}

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

export const OVERSHOOT_USL = 10;

export const runs: LabRun[] = (() => {
  const rand = seeded(412);
  const out: LabRun[] = [];
  for (let n = 1; n <= 411; n++) {
    // Most runs sit near the nominal tune; a tail explores higher gains.
    const kp = Math.min(4.6, Math.max(1.6, 2.8 + 0.42 * gaussian(rand) + (rand() < 0.18 ? 0.9 * rand() : 0)));
    const overshoot = Math.max(0.4, 1.2 + 3.1 * (kp - 1.6) ** 1.25 + 1.3 * gaussian(rand));
    out.push({
      id: `R-${String(n).padStart(4, '0')}`,
      kp: Number(kp.toFixed(2)),
      overshoot: Number(overshoot.toFixed(1)),
    });
  }
  out.push({ id: 'R-0412', kp: 4.2, overshoot: 17.6 });
  return out;
})();

/** Overshoot statistics across all runs: the numbers the histogram states, for metrics elsewhere on the page. */
export const overshootStats = (() => {
  const o = runs.map((r) => r.overshoot);
  const mean = o.reduce((a, b) => a + b, 0) / o.length;
  const sd = Math.sqrt(o.reduce((a, b) => a + (b - mean) ** 2, 0) / (o.length - 1));
  return {
    n: o.length,
    mean,
    sd,
    cpk: (OVERSHOOT_USL - mean) / (3 * sd),
    over: o.filter((v) => v > OVERSHOOT_USL).length,
  };
})();

// ---------- The live bench ----------

/**
 * A 1 kHz simulation of the bench: a 12 N·m step every 1.5 s, the loop's response, and the phase current it
 * draws, with load bumps that sometimes push the current past its 32 A limit.
 */
export function createBench() {
  const rand = seeded(7);
  const zeta = 0.485;
  const wn = 40;
  let t = 0;
  let pos = 0;
  let vel = 0;
  let bump = 0;
  return (dtMs: number) => {
    t += dtMs;
    const command = Math.floor(t / 1500) % 2 ? 12 : 0;
    const dt = dtMs / 1000;
    const acc = wn * wn * (command - pos) - 2 * zeta * wn * vel;
    vel += acc * dt;
    pos += vel * dt;
    if (rand() < 0.0015) bump = 4 + 4 * rand();
    bump *= 0.985;
    const torque = pos + 0.05 * gaussian(rand);
    const phaseCurrent = 2.1 * Math.abs(pos) + 0.00015 * Math.abs(acc) + bump + 0.35 * gaussian(rand);
    return { t, command, torque, current: Math.max(0, phaseCurrent) };
  };
}
