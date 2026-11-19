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

/** Unit step response of a second-order system: damping ratio z, natural frequency wn (rad/s), t in ms. */
function stepResponse(z: number, wn: number, tMs: number) {
  if (tMs < 0) return 0;
  const t = tMs / 1000;
  const root = Math.sqrt(1 - z * z);
  return 1 - (Math.exp(-z * wn * t) / root) * Math.sin(wn * root * t + Math.acos(z));
}

// 8.0 N·m step at 20 ms, sampled at 1 kHz.
const t = Array.from({ length: 401 }, (_, i) => i);
const series: LineSeries[] = [
  {
    id: 'measured',
    label: 'R-0412 measured',
    values: t.map((ms) => 8 * stepResponse(0.484, 44, ms - 20)),
    tone: 'primary',
    width: 2,
    unit: 'N·m',
  },
  {
    id: 'reference',
    label: 'R-0409 reference',
    values: t.map((ms) => 8 * stepResponse(0.72, 34, ms - 20)),
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
          x={t}
          series={series}
          xDomain={windows[win].domain}
          yDomain={[0, 10]}
          xUnit="ms"
          height={200}
          thresholds={[{ value: 8.8, label: 'Limit +10 %', shadeSeries: 'measured' }]}
          ariaLabel="Torque step response. R-0412 overshoots the 8.0 N·m command by 17.6 %, past the 10 % limit; the R-0409 reference stays under it."
        />
      </CardContent>
      <CardFooter>Bench 3 · firmware 4.18.2 · captured at 1 kHz</CardFooter>
    </Card>
  );
}
