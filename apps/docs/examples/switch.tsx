'use client';

import * as React from 'react';
import { Field, FieldDescription, FieldLabel } from '@dtheo/ui/components/field';
import { Switch } from '@dtheo/ui/components/switch';

export default function SwitchExample() {
  const [streaming, setStreaming] = React.useState(true);
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Field>
        <FieldLabel className="w-full items-center justify-between gap-4">
          Stream live traces
          <Switch checked={streaming} onCheckedChange={setStreaming} />
        </FieldLabel>
        <FieldDescription>
          {streaming
            ? 'Bench 3 is streaming torque and current at 1 kHz.'
            : 'Paused. Traces still record on the bench.'}
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel className="w-full items-center justify-between gap-4">
          Stop on winding overheat
          <Switch defaultChecked />
        </FieldLabel>
        <FieldDescription>Cuts motor power when a winding passes 85 °C.</FieldDescription>
      </Field>
      <Field disabled>
        <FieldLabel className="w-full items-center justify-between gap-4">
          Write gains to flash
          <Switch />
        </FieldLabel>
        <FieldDescription>Locked while R-0412 is running.</FieldDescription>
      </Field>
    </div>
  );
}
