'use client';

import { NumberField } from '@dtheo/ui/components/number-field';
import { SETTLE_LIMIT, TORQUE_LIMIT, gains } from '@/lib/lab-data';

const twoDecimals = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

// R-0412's gains and the limits its step is checked against.
export default function NumberFieldExample() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Kp"
          defaultValue={gains.kp}
          min={0}
          max={10}
          step={0.05}
          largeStep={0.5}
          format={twoDecimals}
        />
        <NumberField
          label="Kd"
          defaultValue={gains.kd}
          min={0}
          max={1}
          step={0.01}
          largeStep={0.1}
          format={twoDecimals}
        />
        <NumberField
          label="Torque limit"
          unit="N·m"
          defaultValue={TORQUE_LIMIT}
          min={0}
          max={40}
          step={0.5}
          largeStep={5}
          format={{ minimumFractionDigits: 1 }}
        />
        <NumberField
          label="Settling target"
          unit="ms"
          defaultValue={SETTLE_LIMIT}
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
