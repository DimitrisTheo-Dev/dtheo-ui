'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePortalContainer } from '../lib/theme';

/** A modal task: focus moves in, the page behind is inert, Escape closes, focus returns to the trigger. */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const backdropClass = cn(
  'fixed inset-0 z-50 bg-overlay transition-opacity duration-240 ease-out',
  'data-starting-style:opacity-0 data-ending-style:opacity-0',
);

export function DialogContent({
  className,
  children,
  showClose = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Popup> & { showClose?: boolean }) {
  const container = usePortalContainer();
  return (
    <DialogPrimitive.Portal container={container}>
      <DialogPrimitive.Backdrop className={backdropClass} />
      <DialogPrimitive.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            'relative flex w-full max-w-md flex-col gap-4 rounded-dialog border border-border bg-card p-5 text-card-foreground shadow-dialog outline-none', // dtheo-check-ignore: focus moves to the first control, which shows the ring
            // Scale and opacity ease together. `scale-96` sets the scale property, not transform, so it is listed.
            'transition-[scale,opacity] duration-240 ease-out',
            'data-starting-style:scale-96 data-starting-style:opacity-0 data-ending-style:scale-96 data-ending-style:opacity-0',
            className,
          )}
          {...props}
        >
          {children}
          {showClose ? (
            <DialogPrimitive.Close
              aria-label="Close"
              className="absolute top-3 right-3 grid size-control-sm place-items-center rounded-control text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <XIcon className="size-4" aria-hidden="true" />
            </DialogPrimitive.Close>
          ) : null}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 pr-8', className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-title-3 text-balance', className)} {...props} />;
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-body text-muted-foreground text-pretty', className)}
      {...props}
    />
  );
}

/** Actions, right-aligned. The primary action goes last, closest to where the eye ends. */
export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}
