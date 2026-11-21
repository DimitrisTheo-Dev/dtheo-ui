'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ActivityIcon,
  BotIcon,
  ChevronsUpDownIcon,
  CogIcon,
  FileTextIcon,
  GaugeIcon,
  SearchIcon,
  ServerIcon,
  WavesIcon,
} from 'lucide-react';
import { Avatar } from '@dtheo/ui/components/avatar';
import { Kbd } from '@dtheo/ui/components/kbd';
import { StatusDot } from '@dtheo/ui/components/badge';
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarSection,
} from '@dtheo/ui/components/app-shell';

/** The signed-in engineer in every example: a made-up person, like the rest of the data. */
export const labUser = { name: 'Lena Varga', first: 'Lena' };

/**
 * The shared sidebar of the "Actuator Lab" suite. Run review, Motor map, Loop tuning and the Lab assistant are different tools
 * with their own character, but the frame, navigation and vocabulary are the same.
 */
export function LabSidebar({
  current,
  onSearch,
}: {
  current: 'runs' | 'motors' | 'tuning' | 'assistant';
  onSearch?: () => void;
}) {
  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-1 py-1">
          <span className="grid size-6 place-items-center rounded-control bg-primary text-caption font-semibold text-primary-foreground">
            AL
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-body font-semibold">Actuator Lab</span>
            <span className="truncate text-caption text-subtle-foreground">Bench operations</span>
          </span>
          <ChevronsUpDownIcon className="size-3.5 text-subtle-foreground" aria-hidden="true" />
        </div>
        <button
          type="button"
          onClick={onSearch}
          className="flex h-7 items-center gap-2 rounded-control border border-border bg-muted px-2 text-body text-subtle-foreground transition-colors hover:border-border-strong pointer-coarse:h-10"
        >
          <SearchIcon className="size-3.5" aria-hidden="true" />
          <span className="flex-1 text-left">Search</span>
          <Kbd>⌘K</Kbd>
        </button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarSection title="Bench">
          <SidebarItem
            render={<Link href="/examples/run-review" />}
            icon={<ActivityIcon />}
            count={412}
            active={current === 'runs'}
          >
            Runs
          </SidebarItem>
          {/* Destinations the suite has but this demo doesn't build: listed, dimmed, never a dead link. */}
          <SidebarItem disabled icon={<ServerIcon />} count={6}>
            Benches
          </SidebarItem>
          <SidebarItem disabled icon={<CogIcon />} count={28}>
            Actuators
          </SidebarItem>
          <SidebarItem
            render={<Link href="/examples/motor-map" />}
            icon={<GaugeIcon />}
            active={current === 'motors'}
          >
            Motor maps
          </SidebarItem>
          <SidebarItem
            render={<Link href="/examples/tuning" />}
            icon={<WavesIcon />}
            active={current === 'tuning'}
          >
            Loop tuning
          </SidebarItem>
          <SidebarItem disabled icon={<FileTextIcon />}>
            Reports
          </SidebarItem>
          <SidebarItem
            render={<Link href="/examples/assistant" />}
            icon={<BotIcon />}
            active={current === 'assistant'}
          >
            Lab assistant
          </SidebarItem>
        </SidebarSection>
        <SidebarSection title="Pinned actuators">
          <SidebarItem
            render={<Link href="/examples/tuning" />}
            icon={<StatusDot tone="destructive" className="mx-1" />}
            count="1 failing"
          >
            RA-14 hip pitch
          </SidebarItem>
          <SidebarItem disabled icon={<StatusDot className="mx-1" />}>
            RL-22 knee
          </SidebarItem>
          <SidebarItem disabled icon={<StatusDot className="mx-1" />}>
            RW-05 wrist roll
          </SidebarItem>
        </SidebarSection>
      </SidebarContent>
      <SidebarFooter>
        <Avatar name={labUser.name} />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-body font-medium">{labUser.first}</span>
          <span className="truncate text-caption text-subtle-foreground">Test engineer</span>
        </span>
        <Link href="/docs" className="ml-auto text-caption text-subtle-foreground hover:text-foreground">
          Docs
        </Link>
      </SidebarFooter>
    </>
  );
}
