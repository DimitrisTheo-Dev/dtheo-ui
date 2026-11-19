'use client';

import { ChartLegend, LineChart, type LineSeries } from '@dtheo/charts';

// Synthetic 1 kHz capture: an 8.0 N·m torque step at 20 ms, 400 ms long.
const SETPOINT = 8;
const STEP_AT = 20;
const LIMIT = SETPOINT * 1.1;

/** Unit step response of a second-order system: damping ratio z, natural frequency wn (rad/s), t in ms. */
function stepResponse(z: number, wn: number, tMs: number) {
  if (tMs < 0) return 0;
  const t = tMs / 1000;
  const root = Math.sqrt(1 - z * z);
  return 1 - (Math.exp(-z * wn * t) / root) * Math.sin(wn * root * t + Math.acos(z));
}

const t = Array.from({ length: 401 }, (_, i) => i);
const command = t.map((ms) => (ms >= STEP_AT ? SETPOINT : 0));
// Measured: under-damped (ζ 0.48, ωn 44 rad/s) plus a little sensor noise.
const measured = t.map(
  (ms) =>
    SETPOINT * stepResponse(0.484, 44, ms - STEP_AT) +
    0.012 * Math.sin(ms * 1.1) +
    0.008 * Math.sin(ms * 2.9),
);
// Reference: R-0409, the nominal tune (ζ 0.72, ωn 34 rad/s).
const reference = t.map((ms) => SETPOINT * stepResponse(0.72, 34, ms - STEP_AT));

const peakIndex = measured.reduce((best, v, i) => (v > measured[best]! ? i : best), 0);
const peak = measured[peakIndex]!;
const overshoot = ((peak - SETPOINT) / SETPOINT) * 100;
const referenceOvershoot = ((Math.max(...reference) - SETPOINT) / SETPOINT) * 100;

const series: LineSeries[] = [
  { id: 'measured', label: 'R-0412 measured', values: measured, tone: 'primary', width: 2, unit: 'N·m' },
  { id: 'reference', label: 'R-0409 reference', values: reference, tone: 'muted', width: 1.5, unit: 'N·m' },
  { id: 'command', label: 'Command', values: command, tone: 'faint', width: 1, unit: 'N·m' },
];

export default function LineChartExample() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-headline">Torque step response</h3>
        <p className="text-label font-normal text-muted-foreground">
          Torque in N·m · Bench 3 · 8.0 N·m step · 1 kHz
        </p>
      </div>
      <ChartLegend
        items={[
          { label: 'R-0412 measured', tone: 'primary' },
          { label: 'R-0409 reference', tone: 'muted' },
          { label: 'Command', tone: 'faint', kind: 'thin' },
          { label: '±2 % settling band', kind: 'band' },
          { label: 'Over limit', tone: 'critical', kind: 'area' },
        ]}
      />
      <LineChart
        x={t}
        series={series}
        yDomain={[0, 10]}
        xUnit="ms"
        height={280}
        thresholds={[
          {
            value: LIMIT,
            label: 'Overshoot limit +10 %',
            shortLabel: 'Limit +10 %',
            shadeSeries: 'measured',
          },
        ]}
        bands={[{ from: SETPOINT * 0.98, to: SETPOINT * 1.02, fromX: STEP_AT }]}
        markers={[
          {
            x: peakIndex,
            y: peak,
            label: `Peak ${peak.toFixed(2)} N·m`,
            sublabel: `+${overshoot.toFixed(1)} %`,
          },
        ]}
        ariaLabel={`Torque step response. R-0412 peaks at ${peak.toFixed(2)} N·m, ${overshoot.toFixed(1)} % over the 8.0 N·m command and past the 10 % overshoot limit. The R-0409 reference overshoots by ${referenceOvershoot.toFixed(1)} % and stays under the limit.`}
      />
    </div>
  );
}
