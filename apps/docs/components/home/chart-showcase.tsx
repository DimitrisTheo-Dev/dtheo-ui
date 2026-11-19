'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRightIcon, PauseIcon, PlayIcon } from 'lucide-react';
import { StreamChart, createStream } from '@dtheo/charts';
import { Button } from '@dtheo/ui/components/button';
import { examples } from '@/examples';
import { createBench } from '@/lib/lab-data';

/**
 * The live chart on the landing page starts paused on six seconds of history: nothing moves until the reader asks,
 * so the section stays calm to scan.
 */
function LivePreview() {
  const [{ stream, bench }] = React.useState(() => {
    const s = createStream(['command', 'torque'], 12_000);
    const b = createBench();
    for (let k = 0; k < 6000; k++) {
      const v = b(1);
      s.push(v.t, [v.command, v.torque]);
    }
    return { stream: s, bench: b };
  });
  const [live, setLive] = React.useState(false);
  React.useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      for (let k = 0; k < 20; k++) {
        const v = bench(1);
        stream.push(v.t, [v.command, v.torque]);
      }
    }, 20);
    return () => clearInterval(id);
  }, [live, stream, bench]);
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-headline">Live torque</span>
          <span className="text-caption text-muted-foreground">Bench 3 · 1 kHz · synthetic feed</span>
        </div>
        <Button size="sm" variant={live ? 'secondary' : 'primary'} onClick={() => setLive((l) => !l)}>
          {live ? <PauseIcon aria-hidden="true" /> : <PlayIcon aria-hidden="true" />}
          {live ? 'Pause' : 'Go live'}
        </Button>
      </div>
      <StreamChart
        stream={stream}
        paused={!live}
        window={6000}
        yDomain={[-4, 16]}
        yTicks={[0, 4, 8, 12, 16]}
        series={[
          { channel: 'command', label: 'Command', tone: 'faint', width: 1, unit: 'N·m' },
          { channel: 'torque', label: 'Torque', unit: 'N·m', digits: 2 },
        ]}
        limits={[{ value: 13.2, label: 'Limit 13.2 N·m', channel: 'torque' }]}
        height={330}
        ariaLabel="Torque against a 12 N·m step command. Each step overshoots past the 13.2 N·m limit, drawn in red."
      />
    </div>
  );
}

const charts = [
  {
    id: 'stream-chart',
    title: 'Stream chart',
    text: 'Live telemetry at 1 kHz. Anything past a limit turns red as it happens.',
    features: ['Canvas, one draw per frame', 'Spikes kept', 'Stops off screen'],
  },
  {
    id: 'frequency-chart',
    title: 'Frequency chart',
    text: 'Bode plots and spectra on a log axis, with margins drawn where they are measured.',
    features: ['Gain and phase margin', 'Resonance peaks', 'One crosshair, two panes'],
  },
  {
    id: 'scatter-chart',
    title: 'Scatter chart',
    text: 'Two measures across hundreds of runs, with the fit, the limit and your run called out.',
    features: ['Thousands of points', 'Least-squares fit', 'Arrow-key reading'],
  },
  {
    id: 'histogram',
    title: 'Histogram',
    text: 'A distribution against spec limits, with Cpk stated in words.',
    features: ['Spec limits', 'Cpk and a verdict', 'Normal fit'],
  },
];

const classics = [
  { title: 'Line chart', href: '/docs/charts/line-chart' },
  { title: 'Bar chart', href: '/docs/charts/bar-chart' },
  { title: 'Heatmap', href: '/docs/charts/heatmap' },
  { title: 'Sparkline', href: '/docs/charts/sparkline' },
];

export function ChartShowcase() {
  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-3 lg:grid-cols-2">
        {charts.map((c) => {
          const Example = c.id === 'stream-chart' ? LivePreview : examples[c.id];
          return (
            <li
              key={c.id}
              className="flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card"
            >
              <div className="flex flex-col gap-2 p-5 pb-0 sm:p-6 sm:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-title-3">{c.title}</h3>
                  <Link
                    href={`/docs/charts/${c.id}`}
                    className="group inline-flex items-center gap-1 rounded-control text-label text-link"
                  >
                    Docs
                    <ArrowUpRightIcon
                      aria-hidden="true"
                      className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </Link>
                </div>
                <p className="text-body text-muted-foreground">{c.text}</p>
                <ul aria-label={`${c.title} features`} className="flex flex-wrap gap-1.5 pt-1">
                  {c.features.map((f) => (
                    <li
                      key={f}
                      className="inline-flex h-6 items-center rounded-full bg-secondary px-2.5 text-caption text-secondary-foreground"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex min-w-0 flex-1 items-start justify-center p-5 sm:p-6">
                {Example ? <Example /> : null}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="flex flex-wrap items-center gap-2 text-body text-muted-foreground">
        Also in the box:
        {classics.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="inline-flex h-7 items-center rounded-full border border-border bg-card px-3 text-label font-normal text-foreground transition-colors duration-150 hover:border-border-strong"
          >
            {c.title}
          </Link>
        ))}
      </p>
    </div>
  );
}
