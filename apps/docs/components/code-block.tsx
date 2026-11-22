import * as React from 'react';
import { highlight } from '@/lib/highlight';
import { CopyButton } from './copy-button';

/** Highlighted code with a copy button. Rendered on the server; no highlighting JS reaches the browser. */
export async function CodeBlock({
  code,
  lang = 'tsx',
  title,
  className,
  maxHeight,
}: {
  code: string;
  lang?: 'tsx' | 'ts' | 'bash' | 'css' | 'json' | 'md';
  title?: string;
  className?: string;
  maxHeight?: number;
}) {
  const html = await highlight(code, lang);
  // A Markdown block is a prompt to read and paste, so its lines wrap; code keeps its lines and scrolls.
  const wrap = lang === 'md' ? '[&_pre]:break-words [&_pre]:whitespace-pre-wrap' : '';
  return (
    <div className={`overflow-hidden rounded-card border border-border bg-card ${className ?? ''}`}>
      {title ? (
        <div className="flex h-9 items-center justify-between border-b border-border pr-1.5 pl-3.5">
          <span className="font-mono text-caption text-muted-foreground">{title}</span>
          <CopyButton value={code} label="Copy code" />
        </div>
      ) : null}
      {/* Without a title bar the copy button gets its own column, so a long line scrolls under nothing. */}
      <div className="flex items-start">
        <div
          className={`min-w-0 flex-1 overflow-auto py-3.5 pl-4 ${title ? 'pr-4' : 'pr-1'} ${wrap}`}
          style={maxHeight ? { maxHeight } : undefined}
          // dtheo-check-ignore-next-line (Shiki output for source in this repo, highlighted at build time; no user input)
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {!title ? <CopyButton value={code} label="Copy code" className="m-1.5 shrink-0" /> : null}
      </div>
    </div>
  );
}

/**
 * A terminal command, the way install commands appear on every page. One line where it fits; on a narrow screen it
 * wraps inside its box rather than being cut, so the command people copy is the command they can read.
 */
export function CommandLine({ command, className }: { command: string; className?: string }) {
  return (
    <div
      className={`flex min-h-10 items-start gap-3 rounded-card border border-border bg-card py-2 pr-1.5 pl-3.5 ${className ?? ''}`}
    >
      <span
        aria-hidden="true"
        className="py-1 font-mono text-caption leading-4 text-subtle-foreground select-none"
      >
        $
      </span>
      <code className="min-w-0 flex-1 py-1 font-mono text-label font-normal [overflow-wrap:anywhere] text-foreground">
        {command}
      </code>
      <CopyButton value={command} label="Copy command" className="shrink-0" />
    </div>
  );
}
