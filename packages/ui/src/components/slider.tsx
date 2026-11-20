'use client';

import * as React from 'react';
import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import { cn } from '../lib/utils';

/**
 * A continuous value on a track. Pass an array to `defaultValue` for a range with two thumbs, and name each
 * thumb with `thumbLabels` ("Window start", "Window end") so they are announced apart.
 */
export function Slider({
  className,
  thumbLabels,
  'aria-label': ariaLabel,
  // One locale on the server and in the browser, so the announced value hydrates the same everywhere.
  locale = 'en-US',
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & { thumbLabels?: string[] }) {
  const values = props.value ?? props.defaultValue;
  const count = Array.isArray(values) ? values.length : 1;
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      aria-label={ariaLabel}
      className={cn('w-full touch-none select-none', className)}
      locale={locale}
      {...props}
    >
      <SliderPrimitive.Control className="flex h-5 w-full items-center data-disabled:opacity-45">
        <SliderPrimitive.Track className="relative h-1 w-full rounded-full bg-secondary shadow-[inset_0_0_0_1px_var(--border)]">
          <SliderPrimitive.Indicator className="rounded-full bg-primary" />
          {Array.from({ length: count }, (_, i) => (
            <SliderPrimitive.Thumb
              key={i}
              index={i}
              // The input inside the thumb is what assistive tech focuses, so it carries the name.
              aria-label={thumbLabels?.[i] ?? (count === 1 ? ariaLabel : undefined)}
              className={cn(
                // dtheo-check-ignore-next-line (the knob is white in both modes, like macOS)
                'focus-within-ring size-4 rounded-full bg-white shadow-[0_1px_3px_oklch(0_0_0/0.35),0_0_0_0.5px_oklch(0_0_0/0.12)]',
                'transition-[scale] duration-120 ease-out data-dragging:scale-110',
              )}
            />
          ))}
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}
