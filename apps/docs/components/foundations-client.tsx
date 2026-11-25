'use client';

import * as React from 'react';
import { CommandIcon, PlusIcon, SlidersHorizontalIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { Input } from '@dtheo/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@dtheo/ui/components/select';
import { SegmentedControl, SegmentedControlItem } from '@dtheo/ui/components/toggle-group';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@dtheo/ui/components/popover';
import { Kbd } from '@dtheo/ui/components/kbd';

const benches = [
  { value: 'b3', label: 'Bench 3' },
  { value: 'b1', label: 'Bench 1' },
];

/** The geometry workbench: one row per control size, with guides on the shared top and bottom edges. */
export function AlignmentWorkbench() {
  const sizes = [
    { id: 'sm', label: 'Small · 24px', button: 'sm' as const, h: 'h-control-sm', text: 'text-label' },
    { id: 'md', label: 'Default · 28px (36px on touch)', button: 'md' as const, h: 'h-control-md', text: '' },
    { id: 'lg', label: 'Large · 32px', button: 'lg' as const, h: 'h-control-lg', text: 'text-callout' },
  ];
  return (
    <div className="flex flex-col gap-5 rounded-card border border-border bg-card p-4 sm:p-5">
      {sizes.map((s) => (
        <div key={s.id} className="flex flex-col gap-2">
          <span className="text-caption text-subtle-foreground">{s.label}</span>
          <div className="relative flex flex-wrap items-center gap-2">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-primary/40"
            />
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 ${s.h} border-b border-dashed border-primary/40`}
            />
            <Button size={s.button} variant="primary">
              <PlusIcon aria-hidden="true" />
              New run
            </Button>
            <Input
              aria-label={`Run name, ${s.id}`}
              defaultValue="High-gain step"
              className={`w-40 ${s.h} ${s.text}`}
            />
            <Select items={benches} defaultValue="b3">
              <SelectTrigger aria-label={`Bench, ${s.id}`} className={`w-32 ${s.h} ${s.text}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {benches.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SegmentedControl aria-label={`Window, ${s.id}`} defaultValue={['400']} className={s.h}>
              <SegmentedControlItem value="400">400 ms</SegmentedControlItem>
              <SegmentedControlItem value="1000">1 s</SegmentedControlItem>
            </SegmentedControl>
            <Button
              size={s.id === 'sm' ? 'icon-sm' : s.id === 'lg' ? 'icon-lg' : 'icon'}
              aria-label="Filters"
            >
              <SlidersHorizontalIcon aria-hidden="true" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MotionDemos() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-card p-4">
        <span className="text-label">Press</span>
        <Button variant="primary">Hold me</Button>
        <span className="text-caption text-subtle-foreground">
          scale(0.97) in 120 ms, ease-out, on pointer-down.
        </span>
      </div>
      <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-card p-4">
        <span className="text-label">Origin-aware</span>
        <Popover>
          <PopoverTrigger render={<Button />}>Open popover</PopoverTrigger>
          <PopoverContent side="bottom" align="start">
            <PopoverTitle>Grows from the trigger</PopoverTitle>
            <PopoverDescription>Scale 0.96 → 1 and fade, 180 ms, anchored at the button.</PopoverDescription>
          </PopoverContent>
        </Popover>
        <span className="text-caption text-subtle-foreground">
          Never from zero scale; dialogs stay centered.
        </span>
      </div>
      <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-card p-4">
        <span className="text-label">No animation</span>
        <span className="inline-flex items-center gap-1.5 text-body">
          <CommandIcon className="size-4" aria-hidden="true" /> Press <Kbd>⌘K</Kbd>
        </span>
        <span className="text-caption text-subtle-foreground">
          The command palette opens instantly: it is used too often to make anyone wait.
        </span>
      </div>
    </div>
  );
}
