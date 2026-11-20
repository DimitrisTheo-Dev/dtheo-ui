'use client';

import * as React from 'react';
import { ActivityIcon, DownloadIcon, GaugeIcon, GitCompareIcon, PlayIcon, SearchIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { CommandDialog, type CommandItemData } from '@dtheo/ui/components/command';
import { Kbd } from '@dtheo/ui/components/kbd';
import { useToast } from '@dtheo/ui/components/toast';
import { runHistory } from '@/lib/lab-data';

// The three runs a reviewer jumps between: the run under review, the one before it and the reference.
const run = (id: string) => runHistory.find((r) => r.id === id)!;
const recent = [
  { ...run('R-0412'), hint: 'Bench 3 · today 14:32' },
  { ...run('R-0411'), hint: 'Bench 3 · today 13:05' },
  { ...run('R-0409'), hint: 'Bench 3 · reference · yesterday 16:20' },
];

export default function CommandExample() {
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const items = React.useMemo<CommandItemData[]>(() => {
    const go = (title: string) => () => toast.add({ title });
    return [
      ...recent.map((r) => ({
        value: r.id.toLowerCase(),
        group: 'Runs',
        label: `${r.id} · ${r.profile}`,
        hint: r.hint,
        icon: <ActivityIcon />,
        onSelect: go(`Opened ${r.id}`),
      })),
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
        label: 'Compare R-0412 with the reference',
        icon: <GitCompareIcon />,
        onSelect: go('Comparing R-0412 with R-0409'),
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
