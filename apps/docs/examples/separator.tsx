'use client';

import { DownloadIcon, PlayIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { Separator } from '@dtheo/ui/components/separator';
import { OVERSHOOT_LIMIT, SETTLE_LIMIT, TEMP_LIMIT, fmt, gains as k } from '@/lib/lab-data';

// R-0412's gains and the acceptance limits it is checked against.
const gains = [
  ['Kp', fmt.n2.format(k.kp)],
  ['Ki', fmt.n2.format(k.ki)],
  ['Kd', fmt.n2.format(k.kd)],
];

const limits = [
  ['Overshoot', `${OVERSHOOT_LIMIT} %`],
  ['Settling time', `${SETTLE_LIMIT} ms`],
  ['Winding temperature', `${TEMP_LIMIT} °C`],
];

export default function SeparatorExample() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      {/* Between toolbar groups: run, zoom, export. */}
      <div
        role="toolbar"
        aria-label="Trace tools"
        className="flex h-9 items-center gap-1 self-start rounded-card border border-border bg-card px-1"
      >
        <Button variant="ghost" size="sm">
          <PlayIcon aria-hidden="true" />
          Run
        </Button>
        <Separator orientation="vertical" className="mx-1 h-4" />
        <Button variant="ghost" size="icon-sm" aria-label="Zoom in">
          <ZoomInIcon aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Zoom out">
          <ZoomOutIcon aria-hidden="true" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-4" />
        <Button variant="ghost" size="icon-sm" aria-label="Export CSV">
          <DownloadIcon aria-hidden="true" />
        </Button>
      </div>

      {/* Between sections of a panel. */}
      <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
        <Section title="Gains" rows={gains} />
        <Separator />
        <Section title="Limits" rows={limits} />
      </div>
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-caption font-semibold text-subtle-foreground">{title}</h3>
      <dl className="flex flex-col gap-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-body">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
