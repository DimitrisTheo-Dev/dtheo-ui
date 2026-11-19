'use client';

import * as React from 'react';
import { Field, FieldDescription, FieldLabel } from '@dtheo/ui/components/field';
import { Slider } from '@dtheo/ui/components/slider';

const PEAK_OVERSHOOT = 17.6;

export default function SliderExample() {
  const [threshold, setThreshold] = React.useState(15);
  const [range, setRange] = React.useState<readonly number[]>([120, 680]);
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <Field>
        <div className="flex items-baseline justify-between gap-3">
          <FieldLabel>Overshoot warning</FieldLabel>
          <span className="text-label text-muted-foreground tabular-nums">{threshold} %</span>
        </div>
        <Slider
          value={threshold}
          onValueChange={(v) => setThreshold(v as number)}
          min={0}
          max={40}
          step={1}
        />
        <FieldDescription>
          R-0412 peaked at {PEAK_OVERSHOOT} %:{' '}
          {PEAK_OVERSHOOT > threshold ? 'flagged for review.' : 'within the limit.'}
        </FieldDescription>
      </Field>
      <Field>
        <div className="flex items-baseline justify-between gap-3">
          <FieldLabel>Analysis window</FieldLabel>
          <span className="text-label text-muted-foreground tabular-nums">
            {range[0]}–{range[1]} ms
          </span>
        </div>
        <Slider
          value={range}
          onValueChange={(v) => setRange(v as readonly number[])}
          min={0}
          max={2500}
          step={10}
          minStepsBetweenValues={5}
        />
        <FieldDescription>Settling time and overshoot are computed inside this window.</FieldDescription>
      </Field>
    </div>
  );
}
