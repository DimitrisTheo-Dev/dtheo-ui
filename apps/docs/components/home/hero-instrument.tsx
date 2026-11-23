'use client';

import * as React from 'react';
import { CircleCheckIcon, CircleXIcon, RotateCcwIcon, TriangleAlertIcon } from 'lucide-react';
import { Badge } from '@dtheo/ui/components/badge';
import { Button } from '@dtheo/ui/components/button';
import { Metric, MetricGroup } from '@dtheo/ui/components/metric';
import { formatQuantity } from '@dtheo/ui/components/quantity';
import { Slider } from '@dtheo/ui/components/slider';
import { ChartLegend, LineChart } from '@dtheo/charts';
import {
  CURRENT_LIMIT,
  DELAY,
  KP_RANGE,
  OVERSHOOT_LIMIT,
  RISE_LIMIT,
  SETTLE_LIMIT,
  TARGET,
  TORQUE_LIMIT,
  checkStatus,
  command,
  fmt,
  gains,
  reference,
  responseAt,
} from '@/lib/lab-data';

const verdicts = {
  fail: { word: 'Fail', variant: 'destructive', Icon: CircleXIcon },
  warn: { word: 'Review', variant: 'warning', Icon: TriangleAlertIcon },
  pass: { word: 'Pass', variant: 'success', Icon: CircleCheckIcon },
} as const;

/**
 * The landing page's first screen is the system doing its job: one step response against its limit, and the gain
 * that causes it under the visitor's hand. At the default gain it is R-0412 exactly, the run every example reviews;
 * moving Kp redraws the trace and re-runs the four checks, so the failure can be fixed, or made worse, in place.
 */
export function HeroInstrument({ intro }: { intro?: React.ReactNode }) {
  const [kp, setKp] = React.useState<number>(gains.kp);
  const measuredRun = kp === gains.kp;
  const { trace, metrics: m } = React.useMemo(() => responseAt(kp), [kp]);

  const checks = [
    // `name` is the check as a sentence says it; `label` is the check as its tile names it.
    {
      name: 'Overshoot',
      label: 'Overshoot',
      value: m.overshoot,
      unit: '%',
      digits: 1,
      limit: OVERSHOOT_LIMIT,
      scale: 1.5,
    },
    {
      name: 'Peak current',
      label: 'Peak current',
      value: m.peakCurrent,
      unit: 'A',
      digits: 1,
      limit: CURRENT_LIMIT,
      scale: 1.25,
    },
    {
      name: 'Settling time',
      label: 'Settling, 2 %',
      value: m.settle,
      unit: 'ms',
      digits: 0,
      limit: SETTLE_LIMIT,
      scale: 1.5,
    },
    {
      name: 'Rise time',
      label: 'Rise, 10–90 %',
      value: m.rise,
      unit: 'ms',
      digits: 0,
      limit: RISE_LIMIT,
      scale: 1.5,
    },
  ].map((c) => ({ ...c, status: checkStatus(c.value, c.limit) }));
  const failed = checks.filter((c) => c.status === 'fail');
  const near = checks.filter((c) => c.status === 'warn');
  const verdict = failed.length ? 'fail' : near.length ? 'warn' : 'pass';
  const v = verdicts[verdict];
  const name = measuredRun ? 'R-0412' : `Kp ${fmt.n2.format(kp)}`;

  // One sentence, as the run review writes it: what is wrong, by how much, against which limit.
  const worst = failed[0] ?? near[0];
  const over = worst ? worst.value - worst.limit : 0;
  // The gap between two percentages is in points, as the engineering data guide has it.
  const overBy =
    worst?.unit === '%'
      ? `${fmt.n1.format(over)} points`
      : formatQuantity(over, worst?.unit, { digits: worst?.digits });
  // A no-break space between a number and its unit, so "10 %" never splits across two lines.
  const limitText = worst ? formatQuantity(worst.limit, worst.unit) : '';
  const others = failed.length - 1;
  const more = others > 0 ? `, and ${others} more ${others > 1 ? 'checks fail' : 'check fails'}` : '';
  const sentence = !worst
    ? `All four checks pass at Kp ${fmt.n2.format(kp)}.`
    : worst.status === 'fail'
      ? `${worst.name} is ${overBy} over its ${limitText} limit${more}.`
      : `Nothing fails, but ${worst.name.toLowerCase()} (${formatQuantity(worst.value, worst.unit, { digits: worst.digits })}) is near its ${limitText} limit.`;
  // What a screen reader hears: the verdict and its cause, without the numbers, so it speaks when the outcome
  // changes and stays quiet while a drag moves the value under the same outcome. The slider says its own value.
  const spoken = !worst
    ? 'Pass: all four checks pass.'
    : worst.status === 'fail'
      ? `Fail: ${worst.name.toLowerCase()} is over its limit${more}.`
      : `Review: ${worst.name.toLowerCase()} is near its limit.`;
  const control = React.useRef<HTMLDivElement>(null);
  const reset = () => {
    setKp(gains.kp);
    // The button leaves with the change it made; focus goes back to the control it reset.
    control.current?.querySelector<HTMLElement>('input[type="range"]')?.focus();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* The statement on the left, the one control on the right, both resting on the chart's top edge. */}
      <div className="grid items-end gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {intro}
        <div className="flex flex-col gap-3">
          {/* The slider carries this name and value itself; the visible words are for sighted readers. */}
          <div aria-hidden="true" className="flex items-baseline justify-between gap-3 text-label">
            <span>Proportional gain, Kp</span>
            <span className="flex items-baseline gap-2">
              <span className="text-callout font-semibold tabular-nums">{fmt.n2.format(kp)}</span>
              <span className="font-normal text-subtle-foreground">
                {measuredRun ? 'as measured in R-0412' : 'what if'}
              </span>
            </span>
          </div>
          <div ref={control}>
            <Slider
              aria-label="Proportional gain, Kp"
              min={KP_RANGE[0]}
              max={KP_RANGE[1]}
              step={0.05}
              // Shift + arrow and Page Up / Down: ten steps, not the default of 10, which is wider than the range.
              largeStep={0.5}
              value={kp}
              onValueChange={(next) => setKp(Number((Array.isArray(next) ? next[0] : next).toFixed(2)))}
            />
          </div>
          {/* Tall enough for the longest sentence at each width, so the chart below never moves during a drag. */}
          <div className="flex min-h-14 items-center gap-3 lg:min-h-10">
            <Badge variant={v.variant}>
              <v.Icon aria-hidden="true" />
              {v.word}
            </Badge>
            <p className="min-w-0 flex-1 text-body text-muted-foreground text-pretty">{sentence}</p>
            <p aria-live="polite" className="sr-only">
              {spoken}
            </p>
            {measuredRun ? null : (
              <Button size="sm" variant="ghost" onClick={reset}>
                <RotateCcwIcon aria-hidden="true" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <ChartLegend
          items={[
            {
              label: measuredRun ? 'R-0412 measured' : `Step response at Kp ${fmt.n2.format(kp)}`,
              tone: 'primary',
            },
            { label: 'R-0409 reference', tone: 'muted' },
            { label: 'Command', tone: 'faint', kind: 'thin' },
            { label: 'Over limit', tone: 'critical', kind: 'area' },
          ]}
        />
        <LineChart
          ariaLabel={`Output torque for a ${TARGET} N·m step at Kp ${fmt.n2.format(kp)}. It peaks at ${fmt.n1.format(m.peak)} N·m, ${fmt.n1.format(m.overshoot)} % over the command, against a limit of ${OVERSHOOT_LIMIT} %.`}
          x={trace.t}
          xDomain={[0, 400]}
          xUnit="ms"
          yDomain={[0, 16]}
          yTicks={[0, 4, 8, 12, 16]}
          height={300}
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
            { id: 'meas', label: name, values: trace.torque, tone: 'primary', width: 2, unit: 'N·m' },
          ]}
          bands={[{ from: TARGET * 0.98, to: TARGET * 1.02, fromX: DELAY }]}
          thresholds={[
            {
              value: TORQUE_LIMIT,
              label: `Overshoot limit ${fmt.n1.format(TORQUE_LIMIT)} N·m`,
              shortLabel: `Limit +${OVERSHOOT_LIMIT} %`,
              shadeSeries: 'meas',
            },
          ]}
          // The peak is annotated only while it is over the limit: a note is for what needs attention, and under
          // the limit the overshoot check below carries the number.
          markers={
            m.peak > TORQUE_LIMIT
              ? [
                  {
                    x: m.peakAt,
                    y: m.peak,
                    label: `${fmt.n1.format(m.peak)} N·m`,
                    sublabel: `+${fmt.n1.format(m.overshoot)} %`,
                    tone: 'critical',
                  },
                ]
              : []
          }
        />
      </div>

      <MetricGroup aria-label="Acceptance checks" className="grid-cols-2 lg:grid-cols-4">
        {checks.map((c) => (
          <Metric
            key={c.label}
            label={c.label}
            value={(c.digits ? fmt.n1 : fmt.n0).format(c.value)}
            unit={c.unit}
            status={c.status}
            progress={c.value / (c.limit * c.scale)}
            limit={1 / c.scale}
            limitLabel={`Limit ≤ ${c.limit} ${c.unit}`}
          />
        ))}
      </MetricGroup>
    </div>
  );
}
