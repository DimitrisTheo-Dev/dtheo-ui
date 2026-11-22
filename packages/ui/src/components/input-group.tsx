'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

/**
 * A text field with leading or trailing content: an icon, a unit, a keyboard hint or a small button.
 * The group draws the border and focus ring; the input inside stays borderless.
 */
export function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        'flex h-control-md w-full min-w-0 items-center gap-1.5 rounded-control border border-input bg-card px-2 text-body',
        'has-[input:focus-visible]:border-ring has-[input:focus-visible]:inset-ring has-[input:focus-visible]:inset-ring-ring has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/12',
        'has-[[aria-invalid=true]]:border-destructive-foreground has-[[data-invalid]]:border-destructive-foreground',
        'has-[input:disabled]:opacity-45',
        '[&_[data-slot=input]]:h-full [&_[data-slot=input]]:border-0 [&_[data-slot=input]]:bg-transparent [&_[data-slot=input]]:px-0.5 [&_[data-slot=input]]:shadow-none [&_[data-slot=input]]:ring-0 [&_[data-slot=input]]:inset-ring-0',
        className,
      )}
      {...props}
    />
  );
}

/** Non-interactive content beside the input: an icon, a unit like "N·m", or a <Kbd>. */
export function InputGroupAddon({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="input-group-addon"
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-subtle-foreground select-none [&_svg:not([class*=size-])]:size-4',
        className,
      )}
      {...props}
    />
  );
}
