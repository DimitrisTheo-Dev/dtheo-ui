'use client';

import {
  CircleCheckIcon,
  CircleDashedIcon,
  CirclePlayIcon,
  CircleXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Badge, StatusDot } from '@dtheo/ui/components/badge';

const benches = [
  { name: 'Bench 1', status: 'Idle', tone: 'neutral' },
  { name: 'Bench 2', status: 'Running R-0413', tone: 'info' },
  { name: 'Bench 3', status: 'Over temperature', tone: 'destructive' },
] as const;

export default function BadgeExample() {
  return (
    <div className="flex w-full max-w-md flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h3 className="text-caption font-semibold text-subtle-foreground">
          Run results: an icon and a word, never color alone
        </h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="destructive">
            <CircleXIcon aria-hidden="true" />
            Failed
          </Badge>
          <Badge variant="warning">
            <TriangleAlertIcon aria-hidden="true" />
            Near limit
          </Badge>
          <Badge variant="success">
            <CircleCheckIcon aria-hidden="true" />
            Passed
          </Badge>
          <Badge variant="info">
            <CirclePlayIcon aria-hidden="true" />
            Running
          </Badge>
          <Badge>
            <CircleDashedIcon aria-hidden="true" />
            Queued
          </Badge>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-caption font-semibold text-subtle-foreground">Categories</h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Bench 3</Badge>
          <Badge variant="outline">Firmware 4.18.2</Badge>
          <Badge variant="outline">High-gain step</Badge>
          <Badge variant="primary">Reference</Badge>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-caption font-semibold text-subtle-foreground">
          Status dots in a dense list, always with a label
        </h3>
        <ul className="flex flex-col gap-1.5">
          {benches.map((b) => (
            <li key={b.name} className="flex items-center gap-2 text-body">
              <StatusDot tone={b.tone} />
              <span className="font-medium">{b.name}</span>
              <span className="text-muted-foreground">{b.status}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
