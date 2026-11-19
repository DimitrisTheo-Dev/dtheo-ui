'use client';

import * as React from 'react';
import { PauseIcon, PlayIcon } from 'lucide-react';
import { StreamChart, createStream } from '@dtheo/charts';
import { Button } from '@dtheo/ui/components/button';
import { createBench } from '@/lib/lab-data';

// A 1 kHz bench feed, simulated in the page. In an app this would be a WebSocket pushing into the same stream.
export default function StreamChartExample() {
  // Start with six seconds of history, so the chart opens full rather than filling in.
  const [{ stream, bench }] = React.useState(() => {
    const s = createStream(['command', 'torque'], 12_000);
    const b = createBench();
    for (let k = 0; k < 6000; k++) {
      const v = b(1);
      s.push(v.t, [v.command, v.torque]);
    }
    return { stream: s, bench: b };
  });
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    const id = setInterval(() => {
      for (let k = 0; k < 20; k++) {
        const s = bench(1);
        stream.push(s.t, [s.command, s.torque]);
      }
    }, 20);
    return () => clearInterval(id);
  }, [stream, bench]);

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-headline">Live torque</span>
          <span className="text-caption text-muted-foreground">RA-14 hip pitch · Bench 3 · 1 kHz</span>
        </div>
        <Button size="sm" onClick={() => setPaused((p) => !p)}>
          {paused ? <PlayIcon aria-hidden="true" /> : <PauseIcon aria-hidden="true" />}
          {paused ? 'Resume' : 'Pause'}
        </Button>
      </div>
      <StreamChart
        stream={stream}
        paused={paused}
        window={6000}
        yDomain={[-4, 16]}
        yTicks={[0, 4, 8, 12, 16]}
        series={[
          { channel: 'command', label: 'Command', tone: 'faint', width: 1, unit: 'N·m' },
          { channel: 'torque', label: 'Measured', unit: 'N·m', digits: 2 },
        ]}
        limits={[{ value: 13.2, label: 'Overshoot limit 13.2 N·m', channel: 'torque' }]}
        height={200}
        ariaLabel="Live torque on Bench 3: a 12 N·m step every 1.5 seconds; each step overshoots past the 13.2 N·m limit."
      />
    </div>
  );
}
