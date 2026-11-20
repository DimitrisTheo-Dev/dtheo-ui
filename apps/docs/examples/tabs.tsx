'use client';

import { Tabs, TabsList, TabsPanel, TabsTab } from '@dtheo/ui/components/tabs';
import {
  OVERSHOOT_LIMIT,
  SAMPLES,
  TARGET,
  WINDING_TEMP,
  fmt,
  gains,
  measuredMetrics as M,
} from '@/lib/lab-data';

const summary = [
  { label: 'Overshoot', value: `${fmt.n1.format(M.overshoot)} %` },
  { label: 'Settling time', value: `${fmt.n0.format(M.settle)} ms` },
  { label: 'Peak torque', value: `${fmt.n1.format(M.peak)} N·m` },
  { label: 'Winding temperature', value: `${fmt.n1.format(WINDING_TEMP)} °C` },
];

// One second of capture.
const traces = [
  { name: 'Torque', detail: `N·m · 1 kHz · ${fmt.n0.format(SAMPLES)} samples` },
  { name: 'Phase current', detail: `A · 1 kHz · ${fmt.n0.format(SAMPLES)} samples` },
  { name: 'Winding temperature', detail: '°C · 10 Hz · 11 samples' },
  { name: 'Encoder position', detail: `rad · 1 kHz · ${fmt.n0.format(SAMPLES)} samples` },
];

export default function TabsExample() {
  return (
    <Tabs defaultValue="overview" className="w-full max-w-md">
      <TabsList aria-label="R-0412 views">
        <TabsTab value="overview">Overview</TabsTab>
        <TabsTab value="traces">Traces</TabsTab>
        <TabsTab value="notes">Notes</TabsTab>
      </TabsList>
      {/* A shared minimum height keeps the layout still when switching views. */}
      <TabsPanel value="overview" className="min-h-40">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          {summary.map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <dt className="text-label font-normal text-muted-foreground">{s.label}</dt>
              <dd className="text-callout font-semibold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </TabsPanel>
      <TabsPanel value="traces" className="min-h-40">
        <ul className="flex flex-col divide-y divide-border">
          {traces.map((t) => (
            <li
              key={t.name}
              className="flex flex-wrap items-baseline justify-between gap-x-4 py-2 first:pt-0"
            >
              <span className="text-body font-medium">{t.name}</span>
              <span className="text-label font-normal text-muted-foreground tabular-nums">{t.detail}</span>
            </li>
          ))}
        </ul>
      </TabsPanel>
      <TabsPanel value="notes" className="min-h-40">
        <p className="text-body text-muted-foreground text-pretty">
          Overshoot is {fmt.n1.format(M.overshoot)}&nbsp;%, past the {OVERSHOOT_LIMIT}&nbsp;% limit. Kp&nbsp;
          {fmt.n2.format(gains.kp)} is too aggressive for the {TARGET}&nbsp;N·m step on firmware 4.18.2.
          Retune to Kp&nbsp;3.60 and rerun on Bench&nbsp;3 before approving the gains.
        </p>
      </TabsPanel>
    </Tabs>
  );
}
