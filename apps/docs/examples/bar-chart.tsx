'use client';

import { BarChart, type Bar } from '@dtheo/charts';
import { OVERSHOOT_LIMIT, fmt, runHistory } from '@/lib/lab-data';

// Overshoot of the last eight step tests on Bench 3, oldest first.
const history = runHistory.toReversed();
const runs: Bar[] = history.map((r) => ({
  id: r.id,
  label: r.id.slice(2),
  value: r.overshoot,
  current: r.id === 'R-0412',
}));
const over = history
  .filter((r) => r.overshoot > OVERSHOOT_LIMIT)
  .map((r) => `${r.id} at ${fmt.n1.format(r.overshoot)} %`);

export default function BarChartExample() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-headline">Overshoot per run</h3>
        <p className="text-label font-normal text-muted-foreground">
          Overshoot in % · Bench 3 · runs <span className="whitespace-nowrap">R-0405 to R-0412</span>
        </p>
      </div>
      <BarChart
        bars={runs}
        limit={OVERSHOOT_LIMIT}
        limitLabel={`Limit ${OVERSHOOT_LIMIT} %`}
        yDomain={[0, 25]}
        unit=" %"
        height={220}
        ariaLabel={`Overshoot per run on Bench 3. ${over.length} runs exceed the ${OVERSHOOT_LIMIT} % limit: ${over.join(', ')}.`}
      />
    </div>
  );
}
