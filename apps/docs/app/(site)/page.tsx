import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from '@dtheo/ui/components/accordion';
import { AgentDemo } from '@/components/home/agent-demo';
import { Bento } from '@/components/home/bento';
import { CommandTabs, type CommandWay } from '@/components/command-tabs';
import { Stats } from '@/components/home/stats';
import { site } from '@/lib/site';

const faqs: Array<[string, React.ReactNode]> = [
  [
    `What is ${site.name}?`,
    'A React design system for building clean UIs with a coding agent: components, tokens, an MCP server and a design check. You and your agent build from the same parts.',
  ],
  ['Is it free?', 'Yes, MIT. Components are copied into your project, so you own the code.'],
  [
    'How does my agent use it?',
    <>
      Connect the MCP server or point it at <code className="inline-code">/llms.txt</code>. It looks
      components up, copies the source and checks its own code before handing it back.{' '}
      <Link className="docs-link" href="/docs/loop">
        How the three tools fit
      </Link>
      .
    </>,
  ],
  [
    'Does it work with shadcn and Tailwind v4?',
    'Yes. Token names match shadcn’s, every item installs with the shadcn CLI and styles are Tailwind v4.',
  ],
  [
    'Is it accessible?',
    'Behavior comes from Base UI, contrast is checked when the tokens build and status is never color alone.',
  ],
  [
    'Are there charts?',
    'Yes, eight, for dashboards: line, bar, heatmap, sparkline, a live stream, frequency, scatter and histogram. They draw limits and read with the arrow keys.',
  ],
  [
    'Does it work with React Native?',
    <>
      The tokens do. <code className="inline-code">@dtheo/tokens/native</code> has every color role in OKLCH,
      plus hex for <code className="inline-code">StyleSheet</code>, which cannot read OKLCH yet.
    </>,
  ],
];

const start: CommandWay[] = [
  { value: 'you', label: 'You', text: `npx ${site.cli}@latest init` },
  {
    value: 'agent',
    label: 'Your agent',
    text: `claude mcp add --transport http ${site.cli} ${site.url}/mcp`,
  },
];

const gutter = 'px-[max(1rem,env(safe-area-inset-left,0px))] sm:px-6';

/** Every section opens the same way: a one-word label, a one-line claim, and at most one sentence. */
function SectionHead({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex max-w-2xl flex-col gap-2">
        <p className="text-label text-link">{eyebrow}</p>
        <h2 className="text-title-1 text-balance">{title}</h2>
        {text ? <p className="text-prose text-muted-foreground text-pretty">{text}</p> : null}
      </div>
      {action}
    </div>
  );
}

export default function Home() {
  return (
    <main id="content" tabIndex={-1} className="flex flex-col">
      <section className={`mx-auto flex w-full max-w-6xl flex-col gap-10 pt-12 pb-10 sm:pt-16 ${gutter}`}>
        <div className="flex flex-col gap-5">
          <h1 className="max-w-[16ch] text-hero text-balance">Build clean UIs with your coding agent.</h1>
          <p className="max-w-[56ch] text-prose text-muted-foreground text-pretty">
            Components, tokens and a design check your agent can use. It looks each component up, builds the
            screen and fixes what the check finds, before you review it.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="lg" render={<Link href="/docs" />}>
              Get started
            </Button>
            <Button size="lg" render={<Link href="/docs/agents" />}>
              Connect your agent
            </Button>
          </div>
        </div>
        <AgentDemo />
        <Stats />
      </section>

      <section className={`mx-auto flex w-full max-w-6xl flex-col gap-6 py-16 ${gutter}`}>
        <SectionHead
          eyebrow="Why dtheo/ui"
          title="The same parts for you and your agent"
          text="Your agent looks the system up, uses it and checks its own work. You review less."
          action={
            <Button variant="ghost" render={<Link href="/docs/loop" />}>
              How the three tools fit
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          }
        />
        <Bento />
      </section>

      <section
        className={`mx-auto grid w-full max-w-6xl gap-8 py-16 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] ${gutter}`}
      >
        <h2 className="text-title-1">Questions</h2>
        <Accordion className="border-t border-border">
          {faqs.map(([q, a]) => (
            <AccordionItem key={q}>
              <AccordionTrigger>{q}</AccordionTrigger>
              <AccordionPanel>{a}</AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className={`mx-auto w-full max-w-6xl py-20 ${gutter}`}>
        <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-6 border-t border-border pt-12">
          <h2 className="text-large-title text-balance">Start in one command.</h2>
          <div className="flex w-full max-w-xl flex-col items-start gap-3">
            <CommandTabs label="Who installs it" ways={start} className="w-full text-left" />
            <Button variant="primary" size="lg" render={<Link href="/docs" />}>
              Read the docs
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
