'use client';

import * as React from 'react';
import { PlayIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';

const runId = (n: number) => `R-${String(n).padStart(4, '0')}`;

export default function ButtonLoading() {
  const [loading, setLoading] = React.useState(false);
  const [lastRun, setLastRun] = React.useState<number | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  React.useEffect(() => () => clearTimeout(timer.current), []);

  const queue = () => {
    setLoading(true);
    timer.current = setTimeout(() => {
      setLoading(false);
      setLastRun((n) => (n ?? 412) + 1);
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* While loading, the label stays in place (invisible) so the button keeps its width. */}
      <Button variant="primary" loading={loading} onClick={queue}>
        <PlayIcon aria-hidden="true" />
        Queue retune run
      </Button>
      <p role="status" className="text-caption text-muted-foreground tabular-nums">
        {loading
          ? 'Reserving Bench 3…'
          : lastRun
            ? `${runId(lastRun)} queued on Bench 3 with Kp 3.60, Kd 0.09.`
            : 'Reruns the R-0412 step with Kp 3.60, Kd 0.09.'}
      </p>
    </div>
  );
}
