import { SiteHeader } from './site-header';
import { SiteFooter } from './site-footer';

/**
 * The site's chrome: a skip link, the header with search, the footer. Each page renders its own
 * `<main id="content" tabIndex={-1}>`, which is where the skip link sends focus.
 */
export function SiteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#content"
        className="sr-only z-50 rounded-control bg-primary px-3 py-2 text-body font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
