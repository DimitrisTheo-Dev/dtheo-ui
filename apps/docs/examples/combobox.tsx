'use client';

import { Combobox, type ComboboxOption } from '@dtheo/ui/components/combobox';
import { Field, FieldDescription, FieldLabel } from '@dtheo/ui/components/field';

const actuators: ComboboxOption[] = [
  { value: 'act-7731', label: 'ACT-7731 Hip pitch, left', description: 'Bench 3 · firmware 4.18.2' },
  { value: 'act-7732', label: 'ACT-7732 Hip pitch, right', description: 'Bench 3 · firmware 4.18.2' },
  { value: 'act-7740', label: 'ACT-7740 Knee, left', description: 'Bench 1 · firmware 4.18.1' },
  { value: 'act-7741', label: 'ACT-7741 Knee, right', description: 'Bench 1 · firmware 4.18.1' },
  { value: 'act-7755', label: 'ACT-7755 Ankle roll, left', description: 'Bench 2 · firmware 4.17.9' },
  { value: 'act-7756', label: 'ACT-7756 Ankle roll, right', description: 'Bench 2 · firmware 4.17.9' },
  { value: 'act-7802', label: 'ACT-7802 Shoulder pitch, left', description: 'Bench 4 · firmware 4.18.2' },
  { value: 'act-7803', label: 'ACT-7803 Shoulder pitch, right', description: 'Bench 4 · firmware 4.18.2' },
  { value: 'act-7810', label: 'ACT-7810 Elbow, left', description: 'Bench 5 · firmware 4.18.0' },
  { value: 'act-7811', label: 'ACT-7811 Elbow, right', description: 'Bench 5 · firmware 4.18.0' },
  { value: 'act-7820', label: 'ACT-7820 Wrist yaw, left', description: 'Spares shelf · firmware 4.16.3' },
  { value: 'act-7821', label: 'ACT-7821 Wrist yaw, right', description: 'Spares shelf · firmware 4.16.3' },
];

export default function ComboboxExample() {
  return (
    <Field className="w-full max-w-xs">
      <FieldLabel>Actuator</FieldLabel>
      <Combobox
        items={actuators}
        defaultValue={actuators[0]}
        placeholder="Search by ID or joint"
        emptyMessage="No actuator matches. Try an ID like 7740 or a joint like knee."
      />
      <FieldDescription>12 actuators on the walking rig.</FieldDescription>
    </Field>
  );
}
