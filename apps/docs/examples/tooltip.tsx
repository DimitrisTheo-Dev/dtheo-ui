'use client';

import { DownloadIcon, LinkIcon, MaximizeIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { Separator } from '@dtheo/ui/components/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@dtheo/ui/components/tooltip';

const tools = [
  [
    { label: 'Zoom in', icon: ZoomInIcon },
    { label: 'Zoom out', icon: ZoomOutIcon },
    { label: 'Fit to run', icon: MaximizeIcon },
  ],
  [
    { label: 'Download PNG', icon: DownloadIcon },
    { label: 'Copy link to this view', icon: LinkIcon },
  ],
];

const tracePath = 'traces/bench-3/R-0412_high-gain-step_torque.csv';

export default function TooltipExample() {
  return (
    <div className="flex w-full max-w-md items-center gap-1 rounded-card border border-border bg-card p-1 pl-3">
      {/* A truncated value: the tooltip reveals the whole path on hover. */}
      <Tooltip>
        <TooltipTrigger
          render={<span className="min-w-0 flex-1 truncate text-label text-muted-foreground" />}
        >
          {tracePath}
        </TooltipTrigger>
        <TooltipContent className="max-w-none">{tracePath}</TooltipContent>
      </Tooltip>
      {/* Icon-only buttons: after the first tooltip opens, its neighbours open instantly. */}
      {tools.map((group, i) => (
        <div key={group[0]?.label} className="flex shrink-0 items-center gap-0.5">
          {i > 0 ? <Separator orientation="vertical" className="mx-1 h-4" /> : null}
          {group.map(({ label, icon: Icon }) => (
            <Tooltip key={label}>
              <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label={label} />}>
                <Icon aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      ))}
    </div>
  );
}
