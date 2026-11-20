'use client';

import * as React from 'react';
import { CopyIcon, GitCompareIcon, MoreHorizontalIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from '@dtheo/ui/components/menu';
import { useToast } from '@dtheo/ui/components/toast';
import { TORQUE_LIMIT, fmt, measuredMetrics as M } from '@/lib/lab-data';

const baselines = ['R-0411 · Previous run', 'R-0409 · Reference', 'Reference model'];

export default function MenuExample() {
  const toast = useToast();
  const [showLimit, setShowLimit] = React.useState(true);
  const [showBand, setShowBand] = React.useState(false);
  return (
    <div className="flex w-full max-w-sm items-center gap-3 rounded-card border border-border bg-card py-1.5 pr-1.5 pl-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium">R-0412 · High-gain step</span>
        <span className="truncate text-caption text-muted-foreground">
          Bench 3 · overshoot {fmt.n1.format(M.overshoot)} %
        </span>
      </div>
      <Menu>
        <MenuTrigger render={<Button variant="ghost" size="icon" aria-label="Actions for R-0412" />}>
          <MoreHorizontalIcon aria-hidden="true" />
        </MenuTrigger>
        <MenuContent align="end" className="min-w-52">
          <MenuItem
            onClick={() =>
              toast.add({ title: 'R-0413 created', description: 'Copy of R-0412, ready to retune.' })
            }
          >
            <CopyIcon aria-hidden="true" />
            Duplicate as retune
            <MenuShortcut>⇧⌘D</MenuShortcut>
          </MenuItem>
          <MenuSub>
            <MenuSubTrigger>
              <GitCompareIcon className="text-muted-foreground" aria-hidden="true" />
              Compare with
            </MenuSubTrigger>
            <MenuSubContent>
              {baselines.map((b) => (
                <MenuItem
                  key={b}
                  onClick={() => toast.add({ title: `Comparing R-0412 with ${b.split(' · ')[0]}` })}
                >
                  {b}
                </MenuItem>
              ))}
            </MenuSubContent>
          </MenuSub>
          <MenuSeparator />
          <MenuGroup>
            <MenuLabel>Show on chart</MenuLabel>
            <MenuCheckboxItem checked={showLimit} onCheckedChange={setShowLimit}>
              Overshoot limit, {fmt.n1.format(TORQUE_LIMIT)} N·m
            </MenuCheckboxItem>
            <MenuCheckboxItem checked={showBand} onCheckedChange={setShowBand}>
              ±2 % settling band
            </MenuCheckboxItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuItem variant="destructive">
            <Trash2Icon aria-hidden="true" />
            Delete run…
          </MenuItem>
        </MenuContent>
      </Menu>
    </div>
  );
}
