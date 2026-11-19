'use client';

import * as React from 'react';
import { Field as FieldPrimitive } from '@base-ui/react/field';
import { Fieldset as FieldsetPrimitive } from '@base-ui/react/fieldset';
import { cn } from '../lib/utils';

/**
 * Groups a label, a control, help text and an error. Base UI wires the ids, so the label names the control
 * and the description and error are announced with it.
 */
export function Field({ className, ...props }: React.ComponentProps<typeof FieldPrimitive.Root>) {
  return (
    <FieldPrimitive.Root data-slot="field" className={cn('flex flex-col gap-1.5', className)} {...props} />
  );
}

export function FieldLabel({
  className,
  optional,
  children,
  ...props
}: React.ComponentProps<typeof FieldPrimitive.Label> & { optional?: boolean }) {
  return (
    <FieldPrimitive.Label
      data-slot="field-label"
      className={cn(
        'inline-flex items-baseline gap-1.5 text-label text-foreground data-disabled:opacity-45',
        className,
      )}
      {...props}
    >
      {children}
      {optional ? <span className="text-caption font-normal text-subtle-foreground">Optional</span> : null}
    </FieldPrimitive.Label>
  );
}

export function FieldDescription({
  className,
  ...props
}: React.ComponentProps<typeof FieldPrimitive.Description>) {
  return (
    <FieldPrimitive.Description
      data-slot="field-description"
      className={cn('text-caption text-muted-foreground', className)}
      {...props}
    />
  );
}

/** Shown when the field is invalid. Write what happened and how to fix it. */
export function FieldError({ className, ...props }: React.ComponentProps<typeof FieldPrimitive.Error>) {
  return (
    <FieldPrimitive.Error
      data-slot="field-error"
      className={cn('text-caption font-medium text-destructive-foreground', className)}
      {...props}
    />
  );
}

export const FieldControl = FieldPrimitive.Control;

/** One option in a checkbox or radio group with its own label and description, wired by Base UI. */
export function FieldItem({ className, ...props }: React.ComponentProps<typeof FieldPrimitive.Item>) {
  return (
    <FieldPrimitive.Item
      data-slot="field-item"
      className={cn('flex items-start gap-2', className)}
      {...props}
    />
  );
}
export const FieldValidity = FieldPrimitive.Validity;

/** A titled group of related fields, rendered as a native <fieldset>. */
export function Fieldset({ className, ...props }: React.ComponentProps<typeof FieldsetPrimitive.Root>) {
  return (
    <FieldsetPrimitive.Root
      data-slot="fieldset"
      className={cn('flex flex-col gap-4', className)}
      {...props}
    />
  );
}

export function FieldsetLegend({
  className,
  ...props
}: React.ComponentProps<typeof FieldsetPrimitive.Legend>) {
  return (
    <FieldsetPrimitive.Legend
      data-slot="fieldset-legend"
      className={cn('text-headline text-foreground', className)}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  // oxlint-disable-next-line jsx-a11y/label-has-associated-control -- consumers pass htmlFor or nest the control
  return <label data-slot="label" className={cn('text-label text-foreground', className)} {...props} />;
}
