'use client';

import * as React from 'react';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@dtheo/ui/components/tabs';
import { CopyButton } from './copy-button';

export interface CommandWay {
  value: string;
  label: string;
  text: string;
  /** A prompt rather than a command: shown in the sans face, without a `$`. */
  prose?: boolean;
}

/**
 * One line to copy, with the alternatives one tab away: `npx` or shadcn, you or your agent. Used for every
 * install line in the docs so they look and behave the same.
 */
export function CommandTabs({
  ways,
  label,
  className,
}: {
  ways: CommandWay[];
  label: string;
  className?: string;
}) {
  return (
    <Tabs
      defaultValue={ways[0]?.value}
      className={`w-full gap-0 rounded-card border border-border bg-card p-1 ${className ?? ''}`}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-1 sm:flex-nowrap">
        <TabsList aria-label={label} className="shrink-0">
          {ways.map((w) => (
            <TabsTab key={w.value} value={w.value}>
              {w.label}
            </TabsTab>
          ))}
        </TabsList>
        {ways.map((w) => (
          <TabsPanel
            key={w.value}
            value={w.value}
            className="flex min-h-control-md min-w-0 basis-full items-center gap-2 pl-2.5 sm:basis-auto sm:flex-1"
          >
            {w.prose ? (
              // A prompt to copy is read in full: it wraps instead of ending in an ellipsis.
              <p className="min-w-0 flex-1 py-1 text-label font-normal text-pretty text-muted-foreground">
                {w.text}
              </p>
            ) : (
              <code className="min-w-0 flex-1 overflow-x-auto font-mono text-label font-normal whitespace-nowrap text-foreground [scrollbar-width:none]">
                <span aria-hidden="true" className="text-subtle-foreground select-none">
                  ${' '}
                </span>
                {w.text}
              </code>
            )}
            <CopyButton
              value={w.text}
              label={w.prose ? 'Copy prompt' : 'Copy command'}
              className="shrink-0"
            />
          </TabsPanel>
        ))}
      </div>
    </Tabs>
  );
}
