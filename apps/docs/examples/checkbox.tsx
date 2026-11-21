'use client';

import * as React from 'react';
import { Button } from '@dtheo/ui/components/button';
import { Checkbox, CheckboxGroup } from '@dtheo/ui/components/checkbox';
import { Label } from '@dtheo/ui/components/field';
import { useToast } from '@dtheo/ui/components/toast';

const channels = [
  { value: 'torque', label: 'Torque', unit: 'N·m' },
  { value: 'current', label: 'Phase current', unit: 'A' },
  { value: 'position', label: 'Position error', unit: 'mrad' },
  { value: 'temperature', label: 'Winding temperature', unit: '°C' },
];

export default function CheckboxExample() {
  const id = React.useId();
  const toast = useToast();
  const [value, setValue] = React.useState(['torque', 'current']);
  const count = value.length;
  return (
    <div className="flex w-full max-w-xs flex-col gap-4">
      {/* The parent checkbox turns indeterminate when some, but not all, channels are selected. */}
      <CheckboxGroup
        aria-labelledby={id}
        value={value}
        onValueChange={setValue}
        allValues={channels.map((c) => c.value)}
      >
        <Label id={id} className="flex items-center gap-2.5">
          <Checkbox parent />
          Export channels from <span className="whitespace-nowrap">R-0412</span>
        </Label>
        <div className="flex flex-col gap-2 pl-6">
          {channels.map((c) => (
            <Label key={c.value} className="flex items-center gap-2.5 font-normal">
              <Checkbox value={c.value} />
              <span className="flex-1">{c.label}</span>
              <span className="text-caption text-subtle-foreground">{c.unit}</span>
            </Label>
          ))}
        </div>
      </CheckboxGroup>
      <Button
        className="self-start"
        disabled={count === 0}
        onClick={() =>
          toast.add({
            title: `Exporting ${count} ${count === 1 ? 'channel' : 'channels'}`,
            description: 'R-0412.csv downloads when it is ready.',
          })
        }
      >
        {count === 0
          ? 'Select a channel to export'
          : `Export ${count} ${count === 1 ? 'channel' : 'channels'}`}
      </Button>
    </div>
  );
}
