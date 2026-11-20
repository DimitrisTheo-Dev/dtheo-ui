'use client';

import * as React from 'react';
import { ChartLegend, LineChart, type LineSeries } from '@dtheo/charts';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@dtheo/ui/components/card';
import { SegmentedControl, SegmentedControlItem } from '@dtheo/ui/components/toggle-group';
import {
  OVERSHOOT_LIMIT,
  TARGET,
  TORQUE_LIMIT,
  fmt,
  measured,
  measuredMetrics as M,
  reference,
} from '@/lib/lab-data';

// A 12 N·m step at 20 ms, sampled at 1 kHz.
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
];

const windows = {
  step: { label: '200 ms', domain: [0, 200] as [number, number] },
  full: { label: '400 ms', domain: [0, 400] as [number, number] },
};

export default function CardExample() {
  const [win, setWin] = React.useState<keyof typeof windows>('full');
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <div className="flex min-w-0 flex-col gap-0.5">
          <CardTitle>Torque step response</CardTitle>
          <CardDescription>R-0412 against the R-0409 reference, in N·m</CardDescription>
        </div>
        <CardAction>
          <SegmentedControl
            aria-label="Time window"
            value={[win]}
            onValueChange={(value) => {
              if (value[0]) setWin(value[0] as keyof typeof windows);
            }}
          >
            {Object.entries(windows).map(([key, w]) => (
              <SegmentedControlItem key={key} value={key}>
                {w.label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ChartLegend
          items={[
            { label: 'R-0412 measured', tone: 'primary' },
            { label: 'R-0409 reference', tone: 'muted' },
            { label: 'Over limit', tone: 'critical', kind: 'area' },
          ]}
        />
        <LineChart
          x={measured.t}
          series={series}
          xDomain={windows[win].domain}
          yDomain={[0, 16]}
          yTicks={[0, 4, 8, 12, 16]}
          xUnit="ms"
          height={200}
          thresholds={[
            { value: TORQUE_LIMIT, label: `Limit +${OVERSHOOT_LIMIT} %`, shadeSeries: 'measured' },
          ]}
          ariaLabel={`Torque step response. R-0412 overshoots the ${TARGET} N·m command by ${fmt.n1.format(M.overshoot)} %, past the ${OVERSHOOT_LIMIT} % limit; the R-0409 reference stays under it.`}
        />
      </CardContent>
      <CardFooter>Bench 3 · firmware 4.18.2 · captured at 1 kHz</CardFooter>
    </Card>
  );
}
