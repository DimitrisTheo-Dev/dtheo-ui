import * as React from 'react';
import { cn } from '../lib/utils';

/**
 * A placeholder shaped like the content that is loading. Match the final layout so nothing shifts.
 * Skip skeletons for content that loads in under ~300ms; the flash reads as a glitch.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('animate-pulse rounded-control bg-secondary motion-reduce:animate-none', className)}
      {...props}
    />
  );
}
