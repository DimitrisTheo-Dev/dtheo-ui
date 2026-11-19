'use client';

import * as React from 'react';
import { SlidersHorizontalIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { NumberField } from '@dtheo/ui/components/number-field';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@dtheo/ui/components/popover';

export default function PopoverExample() {
  const [open, setOpen] = React.useState(false);
  const [limits, setLimits] = React.useState({ overshoot: 15, settling: 250 });
  const [draft, setDraft] = React.useState(limits);

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) setDraft(limits);
          setOpen(next);
        }}
      >
        <PopoverTrigger render={<Button variant="outline" />}>
          <SlidersHorizontalIcon aria-hidden="true" />
          Acceptance limits
        </PopoverTrigger>
        <PopoverContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <PopoverTitle>Acceptance limits</PopoverTitle>
            <PopoverDescription>
              Runs on Bench 3 that exceed a limit are flagged for review.
            </PopoverDescription>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Max overshoot"
              unit="%"
              value={draft.overshoot}
              onValueChange={(v) => setDraft((d) => ({ ...d, overshoot: v ?? d.overshoot }))}
              min={0}
              max={50}
            />
            <NumberField
              label="Max settling"
              unit="ms"
              value={draft.settling}
              onValueChange={(v) => setDraft((d) => ({ ...d, settling: v ?? d.settling }))}
              min={50}
              max={2000}
              step={10}
            />
          </div>
          <div className="flex justify-end gap-2">
            <PopoverClose render={<Button size="sm" variant="ghost" />}>Cancel</PopoverClose>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setLimits(draft);
                setOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <span className="text-caption text-muted-foreground tabular-nums">
        Overshoot ≤ {limits.overshoot} %, settling ≤ {limits.settling} ms
      </span>
    </div>
  );
}
