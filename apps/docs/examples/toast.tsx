'use client';

import { Button } from '@dtheo/ui/components/button';
import { useToast } from '@dtheo/ui/components/toast';

export default function ToastExample() {
  const toast = useToast();

  const queueRun = () => {
    const id = toast.add({
      title: 'Retune run queued',
      description: 'R-0413 starts on Bench 3 at 15:10.',
      type: 'success',
      actionProps: {
        children: 'Undo',
        onClick: () => {
          toast.close(id);
          toast.add({ title: 'R-0413 removed from the queue' });
        },
      },
    });
  };

  const overheat = () =>
    toast.add({
      title: 'Winding at 78 °C',
      description: 'Bench 3 pauses the queue at 85 °C. R-0413 keeps running for now.',
      type: 'warning',
    });

  const uploadFailed = () => {
    const id = toast.add({
      title: 'Trace upload failed',
      description: 'R-0412 torque.csv: lost the connection to Bench 3. Retrying in 30 s.',
      type: 'error',
      actionProps: {
        children: 'Retry now',
        onClick: () => {
          toast.close(id);
          toast.add({ title: 'Trace uploaded', description: 'R-0412 torque.csv, 48 MB.', type: 'success' });
        },
      },
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button variant="primary" onClick={queueRun}>
        Queue retune run
      </Button>
      <Button onClick={overheat}>Simulate hot winding</Button>
      <Button onClick={uploadFailed}>Simulate failed upload</Button>
    </div>
  );
}
