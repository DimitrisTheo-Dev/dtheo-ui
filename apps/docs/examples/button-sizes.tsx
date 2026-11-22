'use client';

import { MoreHorizontalIcon, RotateCcwIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';

const sizes = [
  { size: 'xs', icon: 'icon-xs', height: '22 px', use: 'Table rows' },
  { size: 'sm', icon: 'icon-sm', height: '24 px', use: 'Toolbars' },
  { size: 'md', icon: 'icon', height: '28 px', use: 'Default, 36 px on touch' },
  { size: 'lg', icon: 'icon-lg', height: '32 px', use: 'Page actions, 40 px on touch' },
] as const;

export default function ButtonSizes() {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
      {sizes.map(({ size, icon, height, use }) => (
        <div key={size} className="flex flex-col items-center gap-2 text-center">
          <div className="flex min-h-control-touch items-center gap-1">
            <Button size={size}>
              <RotateCcwIcon aria-hidden="true" />
              Rerun
            </Button>
            <Button variant="ghost" size={icon} aria-label="More actions for R-0412">
              <MoreHorizontalIcon aria-hidden="true" />
            </Button>
          </div>
          <div className="flex flex-col">
            <span className="text-label text-foreground tabular-nums">
              {size} · {height}
            </span>
            <span className="text-caption text-muted-foreground">{use}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
