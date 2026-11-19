'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer';
import { XIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePortalContainer } from '../lib/theme';

type Side = 'right' | 'left' | 'bottom';

const SheetSideContext = React.createContext<Side>('right');

/**
 * A panel that slides in from an edge and can be swiped away: inspectors, edit forms, mobile navigation.
 * It leaves the way it came in.
 */
export function Sheet({
  side = 'right',
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root> & { side?: Side }) {
  return (
    <SheetSideContext.Provider value={side}>
      <DrawerPrimitive.Root swipeDirection={side === 'bottom' ? 'down' : side} {...props} />
    </SheetSideContext.Provider>
  );
}

export const SheetTrigger = DrawerPrimitive.Trigger;
export const SheetClose = DrawerPrimitive.Close;

const sideClass: Record<Side, string> = {
  right:
    'inset-y-0 right-0 h-full w-[min(26rem,calc(100vw-2rem))] border-l [transform:translateX(var(--drawer-swipe-movement-x))] data-starting-style:[transform:translateX(calc(100%+8px))] data-ending-style:[transform:translateX(calc(100%+8px))]',
  left: 'inset-y-0 left-0 h-full w-[min(20rem,calc(100vw-3rem))] border-r [transform:translateX(var(--drawer-swipe-movement-x))] data-starting-style:[transform:translateX(calc(-100%-8px))] data-ending-style:[transform:translateX(calc(-100%-8px))]',
  bottom:
    'inset-x-0 bottom-0 max-h-[85dvh] w-full rounded-t-dialog border-t pb-[env(safe-area-inset-bottom,0px)] [transform:translateY(var(--drawer-swipe-movement-y))] data-starting-style:[transform:translateY(calc(100%+8px))] data-ending-style:[transform:translateY(calc(100%+8px))]',
};

export function SheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Popup>) {
  const side = React.useContext(SheetSideContext);
  const container = usePortalContainer();
  return (
    <DrawerPrimitive.Portal container={container}>
      <DrawerPrimitive.Backdrop
        className={cn(
          'fixed inset-0 z-50 bg-overlay opacity-[calc(1-var(--drawer-swipe-progress))]',
          'transition-opacity duration-400 ease-drawer data-swiping:duration-0',
          'data-starting-style:opacity-0 data-ending-style:opacity-0',
        )}
      />
      <DrawerPrimitive.Viewport className="fixed inset-0 z-50">
        <DrawerPrimitive.Popup
          data-slot="sheet-content"
          className={cn(
            'fixed flex flex-col overflow-y-auto overscroll-contain border-border bg-card text-card-foreground shadow-dialog outline-none', // dtheo-check-ignore: focus moves to the first control, which shows the ring
            'transition-transform duration-400 ease-drawer data-swiping:select-none',
            'data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*300ms)]',
            sideClass[side],
            className,
          )}
          {...props}
        >
          {side === 'bottom' ? (
            <div aria-hidden="true" className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border-strong" />
          ) : null}
          <DrawerPrimitive.Content className="flex min-h-0 flex-1 flex-col">
            {children}
          </DrawerPrimitive.Content>
          {side !== 'bottom' ? (
            <DrawerPrimitive.Close
              aria-label="Close"
              className="absolute top-3 right-3 grid size-control-sm place-items-center rounded-control text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <XIcon className="size-4" aria-hidden="true" />
            </DrawerPrimitive.Close>
          ) : null}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-1 border-b border-border px-5 pt-4 pb-3 pr-12', className)}
      {...props}
    />
  );
}

export function SheetTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return <DrawerPrimitive.Title className={cn('text-title-3', className)} {...props} />;
}

export function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description className={cn('text-body text-muted-foreground', className)} {...props} />
  );
}

export function SheetBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-1 flex-col gap-4 px-5 py-4', className)} {...props} />;
}

export function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-5 py-3',
        className,
      )}
      {...props}
    />
  );
}
