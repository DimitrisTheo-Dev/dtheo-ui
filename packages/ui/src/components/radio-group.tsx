'use client';

import * as React from 'react';
import { Radio as RadioPrimitive } from '@base-ui/react/radio';
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';
import { cn } from '../lib/utils';

/** One choice from a short, visible list. Arrow keys move between options. For more than ~5, use Select. */
export function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive>) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}

export function Radio({ className, ...props }: React.ComponentProps<typeof RadioPrimitive.Root>) {
  return (
    <RadioPrimitive.Root
      data-slot="radio"
      className={cn(
        'relative inline-grid size-3.5 shrink-0 place-items-center rounded-full border border-input bg-card',
        'transition-[background-color,border-color] duration-120 ease-out',
        'before:absolute before:-inset-[5px] before:content-[""]',
        'data-checked:border-primary data-checked:bg-primary data-disabled:opacity-45',
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-indicator"
        className="size-1.5 rounded-full bg-primary-foreground data-unchecked:hidden"
      />
    </RadioPrimitive.Root>
  );
}
