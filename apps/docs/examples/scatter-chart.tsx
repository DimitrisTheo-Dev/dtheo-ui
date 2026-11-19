'use client';

import { ScatterChart } from '@dtheo/charts';
import { OVERSHOOT_USL, runs } from '@/lib/lab-data';

const points = runs.map((r) => ({
  x: r.kp,
  y: r.overshoot,
  label: r.id,
  group: r.overshoot > OVERSHOOT_USL ? 'fail' : 'pass',
}));

export default function ScatterChartExample() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col">
        <span className="text-headline">Gain against overshoot</span>
        <span className="text-caption text-muted-foreground">RA-14 hip pitch · {runs.length} step tests</span>
      </div>
      <ScatterChart
        points={points}
        groups={[
          { id: 'fail', label: 'Over limit', tone: 'critical' },
          { id: 'pass', label: 'Within limit', tone: 'muted' },
        ]}
        xDomain={[1.5, 4.75]}
        yDomain={[0, 20]}
        xLabel="Kp"
        yLabel="Overshoot"
        yUnit="%"
        limits={[{ axis: 'y', value: OVERSHOOT_USL, label: 'Limit 10 %' }]}
        highlight="R-0412"
        fit
        height={280}
        ariaLabel={`Overshoot rises with Kp across ${runs.length} runs. Every run over the 10 % limit has Kp above 3.1; R-0412, at Kp 4.20, overshoots 17.6 %.`}
      />
    </div>
  );
}
