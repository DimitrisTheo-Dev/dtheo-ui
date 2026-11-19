import * as React from 'react';
import { cn } from '../lib/utils';

/** A keyboard key or shortcut. Use the platform glyphs: ⌘ ⌥ ⇧ ⌃ ↵. */
export function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-item border border-border-strong bg-muted px-1',
        'font-sans text-caption font-medium text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}
