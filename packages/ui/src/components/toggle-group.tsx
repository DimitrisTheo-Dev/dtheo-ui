'use client';

import * as React from 'react';
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import { cn } from '../lib/utils';

/** A pressed/unpressed button, like Bold in an editor or a "Show reference" switch in a toolbar. */
export function Toggle({ className, ...props }: React.ComponentProps<typeof TogglePrimitive>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(
        'inline-flex h-control-md cursor-default items-center justify-center gap-1.5 rounded-control px-2.5 text-body font-medium select-none',
        'text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out active:scale-97',
        'hover:bg-accent hover:text-foreground data-pressed:bg-secondary data-pressed:text-foreground',
        'data-disabled:opacity-45 [&_svg:not([class*=size-])]:size-4',
        className,
      )}
      {...props}
    />
  );
}

/**
 * A segmented control for a small set of mutually exclusive modes (a time window, a view).
 * Set `value`/`defaultValue` to an array with one item; use `multiple` for independent toggles.
 */
export function SegmentedControl({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive>) {
  return (
    <ToggleGroupPrimitive
      data-slot="segmented-control"
      className={cn(
        'inline-flex h-control-md w-fit items-center gap-0.5 rounded-control bg-secondary p-0.5',
        className,
      )}
      {...props}
    />
  );
}

export function SegmentedControlItem({ className, ...props }: React.ComponentProps<typeof TogglePrimitive>) {
  return (
    <TogglePrimitive
      data-slot="segmented-control-item"
      className={cn(
        'inline-flex h-full cursor-default items-center justify-center gap-1.5 rounded-[calc(var(--radius-control)-2px)] px-2.5 [--focus-offset:-1px]',
        'text-label text-muted-foreground select-none transition-[background-color,color,box-shadow] duration-150 ease-out',
        'hover:text-foreground',
        'data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-raised dark:data-pressed:bg-foreground/15',
        'data-disabled:opacity-45 [&_svg:not([class*=size-])]:size-3.5',
        className,
      )}
      {...props}
    />
  );
}
