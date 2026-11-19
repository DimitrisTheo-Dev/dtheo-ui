'use client';

import * as React from 'react';
import { SegmentedControl, SegmentedControlItem } from '@dtheo/ui/components/toggle-group';

const windows = [
  { value: '100ms', label: '100 ms', summary: '0–100 ms: rises to 90 % of the setpoint in 38 ms.' },
  { value: '400ms', label: '400 ms', summary: '0–400 ms: peaks 17.6 % over at 61 ms, settles by 182 ms.' },
  { value: '1s', label: '1 s', summary: '0–1 s: holds inside the ±2 % band after 182 ms.' },
  { value: 'all', label: 'All', summary: '0–2.5 s: steady-state error 0.3 %, no drift.' },
];

export default function SegmentedControlExample() {
  const [value, setValue] = React.useState(['400ms']);
  const current = windows.find((w) => w.value === value[0]) ?? windows[1]!;
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
