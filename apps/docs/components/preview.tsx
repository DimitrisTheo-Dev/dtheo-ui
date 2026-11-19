'use client';

import * as React from 'react';
import { MoonIcon, SunIcon } from 'lucide-react';
import { ThemeScope, type ThemeMode } from '@dtheo/ui/lib/theme';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@dtheo/ui/components/tabs';
import { Button } from '@dtheo/ui/components/button';
import { examples } from '@/examples';

/**
 * A live example with its code. The preview sits in its own ThemeScope: flip it to light or dark without
 * changing the page, and overlays opened inside keep the preview's theme.
 */
export function Preview({
  id,
  codeHtml,
  title,
  align = 'center',
  minHeight = 220,
}: {
  id: string;
  codeHtml: React.ReactNode;
  title?: string;
  align?: 'center' | 'start';
  minHeight?: number;
}) {
  const Example = examples[id];
  const [mode, setMode] = React.useState<ThemeMode | null>(null);
  React.useEffect(() => {
    const sync = () =>
      setMode((m) => m ?? (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
    sync();
  }, []);
  const effective = mode ?? 'dark';
  return (
    <section aria-label={title ?? 'Example'} className="flex flex-col gap-2.5">
      {title ? <h3 className="text-headline">{title}</h3> : null}
      <Tabs
        defaultValue="preview"
        className="gap-0 overflow-hidden rounded-card border border-border bg-card"
      >
        <div className="flex h-11 items-center justify-between gap-2 border-b border-border px-2">
          <TabsList>
            <TabsTab value="preview">Preview</TabsTab>
            <TabsTab value="code">Code</TabsTab>
          </TabsList>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={effective === 'dark' ? 'Preview in light mode' : 'Preview in dark mode'}
            onClick={() => setMode(effective === 'dark' ? 'light' : 'dark')}
          >
            {effective === 'dark' ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
          </Button>
        </div>
        <TabsPanel value="preview">
          <ThemeScope
            mode={effective}
            data-slot="preview"
            className={`preview-grid flex w-full p-6 sm:p-10 ${align === 'center' ? 'items-center justify-center' : 'items-start justify-start'}`}
            style={{ minHeight }}
          >
            <div className={`w-full min-w-0 ${align === 'center' ? 'flex justify-center' : ''}`}>
              {Example ? <Example /> : <p>Missing example: {id}</p>}
            </div>
          </ThemeScope>
        </TabsPanel>
        <TabsPanel value="code">{codeHtml}</TabsPanel>
      </Tabs>
    </section>
  );
}
