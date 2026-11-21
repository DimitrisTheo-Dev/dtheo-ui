import Link from 'next/link';
import Image, { type StaticImageData } from 'next/image';
import { ArrowRightIcon, ArrowUpRightIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from '@dtheo/ui/components/accordion';
import { AgentDemo } from '@/components/home/agent-demo';
import { Bento } from '@/components/home/bento';
import { CommandTabs, type CommandWay } from '@/components/command-tabs';
import { ComponentTeaser } from '@/components/component-gallery';
import { ChartShowcase } from '@/components/home/chart-showcase';
import { Stats } from '@/components/home/stats';
import { SpaceBackdrop } from '@/components/space-backdrop';
import { StarTrails } from '@/components/star-trails';
import { site } from '@/lib/site';
import runReviewShot from '@/assets/screens/run-review.png';
import motorMapShot from '@/assets/screens/motor-map.png';
import assistantShot from '@/assets/screens/assistant.png';
import tuningShot from '@/assets/screens/tuning.png';

const examples: Array<{ title: string; text: string; href: string; image: StaticImageData }> = [
  {
    title: 'Run review',
    text: 'Find what failed. Fix it.',
    href: '/examples/run-review',
    image: runReviewShot,
  },
  { title: 'Motor map', text: 'Efficiency at a glance.', href: '/examples/motor-map', image: motorMapShot },
  { title: 'Loop tuning', text: 'Live, Bode, Cpk.', href: '/examples/tuning', image: tuningShot },
  { title: 'Lab assistant', text: 'Answers with charts.', href: '/examples/assistant', image: assistantShot },
];

const faqs: Array<[string, React.ReactNode]> = [
  [
    `What is ${site.name}?`,
    'A React design system for dashboards and engineering tools: components, charts and tokens, ready for you and for your coding agent.',
  ],
  ['Is it free?', 'Yes, MIT. Components are copied into your project, so you own the code.'],
  [
    'Which charts are included?',
    'Eight: line, bar, heatmap, sparkline, a live stream, frequency (spectrum and Bode), scatter and histogram. Line, bar, stream, scatter and histogram draw limits; frequency marks gain and phase margins. Line, frequency, scatter and histogram read with the arrow keys. SVG and canvas drawn by React, d3 for the math, no chart library.',
  ],
  [
    'How does my agent use it?',
    <>
      Connect the MCP server or point it at <code className="inline-code">/llms.txt</code>. It looks
      components up, copies the source and checks its own code before handing it back.
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
      <section className="relative overflow-hidden">
        {/* The same sky in both themes: a night sky in dark, a long exposure in ink in light. */}
        <StarTrails className="dark:hidden" />
        <SpaceBackdrop
          alive
          className="hidden opacity-90 [mask-image:linear-gradient(to_bottom,black_30%,transparent_80%)] dark:block"
          starsClassName="[mask-image:radial-gradient(ellipse_34%_20%_at_50%_24%,transparent_45%,black)] max-md:opacity-60"
        />
        <div
          className={`relative mx-auto flex max-w-5xl flex-col items-center gap-6 pt-16 text-center sm:pt-24 ${gutter}`}
        >
          {/* Two lines on wider screens, broken where the sentence turns, so the muted half is never split. */}
          <h1 className="max-w-5xl text-hero text-balance">
            Pixel-perfect UI, <span className="text-muted-foreground sm:block">even when your agent writes it.</span>
          </h1>
          <p className="max-w-xl text-prose text-muted-foreground text-pretty">
            Components and engineering charts for data-heavy React apps, with an MCP server and a design
            linter built in.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="primary" size="lg" render={<Link href="/docs" />}>
              Get started
              <ArrowRightIcon aria-hidden="true" />
            </Button>
            <Button size="lg" render={<Link href="/docs/components" />}>
              Browse components
            </Button>
          </div>
          <CommandTabs
            label="Who installs it"
            ways={start}
            className="max-w-xl bg-card/80 text-left shadow-raised backdrop-blur-material"
          />
        </div>
        <div className={`relative mx-auto mt-14 max-w-6xl pb-16 sm:mt-16 ${gutter}`}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[12%] top-10 h-3/5 rounded-full bg-primary/10 blur-3xl dark:bg-primary/20"
          />
          <div className="relative">
            <AgentDemo />
          </div>
        </div>
        <div className={`relative mx-auto max-w-6xl pb-8 ${gutter}`}>
          <Stats />
        </div>
      </section>

      <section className={`mx-auto flex w-full max-w-6xl flex-col gap-6 py-16 ${gutter}`}>
        <SectionHead
          eyebrow="Why dtheo/ui"
          title="Built for you and your agent"
          text="Your agent looks the system up, uses it and checks its own work. You review less."
        />
        <Bento />
      </section>

      <section className={`mx-auto flex w-full max-w-6xl flex-col gap-6 py-16 ${gutter}`}>
        <SectionHead
          eyebrow="Charts"
          title="Charts that know what a limit is"
          text="Made for test data, telemetry and lab results: from a live 1 kHz feed to a Bode plot and a Cpk."
        />
        <ChartShowcase />
      </section>

      <section className={`mx-auto flex w-full max-w-6xl flex-col gap-6 py-16 ${gutter}`}>
        <SectionHead
          eyebrow="Components"
          title="Every component, running live"
          action={
            <Button variant="ghost" render={<Link href="/docs/components" />}>
              See all
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          }
        />
        <ComponentTeaser
          slugs={['metric', 'switch', 'select', 'toggle', 'slider', 'toast', 'badge', 'progress']}
        />
      </section>

      <section className={`mx-auto flex w-full max-w-6xl flex-col gap-6 py-16 ${gutter}`}>
        <SectionHead eyebrow="Examples" title="Whole apps, built only from the system" />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {examples.map((e) => (
            <li key={e.href}>
              <Link
                href={e.href}
                className="group flex flex-col overflow-hidden rounded-card border border-border bg-card shadow-lift transition-[border-color] duration-150 hover:border-border-strong"
              >
                <span className="relative block aspect-[16/10] overflow-hidden border-b border-border bg-background">
                  <Image
                    src={e.image}
                    alt=""
                    sizes="(min-width: 1152px) 280px, (min-width: 640px) 50vw, 100vw"
                    placeholder="blur"
                    className="size-full object-cover object-top-left transition-transform duration-240 ease-out group-hover:scale-[1.02]"
                  />
                </span>
                <span className="flex items-center gap-3 px-4 py-3">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-body font-medium">{e.title}</span>
                    <span className="text-label font-normal text-muted-foreground">{e.text}</span>
                  </span>
                  <ArrowUpRightIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-subtle-foreground transition-[color,translate] duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
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

      <section className="relative overflow-hidden">
        <StarTrails variant="closing" className="dark:hidden" />
        <SpaceBackdrop className="hidden opacity-80 [mask-image:linear-gradient(to_bottom,transparent,black_35%,black_55%,transparent)] dark:block" />
        <div
          className={`relative mx-auto flex w-full max-w-2xl flex-col items-center gap-6 pt-36 pb-28 text-center ${gutter}`}
        >
          <h2 className="text-large-title text-balance">Start in one command.</h2>
          <CommandTabs label="Who installs it" ways={start} className="text-left shadow-raised" />
          <Button variant="primary" size="lg" render={<Link href="/docs" />}>
            Read the docs
            <ArrowRightIcon aria-hidden="true" />
          </Button>
        </div>
      </section>
    </main>
  );
}
