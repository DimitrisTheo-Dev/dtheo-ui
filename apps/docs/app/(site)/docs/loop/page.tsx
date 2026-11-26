import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';
import { Badge } from '@dtheo/ui/components/badge';
import { DocPage, DocSection } from '@/components/doc-page';
import { inline } from '@/components/markdown';
import {
  loopChoiceNote,
  loopChoices,
  loopDescription,
  loopProblem,
  loopSteps,
  loopTitle,
  loopToolRows,
  loopTools,
  type LoopTool,
} from '@/lib/loop';
import { pageMetadata } from '@/lib/metadata';

export const metadata: Metadata = pageMetadata({
  title: loopTitle,
  description: loopDescription,
  path: '/docs/loop',
  markdown: '/docs/loop.md',
});

function ToolName({ tool }: { tool: LoopTool }) {
  return (
    <span className="docs-link">
      {tool.href.startsWith('/') ? (
        <Link href={tool.href}>{tool.name}</Link>
      ) : (
        <a href={tool.href} rel="noreferrer">
          {tool.name}
        </a>
      )}
    </span>
  );
}

/** Text with inline code and links, at UI size. */
const prose = 'docs-prose max-w-none text-body text-foreground';

export default function LoopPage() {
  return (
    <DocPage
      eyebrow="Get started"
      title={loopTitle}
      description={loopDescription}
      markdownHref="/docs/loop.md"
    >
      <DocSection title="The problem">
        <p className="docs-prose">{loopProblem}</p>
      </DocSection>

      <DocSection title="One screen, from request to review">
        <ol className="flex max-w-2xl flex-col">
          {loopSteps.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
              {/* The number, with a line down to the next step. */}
              <div className="flex flex-col items-center">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border-strong text-label tabular-nums">
                  {i + 1}
                </span>
                {i < loopSteps.length - 1 ? (
                  <span aria-hidden="true" className="w-px flex-1 bg-border" />
                ) : null}
              </div>
              <div className="flex flex-col gap-1 pb-6">
                <div className="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="text-headline">{s.title}</h3>
                  {s.tool ? <Badge variant="outline">{s.tool}</Badge> : null}
                </div>
                <p className={`${prose} text-muted-foreground`}>{inline(s.text)}</p>
              </div>
            </li>
          ))}
        </ol>
      </DocSection>

      <DocSection title="The three tools">
        <ul className="grid gap-3 lg:grid-cols-3">
          {loopTools.map((t) => (
            <li key={t.name} className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
              <h3 className="text-headline">
                <ToolName tool={t} />
              </h3>
              <dl className="flex flex-col gap-3">
                {loopToolRows.map(([key, label]) => (
                  <div key={key} className="flex flex-col gap-0.5">
                    <dt className="text-label text-subtle-foreground">{label}</dt>
                    <dd className={prose}>{inline(t[key])}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection title="Which one do you need?">
        <ul className="flex flex-col overflow-hidden rounded-card border border-border bg-card">
          {loopChoices.map(([need, tool]) => (
            <li
              key={tool}
              className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <span className="text-body">{need}</span>
              <span className="flex shrink-0 items-center gap-1.5 text-body font-medium">
                <ArrowRightIcon
                  aria-hidden="true"
                  className="size-3.5 text-subtle-foreground max-sm:hidden"
                />
                {tool}
              </span>
            </li>
          ))}
        </ul>
        <p className="docs-prose">{loopChoiceNote}</p>
      </DocSection>
    </DocPage>
  );
}
