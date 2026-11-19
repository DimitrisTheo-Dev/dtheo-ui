import * as React from 'react';
import { PageActions } from './page-actions';

export interface TocItem {
  id: string;
  title: string;
}

const anchorFor = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/**
 * Shared header and rhythm for every docs page: where you are, what it is in one line, and one button that hands
 * the page to an agent. Long pages add a contents list on wide screens.
 */
export function DocPage({
  eyebrow,
  title,
  description,
  markdownHref,
  prompt,
  lead,
  toc,
  wide,
  children,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  description: string;
  markdownHref?: string;
  /** What "Copy prompt for your agent" copies. Defaults to "read this page". */
  prompt?: string;
  /** Sits right under the description, before the first section: an install line, say. */
  lead?: React.ReactNode;
  toc?: TocItem[];
  /** Use the full content width, for galleries. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  const article = (
    <article className={`flex min-w-0 flex-1 flex-col gap-12 ${wide ? '' : 'max-w-4xl'}`}>
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-col gap-2">
            {eyebrow ? <p className="text-label text-link">{eyebrow}</p> : null}
            <h1 className="text-large-title text-balance">{title}</h1>
          </div>
          {markdownHref ? <PageActions href={markdownHref} prompt={prompt} /> : null}
        </div>
        <p className="max-w-2xl text-prose text-muted-foreground text-pretty">{description}</p>
        {lead}
      </header>
      {children}
    </article>
  );
  if (!toc?.length) return article;
  return (
    <div className="flex gap-12">
      {article}
      <nav aria-label="On this page" className="sticky top-20 hidden w-40 shrink-0 self-start pt-1 xl:block">
        <p className="pb-2 text-caption font-semibold text-subtle-foreground">On this page</p>
        <ul className="flex flex-col border-l border-border">
          {toc.map((t) => (
            <li key={t.id}>
              <a
                href={`#${t.id}`}
                className="-ml-px block border-l border-transparent py-1 pl-3 text-label font-normal text-muted-foreground transition-colors duration-150 hover:border-border-strong hover:text-foreground"
              >
                {t.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function DocSection({
  title,
  id,
  children,
  description,
}: {
  title: string;
  id?: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  const anchor = id ?? anchorFor(title);
  return (
    <section aria-labelledby={anchor} className="flex scroll-mt-20 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={anchor} className="text-title-2">
          {title}
        </h2>
        {description ? <p className="docs-prose">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
