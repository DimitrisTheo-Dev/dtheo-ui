import type { Metadata } from 'next';
import { site } from './site';

/** The home card (app/opengraph-image.tsx), named for pages that have no card of their own. */
const homeCard = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  type: 'image/png',
  alt: `${site.name}: ${site.tagline}`,
};

/**
 * A page's title, description, address and share card, so a link unfurls as that page and not as the homepage.
 *
 * Next replaces the root layout's `openGraph` as a whole when a page sets its own, and with it the home card, so
 * pages without an `opengraph-image` file of their own name it here. Pages that have one pass `ownCard`, and Next
 * adds theirs. Pages whose card needs alt text of its own (an `opengraph-image` file can only export one alt for
 * every page of a route) pass `card`. The `twitter:*` tags are filled from these by Next, so X shows the same title,
 * text and picture.
 *
 * `path` is the page's address. Leave it out only for a page with no fixed address (the 404), which then has no
 * canonical link and no `og:url` rather than the homepage's.
 */
export function pageMetadata({
  title,
  description,
  path,
  markdown,
  ownCard = false,
  card,
}: {
  title: string;
  description: string;
  path?: string;
  /** The page's Markdown mirror, for agents. */
  markdown?: string;
  /** The route has its own `opengraph-image` file. */
  ownCard?: boolean;
  /** A 1200 × 630 PNG card served at `url`, described by `alt`. */
  card?: { url: string; alt: string };
}): Metadata {
  return {
    title,
    description,
    alternates: path
      ? { canonical: path, ...(markdown ? { types: { 'text/markdown': markdown } } : {}) }
      : { canonical: null },
    openGraph: {
      title: `${title} · ${site.name}`,
      description,
      url: path,
      siteName: site.name,
      type: 'website',
      ...(card ? { images: { ...homeCard, ...card } } : ownCard ? {} : { images: homeCard }),
    },
  };
}
