'use client';

import { Meter, Progress } from '@dtheo/ui/components/progress';

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
          value={71.2}
          max={120}
          limit={90}
          tone="neutral"
          showValue
          format={{ style: 'unit', unit: 'celsius', maximumFractionDigits: 1 }}
        />
        <div className="flex flex-col gap-1.5">
          <Meter
            label="Phase current"
            value={37.6}
            max={50}
            limit={40}
            tone="warning"
            showValue
            unit="A"
            getAriaValueText={(_, value) => `${value} amperes, near the 40 ampere limit`}
          />
          <p className="text-caption text-warning-foreground">Near the 40 A limit</p>
        </div>
      </section>
    </div>
  );
}
