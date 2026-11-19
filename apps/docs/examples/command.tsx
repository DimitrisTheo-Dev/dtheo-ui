'use client';

import * as React from 'react';
import { ActivityIcon, DownloadIcon, GaugeIcon, GitCompareIcon, PlayIcon, SearchIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { CommandDialog, type CommandItemData } from '@dtheo/ui/components/command';
import { Kbd } from '@dtheo/ui/components/kbd';
import { useToast } from '@dtheo/ui/components/toast';

export default function CommandExample() {
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const items = React.useMemo<CommandItemData[]>(() => {
    const go = (title: string) => () => toast.add({ title });
    return [
      {
        value: 'r-0412',
        group: 'Runs',
        label: 'R-0412 · High-gain step',
        hint: 'Bench 3 · today 14:32',
        icon: <ActivityIcon />,
        onSelect: go('Opened R-0412'),
      },
      {
        value: 'r-0411',
        group: 'Runs',
        label: 'R-0411 · Damped step',
        hint: 'Bench 3 · today 11:05',
        icon: <ActivityIcon />,
        onSelect: go('Opened R-0411'),
      },
      {
        value: 'r-0398',
        group: 'Runs',
        label: 'R-0398 · Accepted baseline',
        hint: 'Bench 1 · 12 Nov',
        icon: <ActivityIcon />,
        onSelect: go('Opened R-0398'),
      },
      {
        value: 'bench-1',
        group: 'Benches',
        label: 'Bench 1',
        hint: 'Idle',
        icon: <GaugeIcon />,
        onSelect: go('Opened Bench 1'),
      },
      {
        value: 'bench-3',
        group: 'Benches',
        label: 'Bench 3',
        hint: 'Running R-0412',
        icon: <GaugeIcon />,
        onSelect: go('Opened Bench 3'),
      },
      {
        value: 'bench-4',
        group: 'Benches',
        label: 'Bench 4',
        hint: 'Maintenance until 16:00',
        icon: <GaugeIcon />,
        onSelect: go('Opened Bench 4'),
      },
      {
        value: 'retune',
        group: 'Actions',
        label: 'Queue retune run',
        icon: <PlayIcon />,
        onSelect: go('Retune run queued on Bench 3'),
      },
      {
        value: 'compare',
        group: 'Actions',
        label: 'Compare R-0412 with baseline',
        icon: <GitCompareIcon />,
        onSelect: go('Comparing R-0412 with R-0398'),
      },
      {
        value: 'export',
        group: 'Actions',
        label: 'Export traces as CSV',
        shortcut: '⇧⌘E',
        icon: <DownloadIcon />,
        onSelect: go('Exporting R-0412 traces'),
      },
    ];
  }, [toast]);

  return (
    <>
      <Button
        variant="outline"
        className="w-full max-w-xs justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <SearchIcon aria-hidden="true" />
        <span className="flex-1 text-left font-normal">Jump to a run, bench or action</span>
        <Kbd>⌘K</Kbd>
      </Button>
      {/* Mounted only while open because the docs header already owns ⌘K. In your app, keep one
          CommandDialog mounted near the root so ⌘K opens it from anywhere. */}
      {open ? (
        <CommandDialog
          open
          onOpenChange={setOpen}
          items={items}
          placeholder="Search runs, benches and actions…"
        />
      ) : null}
    </>
  );
}
