'use client';

import * as React from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';
import { cn } from '../lib/utils';

/** Shared look for every text-entry control so inputs, selects and comboboxes align in one row. */
export const fieldControlClass = cn(
  'h-control-md w-full min-w-0 rounded-control border border-input bg-card px-2.5 text-body text-foreground',
  'placeholder:text-subtle-foreground outline-none',
  // Focus is the same 2px line as every other control (the border plus a 1px inset ring) over the 12 % halo. Nothing
  // transitions: focus answers a key press, so it appears at once.
  'focus-visible:border-ring focus-visible:inset-ring focus-visible:inset-ring-ring focus-visible:ring-3 focus-visible:ring-ring/12',
  'data-focused:border-ring',
  'aria-invalid:border-destructive-foreground aria-invalid:focus-visible:inset-ring-destructive-foreground aria-invalid:focus-visible:ring-destructive-foreground/12',
  'data-invalid:border-destructive-foreground data-invalid:focus-visible:inset-ring-destructive-foreground data-invalid:focus-visible:ring-destructive-foreground/12',
  'disabled:cursor-not-allowed disabled:opacity-45 data-disabled:cursor-not-allowed data-disabled:opacity-45',
  // The attribute, not :read-only, which also matches buttons (a Select trigger shares these styles).
  '[&[readonly]]:border-dashed [&[readonly]]:bg-muted',
);

/** A single-line text field. Inside a <Field> it picks up the label, description and error automatically. */
export function Input({ className, ...props }: React.ComponentProps<typeof InputPrimitive>) {
  return (
    <InputPrimitive
      data-slot="input"
      data-focus="field"
      className={cn(fieldControlClass, className)}
      {...props}
    />
  );
}
