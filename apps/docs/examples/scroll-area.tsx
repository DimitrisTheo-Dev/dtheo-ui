'use client';

import { ScrollArea } from '@dtheo/ui/components/scroll-area';

// Event log for R-0412, milliseconds from the start of the capture.
const events: Array<[number, string]> = [
  [0, 'Capture started, 1 kHz'],
  [0, 'Bench 3 armed, firmware 4.18.2'],
  [5, 'Gains loaded: Kp\u00a04.20, Ki\u00a00.80, Kd\u00a00.12'],
  [12, 'Winding temperature 38.4 °C'],
  [20, 'Step command 0 → 8.0 N·m'],
  [32, 'Torque crossed 10 % of step'],
  [68, 'Torque crossed 90 % of step'],
  [83, 'Torque passed the overshoot limit, 8.80 N·m'],
  [102, 'Peak torque 9.41 N·m, +17.6 %'],
  [104, 'Peak phase current 31.2 A'],
  [128, 'Torque back under the overshoot limit'],
  [183, 'Undershoot 7.75 N·m, −3.1 %'],
  [206, 'Settled inside ±2 %, 186 ms after the step'],
  [265, 'Second peak 8.04 N·m, +0.5 %'],
  [300, 'Winding temperature 52.7 °C'],
  [400, 'Capture stopped, 401 samples'],
  [412, 'Overshoot check failed, limit 10 %'],
  [412, 'Settling check near limit, 186 of 200 ms'],
  [415, 'Traces uploaded, 3.2 MB'],
];

export default function ScrollAreaExample() {
  return (
    <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-card border border-border bg-card">
      <h3 className="border-b border-border px-4 py-2.5 text-headline">R-0412 event log</h3>
      <ScrollArea className="h-64">
        <ol className="flex flex-col py-1.5">
          {events.map(([ms, text]) => (
            <li key={`${ms}-${text}`} className="grid grid-cols-[3.5rem_1fr] gap-3 px-4 py-1.5 text-body">
              <span className="text-right text-muted-foreground tabular-nums">{ms} ms</span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </ScrollArea>
    </div>
  );
}
