'use client';

import * as React from 'react';
import { Button } from '@dtheo/ui/components/button';
import { Field, FieldLabel } from '@dtheo/ui/components/field';
import { Input } from '@dtheo/ui/components/input';
import { NumberField } from '@dtheo/ui/components/number-field';
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@dtheo/ui/components/sheet';
import { Textarea } from '@dtheo/ui/components/textarea';
import { useToast } from '@dtheo/ui/components/toast';
import { OVERSHOOT_LIMIT, fmt, runHistory } from '@/lib/lab-data';

// Today's three runs, oldest first, with a review note on each.
const initialRuns = runHistory
  .slice(0, 3)
  .toReversed()
  .map((r) => ({
    id: r.id,
    name: r.profile,
    started: r.started,
    kp: r.kp,
    kd: r.kd,
    note: `Overshoot ${fmt.n1.format(r.overshoot)} %, ${r.overshoot > OVERSHOOT_LIMIT ? 'over' : 'inside'} the ${OVERSHOOT_LIMIT} % limit.`,
  }));
const twoDecimals = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

export default function SheetExample() {
  const toast = useToast();
  const [runs, setRuns] = React.useState(initialRuns);
  const [open, setOpen] = React.useState(false);
  const [run, setRun] = React.useState(initialRuns[2]!);

  const save = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get('name') ?? '').trim() || run.name;
    setRuns((all) => all.map((r) => (r.id === run.id ? { ...r, name } : r)));
    setOpen(false);
    toast.add({ title: `${run.id} saved`, type: 'success' });
  };

  return (
    <>
      {/* The list stays in view behind the sheet, so you can see which run you are editing. */}
      <ul className="flex w-full max-w-sm flex-col divide-y divide-border rounded-card border border-border bg-card">
        {runs.map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-1.5 pr-1.5 pl-3">
            <span className="min-w-0 flex-1 truncate text-body">
              <span className="font-medium tabular-nums">{r.id}</span>
              <span className="text-muted-foreground"> · {r.name}</span>
            </span>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Edit ${r.id}`}
              onClick={() => {
                setRun(r);
                setOpen(true);
              }}
            >
              Edit
            </Button>
          </li>
        ))}
      </ul>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit {run.id}</SheetTitle>
            <SheetDescription>Bench 3 · firmware 4.18.2 · {run.started}</SheetDescription>
          </SheetHeader>
          <form key={run.id} onSubmit={save} className="flex flex-1 flex-col">
            <SheetBody>
              <Field>
                <FieldLabel>Run name</FieldLabel>
                <Input name="name" defaultValue={run.name} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Kp"
                  defaultValue={run.kp}
                  min={0}
                  max={10}
                  step={0.05}
                  format={twoDecimals}
                />
                <NumberField
                  label="Kd"
                  defaultValue={run.kd}
                  min={0}
                  max={1}
                  step={0.01}
                  format={twoDecimals}
                />
              </div>
              <Field>
                <FieldLabel optional>Note</FieldLabel>
                <Textarea defaultValue={run.note} placeholder="What should reviewers look at?" />
              </Field>
            </SheetBody>
            <SheetFooter>
              <SheetClose render={<Button variant="ghost" />}>Cancel</SheetClose>
              <Button type="submit" variant="primary">
                Save changes
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
