'use client';

import * as React from 'react';
import { Field, FieldDescription, FieldLabel } from '@dtheo/ui/components/field';
import { Slider } from '@dtheo/ui/components/slider';
import { DELAY, OVERSHOOT_LIMIT, SAMPLES, fmt, runHistory } from '@/lib/lab-data';

// R-0410 overshot by 9.1 %: inside the 10 % limit, close enough to flag for review.
const r0410 = runHistory.find((r) => r.id === 'R-0410')!;

export default function SliderExample() {
  // Warn at 90 % of the limit; the warning level can go up to the limit itself.
  const [threshold, setThreshold] = React.useState(0.9 * OVERSHOOT_LIMIT);
  // The 400 ms after the step, inside the 1 s capture.
  const [range, setRange] = React.useState<readonly number[]>([DELAY, DELAY + 400]);
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <Field>
        <div className="flex items-baseline justify-between gap-3">
          <FieldLabel>Overshoot warning</FieldLabel>
          <span className="text-label text-muted-foreground tabular-nums">{fmt.n1.format(threshold)} %</span>
        </div>
        <Slider
          value={threshold}
          onValueChange={(v) => setThreshold(v as number)}
          min={0}
          max={OVERSHOOT_LIMIT}
          step={0.5}
          // Announced as shown: "9.0 %".
          format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
          unit="%"
        />
        <FieldDescription>
          R-0410 peaked at {fmt.n1.format(r0410.overshoot)} %, inside the {OVERSHOOT_LIMIT} % limit:{' '}
          {r0410.overshoot > threshold ? 'flagged for review.' : 'not flagged.'}
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
          max={SAMPLES - 1}
          step={10}
          minStepsBetweenValues={5}
          thumbLabels={['Analysis window start', 'Analysis window end']}
          unit="ms"
        />
        <FieldDescription>Settling time and overshoot are computed inside this window.</FieldDescription>
      </Field>
    </div>
  );
}
