'use client';

import { Histogram } from '@dtheo/charts';
import { OVERSHOOT_USL, fmt, measuredMetrics as M, overshootStats as S, runs } from '@/lib/lab-data';

const overshoot = runs.map((r) => r.overshoot);

export default function HistogramExample() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col">
        <span className="text-headline">Overshoot across all runs</span>
        <span className="text-caption text-muted-foreground">
          RA-14 hip pitch · every step test since firmware 4.16
        </span>
      </div>
      <Histogram
        values={overshoot}
        domain={[0, 25]}
        binWidth={1}
        upper={OVERSHOOT_USL}
        target={5}
        marker={{ value: M.overshoot, label: 'R-0412' }}
        normal
        xLabel="Overshoot"
        unit="%"
        height={240}
        ariaLabel={`Overshoot of ${S.n} runs: most sit between 3 and 8 %, and ${S.over} runs exceed the ${OVERSHOOT_USL} % limit. Cpk is ${fmt.n2.format(S.cpk)}, so the process is not capable at these gains.`}
      />
    </div>
  );
}
