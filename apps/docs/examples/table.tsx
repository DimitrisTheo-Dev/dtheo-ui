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

type Result = 'fail' | 'warn' | 'pass';

const runs: Array<{
  id: string;
  profile: string;
  result: Result;
  kp: number;
  overshoot: number;
  settling: number;
  peak: number;
}> = [
  {
    id: 'R-0412',
    profile: 'High-gain step',
    result: 'fail',
    kp: 4.2,
    overshoot: 17.6,
    settling: 186,
    peak: 9.41,
  },
  {
    id: 'R-0411',
    profile: 'High-gain step',
    result: 'fail',
    kp: 3.9,
    overshoot: 11.2,
    settling: 174,
    peak: 8.9,
  },
  { id: 'R-0410', profile: 'Fast rise', result: 'warn', kp: 3.6, overshoot: 7.9, settling: 192, peak: 8.63 },
  {
    id: 'R-0409',
    profile: 'Nominal step',
    result: 'pass',
    kp: 3.2,
    overshoot: 3.8,
    settling: 158,
    peak: 8.3,
  },
  {
    id: 'R-0408',
    profile: 'Nominal step',
    result: 'pass',
    kp: 3.2,
    overshoot: 6.8,
    settling: 161,
    peak: 8.54,
  },
  {
    id: 'R-0407',
    profile: 'Damped step',
    result: 'pass',
    kp: 2.8,
    overshoot: 5.2,
    settling: 149,
    peak: 8.42,
  },
];

const resultBadge = {
  fail: { variant: 'destructive', Icon: CircleXIcon, word: 'Failed' },
  warn: { variant: 'warning', Icon: TriangleAlertIcon, word: 'Near limit' },
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
            <TableHead numeric>Peak torque (N·m)</TableHead>
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
                <TableCell numeric>{run.kp.toFixed(2)}</TableCell>
                <TableCell numeric>{run.overshoot.toFixed(1)}</TableCell>
                <TableCell numeric>{run.settling}</TableCell>
                <TableCell numeric>{run.peak.toFixed(2)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
