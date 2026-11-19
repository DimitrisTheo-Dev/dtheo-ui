import * as React from 'react';
import { CircleCheckIcon, CircleXIcon, PlayIcon } from 'lucide-react';
import { Badge } from '@dtheo/ui/components/badge';
import { Button } from '@dtheo/ui/components/button';
import { ThemeScope, type ThemePreset } from '@dtheo/ui/lib/theme';
import contrast from '@dtheo/tokens/contrast.json';
import { ruleList } from 'dtheo/check';
import { A11yDemo } from './a11y-demo';

const passing = contrast.filter((r) => r.ok).length;

function Tile({
  title,
  text,
  className,
  children,
}: {
  title: string;
  text: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`flex min-w-0 flex-col gap-5 overflow-hidden rounded-card border border-border bg-card p-5 sm:p-6 ${className ?? ''}`}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-title-3">{title}</h3>
        <p className="text-body text-muted-foreground">{text}</p>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-end">{children}</div>
    </li>
  );
}

const tools = [
  ['list_components', 'every component, one line each'],
  ['get_component', 'contract, props, do and don’t'],
  ['get_component_source', 'files ready to write'],
  ['check_ui_code', 'findings with the fix'],
] as const;

const presets: Array<{ preset: ThemePreset; name: string; dark: boolean }> = [
  { preset: 'graphite', name: 'Graphite', dark: false },
  { preset: 'flight-deck', name: 'Flight deck', dark: true },
  { preset: 'deep-space', name: 'Deep space', dark: true },
];

/** Seven reasons, each one a picture and a sentence. */
export function Bento() {
  return (
    <ul className="grid gap-3 lg:grid-cols-3">
      <Tile
        className="lg:col-span-2"
        title="Your agent already knows it"
        text="Seven MCP tools, llms.txt and a Markdown copy of every page."
      >
        <div className="overflow-hidden rounded-popover border border-border bg-background/60 font-mono text-label font-normal">
          <div className="flex items-center gap-2 border-b border-border px-3.5 py-2 text-caption text-muted-foreground">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-success-foreground" />
            dtheo · MCP · connected
          </div>
          <ul className="flex flex-col py-1.5">
            {tools.map(([name, does]) => (
              <li key={name} className="flex min-w-0 items-baseline gap-3 px-3.5 py-1">
                <span className="shrink-0 text-foreground">{name}</span>
                <span className="truncate font-sans text-caption text-subtle-foreground">{does}</span>
              </li>
            ))}
          </ul>
        </div>
      </Tile>

      <Tile title="Contrast, proven" text="Every text pair, every theme, checked on every build.">
        <p className="flex items-baseline gap-2">
          <span className="text-hero tabular-nums">
            {passing}/{contrast.length}
          </span>
        </p>
        <span className="flex items-center gap-1.5 text-label text-success-foreground">
          <CircleCheckIcon className="size-3.5" aria-hidden="true" />
          Pass WCAG AA
        </span>
      </Tile>

      <Tile
        className="lg:col-span-3"
        title="Accessible by default"
        text="Everything works from the keyboard and reads aloud, charts included."
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center lg:gap-8">
          <A11yDemo />
          <ul className="flex flex-col gap-2 text-body">
            {[
              'Every control and chart works from the keyboard',
              'A focus ring you can see, in every theme',
              'Status is an icon and a word, never color alone',
              'Focus traps, typeahead and roving focus from Base UI',
              'Animations stop when reduced motion is on',
              'axe checks the pages in both themes on every pull request',
            ].map((f) => (
              <li key={f} className="flex gap-2">
                <CircleCheckIcon
                  className="mt-0.5 size-4 shrink-0 text-success-foreground"
                  aria-hidden="true"
                />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </Tile>

      <Tile
        title="Mistakes caught"
        text={`${ruleList.length} rules for what agents get wrong, each with the fix.`}
      >
        <div className="flex flex-col gap-1 rounded-popover border border-border bg-background/60 p-3 font-mono text-caption">
          <span className="flex items-center gap-2 text-destructive-foreground">
            <CircleXIcon className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">transition-all</span>
          </span>
          <span className="flex items-center gap-2 text-success-foreground">
            <CircleCheckIcon className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">transition-[transform,opacity]</span>
          </span>
          <span className="mt-2 flex items-center gap-2 text-destructive-foreground">
            <CircleXIcon className="size-3 shrink-0" aria-hidden="true" />
            {/* dtheo-check-ignore-next-line (the tile quotes this class as the mistake the check catches) */}
            <span className="truncate">bg-blue-500</span>
          </span>
          <span className="flex items-center gap-2 text-success-foreground">
            <CircleCheckIcon className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">bg-primary</span>
          </span>
          <span className="mt-2 flex items-center gap-2 text-destructive-foreground">
            <CircleXIcon className="size-3 shrink-0" aria-hidden="true" />
            {/* dtheo-check-ignore-next-line (the tile quotes this as the mistake the check catches) */}
            <span className="truncate">{'<Button size="icon">'}</span>
          </span>
          <span className="flex items-center gap-2 text-success-foreground">
            <CircleCheckIcon className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">aria-label=&quot;Delete run&quot;</span>
          </span>
        </div>
      </Tile>

      <Tile
        className="lg:col-span-2"
        title="Works on phones"
        text="Touch-sized controls, safe areas, and the same tokens for React Native."
      >
        <div className="flex items-end gap-5 sm:gap-8">
          {/* dtheo-check-ignore-next-line (a phone's own corner radius, drawn to scale) */}
          <div className="w-40 shrink-0 rounded-[1.75rem] border-4 border-foreground/10 bg-background p-2.5 shadow-raised sm:w-44">
            <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-foreground/15" />
            <div className="flex flex-col gap-2.5 px-1 pb-1">
              <span className="flex items-center justify-between">
                <span className="font-mono text-caption text-muted-foreground">R-0412</span>
                <Badge variant="destructive">
                  <CircleXIcon aria-hidden="true" />
                  Fail
                </Badge>
              </span>
              <span className="flex items-baseline gap-1">
                <span className="text-title-1 tabular-nums">17.6</span>
                <span className="text-label font-normal text-muted-foreground">% overshoot</span>
              </span>
              <span className="text-caption text-muted-foreground">Limit 10 %. Lower Kp, then rerun.</span>
              <Button variant="primary" size="lg" className="w-full" tabIndex={-1} aria-hidden="true">
                <PlayIcon aria-hidden="true" />
                Queue retune
              </Button>
            </div>
          </div>
          <ul className="flex flex-col gap-2 pb-1 text-body">
            {[
              'Controls grow to 36 px on touch',
              'Respects notches and safe areas',
              'Every page tested at phone width',
              'Tokens for React Native and Expo',
            ].map((f) => (
              <li key={f} className="flex gap-2">
                <CircleCheckIcon
                  className="mt-0.5 size-4 shrink-0 text-success-foreground"
                  aria-hidden="true"
                />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </Tile>

      <Tile
        className="lg:col-span-2"
        title="Three looks, one codebase"
        text="Change one attribute. Components, spacing and contrast come with it."
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {presets.map((p) => (
            <ThemeScope
              key={p.preset}
              preset={p.preset}
              mode={p.dark ? 'dark' : undefined}
              className="flex flex-col gap-3 rounded-popover border border-border p-3"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-label">{p.name}</span>
                <Badge variant="success">
                  <CircleCheckIcon aria-hidden="true" />
                  Pass
                </Badge>
              </span>
              <span className="flex items-baseline gap-1">
                <span className="text-title-2 tabular-nums">203</span>
                <span className="text-label font-normal text-muted-foreground">ms settling</span>
              </span>
              <Button variant="primary" size="sm" className="w-fit" tabIndex={-1} aria-hidden="true">
                <PlayIcon aria-hidden="true" />
                Rerun
              </Button>
            </ThemeScope>
          ))}
        </div>
      </Tile>

      <Tile title="You own the code" text="Copied into your repo. The shadcn CLI works too.">
        <div className="flex flex-col gap-1 rounded-popover border border-border bg-background/60 p-3 font-mono text-caption">
          <span className="truncate text-foreground">
            <span className="text-subtle-foreground">$ </span>npx dtheo add button
          </span>
          <span className="truncate text-success-foreground">+ components/ui/button.tsx</span>
          <span className="truncate text-success-foreground">+ components/ui/spinner.tsx</span>
          <span className="truncate text-success-foreground">+ lib/utils.ts</span>
        </div>
      </Tile>
    </ul>
  );
}
