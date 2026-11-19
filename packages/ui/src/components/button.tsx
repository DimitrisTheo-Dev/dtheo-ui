'use client';

import * as React from 'react';
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { Spinner } from './spinner';

export const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 cursor-default items-center justify-center gap-1.5 whitespace-nowrap rounded-control',
    'text-body font-medium select-none',
    'transition-[transform,background-color,box-shadow,color] duration-150 ease-out active:scale-97',
    'disabled:pointer-events-none disabled:opacity-45 data-disabled:pointer-events-none data-disabled:opacity-45',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-raised hover:bg-primary-hover',
        secondary: 'bg-secondary text-secondary-foreground shadow-raised hover:bg-accent',
        outline: 'border border-border-strong bg-transparent text-foreground hover:bg-accent',
        ghost: 'text-foreground hover:bg-accent data-popup-open:bg-accent',
        destructive: 'bg-destructive text-white shadow-raised hover:bg-destructive/90',
        link: 'h-auto px-0 text-link underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        xs: 'h-control-xs px-2 text-caption [&_svg:not([class*=size-])]:size-3.5',
        sm: 'h-control-sm px-2.5 text-label [&_svg:not([class*=size-])]:size-3.5',
        md: 'h-control-md px-3',
        lg: 'h-control-lg px-4 text-callout',
        'icon-xs': 'size-control-xs [&_svg:not([class*=size-])]:size-3.5',
        'icon-sm': 'size-control-sm [&_svg:not([class*=size-])]:size-3.5',
        icon: 'size-control-md',
        'icon-lg': 'size-control-lg',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0' }],
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ComponentProps<typeof ButtonPrimitive>, VariantProps<typeof buttonVariants> {
  /** Shows a spinner, keeps the button's width and marks it busy. */
  loading?: boolean;
}

/**
 * The one control for actions. Use `primary` once per view for the action that matters most.
 * For navigation, render a link: `<Button render={<a href="/runs" />}>`.
 */
export function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  children,
  render,
  ...props
}: ButtonProps) {
  // Rendering as a link (or a router Link) keeps link semantics; Base UI only adds button behavior to real buttons.
  const nativeButton = !render || (React.isValidElement(render) && render.type === 'button');
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant ?? 'secondary'}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      focusableWhenDisabled={loading}
      aria-busy={loading || undefined}
      render={render}
      nativeButton={nativeButton}
      {...props}
    >
      {loading ? (
        <>
          <span className="inline-flex items-center gap-1.5 opacity-0">{children}</span>
          <span aria-hidden="true" className="absolute inset-0 grid place-items-center">
            <Spinner className="size-4" role="presentation" aria-label={undefined} />
          </span>
        </>
      ) : (
        children
      )}
    </ButtonPrimitive>
  );
}
