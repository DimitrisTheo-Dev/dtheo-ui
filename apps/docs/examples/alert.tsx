'use client';

import { RotateCwIcon } from 'lucide-react';
import { Alert, AlertActions, AlertContent, AlertDescription, AlertTitle } from '@dtheo/ui/components/alert';
import { Button } from '@dtheo/ui/components/button';

export default function AlertExample() {
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <Alert variant="destructive">
        <AlertContent>
          <AlertTitle>Traces for R-0412 did not load</AlertTitle>
          <AlertDescription>
            Bench&nbsp;3 stopped responding during the download. The run itself was saved.
          </AlertDescription>
        </AlertContent>
        <AlertActions>
          <Button size="sm">
            <RotateCwIcon aria-hidden="true" />
            Retry
          </Button>
        </AlertActions>
      </Alert>
      <Alert variant="warning">
        <AlertContent>
          <AlertTitle>Winding temperature is near its limit</AlertTitle>
          <AlertDescription>
            The motor reached 84&nbsp;°C of 90&nbsp;°C. Let it cool to 40&nbsp;°C before the next high-gain
            step.
          </AlertDescription>
        </AlertContent>
      </Alert>
      <Alert variant="info">
        <AlertContent>
          <AlertTitle>Bench 3 now runs firmware 4.18.2</AlertTitle>
          <AlertDescription>
            Runs from before the update are compared against the old reference,{' '}
            <span className="whitespace-nowrap">R-0409</span>.
          </AlertDescription>
        </AlertContent>
        <AlertActions>
          <Button size="sm">Release notes</Button>
        </AlertActions>
      </Alert>
      <Alert variant="success">
        <AlertContent>
          <AlertTitle>Gains approved</AlertTitle>
          <AlertDescription>
            Kp&nbsp;3.60 and Kd&nbsp;0.09 passed all five acceptance checks on R-0413.
          </AlertDescription>
        </AlertContent>
      </Alert>
    </div>
  );
}
