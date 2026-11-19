'use client';

import * as React from 'react';
import { FilterXIcon, InboxIcon, LockIcon, RotateCcwIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { Skeleton } from '@dtheo/ui/components/skeleton';
import { Spinner } from '@dtheo/ui/components/spinner';
import { Progress } from '@dtheo/ui/components/progress';
import { Empty, EmptyActions, EmptyDescription, EmptyMedia, EmptyTitle } from '@dtheo/ui/components/empty';
import { Alert, AlertActions, AlertContent, AlertDescription, AlertTitle } from '@dtheo/ui/components/alert';

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption text-subtle-foreground">{label}</span>
      <div className="flex min-h-56 flex-col justify-center rounded-card border border-border bg-card p-4">
        {children}
      </div>
    </div>
  );
}

/** Every state of one screen side by side. Different reasons, different words, different next steps. */
export function StatesDemo() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Frame label="Loading, shaped like the content">
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading runs">
          <Skeleton className="h-4 w-1/3" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </Frame>
      <Frame label="Long work, honest progress">
        <div className="flex flex-col gap-4">
          <span className="flex items-center gap-2 text-body">
            <Spinner />
            Analyzing 1,001 samples
          </span>
          <Progress label="Fitting step response" value={null} />
          <Progress label="Exporting report" value={64} showValue />
        </div>
      </Frame>
      <Frame label="No data yet">
        <Empty className="py-2">
          <EmptyMedia>
            <InboxIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No runs for RW-05 yet</EmptyTitle>
          <EmptyDescription>
            Runs appear when a bench finishes a test profile on this actuator.
          </EmptyDescription>
          <EmptyActions>
            <Button size="sm" variant="primary">
              Schedule a run
            </Button>
          </EmptyActions>
        </Empty>
      </Frame>
      <Frame label="No results">
        <Empty className="py-2">
          <EmptyMedia>
            <FilterXIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No runs match “R-09”</EmptyTitle>
          <EmptyDescription>The Fail filter is on, and no failing run has that ID.</EmptyDescription>
          <EmptyActions>
            <Button size="sm">Clear filter</Button>
          </EmptyActions>
        </Empty>
      </Frame>
      <Frame label="No permission">
        <Empty className="py-2">
          <EmptyMedia>
            <LockIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Bench 5 is restricted</EmptyTitle>
          <EmptyDescription>
            Thermal chamber runs are visible to the thermal team. Maria Silva can grant access.
          </EmptyDescription>
          <EmptyActions>
            <Button size="sm">Request access</Button>
          </EmptyActions>
        </Empty>
      </Frame>
      <Frame label="Error, with recovery">
        <div className="flex flex-col gap-3">
          <Alert variant="destructive">
            <AlertContent>
              <AlertTitle>Traces could not be loaded</AlertTitle>
              <AlertDescription>
                The sample store timed out. Nothing was lost; the run summary below is current.
              </AlertDescription>
            </AlertContent>
            <AlertActions>
              <Button size="sm">
                <RotateCcwIcon aria-hidden="true" />
                Retry
              </Button>
            </AlertActions>
          </Alert>
          <Alert variant="warning">
            <AlertContent>
              <AlertTitle>2 of 8 runs are missing current data</AlertTitle>
              <AlertDescription>The phase shunt was offline on Bench 1 on 16 Nov.</AlertDescription>
            </AlertContent>
          </Alert>
        </div>
      </Frame>
    </div>
  );
}
