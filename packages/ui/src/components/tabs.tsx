'use client';

import * as React from 'react';
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cn } from '../lib/utils';

type TabsVariant = 'segmented' | 'underline';
const TabsVariantContext = React.createContext<TabsVariant>('segmented');

/**
 * Switches between views of the same object. `segmented` (default) reads like a macOS segmented control;
 * `underline` suits page-level sections. Arrow keys move between tabs.
 */
export function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-3', className)} {...props} />;
}

export function TabsList({
  className,
  variant = 'segmented',
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: TabsVariant }) {
  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        className={cn(
          'relative z-0 inline-flex w-fit items-center',
          variant === 'segmented'
            ? 'h-control-md gap-0.5 rounded-control bg-secondary p-0.5'
            : 'h-control-lg gap-4 border-b border-border',
          className,
        )}
        {...props}
      >
        {children}
        <TabsPrimitive.Indicator
          className={cn(
            'absolute -z-10 transition-[left,width] duration-200 ease-out',
            variant === 'segmented'
              ? 'top-0.5 bottom-0.5 left-(--active-tab-left) w-(--active-tab-width) rounded-[calc(var(--radius-control)-2px)] bg-card shadow-raised dark:bg-foreground/15'
              : '-bottom-px left-(--active-tab-left) h-0.5 w-(--active-tab-width) rounded-full bg-foreground',
          )}
        />
      </TabsPrimitive.List>
    </TabsVariantContext.Provider>
  );
}

export function TabsTab({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Tab>) {
  const variant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        'inline-flex h-full cursor-default items-center justify-center gap-1.5 whitespace-nowrap text-body font-medium select-none',
        'text-muted-foreground transition-colors duration-150 hover:text-foreground',
        'data-active:text-foreground data-disabled:opacity-45 [&_svg:not([class*=size-])]:size-4',
        // Inside the track, the ring sits on the segment's own edge so its halo does not spill onto neighbours.
        variant === 'segmented'
          ? 'rounded-[calc(var(--radius-control)-2px)] px-2.5 [--focus-offset:-1px]'
          : 'rounded-item px-0.5',
        className,
      )}
      {...props}
    />
  );
}

export function TabsPanel({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Panel>) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn('rounded-card [--focus-offset:4px]', className)}
      {...props}
    />
  );
}
