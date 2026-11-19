'use client';

import * as React from 'react';
import { Label } from '@dtheo/ui/components/field';
import { Radio, RadioGroup } from '@dtheo/ui/components/radio-group';

const criteria = [
  {
    value: 'band-2',
    label: '±2 % band',
    detail: 'Settled once the response stays within 2 % of the setpoint.',
  },
  { value: 'band-5', label: '±5 % band', detail: 'Looser. Use for loaded or compliant joints.' },
  {
    value: 'velocity',
    label: 'Velocity threshold',
    detail: 'Settled when joint speed stays under 0.05 rad/s for 50 ms.',
  },
];

export default function RadioGroupExample() {
  const id = React.useId();
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <span id={id} className="text-label text-foreground">
        Settling criterion
      </span>
      <RadioGroup aria-labelledby={id} defaultValue="band-2" className="gap-3">
        {criteria.map((c) => (
          <div key={c.value} className="flex flex-col gap-0.5">
            <Label className="flex items-center gap-2.5">
              <Radio value={c.value} aria-describedby={`${id}-${c.value}`} />
              {c.label}
            </Label>
            {/* pl-6 lines the detail up with the label text: 14px radio + 10px gap. */}
            <p id={`${id}-${c.value}`} className="pl-6 text-caption text-muted-foreground">
              {c.detail}
            </p>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
