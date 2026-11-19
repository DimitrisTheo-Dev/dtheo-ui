'use client';

import { BarChart, type Bar } from '@dtheo/charts';

// Overshoot of the last eight step tests on Bench 3, oldest first. The limit is 10 %.
const runs: Bar[] = [
  { id: 'R-0405', label: '0405', value: 4.1 },
  { id: 'R-0406', label: '0406', value: 3.6 },
  { id: 'R-0407', label: '0407', value: 5.2 },
  { id: 'R-0408', label: '0408', value: 6.8 },
  { id: 'R-0409', label: '0409', value: 3.8 },
  { id: 'R-0410', label: '0410', value: 7.9 },
  { id: 'R-0411', label: '0411', value: 11.2 },
  { id: 'R-0412', label: '0412', value: 17.6, current: true },
];

export default function BarChartExample() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-headline">Overshoot per run</h3>
        <p className="text-label font-normal text-muted-foreground">
          Overshoot in % · Bench 3 · runs R-0405 to R-0412
        </p>
      </div>
      <BarChart
        bars={runs}
        limit={10}
        limitLabel="Limit 10 %"
        yDomain={[0, 20]}
        unit=" %"
        height={220}
        ariaLabel="Overshoot per run on Bench 3. Two runs exceed the 10 % limit: R-0411 at 11.2 % and R-0412 at 17.6 %. R-0405 to R-0410 stay between 3.6 % and 7.9 %."
      />
    </div>
  );
}
