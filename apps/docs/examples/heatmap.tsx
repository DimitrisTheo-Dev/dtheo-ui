'use client';

import { Heatmap } from '@dtheo/charts';

// Synthetic efficiency map for the hip-pitch actuator motor: 500 to 6000 rpm, 1 to 12 N·m.
const speeds = Array.from({ length: 23 }, (_, i) => 500 + i * 250);
const torques = Array.from({ length: 12 }, (_, i) => 1 + i);

/** Peak torque: 12 N·m up to the 3000 rpm base speed, then constant power. */
const maxTorque = (rpm: number) => (rpm <= 3000 ? 12 : (12 * 3000) / rpm);

/** Output power over input power, with copper, iron, windage and fixed losses (W). */
function efficiency(rpm: number, torque: number) {
  const w = (rpm * 2 * Math.PI) / 60;
  const output = torque * w;
  const copper = 1.4 * torque ** 2 * (1 + (torque / 6.5) ** 2);
  const iron = 0.3 * w + 5e-4 * w ** 2;
  const windage = 2e-6 * w ** 3;
  const losses = 0.34 * (copper + iron + windage + 30);
  return (100 * output) / (output + losses);
}

// Rows follow torque (bottom to top), columns follow speed. Points past the torque limit stay empty.
const values = torques.map((torque) =>
  speeds.map((rpm) => (torque > maxTorque(rpm) + 1e-9 ? Number.NaN : efficiency(rpm, torque))),
);

const duty = { rpm: 1500, torque: 8 };
const dutyEfficiency = efficiency(duty.rpm, duty.torque);

export default function HeatmapExample() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-headline">Motor efficiency map</h3>
        <p className="text-label font-normal text-muted-foreground">
          Hip-pitch actuator · firmware 4.18.2 · Bench 3
        </p>
      </div>
      <Heatmap
        xValues={speeds}
        yValues={torques}
        values={values}
        xLabel="Speed"
        xUnit="rpm"
        yLabel="Torque"
        yUnit="N·m"
        valueLabel="Efficiency"
        valueUnit="%"
        digits={0}
        domain={[65, 95]}
        xTicks={[1000, 2000, 3000, 4000, 5000]}
        yTicks={[2, 4, 6, 8, 10, 12]}
        marker={{ x: duty.rpm, y: duty.torque, label: `Duty point ${dutyEfficiency.toFixed(0)} %` }}
        ariaLabel={`Motor efficiency over speed and torque. Efficiency peaks at about 94 % around 2750 rpm and 6 N·m, and falls below 70 % at high speed with light torque and at low speed with peak torque. The duty point, 8 N·m at 1500 rpm, runs at ${dutyEfficiency.toFixed(0)} %.`}
      />
    </div>
  );
}
