'use client';

import * as React from 'react';
import { RotateCwIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { Skeleton } from '@dtheo/ui/components/skeleton';
import { Spinner } from '@dtheo/ui/components/spinner';
import { fmt, runHistory } from '@/lib/lab-data';

const runs = runHistory.slice(0, 3);

export default function LoadingExample() {
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    if (!loading) return;
    const id = setTimeout(() => setLoading(false), 1800);
    return () => clearTimeout(id);
  }, [loading]);

  return (
    <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-card border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <h3 className="text-headline">Recent runs</h3>
        <Button size="sm" variant="ghost" className="-mr-2" onClick={() => setLoading(true)}>
          <RotateCwIcon aria-hidden="true" />
          Refresh
        </Button>
      </div>
      {/* Skeleton rows match the loaded rows' height and columns, so nothing shifts when data arrives. */}
      <ul aria-busy={loading} className="flex flex-col divide-y divide-border">
        {runs.map((run) => (
          <li key={run.id} className="flex h-12 items-center justify-between gap-3 px-4">
            {loading ? (
              <>
                <span className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-2.5 w-24" />
                </span>
                <Skeleton className="h-3 w-10" />
              </>
            ) : (
              <>
                <span className="flex flex-col">
                  <span className="text-body font-medium tabular-nums">{run.id}</span>
                  <span className="text-caption text-muted-foreground">{run.profile}</span>
                </span>
                <span className="text-body tabular-nums">{fmt.n1.format(run.overshoot)} %</span>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="flex h-9 items-center gap-2 border-t border-border px-4 text-caption text-subtle-foreground">
        {loading ? (
          <>
            <Spinner className="size-3.5" label="Fetching runs" />
            Fetching runs from Bench 3…
          </>
        ) : (
          'Updated just now from Bench 3'
        )}
      </div>
    </div>
  );
}
