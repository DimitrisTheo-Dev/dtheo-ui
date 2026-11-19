'use client';

import { Button } from '@dtheo/ui/components/button';
import { Checkbox } from '@dtheo/ui/components/checkbox';
import { Kbd } from '@dtheo/ui/components/kbd';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@dtheo/ui/components/table';
import { useRowSelection, withShift } from '@dtheo/ui/lib/use-row-selection';

const runs = [
  { id: 'R-0412', profile: 'High-gain step', overshoot: 17.6 },
  { id: 'R-0411', profile: 'High-gain step', overshoot: 21.3 },
  { id: 'R-0410', profile: 'Fast rise', overshoot: 9.4 },
  { id: 'R-0409', profile: 'Nominal step', overshoot: 4.1 },
  { id: 'R-0408', profile: 'Nominal step', overshoot: 6.8 },
  { id: 'R-0407', profile: 'Damped step', overshoot: 3.2 },
];
const ids = runs.map((r) => r.id);

export default function TableSelectionExample() {
  const sel = useRowSelection(ids);
  return (
    <div className="flex w-full max-w-lg flex-col gap-2">
      <div className="flex h-7 items-center justify-between gap-3 text-label font-normal text-muted-foreground">
        {sel.count ? (
          <>
            <span className="tabular-nums">{sel.count} selected</span>
            <Button size="xs" variant="ghost" onClick={sel.clear}>
              Clear
            </Button>
          </>
        ) : (
          <span className="flex items-center gap-1.5">
            Click one, then <Kbd>⇧</Kbd> click another
          </span>
        )}
      </div>
      <div className="overflow-hidden rounded-card border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Select all runs"
                  checked={sel.all}
                  indeterminate={sel.some}
                  onCheckedChange={(c) => sel.setAll(ids, c)}
                />
              </TableHead>
              <TableHead>Run</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead numeric>Overshoot</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((r) => (
              <TableRow key={r.id} aria-selected={sel.isSelected(r.id) || undefined}>
                <TableCell>
                  <Checkbox
                    aria-label={`Select ${r.id}`}
                    checked={sel.isSelected(r.id)}
                    onCheckedChange={(c, d) => sel.toggle(r.id, c, withShift(d))}
                  />
                </TableCell>
                <TableCell className="font-mono text-label">{r.id}</TableCell>
                <TableCell>{r.profile}</TableCell>
                <TableCell numeric>{r.overshoot.toFixed(1)} %</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
