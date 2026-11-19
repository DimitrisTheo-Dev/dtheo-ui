import * as React from 'react';
import { cn } from '../lib/utils';

const SPOKES = 8;

/**
 * An Apple-style activity indicator. Eight spokes fade in sequence; under reduced motion it holds still
 * and the surrounding copy carries the "loading" meaning.
 */
export function Spinner({
  className,
  label = 'Loading',
  ...props
}: React.ComponentProps<'span'> & { label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      data-slot="spinner"
      className={cn('relative inline-block size-4 text-current', className)}
      {...props}
    >
      {Array.from({ length: SPOKES }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="absolute top-0 left-[calc(50%-0.75px)] h-1/2 w-[1.5px] origin-bottom"
          style={{ transform: `rotate(${(360 / SPOKES) * i}deg)` }}
        >
          <span
            className="block h-[42%] w-full animate-[dtheo-spoke_0.8s_linear_infinite] rounded-full bg-current"
            style={{ animationDelay: `${-0.8 + (0.8 / SPOKES) * i}s` }}
          />
        </span>
      ))}
    </span>
  );
}
