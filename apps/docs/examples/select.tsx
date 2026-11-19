'use client';

import { Field, FieldDescription, FieldLabel } from '@dtheo/ui/components/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@dtheo/ui/components/select';

const profiles = [
  { value: 'nominal', label: 'Nominal step' },
  { value: 'high-gain', label: 'High-gain step' },
  { value: 'damped', label: 'Damped step' },
  { value: 'fast-rise', label: 'Fast rise' },
  { value: 'thermal-soak', label: 'Thermal soak, 20 min' },
];

export default function SelectExample() {
  return (
    <Field className="w-64">
      <FieldLabel>Test profile</FieldLabel>
      <Select items={profiles} defaultValue="high-gain">
        <SelectTrigger>
          <SelectValue placeholder="Choose a profile" />
        </SelectTrigger>
        <SelectContent>
          {profiles.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldDescription>The command the bench applies to the actuator.</FieldDescription>
    </Field>
  );
}
