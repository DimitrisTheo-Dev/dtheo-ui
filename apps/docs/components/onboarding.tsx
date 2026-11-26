'use client';
// dtheo-check-disable-file arbitrary-radius -- the picker's illustrations are drawn at miniature scale.

import * as React from 'react';
import Link from 'next/link';
import { ArrowRightIcon, BotIcon, CheckIcon, SparklesIcon, TerminalIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { Checkbox } from '@dtheo/ui/components/checkbox';
import { Radio, RadioGroup } from '@dtheo/ui/components/radio-group';
import { getComponent } from '@dtheo/ui/meta';
import { CopyButton } from './copy-button';
import { site } from '@/lib/site';
import { docsSection } from '@/lib/paths';

// ---------- Little pictures of each thing you can build. Decorative; the card's words carry the meaning. ----------

const bar = 'rounded-full bg-foreground/15';

function DashboardArt() {
  return (
    <div className="grid h-full grid-cols-3 gap-1.5">
      {[0.62, 0.9, 0.38].map((v, i) => (
        <div
          key={v}
          className="flex flex-col justify-end gap-1 rounded-[5px] border border-border bg-card p-1.5"
        >
          <span className={`h-1 w-5 ${bar}`} />
          <span className="h-2 w-7 rounded-full bg-foreground/45" />
          <span
            className={`h-1 rounded-full ${i === 1 ? 'bg-destructive-foreground' : 'bg-chart-1'}`}
            style={{ width: `${v * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function TableArt() {
  return (
    <div className="flex h-full flex-col justify-center gap-1">
      {[false, true, true, false].map((on, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 rounded-[4px] px-1.5 py-1 ${on ? 'bg-selection' : ''}`}
        >
          <span className={`size-2 rounded-[2px] ${on ? 'bg-primary' : 'border border-foreground/30'}`} />
          <span className={`h-1 w-8 ${bar}`} />
          <span className={`ml-auto h-1 w-5 ${bar}`} />
        </div>
      ))}
    </div>
  );
}

function FormsArt() {
  return (
    <div className="flex h-full flex-col justify-center gap-1">
      {[0, 1].map((k) => (
        <div key={k} className="flex flex-col gap-0.5">
          <span className={`h-1 w-7 ${bar}`} />
          <span className="h-3 rounded-[4px] border border-foreground/20 bg-card" />
        </div>
      ))}
      <span className="mt-0.5 h-2.5 w-10 self-end rounded-[3px] bg-primary" />
    </div>
  );
}

function SettingsArt() {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5">
      {[true, false, true].map((on, i) => (
        <div key={i} className="flex items-center justify-between gap-2 px-1">
          <span className={`h-1 w-12 ${bar}`} />
          <span
            className={`flex h-2.5 w-4.5 items-center rounded-full p-px ${on ? 'justify-end bg-primary' : 'bg-foreground/20'}`}
          >
            <span className="size-2 rounded-full bg-background" />
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------- The choices ----------

const builds = [
  {
    id: 'dashboard',
    phrase: 'a dashboard',
    title: 'Dashboard',
    text: 'Metrics and charts',
    art: DashboardArt,
    components: ['app-shell', 'metric', 'card', 'line-chart', 'bar-chart', 'badge'],
    next: { title: 'Charts', href: '/docs/components#cat-charts' },
  },
  {
    id: 'table',
    phrase: 'a data table',
    title: 'Data table',
    text: 'Search, sort, select',
    art: TableArt,
    components: ['table', 'input-group', 'select', 'checkbox', 'menu', 'empty'],
    next: { title: 'Data table pattern', href: '/docs/patterns/data-table' },
  },
  {
    id: 'forms',
    phrase: 'forms',
    title: 'Forms',
    text: 'Fields that explain',
    art: FormsArt,
    components: ['field', 'input', 'number-field', 'select', 'switch', 'toast'],
    next: { title: 'Forms pattern', href: '/docs/patterns/forms' },
  },
  {
    id: 'settings',
    phrase: 'a settings page',
    title: 'Settings',
    text: 'Switches and choices',
    art: SettingsArt,
    components: ['card', 'field', 'switch', 'select', 'button', 'toast'],
    next: { title: 'Forms pattern', href: '/docs/patterns/forms' },
  },
];

const writers = [
  { id: 'you', title: 'You', text: 'Copy, paste, ship', icon: TerminalIcon },
  { id: 'agent', title: 'Your agent', text: 'It reads the docs', icon: BotIcon },
  { id: 'both', title: 'Both', text: 'It builds, you review', icon: SparklesIcon },
] as const;

type Writer = (typeof writers)[number]['id'];

const docHref = (slug: string) => {
  const meta = getComponent(slug);
  return `/docs/${docsSection(meta)}/${slug}`;
};

function Step({
  n,
  done,
  title,
  children,
}: {
  n: number;
  done: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`step-${n}`}
      className="intro-in flex flex-col gap-4"
      style={{ '--i': n } as React.CSSProperties}
    >
      <h2 id={`step-${n}`} className="flex items-center gap-2.5 text-title-3">
        <span
          aria-hidden="true"
          className={`grid size-6 place-items-center rounded-full text-label tabular-nums transition-[background-color,color] duration-150 ${done ? 'bg-primary text-primary-foreground' : 'border border-border-strong text-muted-foreground'}`}
        >
          {done ? <CheckIcon className="size-3.5" strokeWidth={2.5} /> : n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A terminal-style block with one copy button for everything in it. */
function Block({ label, text, prose }: { label: string; text: string; prose?: boolean }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-background">
      <div className="flex h-9 items-center justify-between border-b border-border pr-1.5 pl-3.5">
        <span className="text-label font-normal text-muted-foreground">{label}</span>
        <CopyButton value={text} label={`Copy ${label.toLowerCase()}`} />
      </div>
      {/* Remounts when the text changes, so the new command fades in instead of snapping. */}
      <pre
        key={text}
        className={`swap-in overflow-x-auto px-4 py-3.5 [scrollbar-width:thin] ${prose ? 'font-sans text-body whitespace-pre-wrap text-foreground' : 'font-mono text-label leading-6 font-normal text-foreground'}`}
      >
        {prose
          ? text
          : text.split('\n').map((line) => (
              <span key={line} className="block">
                <span aria-hidden="true" className="text-subtle-foreground select-none">
                  ${' '}
                </span>
                {line}
              </span>
            ))}
      </pre>
    </div>
  );
}

/**
 * Get started as three choices: what you are building, who writes the code, then one command. Everything below
 * the choices updates as you pick, so the page is the setup.
 */
export function Onboarding() {
  const [picked, setPicked] = React.useState<string[]>([]);
  const [who, setWho] = React.useState<Writer>('you');

  const chosen = builds.filter((b) => picked.includes(b.id));
  const slugs = [...new Set(chosen.flatMap((b) => b.components))];
  const nexts = [...new Map(chosen.map((b) => [b.next.href, b.next])).values()];
  const phrases = chosen.map((b) => b.phrase);
  const what = phrases.length
    ? phrases.length === 1
      ? phrases[0]!
      : `${phrases.slice(0, -1).join(', ')} and ${phrases.at(-1)}`
    : 'a screen';

  const command = [
    `npx ${site.cli}@latest init`,
    ...(slugs.length ? [`npx ${site.cli} add ${slugs.join(' ')}`] : []),
  ].join('\n');
  const mcp = `claude mcp add --transport http ${site.cli} ${site.url}/mcp`;
  const prompt =
    `Build ${what} with the ${site.name} design system.${slugs.length ? ` Use ${slugs.join(', ')}.` : ''} Look each component up with the ${site.cli} MCP server, add it with \`npx ${site.cli} add\`, and run \`npx ${site.cli} check\` until it reports 0 errors.`
      .replace(/\s+/g, ' ')
      .trim();

  return (
    <div className="flex flex-col gap-12">
      <Step n={1} done={picked.length > 0} title="What are you building?">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Pick one or more">
          {builds.map((b) => {
            const Art = b.art;
            const on = picked.includes(b.id);
            return (
              <li key={b.id}>
                {/* The label is the hit area and never moves; only the surface inside it scales on press, so a
                    click at the very edge still lands on the card. */}
                <label className="group block h-full cursor-pointer select-none">
                  <span
                    className={`focus-within-ring relative flex h-full flex-col gap-3 rounded-card border bg-card p-3 transition-[border-color,background-color,scale] duration-150 ease-out group-active:scale-[0.98] ${on ? 'border-primary bg-primary/6' : 'border-border group-hover:border-border-strong'}`}
                  >
                    <span
                      aria-hidden="true"
                      className="block h-20 rounded-popover border border-border bg-background/70 p-2.5 transition-transform duration-200 ease-out group-hover:-translate-y-0.5"
                    >
                      <Art />
                    </span>
                    <span className="flex items-start justify-between gap-2 px-0.5">
                      <span className="flex flex-col">
                        <span className="text-headline">{b.title}</span>
                        <span className="text-label font-normal text-muted-foreground">{b.text}</span>
                      </span>
                      <Checkbox
                        data-focus="none"
                        className="mt-0.5"
                        checked={on}
                        onCheckedChange={(c) =>
                          setPicked((p) => (c ? [...p, b.id] : p.filter((id) => id !== b.id)))
                        }
                      />
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </Step>

      <Step n={2} done title="Who writes the code?">
        <RadioGroup
          aria-label="Who writes the code"
          value={who}
          onValueChange={(v) => setWho(v as Writer)}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {writers.map((w) => {
            const on = who === w.id;
            return (
              <label key={w.id} className="group block cursor-pointer select-none">
                <span
                  className={`focus-within-ring flex items-center gap-3 rounded-card border bg-card p-3 transition-[border-color,background-color,scale] duration-150 ease-out group-active:scale-[0.98] ${on ? 'border-primary bg-primary/6' : 'border-border group-hover:border-border-strong'}`}
                >
                  <span
                    aria-hidden="true"
                    className={`grid size-9 shrink-0 place-items-center rounded-control transition-[background-color,color] duration-150 ${on ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
                  >
                    <w.icon className="size-4.5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-headline">{w.title}</span>
                    <span className="truncate text-label font-normal text-muted-foreground">{w.text}</span>
                  </span>
                  <Radio value={w.id} data-focus="none" />
                </span>
              </label>
            );
          })}
        </RadioGroup>
      </Step>

      <Step n={3} done={picked.length > 0} title="Copy and go">
        <div className="flex flex-col gap-3">
          {who !== 'agent' ? <Block label="Terminal" text={command} /> : null}
          {who !== 'you' ? <Block label="Connect your agent" text={mcp} /> : null}
          {who !== 'you' ? <Block label="Prompt" text={prompt} prose /> : null}
        </div>
        {nexts.length ? (
          <div className="flex flex-col gap-2.5">
            <p className="text-label font-normal text-muted-foreground">Read next</p>
            <div className="flex flex-wrap gap-2">
              {nexts.map((s) => (
                <Button key={s.href} render={<Link href={s.href} />}>
                  {s.title}
                  <ArrowRightIcon aria-hidden="true" />
                </Button>
              ))}
            </div>
            <p className="pt-2 text-label font-normal text-muted-foreground">{slugs.length} components</p>
            <div className="flex flex-wrap gap-1.5">
              {slugs.map((slug) => (
                <Link
                  key={slug}
                  href={docHref(slug)}
                  className="inline-flex h-7 items-center rounded-full border border-border bg-card px-3 font-mono text-caption text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                  {slug}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-body text-muted-foreground">
            Pick what you are building and your commands appear here.
          </p>
        )}
      </Step>
    </div>
  );
}
