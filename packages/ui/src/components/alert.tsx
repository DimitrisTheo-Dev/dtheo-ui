import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react';
import { cn } from '../lib/utils';

const alertVariants = cva(
  'relative flex w-full items-start gap-2.5 rounded-card border px-3.5 py-3 text-body',
  {
    variants: {
      variant: {
        info: 'border-info/30 bg-info/8 [&>svg]:text-info',
        success: 'border-success/30 bg-success/8 [&>svg]:text-success',
        warning: 'border-warning/35 bg-warning/10 [&>svg]:text-warning',
        destructive: 'border-destructive-foreground/30 bg-destructive/8 [&>svg]:text-destructive-foreground',
        neutral: 'border-border bg-muted [&>svg]:text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'info' },
  },
);

const defaultIcons = {
  info: InfoIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
  destructive: CircleAlertIcon,
  neutral: InfoIcon,
};

/**
 * An inline message about the current view: what happened and what to do next.
 * For transient confirmations use a toast; for blocking decisions use an AlertDialog.
 */
export function Alert({
  className,
  variant = 'info',
  icon,
  children,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants> & { icon?: React.ReactNode | false }) {
  const Icon = defaultIcons[variant ?? 'info'];
  return (
    <div
      data-slot="alert"
      role={variant === 'destructive' || variant === 'warning' ? 'alert' : 'status'}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {icon === false ? null : (icon ?? <Icon className="mt-px size-4 shrink-0" aria-hidden="true" />)}
      <div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-4 gap-y-2">{children}</div>
    </div>
  );
}

export function AlertContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex min-w-0 flex-1 basis-60 flex-col gap-0.5', className)} {...props} />;
}

export function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="alert-title" className={cn('font-semibold text-foreground', className)} {...props} />
  );
}

export function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-description" className={cn('text-muted-foreground', className)} {...props} />;
}

export function AlertActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="alert-actions" className={cn('flex shrink-0 items-center gap-2', className)} {...props} />
  );
}
