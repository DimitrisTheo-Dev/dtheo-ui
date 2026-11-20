'use client';

import * as React from 'react';
import { SegmentedControl, SegmentedControlItem } from '@dtheo/ui/components/toggle-group';
import { DELAY, OVERSHOOT_LIMIT, fmt, measuredMetrics as M } from '@/lib/lab-data';

// What R-0412's 1 s capture shows in each window. Times after the step; the step is applied at 20 ms.
const peak = `peaks ${fmt.n1.format(M.overshoot)} % over the command ${M.peakAt - DELAY} ms after the step`;
const windows = [
  {
    value: '100ms',
    label: '100 ms',
    summary: `0–100 ms: rises from 10 to 90 % of the command in ${M.rise} ms.`,
  },
  { value: '200ms', label: '200 ms', summary: `0–200 ms: ${peak}, past the ${OVERSHOOT_LIMIT} % limit.` },
  { value: '400ms', label: '400 ms', summary: `0–400 ms: ${peak} and settles ${M.settle} ms after it.` },
  {
    value: '1s',
    label: '1 s',
    summary: `0–1 s: stays inside the ±2 % band from ${M.settle} ms after the step to the end of the capture.`,
  },
];

export default function SegmentedControlExample() {
  const [value, setValue] = React.useState(['400ms']);
  const current = windows.find((w) => w.value === value[0]) ?? windows[2]!;
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-headline">Step response</span>
          <span className="text-caption text-muted-foreground">R-0412 · Bench 3</span>
        </div>
        <SegmentedControl
          aria-label="Time window"
          value={value}
          // Clicking the pressed segment would empty the group; a time window always has one value.
          onValueChange={(next) => next.length && setValue(next)}
        >
          {windows.map((w) => (
            <SegmentedControlItem key={w.value} value={w.value}>
              {w.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>
      <p className="rounded-card border border-border bg-background px-3 py-2.5 text-body text-muted-foreground tabular-nums">
        {current.summary}
      </p>
    </div>
  );
}
