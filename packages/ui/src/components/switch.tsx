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
        'relative inline-flex h-4.5 w-8 shrink-0 items-center rounded-full bg-secondary p-0.5',
        'shadow-[inset_0_0_0_1px_var(--border-strong)] transition-[background-color] duration-150 ease-out',
        'before:absolute before:-inset-y-[3px] before:inset-x-0 before:content-[""]',
        'data-checked:bg-primary data-checked:shadow-none data-disabled:opacity-45',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          // dtheo-check-ignore-next-line (the knob is white in both modes, like macOS)
          'block size-3.5 rounded-full bg-white shadow-[0_1px_2px_oklch(0_0_0/0.3),0_0_0_0.5px_oklch(0_0_0/0.08)]',
          'transition-transform duration-180 ease-out data-checked:translate-x-3.5',
        )}
      />
    </SwitchPrimitive.Root>
  );
}
