'use client';

import { Field, FieldDescription, FieldError, FieldLabel } from '@dtheo/ui/components/field';
import { Input } from '@dtheo/ui/components/input';

export default function InputStates() {
  return (
    <div className="grid w-full max-w-lg gap-x-4 gap-y-5 sm:grid-cols-2">
      <Field>
        <FieldLabel>Run name</FieldLabel>
        <Input defaultValue="High-gain step" />
      </Field>
      <Field>
        <FieldLabel optional>Tag</FieldLabel>
        <Input placeholder="e.g. retune-kp" />
      </Field>
      <Field>
        <FieldLabel>Firmware</FieldLabel>
        <Input defaultValue="4.18.2" readOnly />
        <FieldDescription>Reported by the controller.</FieldDescription>
      </Field>
      <Field disabled>
        <FieldLabel>Actuator serial</FieldLabel>
        <Input defaultValue="ACT-7731-B" />
        <FieldDescription>Locked while R-0412 is running.</FieldDescription>
      </Field>
      <Field invalid className="sm:col-span-2">
        <FieldLabel>Bench</FieldLabel>
        <Input defaultValue="Bench 9" />
        <FieldError match>There is no Bench 9. Enter a bench from 1 to 6.</FieldError>
      </Field>
    </div>
  );
}
