'use client';

import { Tabs, TabsList, TabsPanel, TabsTab } from '@dtheo/ui/components/tabs';

const summary = [
  { label: 'Overshoot', value: '17.6 %' },
  { label: 'Settling time', value: '186 ms' },
  { label: 'Peak torque', value: '9.41 N·m' },
  { label: 'Winding temperature', value: '71.2 °C' },
];

const traces = [
  { name: 'Torque', detail: 'N·m · 1 kHz · 400 samples' },
  { name: 'Phase current A, B, C', detail: 'A · 20 kHz · 8000 samples' },
  { name: 'Winding temperature', detail: '°C · 10 Hz · 4 samples' },
  { name: 'Encoder position', detail: 'rad · 1 kHz · 400 samples' },
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
          Overshoot is 17.6&nbsp;%, past the 10&nbsp;% limit. Kp&nbsp;4.20 is too aggressive for the
          8.0&nbsp;N·m step on firmware 4.18.2. Retune to Kp&nbsp;3.60 and rerun on Bench&nbsp;3 before
          approving the gains.
        </p>
      </TabsPanel>
    </Tabs>
  );
}
