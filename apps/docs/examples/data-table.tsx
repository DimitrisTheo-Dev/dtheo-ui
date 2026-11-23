'use client';

import { DataTable, type DataTableColumn } from '@dtheo/ui/components/data-table';
import { CURRENT_LIMIT, TORQUE_LIMIT, createBench, fmt } from '@/lib/lab-data';

interface Sample {
  t: number;
  command: number;
  torque: number;
  current: number;
}

// Ten seconds of the synthetic bench at 1 kHz: 10,000 rows, and only the ones in view are drawn.
const step = createBench();
const samples: Sample[] = Array.from({ length: 10_000 }, () => step(1));

const columns: Array<DataTableColumn<Sample>> = [
  { id: 't', header: 'Time', unit: 'ms', numeric: true, width: 96, value: (s) => s.t, sticky: true },
  {
    id: 'command',
    header: 'Command',
    unit: 'N·m',
    numeric: true,
    value: (s) => s.command,
    format: fmt.n1.format,
  },
  {
    id: 'torque',
    header: 'Torque',
    unit: 'N·m',
    numeric: true,
    value: (s) => s.torque,
    format: fmt.n2.format,
    // Near the limit starts at 9 % overshoot (13.08 N·m), as on the run review, not at 90 % of the torque.
    limit: { max: TORQUE_LIMIT, near: 0.99 },
  },
  {
    id: 'current',
    header: 'Phase current',
    unit: 'A',
    numeric: true,
    value: (s) => s.current,
    format: fmt.n1.format,
    limit: { max: CURRENT_LIMIT },
  },
];

export default function DataTableExample() {
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-label font-normal text-muted-foreground">
        Bench 3 · 10 s at 1 kHz · {fmt.n0.format(samples.length)} samples, highest torque first
      </p>
      <div className="overflow-hidden rounded-card border border-border bg-card">
        <DataTable
          aria-label="Bench 3 samples, 10 s at 1 kHz"
          rows={samples}
          columns={columns}
          getRowId={(s) => String(s.t)}
          defaultSort={{ id: 'torque', dir: 'desc' }}
          density="compact"
          className="h-80"
        />
      </div>
    </div>
  );
}
