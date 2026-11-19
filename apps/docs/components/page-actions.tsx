'use client';

import * as React from 'react';
import { BotIcon, CheckIcon, ChevronDownIcon, CopyIcon, ExternalLinkIcon, FileTextIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@dtheo/ui/components/menu';
import { site } from '@/lib/site';

type State = 'idle' | 'copied' | 'failed';

const open = (to: string) => window.open(to, '_blank', 'noopener,noreferrer');

/**
 * Every docs page, handed to an agent in one click: copy it as Markdown, copy a ready prompt, open the `.md`
 * mirror, or start a chat that reads it.
 */
export function PageActions({ href, prompt }: { href: string; prompt?: string }) {
  const [state, setState] = React.useState<State>('idle');
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const url = `${site.url}${href}`;
  const ask = prompt ?? `Read ${url} and help me use it in my project.`;

  const flash = (next: State) => {
    setState(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 1600);
  };
  const copyPage = async () => {
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error(String(res.status));
      await navigator.clipboard.writeText(await res.text());
      flash('copied');
    } catch {
      flash('failed');
    }
  };
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(ask);
      flash('copied');
    } catch {
      flash('failed');
    }
  };

  return (
    <div className="flex shrink-0 items-center" aria-live="polite">
      <Button size="sm" variant="outline" className="rounded-r-none border-r-0" onClick={copyPage}>
        {state === 'copied' ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy page'}
      </Button>
      <Menu>
        <MenuTrigger
          render={
            <Button
              size="icon-sm"
              variant="outline"
              className="rounded-l-none"
              aria-label="More ways to share this page"
            />
          }
        >
          <ChevronDownIcon aria-hidden="true" />
        </MenuTrigger>
        <MenuContent align="end" className="min-w-56">
          <MenuItem onClick={copyPage}>
            <FileTextIcon aria-hidden="true" />
            Copy page as Markdown
          </MenuItem>
          <MenuItem onClick={copyPrompt}>
            <BotIcon aria-hidden="true" />
            Copy prompt for your agent
          </MenuItem>
          <MenuItem onClick={() => window.location.assign(href)}>
            <FileTextIcon aria-hidden="true" />
            View as Markdown
          </MenuItem>
          <MenuSeparator />
          <MenuItem onClick={() => open(`https://claude.ai/new?q=${encodeURIComponent(ask)}`)}>
            <ExternalLinkIcon aria-hidden="true" />
            Open in Claude
          </MenuItem>
          <MenuItem onClick={() => open(`https://chatgpt.com/?q=${encodeURIComponent(ask)}`)}>
            <ExternalLinkIcon aria-hidden="true" />
            Open in ChatGPT
          </MenuItem>
        </MenuContent>
      </Menu>
    </div>
  );
}
