'use client';

import * as React from 'react';
import { Toast as ToastPrimitive } from '@base-ui/react/toast';
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon, XIcon } from 'lucide-react';
import { usePortalContainer } from '../lib/theme';

export type ToastType = 'default' | 'success' | 'warning' | 'error' | 'info';

const icons: Record<Exclude<ToastType, 'default'>, React.ReactNode> = {
  success: <CircleCheckIcon className="size-4 text-success" aria-hidden="true" />,
  warning: <TriangleAlertIcon className="size-4 text-warning" aria-hidden="true" />,
  error: <CircleAlertIcon className="size-4 text-destructive-foreground" aria-hidden="true" />,
  info: <InfoIcon className="size-4 text-info" aria-hidden="true" />,
};

/** Create toasts from anywhere inside <Toaster>: `const toast = useToast(); toast.add({ title, type })`. */
export const useToast = ToastPrimitive.useToastManager;

/**
 * Mount once near the root. Toasts stack at the bottom-right, expand on hover or focus,
 * pause while the window is hidden, and can be swiped away. Use them to confirm, not to ask.
 */
export function Toaster({ children, timeout = 5000 }: { children?: React.ReactNode; timeout?: number }) {
  return (
    <ToastPrimitive.Provider timeout={timeout}>
      {children}
      <ToastViewport />
    </ToastPrimitive.Provider>
  );
}

function ToastViewport() {
  const container = usePortalContainer();
  const { toasts } = ToastPrimitive.useToastManager();
  return (
    <ToastPrimitive.Portal container={container}>
      <ToastPrimitive.Viewport className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-60 w-[calc(100vw-2rem)] sm:right-6 sm:bottom-6 sm:w-90">
        {toasts.map((toast) => {
          const type = (toast.type ?? 'default') as ToastType;
          return (
            <ToastPrimitive.Root
              key={toast.id}
              toast={toast}
              data-slot="toast"
              className="dtheo-toast rounded-card border border-border bg-popover text-popover-foreground shadow-popover backdrop-blur-material"
            >
              <ToastPrimitive.Content className="flex items-start gap-2.5 overflow-hidden p-3 transition-opacity duration-240 data-behind:opacity-0 data-expanded:opacity-100">
                {type !== 'default' ? <span className="mt-px flex">{icons[type]}</span> : null}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <ToastPrimitive.Title className="text-body font-semibold" />
                  <ToastPrimitive.Description className="text-body text-muted-foreground" />
                </div>
                <ToastPrimitive.Action className="h-control-sm shrink-0 rounded-control bg-secondary px-2 text-label hover:bg-accent" />
                <ToastPrimitive.Close
                  aria-label="Dismiss"
                  className="-mt-0.5 -mr-1 grid size-control-xs shrink-0 place-items-center rounded-control text-subtle-foreground hover:bg-accent hover:text-foreground"
                >
                  <XIcon className="size-3.5" aria-hidden="true" />
                </ToastPrimitive.Close>
              </ToastPrimitive.Content>
            </ToastPrimitive.Root>
          );
        })}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  );
}
