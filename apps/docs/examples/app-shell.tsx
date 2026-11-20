'use client';

import * as React from 'react';
import {
  CircleXIcon,
  DownloadIcon,
  FlaskConicalIcon,
  HistoryIcon,
  PlayIcon,
  ServerIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import {
  AppShell,
  AppToolbar,
  PageHeader,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarSection,
} from '@dtheo/ui/components/app-shell';
import { Avatar } from '@dtheo/ui/components/avatar';
import { Badge } from '@dtheo/ui/components/badge';
import { Button } from '@dtheo/ui/components/button';
import {
  OVERSHOOT_LIMIT,
  WINDING_TEMP,
  fmt,
  gains,
  measuredMetrics as M,
  overshootStats,
  runs,
} from '@/lib/lab-data';

const views = [
  { id: 'all', label: 'All runs', icon: <HistoryIcon aria-hidden="true" />, count: runs.length },
  { id: 'review', label: 'Needs review', icon: <TriangleAlertIcon aria-hidden="true" />, count: 3 },
  { id: 'failed', label: 'Failed', icon: <CircleXIcon aria-hidden="true" />, count: overshootStats.over },
];

const benches = [
  { id: 'bench-1', label: 'Bench 1', count: 128 },
  { id: 'bench-2', label: 'Bench 2', count: 141 },
  { id: 'bench-3', label: 'Bench 3', count: 143 },
];

export default function AppShellExample() {
  const [current, setCurrent] = React.useState('review');
  const currentLabel = [...views, ...benches].find((v) => v.id === current)?.label;
  const item = (id: string) => ({
    href: `#${id}`,
    active: current === id,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      setCurrent(id);
    },
  });

  const sidebar = (
    <>
      <SidebarHeader>
        <span className="flex items-center gap-2 px-1 text-headline">
          <FlaskConicalIcon className="size-4 text-primary" aria-hidden="true" />
          Bench Review
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarSection title="Runs">
          {views.map((v) => (
            <SidebarItem key={v.id} icon={v.icon} count={v.count} {...item(v.id)}>
              {v.label}
            </SidebarItem>
          ))}
        </SidebarSection>
        <SidebarSection title="Benches">
          {benches.map((b) => (
            <SidebarItem key={b.id} icon={<ServerIcon aria-hidden="true" />} count={b.count} {...item(b.id)}>
              {b.label}
            </SidebarItem>
          ))}
        </SidebarSection>
      </SidebarContent>
      <SidebarFooter>
        <Avatar name="Maya Okafor" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-label">Maya Okafor</span>
          <span className="truncate text-caption text-subtle-foreground">Controls</span>
        </span>
      </SidebarFooter>
    </>
  );

  return (
    // AppShell fills the viewport by default; `embedded` makes it fill this fixed-height frame instead.
    <div className="h-105 w-full overflow-hidden rounded-card border border-border">
      <AppShell sidebar={sidebar} embedded>
        <AppToolbar>
          <span className="min-w-0 flex-1 truncate text-label text-muted-foreground">
            <span className="hidden sm:inline">{currentLabel} / </span>R-0412
          </span>
          <Button variant="ghost" size="icon" aria-label="Export run as CSV">
            <DownloadIcon aria-hidden="true" />
          </Button>
          <Button variant="primary" size="sm">
            <PlayIcon aria-hidden="true" />
            Rerun
          </Button>
        </AppToolbar>
        <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
          <PageHeader
            level={2}
            eyebrow="Bench 3 · firmware 4.18.2"
            title="R-0412 High-gain step"
            description={`Overshoot reached ${fmt.n1.format(M.overshoot)} %, past the ${OVERSHOOT_LIMIT} % limit. Settled ${fmt.n0.format(M.settle)} ms after the step.`}
          >
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="destructive">
                <CircleXIcon aria-hidden="true" />
                Failed
              </Badge>
              <Badge variant="outline">Kp {fmt.n2.format(gains.kp)}</Badge>
            </div>
          </PageHeader>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-3">
            {[
              ['Peak torque', `${fmt.n1.format(M.peak)} N·m`],
              ['Peak phase current', `${fmt.n1.format(M.peakCurrent)} A`],
              ['Winding temperature', `${fmt.n1.format(WINDING_TEMP)} °C`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex flex-col gap-0.5 bg-card px-3 py-2.5 last:col-span-2 sm:last:col-span-1"
              >
                <dt className="truncate text-label font-normal text-muted-foreground">{label}</dt>
                <dd className="text-callout font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </AppShell>
    </div>
  );
}
