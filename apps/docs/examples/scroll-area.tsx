'use client';

import { ScrollArea } from '@dtheo/ui/components/scroll-area';
import {
  CURRENT_LIMIT,
  DELAY,
  OVERSHOOT_LIMIT,
  SAMPLES,
  SETTLE_LIMIT,
  TARGET,
  TORQUE_LIMIT,
  fmt,
  gains,
  measured,
  measuredMetrics as M,
} from '@/lib/lab-data';

// Event log for R-0412, milliseconds from the start of the capture, read from the synthetic trace.
const { torque } = measured;
const backUnder = torque.findIndex((v, i) => i > M.peakAt && v < TORQUE_LIMIT);
const dipAt = torque.indexOf(Math.min(...torque.slice(M.peakAt, DELAY + M.settle)), M.peakAt);
const pct = (v: number) => fmt.n1.format((Math.abs(v - TARGET) / TARGET) * 100);
const end = SAMPLES - 1;

const events: Array<[number, string]> = [
  [0, 'Capture started, 1 kHz'],
  [0, 'Bench 3 armed, firmware 4.18.2'],
  [
    5,
    `Gains loaded: Kp\u00a0${fmt.n2.format(gains.kp)}, Ki\u00a0${fmt.n2.format(gains.ki)}, Kd\u00a0${fmt.n2.format(gains.kd)}`,
  ],
  [12, 'Winding temperature 38.4 °C'],
  [DELAY, `Step command 0 → ${TARGET} N·m`],
  [M.t10, 'Torque crossed 10 % of step'],
  [M.t90, 'Torque crossed 90 % of step'],
  [
    torque.findIndex((v) => v > TORQUE_LIMIT),
    `Torque passed the overshoot limit, ${fmt.n1.format(TORQUE_LIMIT)} N·m`,
  ],
  [M.peakCurrentAt, `Peak phase current ${fmt.n1.format(M.peakCurrent)} A`],
  [M.peakAt, `Peak torque ${fmt.n1.format(M.peak)} N·m, +${pct(M.peak)} %`],
  [backUnder, 'Torque back under the overshoot limit'],
  [dipAt, `Undershoot ${fmt.n1.format(torque[dipAt]!)} N·m, −${pct(torque[dipAt]!)} %`],
  [DELAY + M.settle, `Settled inside ±2 %, ${M.settle} ms after the step`],
  [300, 'Winding temperature 52.7 °C'],
  [end, `Capture stopped, ${fmt.n0.format(SAMPLES)} samples`],
  [end, `Overshoot check failed: ${pct(M.peak)} %, limit ${OVERSHOOT_LIMIT} %`],
  [end, `Current check near limit: ${fmt.n1.format(M.peakCurrent)} of ${CURRENT_LIMIT} A`],
  [end, `Settling check passed: ${M.settle} of ${SETTLE_LIMIT} ms`],
  [end + 3, 'Traces uploaded, 3.2 MB'],
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
