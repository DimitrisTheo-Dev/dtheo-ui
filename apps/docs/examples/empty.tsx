'use client';

import { FilterXIcon, PlayIcon, SearchXIcon, ServerIcon, UploadIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { Empty, EmptyActions, EmptyDescription, EmptyMedia, EmptyTitle } from '@dtheo/ui/components/empty';

export default function EmptyExample() {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2">
      {/* No data yet: say why and offer the first action. */}
      <Empty className="justify-start border border-border bg-card">
        <EmptyMedia>
          <ServerIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No runs on Bench 3 yet</EmptyTitle>
        <EmptyDescription>
          Run a step test to record torque, phase current and winding temperature.
        </EmptyDescription>
        <EmptyActions>
          <Button variant="primary">
            <PlayIcon aria-hidden="true" />
            Run step test
          </Button>
          <Button variant="ghost">
            <UploadIcon aria-hidden="true" />
            Import CSV
          </Button>
        </EmptyActions>
      </Empty>
      {/* No results: name the filter that hid everything and offer to clear it. */}
      <Empty className="justify-start border border-border bg-card">
        <EmptyMedia>
          <SearchXIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No runs match these filters</EmptyTitle>
        <EmptyDescription>No failed runs on firmware 4.18.2 in the last 7 days.</EmptyDescription>
        <EmptyActions>
          <Button>
            <FilterXIcon aria-hidden="true" />
            Clear filters
          </Button>
        </EmptyActions>
      </Empty>
    </div>
  );
}
