'use client';

import { CircleCheckIcon, CircleXIcon, TriangleAlertIcon } from 'lucide-react';
import { Badge } from '@dtheo/ui/components/badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@dtheo/ui/components/table';
import { fmt, runHistory } from '@/lib/lab-data';

// The six latest runs from the synthetic run history, newest first.
const runs = runHistory.slice(0, 6);

const resultBadge = {
  fail: { variant: 'destructive', Icon: CircleXIcon, word: 'Failed' },
  review: { variant: 'warning', Icon: TriangleAlertIcon, word: 'Near limit' },
  pass: { variant: 'success', Icon: CircleCheckIcon, word: 'Passed' },
} as const;

export default function TableExample() {
  const selected = 'R-0412';
  return (
    <div className="w-full overflow-hidden rounded-card border border-border bg-card">
      <Table>
        {/* Left-aligned: on narrow screens the table scrolls and a centered caption would be cut off. */}
        <TableCaption>Bench 3, firmware 4.18.2. Selected: R-0412.</TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Run</TableHead>
            <TableHead>Profile</TableHead>
            <TableHead>Result</TableHead>
            <TableHead numeric>Kp</TableHead>
            <TableHead numeric>Overshoot (%)</TableHead>
            <TableHead numeric>Settling (ms)</TableHead>
            <TableHead numeric>Peak current (A)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => {
            const badge = resultBadge[run.result];
            return (
              <TableRow key={run.id} aria-selected={run.id === selected}>
                <TableCell className="font-medium tabular-nums">{run.id}</TableCell>
                <TableCell className="text-muted-foreground">{run.profile}</TableCell>
                <TableCell>
                  <Badge variant={badge.variant}>
                    <badge.Icon aria-hidden="true" />
                    {badge.word}
                  </Badge>
                </TableCell>
                <TableCell numeric>{fmt.n2.format(run.kp)}</TableCell>
                <TableCell numeric>{fmt.n1.format(run.overshoot)}</TableCell>
                <TableCell numeric>{fmt.n0.format(run.settle)}</TableCell>
                <TableCell numeric>{fmt.n1.format(run.current)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
