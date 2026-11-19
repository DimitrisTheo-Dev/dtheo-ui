'use client';

import { Metric, MetricGroup } from '@dtheo/ui/components/metric';

// Acceptance checks for R-0412 "High-gain step" on Bench 3. Failing and near-limit checks lead.
// `progress` and `limit` are positions on each meter (0 to 1); each meter spans 0 to 125 % of its limit.
const on = (value: number, limit: number) => ({ progress: value / (limit * 1.25), limit: 0.8 });

export default function MetricExample() {
  return (
    // Five checks wrap unevenly in narrow containers, so the failing check takes the full first row there.
    <div className="@container w-full">
      <MetricGroup className="grid-cols-2 @xl:grid-cols-3 @2xl:grid-cols-5">
        <Metric
          className="col-span-2 @2xl:col-span-1"
          label="Overshoot"
          value="17.6"
          unit="%"
          status="fail"
          {...on(17.6, 10)}
          limitLabel="Limit 10 %"
        />
        <Metric
          label="Settling time"
          value="186"
          unit="ms"
          status="warn"
          {...on(186, 200)}
          limitLabel="Limit 200 ms"
        />
        <Metric
          label="Phase current"
          value="31.2"
          unit="A"
          status="pass"
          {...on(31.2, 40)}
          limitLabel="Limit 40 A"
        />
        <Metric
          label="Winding temp."
          hint="Winding temperature"
          value="71.2"
          unit="°C"
          status="pass"
          {...on(71.2, 90)}
          limitLabel="Limit 90 °C"
        />
        <Metric
          label="Static error"
          hint="Steady-state error"
          value="0.4"
          unit="%"
          status="pass"
          {...on(0.4, 2)}
          limitLabel="Limit 2 %"
        />
      </MetricGroup>
    </div>
  );
}
