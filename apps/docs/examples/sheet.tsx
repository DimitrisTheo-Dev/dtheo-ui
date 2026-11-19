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

const initialRuns = [
  {
    id: 'R-0410',
    name: 'Nominal step',
    time: '09:12',
    kp: 3.2,
    kd: 0.08,
    note: 'Clean response, 4.1 % overshoot.',
  },
  { id: 'R-0411', name: 'Damped step', time: '11:05', kp: 3.6, kd: 0.12, note: '' },
  {
    id: 'R-0412',
    name: 'High-gain step',
    time: '14:32',
    kp: 4.2,
    kd: 0.06,
    note: 'Overshoot 17.6 %, over the 15 % limit.',
  },
];
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
            <SheetDescription>Bench 3 · firmware 4.18.2 · 18 Nov, {run.time}</SheetDescription>
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
