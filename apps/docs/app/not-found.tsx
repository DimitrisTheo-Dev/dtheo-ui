import Link from 'next/link';
import { Button } from '@dtheo/ui/components/button';
import { Empty, EmptyActions, EmptyDescription, EmptyMedia, EmptyTitle } from '@dtheo/ui/components/empty';
import { CompassIcon } from 'lucide-react';
import { OpenSearchButton } from '@/components/open-search-button';
import { SiteFrame } from '@/components/site-frame';
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

const ways = [
  { title: 'Introduction', href: '/docs' },
  { title: 'Components', href: '/docs/components' },
  { title: 'Examples', href: '/examples/run-review' },
  { title: 'For agents', href: '/docs/agents' },
];

/**
 * The 404 keeps the site around it: the header with search, the skip link and the footer, so a broken link is one
 * step from the right page. The status stays 404, and every way out it offers is a page that exists.
 */
export default function NotFound() {
  return (
    <SiteFrame>
      <main id="content" tabIndex={-1} className="grid flex-1 place-items-center px-4 py-16">
        <Empty>
          <EmptyMedia>
            <CompassIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle level={1}>This page is not in the system</EmptyTitle>
          <EmptyDescription>
            The link may be old, or the page was renamed. Search the docs or start from the component index.
          </EmptyDescription>
          <EmptyActions>
            <OpenSearchButton>Search the docs</OpenSearchButton>
            <Button render={<Link href="/docs/components" />}>Browse components</Button>
          </EmptyActions>
          <nav aria-label="Popular pages" className="mt-2">
            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-body">
              {ways.map((w) => (
                <li key={w.href}>
                  <Link href={w.href} className="docs-link inline-flex min-h-6 items-center">
                    {w.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Empty>
      </main>
    </SiteFrame>
  );
}
