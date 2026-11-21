import type { Metadata } from 'next';
import { ExternalLinkIcon } from 'lucide-react';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@dtheo/ui/components/tabs';
import { Button } from '@dtheo/ui/components/button';
import { DocPage } from '@/components/doc-page';
import { CodeBlock, CommandLine } from '@/components/code-block';
import { CopyButton } from '@/components/copy-button';
import { mcpClients, mcpTools, agentPrompt } from '@/lib/agents';
import { site } from '@/lib/site';
import { pageMetadata } from '@/lib/metadata';

export const metadata: Metadata = pageMetadata({
  title: 'For agents',
  description:
    'Connect your coding agent in one command. It looks components up, copies them and checks its work.',
  path: '/docs/agents',
  markdown: '/docs/agents.md',
});

function Step({
  n,
  title,
  text,
  children,
}: {
  n: number;
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <li className="relative flex gap-4 pb-10 last:pb-0">
      <span
        aria-hidden="true"
        className="absolute top-8 bottom-1 left-[13px] w-px bg-border [li:last-child>&]:hidden"
      />
      <span
        aria-hidden="true"
        className="grid size-7 shrink-0 place-items-center rounded-full border border-border-strong bg-card text-label tabular-nums"
      >
        {n}
      </span>
      <section aria-labelledby={`step-${n}`} className="flex min-w-0 flex-1 flex-col gap-3 pt-0.5">
        <div className="flex flex-col gap-0.5">
          <h2 id={`step-${n}`} className="text-title-3">
            {title}
          </h2>
          <p className="text-body text-muted-foreground">{text}</p>
        </div>
        {children}
      </section>
    </li>
  );
}

const urls = [
  ['llms.txt', `${site.url}/llms.txt`, 'A described index of the docs and examples', 'Copy the llms.txt URL'],
  ['llms-full.txt', `${site.url}/llms-full.txt`, 'All the docs in one file', 'Copy the llms-full.txt URL'],
  [
    'Any docs page + .md',
    `${site.url}/docs/components/button.md`,
    'The Markdown copy of that page',
    'Copy the Button page’s Markdown URL',
  ],
  ['Registry', `${site.url}/r/registry.json`, 'Every item, shadcn format', 'Copy the registry URL'],
] as const;

export default function AgentsPage() {
  return (
    <DocPage
      eyebrow="Get started"
      title="For agents"
      description="Three steps: connect, ask, check. Your agent gets the docs, the code and a reviewer."
      markdownHref="/docs/agents.md"
    >
      <ol className="flex flex-col">
        <Step n={1} title="Connect" text="Add the read-only MCP server to your agent.">
          <Tabs defaultValue={mcpClients[0]!.id}>
            <TabsList variant="underline" aria-label="Agent">
              {mcpClients.map((c) => (
                <TabsTab key={c.id} value={c.id}>
                  {c.name}
                </TabsTab>
              ))}
            </TabsList>
            {mcpClients.map((c) => (
              <TabsPanel key={c.id} value={c.id} className="flex flex-col gap-3">
                {c.command ? <CommandLine command={c.command} /> : null}
                {c.file ? <CodeBlock title={c.file.path} lang={c.file.lang} code={c.file.code} /> : null}
                {c.deeplink ? (
                  <Button className="w-fit" render={<a href={c.deeplink} aria-label={`Add to ${c.name}`} />}>
                    <ExternalLinkIcon aria-hidden="true" />
                    Add to {c.name}
                  </Button>
                ) : null}
              </TabsPanel>
            ))}
          </Tabs>
        </Step>

        <Step n={2} title="Ask" text="Tell it to use the system. This prompt works well.">
          <CodeBlock lang="md" code={agentPrompt} />
        </Step>

        <Step n={3} title="Check" text="It runs the design check and fixes what it finds. Add it to CI too.">
          <CommandLine command={`npx ${site.cli} check src`} />
          <CodeBlock
            title="output"
            lang="bash"
            code={`src/run-card.tsx:14:9 error icon-button-label Icon-only button without an accessible name.\n  → Add aria-label naming the action ("Delete run"), not the icon.\n\n12 files checked: 1 error, 0 warnings.`}
          />
        </Step>
      </ol>

      <section aria-labelledby="tools" className="flex flex-col gap-4">
        <h2 id="tools" className="text-title-2">
          What it can call
        </h2>
        <dl className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
          {mcpTools.map(([name, does]) => (
            <div key={name} className="grid gap-x-6 gap-y-0.5 px-4 py-2.5 sm:grid-cols-[13rem_minmax(0,1fr)]">
              <dt className="font-mono text-label">{name}</dt>
              <dd className="text-body text-muted-foreground">{does}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="no-mcp" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="no-mcp" className="text-title-2">
            No MCP? Use these
          </h2>
          <p className="text-body text-muted-foreground">
            Plain URLs any agent can read, no JavaScript needed.
          </p>
        </div>
        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
          {urls.map(([name, url, does, copy]) => (
            <li key={name} className="flex items-center gap-3 py-2 pr-2 pl-4">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-body font-medium">{name}</span>
                <span className="truncate font-mono text-caption text-muted-foreground">{url}</span>
              </span>
              <span className="hidden text-label font-normal text-muted-foreground md:block">{does}</span>
              <CopyButton value={url} label={copy} />
            </li>
          ))}
        </ul>
      </section>
    </DocPage>
  );
}
