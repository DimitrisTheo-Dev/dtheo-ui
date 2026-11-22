'use client';

import * as React from 'react';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { CheckIcon, ChevronsUpDownIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { popupItemClass, popupSurfaceClass } from '../lib/popup';
import { usePortalContainer } from '../lib/theme';
import { fieldControlClass } from './input';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;

/** The closed control. One chevron, in the icon slot, never beside a native arrow. */
export function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-focus="field"
      className={cn(
        fieldControlClass,
        'flex cursor-default items-center justify-between gap-2 pr-1.5 text-left select-none',
        'data-popup-open:border-ring',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="flex shrink-0 text-subtle-foreground">
        <ChevronsUpDownIcon className="size-3.5" aria-hidden="true" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectValue({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn('min-w-0 flex-1 truncate data-placeholder:text-subtle-foreground', className)}
      {...props}
    />
  );
}

export function SelectContent({
  className,
  children,
  sideOffset = 4,
  alignItemWithTrigger = true,
  side,
  align,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Popup> &
  Pick<
    React.ComponentProps<typeof SelectPrimitive.Positioner>,
    'sideOffset' | 'align' | 'side' | 'alignItemWithTrigger'
  >) {
  const container = usePortalContainer();
  return (
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Positioner
        // dtheo-check-ignore-next-line (the positioner is never focused; items highlight with popupItemClass)
        className="z-50 outline-none select-none"
        sideOffset={sideOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        side={side}
        align={align}
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            popupSurfaceClass,
            'min-w-(--anchor-width) data-[side=none]:scale-100 data-[side=none]:transition-none',
            className,
          )}
          {...props}
        >
          <SelectPrimitive.ScrollUpArrow className="flex h-5 w-full cursor-default items-center justify-center text-subtle-foreground">
            <ChevronUpIcon className="size-3.5" aria-hidden="true" />
          </SelectPrimitive.ScrollUpArrow>
          <SelectPrimitive.List className="max-h-(--available-height) scroll-py-1 overflow-y-auto p-1">
            {children}
          </SelectPrimitive.List>
          <SelectPrimitive.ScrollDownArrow className="flex h-5 w-full cursor-default items-center justify-center text-subtle-foreground">
            <ChevronDownIcon className="size-3.5" aria-hidden="true" />
          </SelectPrimitive.ScrollDownArrow>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

/** A choice. The checkmark sits in its own column so labels align whether or not they are selected. */
export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(popupItemClass, 'grid grid-cols-[1rem_1fr] gap-1.5 pr-3', className)}
      {...props}
    >
      <SelectPrimitive.ItemIndicator className="col-start-1 flex">
        <CheckIcon className="size-3.5" aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText className="col-start-2 truncate">{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export function SelectGroupLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.GroupLabel>) {
  return (
    <SelectPrimitive.GroupLabel
      className={cn('px-2 pt-1.5 pb-1 text-caption font-medium text-subtle-foreground', className)}
      {...props}
    />
  );
}

export function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator className={cn('mx-2 my-1 h-px bg-border', className)} {...props} />;
}
