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
  return (
    <div className={`overflow-hidden rounded-card border border-border bg-card ${className ?? ''}`}>
      {title ? (
        <div className="flex h-9 items-center justify-between border-b border-border pr-1.5 pl-3.5">
          <span className="font-mono text-caption text-muted-foreground">{title}</span>
          <CopyButton value={code} label="Copy code" />
        </div>
      ) : null}
      <div className="relative">
        {!title ? (
          <CopyButton value={code} label="Copy code" className="absolute top-1.5 right-1.5 z-10" />
        ) : null}
        <div
          className="overflow-auto px-4 py-3.5 pr-12"
          style={maxHeight ? { maxHeight } : undefined}
          // dtheo-check-ignore-next-line (Shiki output for source in this repo, highlighted at build time; no user input)
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

/** A one-line terminal command, the way install commands appear on every page. */
export function CommandLine({ command, className }: { command: string; className?: string }) {
  return (
    <div
      className={`flex h-10 items-center gap-3 rounded-card border border-border bg-card pr-1.5 pl-3.5 ${className ?? ''}`}
    >
      <span aria-hidden="true" className="font-mono text-caption text-subtle-foreground select-none">
        $
      </span>
      <code className="min-w-0 flex-1 truncate font-mono text-label font-normal text-foreground">
        {command}
      </code>
      <CopyButton value={command} label="Copy command" />
    </div>
  );
}
