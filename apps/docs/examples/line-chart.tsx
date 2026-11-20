'use client';

import { ChartLegend, LineChart, type LineSeries } from '@dtheo/charts';
import {
  DELAY,
  OVERSHOOT_LIMIT,
  TARGET,
  TORQUE_LIMIT,
  command,
  fmt,
  measured,
  measuredMetrics as M,
  reference,
  referenceMetrics as R,
} from '@/lib/lab-data';

// Synthetic 1 kHz capture of R-0412: a 12 N·m torque step at 20 ms, against the R-0409 reference.
const series: LineSeries[] = [
  {
    id: 'measured',
    label: 'R-0412 measured',
    values: measured.torque,
    tone: 'primary',
    width: 2,
    unit: 'N·m',
  },
  {
    id: 'reference',
    label: 'R-0409 reference',
    values: reference.torque,
    tone: 'muted',
    width: 1.5,
    unit: 'N·m',
  },
  { id: 'command', label: 'Command', values: command, tone: 'faint', width: 1, unit: 'N·m' },
];

export default function LineChartExample() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-headline">Torque step response</h3>
        <p className="text-label font-normal text-muted-foreground">
          Torque in N·m · Bench 3 · {TARGET} N·m step · 1 kHz
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
        x={measured.t}
        series={series}
        xDomain={[0, 400]}
        yDomain={[0, 16]}
        yTicks={[0, 4, 8, 12, 16]}
        xUnit="ms"
        height={280}
        thresholds={[
          {
            value: TORQUE_LIMIT,
            label: `Overshoot limit +${OVERSHOOT_LIMIT} %`,
            shortLabel: `Limit +${OVERSHOOT_LIMIT} %`,
            shadeSeries: 'measured',
          },
        ]}
        bands={[{ from: TARGET * 0.98, to: TARGET * 1.02, fromX: DELAY }]}
        markers={[
          {
            x: M.peakAt,
            y: M.peak,
            label: `Peak ${fmt.n1.format(M.peak)} N·m`,
            sublabel: `+${fmt.n1.format(M.overshoot)} %`,
          },
        ]}
        ariaLabel={`Torque step response. R-0412 peaks at ${fmt.n1.format(M.peak)} N·m, ${fmt.n1.format(M.overshoot)} % over the ${TARGET} N·m command and past the ${OVERSHOOT_LIMIT} % overshoot limit. The R-0409 reference overshoots by ${fmt.n1.format(R.overshoot)} % and stays under the limit.`}
      />
    </div>
  );
}
