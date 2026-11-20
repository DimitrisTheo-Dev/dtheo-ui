'use client';

import * as React from 'react';
import { AudioLinesIcon } from 'lucide-react';
import { Kbd } from '@dtheo/ui/components/kbd';
import { LineChart } from '@dtheo/charts';
import { CURRENT_LIMIT, fmt, measured, measuredMetrics as M } from '@/lib/lab-data';

const ariaLabel = `Phase current for run R-0412. It peaks at ${fmt.n1.format(M.peakCurrent)} A, under the ${CURRENT_LIMIT} A limit.`;

/**
 * A chart people can read without seeing it. The transcript under it is not a mock: it mirrors the chart's own
 * live region, so it shows exactly what a screen reader is told as the arrow keys move the cursor.
 */
export function A11yDemo() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [heard, setHeard] = React.useState(ariaLabel);

  React.useEffect(() => {
    const live = ref.current?.querySelector('[aria-live]');
    if (!live) return;
    const observer = new MutationObserver(() => {
      const text = live.textContent?.trim();
      if (text) setHeard(text);
    });
    observer.observe(live, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="flex min-w-0 flex-col gap-3 rounded-popover border border-border bg-background/60 p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="text-label">
          Phase current <span className="font-mono font-normal text-muted-foreground">R-0412</span>
        </span>
        <span className="flex items-center gap-1.5 text-caption text-muted-foreground pointer-coarse:hidden">
          Tab to the chart, then <Kbd>←</Kbd>
          <Kbd>→</Kbd>
        </span>
      </div>
      <LineChart
        ariaLabel={ariaLabel}
        x={measured.t}
        xDomain={[0, 400]}
        xUnit="ms"
        yDomain={[0, 40]}
        yTicks={[0, 10, 20, 30, 40]}
        height={150}
        series={[
          { id: 'current', label: 'Current', values: measured.current, unit: 'A', digits: 1, width: 2 },
        ]}
        thresholds={[{ value: CURRENT_LIMIT, label: 'Current limit', shortLabel: 'Limit', tone: 'warning' }]}
      />
      <p className="flex min-w-0 items-start gap-2 border-t border-border pt-3 text-label font-normal">
        <AudioLinesIcon className="mt-0.5 size-3.5 shrink-0 text-link" aria-hidden="true" />
        <span className="shrink-0 text-muted-foreground">Screen reader:</span>
        {/* Visible copy of what the live region says; hidden from assistive tech so it is not read twice. */}
        <span aria-hidden="true" className="min-w-0 text-foreground text-pretty">
          “{heard}”
        </span>
      </p>
    </div>
  );
}
