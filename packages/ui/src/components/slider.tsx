'use client';

import * as React from 'react';
import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import { cn } from '../lib/utils';

/**
 * A continuous value on a track. Pass an array to `defaultValue` for a range with two thumbs, and name each
 * thumb with `thumbLabels` ("Window start", "Window end") so they are announced apart. Pass `unit` (and `format`
 * for the digits) so a screen reader hears the value the screen shows: "9.0 %", not "9".
 */
export function Slider({
  className,
  thumbLabels,
  unit,
  getAriaValueText,
  'aria-label': ariaLabel,
  // One locale on the server and in the browser, so the announced value hydrates the same everywhere.
  locale = 'en-US',
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  /** A name per thumb, in value order. A single slider can use `aria-label` or a Field label instead. */
  thumbLabels?: string[];
  /** Appended to the announced value: "ms", "%", "N·m". */
  unit?: string;
  /** Full control of the announced value, for text a unit cannot express ("Off", "Auto"). */
  getAriaValueText?: (formattedValue: string, value: number, index: number) => string;
}) {
  const values = props.value ?? props.defaultValue;
  const count = Array.isArray(values) ? values.length : 1;
  // Base UI announces a range as "20 start range"; with a unit, each thumb says its own value: "20 ms".
  const valueText = getAriaValueText ?? (unit ? (formatted: string) => `${formatted} ${unit}` : undefined);
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      aria-label={ariaLabel}
      className={cn('w-full touch-none select-none', className)}
      locale={locale}
      {...props}
    >
      <SliderPrimitive.Control className="flex h-5 w-full items-center data-disabled:opacity-45">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative h-1 w-full rounded-full bg-secondary shadow-[inset_0_0_0_1px_var(--border)]"
        >
          <SliderPrimitive.Indicator data-slot="slider-indicator" className="rounded-full bg-primary" />
          {Array.from({ length: count }, (_, i) => (
            <SliderPrimitive.Thumb
              key={i}
              index={i}
              data-slot="slider-thumb"
              // The input inside the thumb is what assistive tech focuses, so it carries the name and the value text.
              aria-label={thumbLabels?.[i] ?? (count === 1 ? ariaLabel : undefined)}
              getAriaValueText={valueText}
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
