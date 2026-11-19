'use client';

import { PlayIcon, Trash2Icon, DownloadIcon, MoreHorizontalIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';

export default function ButtonVariants() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button variant="primary">
        <PlayIcon aria-hidden="true" />
        Run step test
      </Button>
      <Button>
        <DownloadIcon aria-hidden="true" />
        Export CSV
      </Button>
      <Button variant="outline">Compare runs</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="destructive">
        <Trash2Icon aria-hidden="true" />
        Delete run
      </Button>
      <Button variant="ghost" size="icon" aria-label="More actions">
        <MoreHorizontalIcon aria-hidden="true" />
      </Button>
      <Button variant="link">View limits</Button>
    </div>
  );
}
