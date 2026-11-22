'use client';

import * as React from 'react';
import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '../lib/utils';

/** An immediate on/off setting. If the change needs a Save button, use a Checkbox instead. */
export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // The track's edge is a real border (the fill shows through it), so forced colors, which drop fills and
        // shadows, still draw the track (base.css).
        'relative inline-flex h-4.5 w-8 shrink-0 items-center rounded-full border border-border-strong bg-secondary p-px',
        'transition-[background-color,border-color] duration-150 ease-out',
        'before:absolute before:-inset-x-px before:-inset-y-1 before:content-[""]',
        'data-checked:border-transparent data-checked:bg-primary data-disabled:opacity-45',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // dtheo-check-ignore-next-line (the knob is white in both modes, like macOS)
          'block size-3.5 rounded-full bg-white shadow-[0_1px_2px_oklch(0_0_0/0.3),0_0_0_0.5px_oklch(0_0_0/0.08)]',
          'transition-transform duration-180 ease-out data-checked:translate-x-3.5',
        )}
      />
    </SwitchPrimitive.Root>
  );
}
