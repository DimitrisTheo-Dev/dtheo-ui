'use client';

import * as React from 'react';
import { Field, FieldDescription, FieldError, FieldLabel } from '@dtheo/ui/components/field';
import { Input } from '@dtheo/ui/components/input';

const CURRENT_RUN = 'R-0412';

/** Return a message that says what is wrong and how to fix it, or null when the value is valid. */
function validateBaseline(value: unknown) {
  const run = String(value ?? '')
    .trim()
    .toUpperCase();
  // U+2011 (non-breaking hyphen) keeps the sample ID on one line when the message wraps.
  if (!run) return 'Enter the run to compare against, like R\u20110409.';
  if (!/^R-\d{4}$/.test(run))
    return `“${run}” is not a run ID. Use four digits after “R-”, like R\u20110409.`;
  if (run === CURRENT_RUN) return `${CURRENT_RUN} is the run under review. Pick an earlier run.`;
  return null;
}

export default function FieldValidation() {
  const actions = React.useRef<{ validate: () => void }>(null);
  // Validate the sample value once so the preview opens on the error; after that, validation runs on blur.
  React.useEffect(() => actions.current?.validate(), []);

  return (
    <Field
      className="w-full max-w-sm"
      validate={validateBaseline}
      validationMode="onBlur"
      actionsRef={actions}
    >
      <FieldLabel>Baseline run</FieldLabel>
      <Input defaultValue="R-409" autoComplete="off" spellCheck={false} />
      <FieldDescription>Overshoot and settling time are compared against this run.</FieldDescription>
      <FieldError />
    </Field>
  );
}
