import * as React from 'react';
import Link from 'next/link';
import { CodeBlock } from './code-block';
import { DocPage } from './doc-page';
import { parseMarkdown, type Block } from '@/lib/parse-markdown';

/**
 * A small Markdown renderer for the docs' own content: headings, paragraphs, lists, tables, fenced code,
 * inline code, bold and links. Text renders as React children, never as raw HTML.
 */
export function inline(text: string, key = 0): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let i = key;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('`'))
      nodes.push(
        <code key={i++} className="inline-code">
          {tok.slice(1, -1)}
        </code>,
      );
    else if (tok.startsWith('**')) nodes.push(<strong key={i++}>{tok.slice(2, -2)}</strong>);
    else {
      const [, label, href] = tok.match(/\[([^\]]+)\]\(([^)]+)\)/)!;
      nodes.push(
        href!.startsWith('/') ? (
          <Link key={i++} href={href!}>
            {label}
          </Link>
        ) : (
          <a key={i++} href={href} rel="noreferrer">
            {label}
          </a>
        ),
      );
    }
    last = m.index! + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export async function MarkdownBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((b, k) => {
        switch (b.type) {
          case 'h2':
            return (
              <h2
                key={k}
                id={b.text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                className="mt-6 scroll-mt-20 text-title-2 first:mt-0"
              >
                {b.text}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={k} className="mt-2 text-headline">
                {b.text}
              </h3>
            );
          case 'p':
            return (
              <p key={k} className="docs-prose">
                {inline(b.text)}
              </p>
            );
          case 'ul':
          case 'ol': {
            const List = b.type;
            return (
              <List
                key={k}
                className={`docs-prose flex flex-col gap-1.5 pl-5 marker:text-subtle-foreground ${b.type === 'ul' ? 'list-disc' : 'list-decimal'}`}
              >
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </List>
            );
          }
          case 'code':
            return (
              <CodeBlock
                key={k}
                code={b.code}
                lang={
                  (['tsx', 'ts', 'bash', 'css', 'json', 'md'].includes(b.lang) ? b.lang : 'bash') as 'bash'
                }
              />
            );
          case 'table':
            return (
              <div
                key={k}
                className="docs-prose max-w-none overflow-x-auto rounded-card border border-border bg-card"
              >
                <table className="w-full border-collapse text-body">
                  <thead>
                    <tr className="border-b border-border">
                      {b.head.map((h, j) => (
                        <th
                          key={j}
                          className="h-8 px-3 text-left text-label font-medium whitespace-nowrap text-subtle-foreground first:pl-4"
                        >
                          {inline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j} className="border-b border-border last:border-0">
                        {r.map((c, n) => (
                          <td
                            key={n}
                            className="px-3 py-2 align-top text-muted-foreground first:pl-4 [&_code]:whitespace-nowrap"
                          >
                            {inline(c)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}

/** A docs page whose content is a Markdown document from lib/pages-md.ts. */
export async function MarkdownPage({
  md,
  markdownHref,
  eyebrow,
  demoTitle = 'Live example',
  children,
}: {
  md: string;
  markdownHref: string;
  eyebrow?: string;
  /** Names the demo for screen readers. It is an h2, so headings inside the demo can be h3s. */
  demoTitle?: string;
  children?: React.ReactNode;
}) {
  const { title, description, blocks } = parseMarkdown(md);
  return (
    <DocPage eyebrow={eyebrow} title={title} description={inline(description)} markdownHref={markdownHref}>
      {children ? (
        <section aria-labelledby="demo-heading">
          <h2 id="demo-heading" className="sr-only">
            {demoTitle}
          </h2>
          {children}
        </section>
      ) : null}
      <MarkdownBlocks blocks={blocks} />
    </DocPage>
  );
}
