'use client';

import { Metric, MetricGroup } from '@dtheo/ui/components/metric';
import {
  CURRENT_LIMIT,
  OVERSHOOT_LIMIT,
  RISE_LIMIT,
  SETTLE_LIMIT,
  TEMP_LIMIT,
  WINDING_TEMP,
  checkStatus,
  fmt,
  measuredMetrics as M,
} from '@/lib/lab-data';

// Acceptance checks for R-0412 "High-gain step" on Bench 3. Failing and near-limit checks lead.
// Each check fails over its limit and is near the limit above 90 % of it. `progress` and `limit` are positions on
// each meter (0 to 1); each meter spans 0 to 125 % of its limit.
const check = (value: number, limit: number) => ({
  status: checkStatus(value, limit),
  progress: value / (limit * 1.25),
  limit: 0.8,
});

export default function MetricExample() {
  return (
    // Five checks wrap unevenly in narrow containers, so the failing check takes the full first row there.
    <div className="@container w-full">
      <MetricGroup className="grid-cols-2 @xl:grid-cols-3 @2xl:grid-cols-5">
        <Metric
          className="col-span-2 @2xl:col-span-1"
          label="Overshoot"
          value={fmt.n1.format(M.overshoot)}
          unit="%"
          {...check(M.overshoot, OVERSHOOT_LIMIT)}
          limitLabel={`Limit ${OVERSHOOT_LIMIT} %`}
        />
        <Metric
          label="Phase current"
          hint="Peak phase current"
          value={fmt.n1.format(M.peakCurrent)}
          unit="A"
          {...check(M.peakCurrent, CURRENT_LIMIT)}
          limitLabel={`Limit ${CURRENT_LIMIT} A`}
        />
        <Metric
          label="Settling time"
          hint="Time after the step until torque stays inside ±2 %"
          value={fmt.n0.format(M.settle)}
          unit="ms"
          {...check(M.settle, SETTLE_LIMIT)}
          limitLabel={`Limit ${SETTLE_LIMIT} ms`}
        />
        <Metric
          label="Rise time"
          hint="10 to 90 % of the step"
          value={fmt.n0.format(M.rise)}
          unit="ms"
          {...check(M.rise, RISE_LIMIT)}
          limitLabel={`Limit ${RISE_LIMIT} ms`}
        />
        <Metric
          label="Winding temperature"
          value={fmt.n1.format(WINDING_TEMP)}
          unit="°C"
          {...check(WINDING_TEMP, TEMP_LIMIT)}
          limitLabel={`Limit ${TEMP_LIMIT} °C`}
        />
      </MetricGroup>
    </div>
  );
}
