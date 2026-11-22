'use client';

import * as React from 'react';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { CheckIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePortalContainer } from '../lib/theme';
import { popupItemClass, popupSurfaceClass } from '../lib/popup';

/** A list of actions or options behind a trigger (the "…" menu, a toolbar dropdown). */
export const Menu = MenuPrimitive.Root;
export const MenuTrigger = MenuPrimitive.Trigger;
export const MenuGroup = MenuPrimitive.Group;
export const MenuRadioGroup = MenuPrimitive.RadioGroup;
export const MenuSub = MenuPrimitive.SubmenuRoot;

export function MenuContent({
  className,
  side = 'bottom',
  align = 'start',
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Popup> &
  Pick<React.ComponentProps<typeof MenuPrimitive.Positioner>, 'side' | 'align' | 'sideOffset'>) {
  const container = usePortalContainer();
  return (
    <MenuPrimitive.Portal container={container}>
      <MenuPrimitive.Positioner
        className="z-50 outline-none"
        side={side}
        align={align}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="menu-content"
          className={cn(
            popupSurfaceClass,
            'min-w-44 max-h-(--available-height) overflow-y-auto p-1',
            className,
          )}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

/** The popup of a submenu: opens beside its trigger, aligned with it, instead of covering the parent menu. */
export function MenuSubContent({
  side = 'inline-end',
  align = 'start',
  sideOffset = 0,
  ...props
}: React.ComponentProps<typeof MenuContent>) {
  return <MenuContent side={side} align={align} sideOffset={sideOffset} {...props} />;
}

export function MenuItem({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Item> & { variant?: 'default' | 'destructive' }) {
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      data-variant={variant}
      className={cn(
        popupItemClass,
        'pr-3 [&>svg]:text-muted-foreground data-highlighted:[&>svg]:text-primary-foreground',
        variant === 'destructive' &&
          'text-destructive-foreground data-highlighted:bg-destructive data-highlighted:text-white',
        className,
      )}
      {...props}
    />
  );
}

export function MenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
  return (
    <MenuPrimitive.CheckboxItem
      className={cn(popupItemClass, 'grid grid-cols-[1rem_1fr] gap-1.5 pr-3', className)}
      {...props}
    >
      <MenuPrimitive.CheckboxItemIndicator className="col-start-1 flex">
        <CheckIcon className="size-3.5" aria-hidden="true" />
      </MenuPrimitive.CheckboxItemIndicator>
      <span className="col-start-2">{children}</span>
    </MenuPrimitive.CheckboxItem>
  );
}

export function MenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem
      className={cn(popupItemClass, 'grid grid-cols-[1rem_1fr] gap-1.5 pr-3', className)}
      {...props}
    >
      <MenuPrimitive.RadioItemIndicator className="col-start-1 flex">
        <span className="size-1.5 rounded-full bg-current" />
      </MenuPrimitive.RadioItemIndicator>
      <span className="col-start-2">{children}</span>
    </MenuPrimitive.RadioItem>
  );
}

export function MenuSubTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.SubmenuTrigger>) {
  return (
    <MenuPrimitive.SubmenuTrigger
      className={cn(
        popupItemClass,
        'pr-1.5 data-popup-open:not-data-highlighted:bg-accent data-popup-open:not-data-highlighted:text-accent-foreground',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-3.5" aria-hidden="true" />
    </MenuPrimitive.SubmenuTrigger>
  );
}

export function MenuLabel({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.GroupLabel>) {
  return (
    <MenuPrimitive.GroupLabel
      className={cn('px-2 pt-1.5 pb-1 text-caption font-medium text-subtle-foreground', className)}
      {...props}
    />
  );
}

export function MenuSeparator({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Separator>) {
  return <MenuPrimitive.Separator className={cn('mx-2 my-1 h-px bg-border', className)} {...props} />;
}

/** Right-aligned keyboard hint inside a menu item, e.g. ⌘D. */
export function MenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'ml-auto pl-4 text-caption tracking-wide text-subtle-foreground in-data-highlighted:text-primary-foreground',
        className,
      )}
      {...props}
    />
  );
}
