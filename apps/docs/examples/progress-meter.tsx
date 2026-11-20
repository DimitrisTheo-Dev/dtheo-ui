'use client';

import { TriangleAlertIcon } from 'lucide-react';
import { Meter, Progress } from '@dtheo/ui/components/progress';
import { CURRENT_LIMIT, TEMP_LIMIT, WINDING_TEMP, fmt, measuredMetrics as M } from '@/lib/lab-data';

// R-0412's winding temperature and peak phase current, against their limits. The current is within 10 % of its
// limit, so its meter is amber and says so in words.

export default function ProgressMeterExample() {
  return (
    <div className="grid w-full max-w-xl gap-x-10 gap-y-6 sm:grid-cols-2">
      <section aria-label="Task progress" className="flex flex-col gap-4">
        <h3 className="text-caption font-semibold text-subtle-foreground">Progress: work getting done</h3>
        <Progress label="Uploading R-0412 traces" value={64} showValue />
        {/* The duration is unknown, so no percentage. */}
        <Progress label="Computing efficiency map" value={null} />
      </section>
      <section aria-label="Measurements" className="flex flex-col gap-4">
        <h3 className="text-caption font-semibold text-subtle-foreground">
          Meter: a measurement against its limit
        </h3>
        <Meter
          label="Winding temperature"
          value={WINDING_TEMP}
          max={120}
          limit={TEMP_LIMIT}
          tone="neutral"
          showValue
          format={{ style: 'unit', unit: 'celsius', maximumFractionDigits: 1 }}
        />
        <div className="flex flex-col gap-1.5">
          <Meter
            label="Peak phase current"
            value={M.peakCurrent}
            max={40}
            limit={CURRENT_LIMIT}
            tone="warning"
            showValue
            unit="A"
            getAriaValueText={(_, value) =>
              `${fmt.n1.format(value)} amperes, near the ${CURRENT_LIMIT} ampere limit`
            }
          />
          <p className="flex items-center gap-1 text-caption text-warning-foreground">
            <TriangleAlertIcon className="size-3" aria-hidden="true" />
            Near the {CURRENT_LIMIT} A limit
          </p>
        </div>
      </section>
    </div>
  );
}
