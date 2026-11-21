'use client';

import * as React from 'react';
import { NumberField as NumberFieldPrimitive } from '@base-ui/react/number-field';
import { MinusIcon, PlusIcon } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * A number with steppers and an optional unit. Drag the label horizontally to scrub the value,
 * use arrow keys (Shift steps by `largeStep`, 10 unless you set it), or type. Formats with the user's locale.
 */
export function NumberField({
  className,
  unit,
  label,
  id: idProp,
  ...props
}: React.ComponentProps<typeof NumberFieldPrimitive.Root> & { unit?: string; label?: React.ReactNode }) {
  const generatedId = React.useId();
  const id = idProp ?? generatedId;
  return (
    <NumberFieldPrimitive.Root
      id={id}
      data-slot="number-field"
      className={cn('flex flex-col gap-1.5', className)}
      {...props}
    >
      {label ? (
        <NumberFieldPrimitive.ScrubArea className="w-fit cursor-ew-resize">
          <label htmlFor={id} className="cursor-ew-resize text-label text-foreground select-none">
            {label}
          </label>
          {/* dtheo-check-ignore-next-line (black at low alpha is depth under the cursor, not a color role; there is no drop-shadow token) */}
          <NumberFieldPrimitive.ScrubAreaCursor className="drop-shadow-[0_1px_1px_oklch(0_0_0/0.4)]">
            <svg width="20" height="10" viewBox="0 0 20 10" fill="currentColor" aria-hidden="true">
              <path d="M0 5 6 0v10L0 5Zm20 0-6 5V0l6 5Z" />
            </svg>
          </NumberFieldPrimitive.ScrubAreaCursor>
        </NumberFieldPrimitive.ScrubArea>
      ) : null}
      <NumberFieldPrimitive.Group
        data-slot="number-field-group"
        className={cn(
          'flex h-control-md w-full items-center rounded-control border border-input bg-card text-body',
          'has-[input:focus-visible]:border-ring has-[input:focus-visible]:inset-ring has-[input:focus-visible]:inset-ring-ring has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/12',
          'data-invalid:border-destructive-foreground data-disabled:opacity-45',
        )}
      >
        <NumberFieldPrimitive.Decrement
          aria-label="Decrease"
          className="grid h-full w-7 shrink-0 cursor-default place-items-center rounded-l-control text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <MinusIcon className="size-3.5" aria-hidden="true" />
        </NumberFieldPrimitive.Decrement>
        <NumberFieldPrimitive.Input
          data-focus="field"
          className="h-full min-w-0 flex-1 bg-transparent px-1 text-center tabular-nums outline-none"
        />
        {unit ? <span className="pr-1 text-caption text-subtle-foreground select-none">{unit}</span> : null}
        <NumberFieldPrimitive.Increment
          aria-label="Increase"
          className="grid h-full w-7 shrink-0 cursor-default place-items-center rounded-r-control text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <PlusIcon className="size-3.5" aria-hidden="true" />
        </NumberFieldPrimitive.Increment>
      </NumberFieldPrimitive.Group>
    </NumberFieldPrimitive.Root>
  );
}
