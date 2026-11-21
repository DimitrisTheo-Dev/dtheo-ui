'use client';

import { SearchIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { OPEN_SEARCH_EVENT } from './site-header';

/** Opens the header's ⌘K search from inside a page (the 404 offers it as the way back). */
export function OpenSearchButton({ children }: { children: React.ReactNode }) {
  return (
    <Button
      variant="primary"
      aria-keyshortcuts="Meta+K Control+K"
      onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
    >
      <SearchIcon aria-hidden="true" />
      {children}
    </Button>
  );
}
