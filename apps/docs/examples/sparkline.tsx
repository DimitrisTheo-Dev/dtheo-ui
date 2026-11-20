'use client';

import { CircleXIcon } from 'lucide-react';
import { Sparkline } from '@dtheo/charts';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@dtheo/ui/components/table';
import { OVERSHOOT_LIMIT, runs } from '@/lib/lab-data';

// Overshoot (%) over the last 12 step tests of each joint on Bench 3, oldest first. Hip pitch is RA-14, up to R-0412.
const joints = [
  { name: 'Hip pitch', values: runs.slice(-12).map((r) => r.overshoot), trend: 'rising' },
  { name: 'Knee', values: [4.8, 4.9, 5.0, 5.1, 5.1, 5.0, 4.9, 4.9, 5.0, 5.1, 5.0, 4.9], trend: 'steady' },
  { name: 'Ankle', values: [9.2, 8.8, 8.1, 7.6, 7.0, 6.2, 5.9, 5.1, 4.6, 4.2, 3.9, 3.7], trend: 'falling' },
];

const LIMIT = OVERSHOOT_LIMIT;
// One shared scale, so a steady joint looks steady next to a rising one.
const DOMAIN: [number, number] = [0, Math.max(...joints.flatMap((j) => j.values))];

export default function SparklineExample() {
  return (
    <div className="w-full max-w-md overflow-hidden rounded-card border border-border bg-card">
      <Table>
        <TableCaption>Overshoot over the last 12 runs on Bench&nbsp;3. Limit&nbsp;10&nbsp;%.</TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Joint</TableHead>
            <TableHead>Trend</TableHead>
            <TableHead numeric>Latest</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {joints.map((j) => {
            const latest = j.values.at(-1)!;
            const over = latest > LIMIT;
            return (
              <TableRow key={j.name}>
                <TableCell className="font-medium">{j.name}</TableCell>
                <TableCell className="w-full">
                  <div className="w-20 sm:w-28">
                    <Sparkline
                      values={j.values}
                      domain={DOMAIN}
                      tone={over ? 'critical' : 'muted'}
                      height={24}
                      ariaLabel={`${j.name} overshoot over the last 12 runs, ${j.trend} from ${j.values[0]} % to ${latest} %`}
                    />
                  </div>
                </TableCell>
                <TableCell numeric className={over ? 'font-semibold text-destructive-foreground' : undefined}>
                  <span className="inline-flex items-center gap-1">
                    {over ? <CircleXIcon className="size-3.5" aria-hidden="true" /> : null}
                    {latest.toFixed(1)} %{over ? <span className="sr-only">, over the limit</span> : null}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
