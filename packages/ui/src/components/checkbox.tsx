'use client';

import * as React from 'react';
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { CheckboxGroup as CheckboxGroupPrimitive } from '@base-ui/react/checkbox-group';
import { CheckIcon, MinusIcon } from 'lucide-react';
import { cn } from '../lib/utils';

/** A 14px box with a 24px hit area. Supports `indeterminate` for "some selected". */
export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer relative inline-grid size-3.5 shrink-0 place-items-center rounded-item border border-input bg-card text-primary-foreground',
        'transition-[background-color,border-color] duration-120 ease-out',
        'before:absolute before:-inset-[5px] before:content-[""]',
        'data-checked:border-primary data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary',
        'data-invalid:border-destructive-foreground data-disabled:opacity-45',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className="flex data-unchecked:hidden"
        render={(indicatorProps, state) => (
          <span {...indicatorProps}>
            {state.indeterminate ? (
              <MinusIcon className="size-3" strokeWidth={3} aria-hidden="true" />
            ) : (
              <CheckIcon className="size-3" strokeWidth={3} aria-hidden="true" />
            )}
          </span>
        )}
      />
    </CheckboxPrimitive.Root>
  );
}

export function CheckboxGroup({ className, ...props }: React.ComponentProps<typeof CheckboxGroupPrimitive>) {
  return (
    <CheckboxGroupPrimitive
      data-slot="checkbox-group"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}
