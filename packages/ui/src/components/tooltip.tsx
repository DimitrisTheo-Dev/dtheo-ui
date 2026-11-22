'use client';

import * as React from 'react';
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { cn } from '../lib/utils';
import { usePortalContainer } from '../lib/theme';

/**
 * Wrap the app once. After the first tooltip opens, neighbors open instantly (no delay, no animation),
 * so scanning a toolbar feels fast.
 */
export function TooltipProvider({
  delay = 500,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delay={delay} {...props} />;
}

export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

/** A short label for an icon-only control. Never put essential information only in a tooltip. */
export function TooltipContent({
  className,
  side = 'top',
  align = 'center',
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Popup> &
  Pick<React.ComponentProps<typeof TooltipPrimitive.Positioner>, 'side' | 'sideOffset' | 'align'>) {
  const container = usePortalContainer();
  return (
    <TooltipPrimitive.Portal container={container}>
      <TooltipPrimitive.Positioner className="z-50" side={side} align={align} sideOffset={sideOffset}>
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            'max-w-64 rounded-item border border-border bg-popover px-2 py-1 text-caption text-popover-foreground shadow-popover',
            'origin-(--transform-origin) transition-[scale,opacity] duration-120 ease-out',
            'data-starting-style:scale-97 data-starting-style:opacity-0 data-ending-style:scale-97 data-ending-style:opacity-0',
            'data-instant:duration-0',
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}
