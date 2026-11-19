'use client';

import { Trash2Icon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@dtheo/ui/components/alert-dialog';
import { Button } from '@dtheo/ui/components/button';
import { useToast } from '@dtheo/ui/components/toast';

export default function AlertDialogExample() {
  const toast = useToast();
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        <Trash2Icon aria-hidden="true" />
        Delete 3 runs
      </AlertDialogTrigger>
      <AlertDialogContent>
        <div className="flex flex-col gap-1.5">
          <AlertDialogTitle>Delete 3 runs?</AlertDialogTitle>
          <AlertDialogDescription>
            R-0409, R-0410 and R-0411 and their traces (1.2 GB) are removed for everyone on the team. This
            cannot be undone.
          </AlertDialogDescription>
        </div>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" />}>Keep runs</AlertDialogClose>
          <AlertDialogClose
            render={<Button variant="destructive" />}
            onClick={() =>
              toast.add({
                title: '3 runs deleted',
                description: 'R-0409 to R-0411 and their traces were removed.',
              })
            }
          >
            Delete runs
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
