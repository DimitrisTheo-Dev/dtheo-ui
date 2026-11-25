'use client';

import * as React from 'react';
import {
  ChevronRightIcon,
  CircleCheckIcon,
  CircleXIcon,
  CornerDownRightIcon,
  RotateCcwIcon,
  SparkleIcon,
} from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { HeroPreview } from './hero-preview';

type Kind = 'prompt' | 'tool' | 'cmd' | 'fail' | 'fix' | 'pass';

/** What an agent does with the system, in the order it does it. Every command and rule here is real. */
const steps: Array<{ id: string; kind: Kind; text: string; detail?: string }> = [
  { id: 'ask', kind: 'prompt', text: 'Build a notifications settings card' },
  { id: 'lookup', kind: 'tool', text: 'get_component', detail: 'card, switch, select' },
  { id: 'add', kind: 'cmd', text: 'npx dtheo add card switch select field', detail: '+9 files' },
  { id: 'check-1', kind: 'cmd', text: 'npx dtheo check' },
  { id: 'finding', kind: 'fail', text: 'icon-button-label', detail: 'notifications.tsx:21' },
  { id: 'fix', kind: 'fix', text: 'Added aria-label="Send a test message"' },
  { id: 'check-2', kind: 'cmd', text: 'npx dtheo check' },
  { id: 'pass', kind: 'pass', text: '0 errors in 12 files' },
];

const icon: Record<Kind, React.ReactNode> = {
  prompt: <ChevronRightIcon className="size-3.5 text-link" />,
  tool: <SparkleIcon className="size-3.5 text-link" />,
  cmd: <span className="w-3.5 text-center text-subtle-foreground">$</span>,
  fail: <CircleXIcon className="size-3.5 text-destructive-foreground" />,
  fix: <CornerDownRightIcon className="size-3.5 text-subtle-foreground" />,
  pass: <CircleCheckIcon className="size-3.5 text-success-foreground" />,
};

const tone: Record<Kind, string> = {
  prompt: 'text-foreground font-sans text-body font-medium',
  tool: 'text-foreground',
  cmd: 'text-foreground',
  fail: 'text-destructive-foreground',
  fix: 'text-muted-foreground',
  pass: 'text-success-foreground',
};

/**
 * The landing page's proof: a prompt goes in, the agent looks the components up over MCP, adds them, fails the
 * design check once, fixes it, and the result is the working card on the right. Plays once; Replay runs it again.
 */
export function AgentDemo() {
  const [run, setRun] = React.useState(0);
  return (
    <figure
      aria-label="An agent building a run card with dtheo/ui"
      className="overflow-hidden rounded-dialog border border-border bg-card/70 shadow-dialog backdrop-blur-material"
    >
      <div className="flex h-10 items-center gap-3 border-b border-border px-3.5">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-foreground/15" />
          <span className="size-2.5 rounded-full bg-foreground/15" />
          <span className="size-2.5 rounded-full bg-foreground/15" />
        </span>
        <figcaption className="flex-1 truncate text-center text-label font-normal text-muted-foreground">
          Your agent, building with dtheo/ui
        </figcaption>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Replay the demo"
          onClick={() => setRun((r) => r + 1)}
        >
          <RotateCcwIcon aria-hidden="true" />
        </Button>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div
          key={run}
          className="flex flex-col gap-5 border-border bg-background/40 p-4 max-lg:border-b sm:p-5 lg:border-r"
        >
          <ol aria-label="Agent steps" className="flex flex-col gap-2.5 font-mono text-label font-normal">
            {steps.map((s, i) => (
              <li
                key={s.id}
                className={`demo-in flex min-w-0 items-center gap-2.5 ${s.kind === 'fail' || s.kind === 'fix' ? 'pl-6' : ''} ${s.kind === 'prompt' ? 'pb-1.5' : ''}`}
                style={{ '--i': i } as React.CSSProperties}
              >
                <span aria-hidden="true" className="grid w-3.5 shrink-0 place-items-center">
                  {icon[s.kind]}
                </span>
                <span className={`min-w-0 truncate ${tone[s.kind]}`}>
                  {s.kind === 'tool' ? <span className="text-subtle-foreground">dtheo · </span> : null}
                  {s.text}
                </span>
                {s.detail ? (
                  <span className="ml-auto shrink-0 pl-2 text-caption text-subtle-foreground max-sm:hidden">
                    {s.detail}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          <p
            className="demo-in flex gap-2.5 rounded-popover border border-border bg-card/60 px-3 py-2.5 text-body text-pretty"
            style={{ '--i': steps.length } as React.CSSProperties}
          >
            <SparkleIcon className="mt-0.5 size-3.5 shrink-0 text-link" aria-hidden="true" />
            <span>
              Done. <code className="font-mono text-label">notifications.tsx</code> has three switches, a
              channel picker and one Save button. Every control has a name a screen reader can say.
            </span>
          </p>
          <dl
            className="demo-in mt-auto grid grid-cols-3 gap-2 border-t border-border pt-4"
            style={{ '--i': steps.length + 1 } as React.CSSProperties}
          >
            {[
              ['MCP calls', '1'],
              ['Fixes', '1'],
              ['Errors', '0'],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="text-caption text-muted-foreground">{label}</dt>
                <dd className="text-title-2 tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="preview-grid min-w-0 p-3 sm:p-5">
          <HeroPreview />
        </div>
      </div>
    </figure>
  );
}
