'use client';

import { Quantity, formatDelta, formatShareOfLimit } from '@dtheo/ui/components/quantity';
import {
  CURRENT_LIMIT,
  OVERSHOOT_LIMIT,
  RISE_LIMIT,
  TEMP_LIMIT,
  WINDING_TEMP,
  measuredMetrics as M,
  referenceMetrics as R,
} from '@/lib/lab-data';

// R-0412's checks as an inspector lists them: the value, its limit, and words when it is past or near it. Rise is
// drawn as if its capture had failed, to show a missing value: a dash and “No data”, never 0.
const rows = [
  { label: 'Overshoot', value: M.overshoot, unit: '%', digits: 1, limit: { max: OVERSHOOT_LIMIT } },
  { label: 'Peak current', value: M.peakCurrent, unit: 'A', digits: 1, limit: { max: CURRENT_LIMIT } },
  { label: 'Winding temp', value: WINDING_TEMP, unit: '°C', digits: 1, limit: { max: TEMP_LIMIT } },
  { label: 'Rise, 10–90 %', value: null, unit: 'ms', digits: 0, limit: { max: RISE_LIMIT } },
];

export default function QuantityExample() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-body">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="text-right">
              <Quantity value={r.value} unit={r.unit} digits={r.digits} limit={r.limit} showLimit />
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-label font-normal text-muted-foreground text-pretty">
        Overshoot is {formatDelta(M.overshoot - OVERSHOOT_LIMIT, '%', { digits: 1 })} over its limit, against{' '}
        {formatDelta(R.overshoot - OVERSHOOT_LIMIT, '%', { digits: 1 })} on{' '}
        <span className="whitespace-nowrap">R-0409</span>. Current is at{' '}
        {formatShareOfLimit(M.peakCurrent, CURRENT_LIMIT)}.
      </p>
    </div>
  );
}
