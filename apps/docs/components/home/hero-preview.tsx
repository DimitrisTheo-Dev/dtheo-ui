'use client';

import * as React from 'react';
import Link from 'next/link';
import { CircleXIcon, RotateCcwIcon } from 'lucide-react';
import { Card, CardContent } from '@dtheo/ui/components/card';
import { Metric, MetricGroup } from '@dtheo/ui/components/metric';
import { Button } from '@dtheo/ui/components/button';
import { Badge } from '@dtheo/ui/components/badge';
import { ChartLegend, LineChart } from '@dtheo/charts';
import {
  CURRENT_LIMIT,
  DELAY,
  OVERSHOOT_LIMIT,
  SETTLE_LIMIT,
  TARGET,
  TORQUE_LIMIT,
  checkStatus,
  command,
  fmt,
  measured,
  measuredMetrics as M,
  reference,
} from '@/lib/lab-data';

/**
 * The hero shows the product, not decoration: the live checks and trace from the run review example. The run is
 * synthetic and says so.
 */
export function HeroPreview() {
  return (
    <Card className="min-w-0 overflow-hidden shadow-raised">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="font-mono text-label text-muted-foreground">R-0412</span>
          <span className="truncate text-headline">High-gain step</span>
        </span>
        <Badge variant="destructive">
          <CircleXIcon aria-hidden="true" />
          Needs retune
        </Badge>
      </div>
      <CardContent className="flex flex-col gap-4">
        <MetricGroup aria-label="Acceptance checks" className="grid-cols-3">
          <Metric
            label="Overshoot"
            value={fmt.n1.format(M.overshoot)}
            unit="%"
            status={checkStatus(M.overshoot, OVERSHOOT_LIMIT)}
            progress={M.overshoot / (OVERSHOOT_LIMIT * 1.5)}
            limit={1 / 1.5}
          />
          <Metric
            label="Current"
            hint="Peak phase current"
            value={fmt.n1.format(M.peakCurrent)}
            unit="A"
            status={checkStatus(M.peakCurrent, CURRENT_LIMIT)}
            progress={M.peakCurrent / (CURRENT_LIMIT * 1.25)}
            limit={1 / 1.25}
          />
          <Metric
            label="Settling"
            hint="Time after the step until torque stays inside ±2 %"
            value={fmt.n0.format(M.settle)}
            unit="ms"
            status={checkStatus(M.settle, SETTLE_LIMIT)}
            progress={M.settle / (SETTLE_LIMIT * 1.5)}
            limit={1 / 1.5}
          />
        </MetricGroup>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
          <ChartLegend
            items={[
              { label: 'R-0412', tone: 'primary' },
              { label: 'R-0409 reference', tone: 'muted' },
              { label: 'Over limit', tone: 'critical', kind: 'area' },
            ]}
          />
          <span className="text-caption text-subtle-foreground">Synthetic data</span>
        </div>
        <LineChart
          ariaLabel={`Output torque: R-0412 overshoots ${fmt.n1.format(M.overshoot)} %, above the ${OVERSHOOT_LIMIT} % limit. Phase current peaks at ${fmt.n1.format(M.peakCurrent)} A of ${CURRENT_LIMIT} A.`}
          x={measured.t}
          xDomain={[0, 400]}
          xUnit="ms"
          yDomain={[0, 16]}
          yTicks={[0, 4, 8, 12, 16]}
          height={210}
          syncId="hero"
          series={[
            {
              id: 'cmd',
              label: 'Command',
              values: command,
              tone: 'faint',
              width: 1,
              unit: 'N·m',
              dot: false,
            },
            { id: 'ref', label: 'R-0409', values: reference.torque, tone: 'muted', width: 1.5, unit: 'N·m' },
            { id: 'meas', label: 'R-0412', values: measured.torque, tone: 'primary', width: 2, unit: 'N·m' },
          ]}
          bands={[{ from: TARGET * 0.98, to: TARGET * 1.02, fromX: DELAY }]}
          thresholds={[
            { value: TORQUE_LIMIT, label: 'Overshoot limit', shortLabel: 'Limit', shadeSeries: 'meas' },
          ]}
          markers={[
            {
              x: M.peakAt,
              y: M.peak,
              label: `${fmt.n1.format(M.peak)} N·m`,
              sublabel: `+${fmt.n1.format(M.overshoot)} %`,
            },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-label font-normal text-muted-foreground">
            Lower Kp or raise Kd, then rerun on Bench 3.
          </span>
          <Button variant="primary" size="sm" render={<Link href="/examples/run-review" />}>
            <RotateCcwIcon aria-hidden="true" />
            Review the run
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
