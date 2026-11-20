'use client';

import { ScatterChart } from '@dtheo/charts';
import { OVERSHOOT_USL, fmt, gains, measuredMetrics as M, overshootStats as S, runs } from '@/lib/lab-data';

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
        yDomain={[0, 25]}
        xLabel="Kp"
        yLabel="Overshoot"
        yUnit="%"
        limits={[{ axis: 'y', value: OVERSHOOT_USL, label: `Limit ${OVERSHOOT_USL} %` }]}
        highlight="R-0412"
        fit
        height={280}
        ariaLabel={`Overshoot rises with Kp across ${runs.length} runs. Every run over the ${OVERSHOOT_USL} % limit has Kp of ${fmt.n2.format(S.minKpOver)} or more; R-0412, at Kp ${fmt.n2.format(gains.kp)}, overshoots ${fmt.n1.format(M.overshoot)} %.`}
      />
    </div>
  );
}
