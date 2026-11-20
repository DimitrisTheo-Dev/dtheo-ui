import Link from 'next/link';
import { Button } from '@dtheo/ui/components/button';
import { Empty, EmptyActions, EmptyDescription, EmptyMedia, EmptyTitle } from '@dtheo/ui/components/empty';
import { CompassIcon } from 'lucide-react';
import { pageMetadata } from '@/lib/metadata';

// No path: a 404 has no address of its own, so it gets no canonical link and no og:url (not the homepage's).
export const metadata = {
  ...pageMetadata({
    title: 'Page not found',
    description: 'This page is not in the system. Search the docs or start from the component index.',
  }),
  // Agrees with the noindex Next adds to every 404, instead of the root layout's "index".
  robots: { index: false, follow: true },
};

/** A real 404 (AR-READ-02): the status is 404, and the page says how to find the way. */
export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <Empty>
        <EmptyMedia>
          <CompassIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle level={1}>This page is not in the system</EmptyTitle>
        <EmptyDescription>
          The link may be old, or the page was renamed. Search the docs or start from the component index.
        </EmptyDescription>
        <EmptyActions>
          <Button variant="primary" render={<Link href="/docs" />}>
            Open the docs
          </Button>
          <Button render={<Link href="/llms.txt" />}>See every page</Button>
        </EmptyActions>
      </Empty>
    </main>
  );
}
