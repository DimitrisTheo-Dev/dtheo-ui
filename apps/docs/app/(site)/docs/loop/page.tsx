import type { Metadata } from 'next';
import Link from 'next/link';
import { RotateCcwIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@dtheo/ui/components/table';
import { DocPage, DocSection } from '@/components/doc-page';
import { inline } from '@/components/markdown';
import { loopDescription, loopReasons, loopRows, loopSteps, loopTools, type LoopTool } from '@/lib/loop';
import { pageMetadata } from '@/lib/metadata';
import { site } from '@/lib/site';

export const metadata: Metadata = pageMetadata({
  title: 'The loop',
  description: loopDescription,
  path: '/docs/loop',
  markdown: '/docs/loop.md',
});

function ToolName({ tool, className }: { tool: LoopTool; className?: string }) {
  const name = tool.href.startsWith('/') ? (
    <Link href={tool.href}>{tool.name}</Link>
  ) : (
    <a href={tool.href} rel="noreferrer">
      {tool.name}
    </a>
  );
  return <span className={`docs-link ${className ?? ''}`}>{name}</span>;
}

/** Cell text with inline code and links, at UI size. */
const cellText = 'docs-prose max-w-none text-body text-foreground';

export default function LoopPage() {
  return (
    <DocPage
      eyebrow="Get started"
      title="The loop"
      description={loopDescription}
      markdownHref="/docs/loop.md"
    >
      <DocSection title="How a screen gets built">
        <ol className="grid gap-px overflow-hidden rounded-card border border-border bg-border xl:grid-cols-5">
          {loopSteps.map((s, i) => (
            <li key={s.step} className="flex flex-col gap-2 bg-card p-4">
              <p className="text-label font-normal text-muted-foreground">{s.tool}</p>
              <h3 className="flex items-baseline gap-2 text-headline">
                <span className="text-subtle-foreground tabular-nums">{i + 1}</span>
                {s.step}
              </h3>
              <p className={`${cellText} text-muted-foreground`}>{inline(s.text)}</p>
              {s.again ? (
                <p className="mt-auto flex items-center gap-1.5 pt-1 text-caption text-muted-foreground">
                  <RotateCcwIcon className="size-3 shrink-0" aria-hidden="true" />
                  {s.again}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </DocSection>

      <DocSection title="Which tool does what">
        <div className="hidden overflow-hidden rounded-card border border-border bg-card md:block">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-36">
                  <span className="sr-only">Question</span>
                </TableHead>
                {loopTools.map((t) => (
                  <TableHead key={t.name} scope="col" className="h-11 text-headline text-foreground">
                    <ToolName tool={t} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loopRows.map(([key, label]) => (
                <TableRow key={key} className="hover:bg-transparent">
                  <TableHead scope="row" className="h-auto py-3 align-top whitespace-normal">
                    {label}
                  </TableHead>
                  {loopTools.map((t) => (
                    <TableCell key={t.name} className={`h-auto py-3 align-top whitespace-normal ${cellText}`}>
                      {inline(t[key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <ul className="flex flex-col gap-3 md:hidden">
          {loopTools.map((t) => (
            <li key={t.name} className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
              <h3 className="text-headline">
                <ToolName tool={t} />
              </h3>
              <dl className="flex flex-col gap-3">
                {loopRows.map(([key, label]) => (
                  <div key={key} className="flex flex-col gap-0.5">
                    <dt className="text-label text-subtle-foreground">{label}</dt>
                    <dd className={cellText}>{inline(t[key])}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection title={`Why ${site.name}`}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {loopReasons.map(([title, text]) => (
            <li key={title} className="flex flex-col gap-1 rounded-card border border-border bg-card p-4">
              <h3 className="text-headline">{title}</h3>
              <p className="text-body text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </DocSection>
    </DocPage>
  );
}
