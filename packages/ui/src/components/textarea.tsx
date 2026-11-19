'use client';

import * as React from 'react';
import { Field } from '@base-ui/react/field';
import { cn } from '../lib/utils';
import { fieldControlClass } from './input';

/** Multi-line text. Grows with its content up to `max-h`, then scrolls. */
export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <Field.Control
      data-slot="textarea"
      data-focus="field"
      render={<textarea />}
      className={cn(
        fieldControlClass,
        'field-sizing-content h-auto min-h-18 max-h-64 resize-y py-1.5',
        className,
      )}
      {...(props as React.ComponentProps<typeof Field.Control>)}
    />
  );
}
