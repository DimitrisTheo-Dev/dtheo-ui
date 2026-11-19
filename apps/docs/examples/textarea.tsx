'use client';

import * as React from 'react';
import { Button } from '@dtheo/ui/components/button';
import { Field, FieldDescription, FieldLabel } from '@dtheo/ui/components/field';
import { Textarea } from '@dtheo/ui/components/textarea';
import { useToast } from '@dtheo/ui/components/toast';

const MAX = 600;

export default function TextareaExample() {
  const toast = useToast();
  const [note, setNote] = React.useState(
    'Overshoot 17.6 % is over the 15 % limit. Kp 4.20 is too aggressive for the 2 kg load; suggest Kp 3.60 and a rerun on Bench 3.',
  );
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <Field>
        <FieldLabel>Review note</FieldLabel>
        <Textarea value={note} maxLength={MAX} onChange={(e) => setNote(e.target.value)} />
        <div className="flex items-baseline justify-between gap-3">
          <FieldDescription>Reviewers see this on R-0412.</FieldDescription>
          <span className="text-caption text-subtle-foreground tabular-nums">
            {note.length}/{MAX}
          </span>
        </div>
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setNote('')}>
          Discard
        </Button>
        <Button
          variant="primary"
          disabled={!note.trim()}
          onClick={() => {
            toast.add({
              title: 'Note posted',
              description: 'Reviewers on R-0412 were notified.',
              type: 'success',
            });
            setNote('');
          }}
        >
          Post note
        </Button>
      </div>
    </div>
  );
}
