'use client';

import * as React from 'react';
import { RotateCcwIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@dtheo/ui/components/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@dtheo/ui/components/field';
import { NumberField } from '@dtheo/ui/components/number-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@dtheo/ui/components/select';
import { Switch } from '@dtheo/ui/components/switch';
import { Textarea } from '@dtheo/ui/components/textarea';
import { Alert, AlertActions, AlertContent, AlertDescription, AlertTitle } from '@dtheo/ui/components/alert';
import { useToast } from '@dtheo/ui/components/toast';
import { Combobox, type ComboboxOption } from '@dtheo/ui/components/combobox';

const benches = [
  { value: 'bench-3', label: 'Bench 3' },
  { value: 'bench-1', label: 'Bench 1' },
  { value: 'bench-5', label: 'Bench 5 · thermal chamber' },
];

// Long lists people search by ID or name: a combobox, not a select.
const actuators: ComboboxOption[] = [
  { value: 'ra-14', label: 'RA-14 hip pitch', description: 'Bench 3 · firmware 4.18.2' },
  { value: 'ra-15', label: 'RA-15 hip roll', description: 'Bench 3 · firmware 4.18.2' },
  { value: 'rl-22', label: 'RL-22 knee', description: 'Bench 1 · firmware 4.18.0' },
  { value: 'rl-23', label: 'RL-23 ankle pitch', description: 'Bench 1 · firmware 4.18.0' },
  { value: 'rw-05', label: 'RW-05 wrist roll', description: 'Bench 5 · firmware 4.17.9' },
  { value: 'rw-06', label: 'RW-06 wrist pitch', description: 'Bench 5 · firmware 4.17.9' },
  { value: 'rs-31', label: 'RS-31 shoulder pitch', description: 'Bench 2 · firmware 4.18.2' },
  { value: 'rs-32', label: 'RS-32 shoulder roll', description: 'Bench 2 · firmware 4.18.2' },
];

const initial = {
  actuator: actuators[0] as ComboboxOption | null,
  overshoot: 10 as number | null,
  settle: 250 as number | null,
  bench: 'bench-3' as string | null,
  notify: true,
  note: '',
};

/** The forms pattern: grouped fields, units in the field, validation that explains, a save that never loses work. */
export function FormDemo() {
  const toast = useToast();
  const [values, setValues] = React.useState(initial);
  const [saved, setSaved] = React.useState(initial);
  const [failNext, setFailNext] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const overshootInvalid = values.overshoot === null || values.overshoot < 1 || values.overshoot > 30;
  const settleInvalid = values.settle === null || values.settle < 50 || values.settle > 1000;
  const set = <K extends keyof typeof initial>(k: K, v: (typeof initial)[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  const save = () => {
    if (overshootInvalid || settleInvalid) return;
    setSaving(true);
    setError(false);
    setTimeout(() => {
      setSaving(false);
      if (failNext) {
        setError(true);
        return;
      }
      setSaved(values);
      toast.add({
        title: 'Limits saved',
        description: `New runs on ${values.actuator?.label.split(' ')[0] ?? 'this actuator'} are checked against them.`,
        type: 'success',
      });
    }, 900);
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-label font-normal text-muted-foreground">
        <Switch checked={failNext} onCheckedChange={setFailNext} />
        Make the next save fail
      </label>
      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex flex-col gap-0.5">
            <CardTitle>Acceptance limits</CardTitle>
            <CardDescription>Every new step test on the actuator is checked against these.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertContent>
                <AlertTitle>Limits were not saved</AlertTitle>
                <AlertDescription>
                  The spec service rejected the request (timeout). Your changes are still here.
                </AlertDescription>
              </AlertContent>
              <AlertActions>
                <Button size="sm" onClick={save}>
                  <RotateCcwIcon aria-hidden="true" />
                  Retry
                </Button>
              </AlertActions>
            </Alert>
          ) : null}
          <Field>
            <FieldLabel>Actuator</FieldLabel>
            <Combobox
              items={actuators}
              value={values.actuator}
              onValueChange={(v) => set('actuator', v)}
              placeholder="Search by ID or joint"
              emptyMessage="No actuator matches. Check the ID on the bench label."
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field invalid={overshootInvalid}>
              <NumberField
                label="Overshoot limit"
                unit="%"
                value={values.overshoot}
                onValueChange={(v) => set('overshoot', v)}
                min={0}
                max={100}
                step={0.5}
              />
              {overshootInvalid ? (
                <FieldError match>Enter a limit between 1 and 30 %.</FieldError>
              ) : (
                <FieldDescription>Peak above the command.</FieldDescription>
              )}
            </Field>
            <Field invalid={settleInvalid}>
              <NumberField
                label="Settling limit"
                unit="ms"
                value={values.settle}
                onValueChange={(v) => set('settle', v)}
                min={0}
                max={5000}
                step={10}
              />
              {settleInvalid ? (
                <FieldError match>Enter a limit between 50 and 1,000 ms.</FieldError>
              ) : (
                <FieldDescription>To within ±2 % of the command.</FieldDescription>
              )}
            </Field>
          </div>
          <Field>
            <FieldLabel>Default bench</FieldLabel>
            <Select items={benches} value={values.bench} onValueChange={(v) => set('bench', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {benches.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <label className="flex items-start justify-between gap-4">
            <span className="flex flex-col gap-0.5">
              <span className="text-label">Notify on failure</span>
              <span className="text-caption text-muted-foreground">
                Message the actuator owner when a run fails a limit.
              </span>
            </span>
            <Switch checked={values.notify} onCheckedChange={(v) => set('notify', v)} />
          </label>
          <Field>
            <FieldLabel optional>Reason for the change</FieldLabel>
            <Textarea
              value={values.note}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set('note', e.target.value)}
              placeholder="Shown in the spec history"
            />
          </Field>
        </CardContent>
        <CardFooter className="justify-between">
          <span aria-live="polite">{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
          <span className="flex gap-2">
            <Button variant="ghost" size="sm" disabled={!dirty || saving} onClick={() => setValues(saved)}>
              Discard
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!dirty || overshootInvalid || settleInvalid}
              loading={saving}
              onClick={save}
            >
              Save limits
            </Button>
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}
