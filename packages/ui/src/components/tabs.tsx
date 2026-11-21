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

/**
 * The row of tabs. When the tabs are wider than the space they get (a phone), the row scrolls sideways inside its own
 * box instead of pushing the page wider; arrow keys bring the focused tab into view.
 */
export function TabsList({
  className,
  variant = 'segmented',
  children,
  onKeyDown,
  onPointerDown,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: TabsVariant }) {
  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        // The indicator slides when you click a tab and jumps when you arrow to one: nothing animates on keyboard
        // actions. Kept on the element, not in state, so a key press never re-renders the list.
        onKeyDown={(e) => {
          e.currentTarget.dataset.input = 'keyboard';
          onKeyDown?.(e);
        }}
        onPointerDown={(e) => {
          e.currentTarget.dataset.input = 'pointer';
          onPointerDown?.(e);
        }}
        className={cn(
          'group/tabs-list relative z-0 inline-flex w-fit max-w-full items-center',
          'overflow-x-auto overscroll-x-contain [scrollbar-width:none]',
          variant === 'segmented'
            ? 'h-control-md gap-0.5 rounded-control bg-secondary p-0.5'
            : // The baseline is an inset shadow, not a border, so the scroll box does not clip the indicator on it.
              'h-control-lg gap-3 shadow-[inset_0_-1px_0_var(--border)]',
          className,
        )}
        {...props}
      >
        {children}
        <TabsPrimitive.Indicator
          data-slot="tabs-indicator"
          className={cn(
            'absolute left-0 -z-10 w-(--active-tab-width) translate-x-(--active-tab-left)',
            'transition-[translate,width] duration-200 ease-out group-data-[input=keyboard]/tabs-list:transition-none',
            variant === 'segmented'
              ? 'top-0.5 bottom-0.5 rounded-[calc(var(--radius-control)-2px)] bg-card shadow-raised dark:bg-foreground/15'
              : 'bottom-0 h-0.5 rounded-full bg-foreground',
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
        // Inside the track, the ring sits on the segment's own edge so its halo does not spill onto neighbours. An
        // underline tab fills the height of its scrolling row, so its ring is drawn just inside the tab.
        variant === 'segmented'
          ? 'rounded-[calc(var(--radius-control)-2px)] px-2.5 [--focus-offset:-1px]'
          : 'rounded-item px-1 [--focus-offset:-2px]',
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
      // The panel's own ring stands clear of its content. The offset does not inherit (base.css), so controls inside
      // the panel keep the normal ring.
      className={cn('rounded-card [--focus-offset:4px]', className)}
      {...props}
    />
  );
}
