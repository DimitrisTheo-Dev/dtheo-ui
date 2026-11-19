'use client';

import { Histogram } from '@dtheo/charts';
import { OVERSHOOT_USL, runs } from '@/lib/lab-data';

const overshoot = runs.map((r) => r.overshoot);

export default function HistogramExample() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col">
        <span className="text-headline">Overshoot across all runs</span>
        <span className="text-caption text-muted-foreground">
          RA-14 hip pitch · Bench 3 · since firmware 4.16
        </span>
      </div>
      <Histogram
        values={overshoot}
        domain={[0, 20]}
        binWidth={1}
        upper={OVERSHOOT_USL}
        target={5}
        marker={{ value: 17.6, label: 'R-0412' }}
        normal
        xLabel="Overshoot"
        unit="%"
        height={240}
        ariaLabel={`Overshoot of ${overshoot.length} runs: most sit between 3 and 8 %, and 12 runs exceed the 10 % limit. Cpk is 0.6, so the process is not capable at these gains.`}
      />
    </div>
  );
}
