'use client';

import { NumberField } from '@dtheo/ui/components/number-field';

const twoDecimals = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

export default function NumberFieldExample() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Kp"
          defaultValue={4.2}
          min={0}
          max={10}
          step={0.05}
          largeStep={0.5}
          format={twoDecimals}
        />
        <NumberField
          label="Kd"
          defaultValue={0.06}
          min={0}
          max={1}
          step={0.01}
          largeStep={0.1}
          format={twoDecimals}
        />
        <NumberField
          label="Torque limit"
          unit="N·m"
          defaultValue={12}
          min={0}
          max={40}
          step={0.5}
          largeStep={5}
          format={{ minimumFractionDigits: 1 }}
        />
        <NumberField
          label="Settling target"
          unit="ms"
          defaultValue={250}
          min={50}
          max={2000}
          step={10}
          largeStep={100}
        />
      </div>
      <p className="text-caption text-muted-foreground">
        Drag a label sideways to scrub. Arrow keys step; Shift + arrow takes a larger step.
      </p>
    </div>
  );
}
