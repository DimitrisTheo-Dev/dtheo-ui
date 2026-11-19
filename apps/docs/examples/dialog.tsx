'use client';

import * as React from 'react';
import { Button } from '@dtheo/ui/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@dtheo/ui/components/dialog';
import { Field, FieldDescription, FieldLabel } from '@dtheo/ui/components/field';
import { NumberField } from '@dtheo/ui/components/number-field';
import { useToast } from '@dtheo/ui/components/toast';

export default function DialogExample() {
  const [open, setOpen] = React.useState(false);
  const toast = useToast();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="primary" />}>Queue retune run</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Queue a retune run</DialogTitle>
          <DialogDescription>
            R-0412 overshot by 17.6 %. Lower the proportional gain and rerun the same step on Bench 3.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Kp"
            defaultValue={3.6}
            step={0.05}
            min={0}
            max={10}
            format={{ minimumFractionDigits: 2 }}
          />
          <NumberField
            label="Kd"
            defaultValue={0.09}
            step={0.01}
            min={0}
            max={1}
            format={{ minimumFractionDigits: 2 }}
          />
        </div>
        <Field>
          <FieldLabel>Bench</FieldLabel>
          <FieldDescription>Bench 3 is free from 15:10.</FieldDescription>
        </Field>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button
            variant="primary"
            onClick={() => {
              setOpen(false);
              toast.add({
                title: 'Retune run queued',
                description: 'R-0413 starts on Bench 3 at 15:10.',
                type: 'success',
              });
            }}
          >
            Queue run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
