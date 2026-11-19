'use client';

import * as React from 'react';
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { Spinner } from './spinner';

export const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 cursor-default items-center justify-center gap-1.5 whitespace-nowrap rounded-control',
    'text-body font-medium select-none',
    'transition-[transform,background-color,box-shadow,color] duration-150 ease-out active:scale-97',
    // Pressing scales the button down; this keeps a release at its original edge on the button, so it still clicks.
    'after:absolute after:inset-0 active:after:-inset-2',
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
  const classes = cn(buttonVariants({ variant, size }), className);
  const isButton = !render || (React.isValidElement(render) && render.type === 'button');
  if (!isButton)
    return (
      <ButtonLink render={render!} className={classes} data-variant={variant ?? 'secondary'} {...props}>
        {children}
      </ButtonLink>
    );
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant ?? 'secondary'}
      className={classes}
      disabled={disabled || loading}
      focusableWhenDisabled={loading}
      aria-busy={loading || undefined}
      render={render}
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

/**
 * A link that looks like a button stays a link: no button role and no Space-key activation, which Base UI's Button
 * would add to any element that is not a <button>. Screen readers announce it as a link, as navigation should be.
 */
function ButtonLink({
  render,
  children,
  ...props
}: Omit<ButtonProps, 'variant' | 'size' | 'loading'> & { render: NonNullable<ButtonProps['render']> }) {
  return useRender({
    render,
    state: { disabled: false },
    props: { 'data-slot': 'button', ...props, children },
  });
}
