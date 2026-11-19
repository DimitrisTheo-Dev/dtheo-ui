'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowUpIcon,
  DatabaseIcon,
  GitCompareIcon,
  PaperclipIcon,
  RotateCcwIcon,
  SparklesIcon,
  SquareArrowOutUpRightIcon,
} from 'lucide-react';
import { ThemeScope } from '@dtheo/ui/lib/theme';
import { AppShell, AppToolbar } from '@dtheo/ui/components/app-shell';
import { Button } from '@dtheo/ui/components/button';
import { Badge } from '@dtheo/ui/components/badge';
import { Metric, MetricGroup } from '@dtheo/ui/components/metric';
import { Meter } from '@dtheo/ui/components/progress';
import { Spinner } from '@dtheo/ui/components/spinner';
import { Kbd } from '@dtheo/ui/components/kbd';
import { useToast } from '@dtheo/ui/components/toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@dtheo/ui/components/table';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@dtheo/ui/components/tabs';
import { ChartLegend, LineChart } from '@dtheo/charts';
import { LabSidebar } from '../_shared/lab-sidebar';
import { SpaceBackdrop } from '@/components/space-backdrop';
import {
  CURRENT_LIMIT,
  DELAY,
  OVERSHOOT_LIMIT,
  TARGET,
  command,
  fmt,
  measured,
  measuredMetrics as M,
  reference,
} from '@/lib/actuator';

type Part =
  | { type: 'text'; text: string }
  | { type: 'tool'; summary: string }
  | { type: 'checks' }
  | { type: 'chart' }
  | { type: 'current-table' }
  | { type: 'actions' };

/** Parts of one message are unique by type, except text and tool calls, which are keyed by their content. */
const partKey = (p: Part) =>
  p.type === 'text' ? `text:${p.text}` : p.type === 'tool' ? `tool:${p.summary}` : p.type;

interface Message {
  id: number;
  role: 'user' | 'assistant';
  parts: Part[];
}

const initial: Message[] = [
  { id: 1, role: 'user', parts: [{ type: 'text', text: 'Why did R-0412 fail its acceptance checks?' }] },
  {
    id: 2,
    role: 'assistant',
    parts: [
      { type: 'tool', summary: 'Read run R-0412 and the 7 runs before it · 8,008 samples' },
      {
        type: 'text',
        text: `R-0412 overshot by ${fmt.n1.format(M.overshoot)} %, ${fmt.n1.format(M.overshoot - OVERSHOOT_LIMIT)} points over the ${OVERSHOOT_LIMIT} % limit. Kp rose from 2.80 to 4.20 since R-0409, the last passing run, which lowered damping. Phase current also peaked at ${fmt.n1.format(M.peakCurrent)} A, ${fmt.n0.format((M.peakCurrent / CURRENT_LIMIT) * 100)} % of its limit.`,
      },
      { type: 'checks' },
      { type: 'chart' },
      {
        type: 'text',
        text: 'Lowering Kp to about 3.6 should bring overshoot under 10 % while keeping the rise time under 60 ms. Raising Kd to 0.09 adds margin.',
      },
      { type: 'actions' },
    ],
  },
  {
    id: 3,
    role: 'user',
    parts: [{ type: 'text', text: 'Which other actuators are near their current limit this week?' }],
  },
  {
    id: 4,
    role: 'assistant',
    parts: [
      { type: 'tool', summary: 'Queried 28 actuators · 18 Nov to 25 Nov' },
      {
        type: 'text',
        text: 'Two actuators peaked above 90 % of their phase-current limit. Both ran high-gain profiles; the wrist is well clear.',
      },
      { type: 'current-table' },
    ],
  },
];

const suggestions = [
  'Summarize today’s failed runs',
  'Draft the weekly bench report',
  'Explain settling time',
];

const scripted = (q: string) => {
  const s = q.toLowerCase();
  if (s.includes('settling'))
    return 'Settling time is how long the output takes to stay within ±2 % of the command. R-0412 settled at 203 ms, inside the 250 ms limit; the problem was the overshoot on the way there.';
  if (s.includes('report'))
    return 'Draft: This week Bench 3 ran 41 step tests on RA-14. 3 failed on overshoot, all at Kp ≥ 3.9. Next week: retune at Kp 3.6 / Kd 0.09 and repeat the thermal soak.';
  if (s.includes('fail'))
    return 'Today 2 runs failed: R-0412 and R-0411, both high-gain steps on RA-14 that overshot the 10 % limit (17.6 % and 21.3 %). No thermal or current failures.';
  return 'This demo answers from scripted data. In a real deployment the assistant reads the run database through a read-only tool and cites every number it uses.';
};

export function Assistant() {
  const toast = useToast();
  const [messages, setMessages] = React.useState<Message[]>(initial);
  const [draft, setDraft] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);
  const reduce = React.useRef(false);
  React.useEffect(() => {
    reduce.current = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const send = (text: string) => {
    const q = text.trim();
    if (!q || pending) return;
    const id = Date.now();
    setMessages((m) => [...m, { id, role: 'user', parts: [{ type: 'text', text: q }] }]);
    setDraft('');
    setPending(true);
    setTimeout(
      () => endRef.current?.scrollIntoView({ block: 'end', behavior: reduce.current ? 'auto' : 'smooth' }),
      0,
    );
    const answer = scripted(q);
    setTimeout(() => {
      setPending(false);
      if (reduce.current) {
        setMessages((m) => [
          ...m,
          { id: id + 1, role: 'assistant', parts: [{ type: 'text', text: answer }] },
        ]);
        return;
      }
      // Reveal word by word; the final message is complete text for assistive tech (log announces once).
      const words = answer.split(' ');
      let i = 0;
      setMessages((m) => [...m, { id: id + 1, role: 'assistant', parts: [{ type: 'text', text: '' }] }]);
      const timer = setInterval(() => {
        i += 2;
        setMessages((m) =>
          m.map((msg) =>
            msg.id === id + 1
              ? { ...msg, parts: [{ type: 'text', text: words.slice(0, i).join(' ') }] }
              : msg,
          ),
        );
        if (i >= words.length) clearInterval(timer);
      }, 40);
    }, 900);
  };

  return (
    <ThemeScope mode="dark" preset="deep-space" className="relative">
      <SpaceBackdrop className="fixed" />
      <AppShell className="relative bg-transparent" sidebar={<LabSidebar current="assistant" />}>
        <AppToolbar className="bg-background/40">
          <h1 className="flex items-center gap-2 text-body font-medium">
            <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
            Lab assistant
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex">
              Deep space preset
            </Badge>
            <Badge variant="outline">Scripted demo · no model called</Badge>
          </div>
        </AppToolbar>

        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 sm:px-6">
          <div
            role="log"
            aria-live="polite"
            aria-label="Conversation"
            className="flex flex-col gap-8 pt-8 pb-6"
          >
            {messages.map((m) =>
              m.role === 'user' ? (
                <UserMessage key={m.id} text={(m.parts[0] as { text: string }).text} />
              ) : (
                <AssistantMessage key={m.id} parts={m.parts} onAction={(t) => toast.add(t)} />
              ),
            )}
            {pending ? (
              <div className="flex items-center gap-2.5 text-body text-muted-foreground">
                <Spinner className="size-4" label="Reading run data" />
                Reading run data…
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <div className="sticky bottom-0 mt-auto bg-linear-to-t from-background from-70% to-transparent pt-10 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            {messages.length <= initial.length ? (
              <div className="mb-2.5 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant="outline"
                    className="rounded-full bg-card"
                    onClick={() => send(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            ) : null}
            <form
              className="flex flex-col gap-2 rounded-dialog border border-border-strong bg-popover p-2 shadow-dialog backdrop-blur-material transition-[border-color,box-shadow] duration-150 has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-3 has-[textarea:focus-visible]:ring-ring/25"
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
            >
              <label htmlFor="composer" className="sr-only">
                Ask about runs, benches or actuators
              </label>
              <textarea
                id="composer"
                data-focus="field"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(draft);
                  }
                }}
                rows={2}
                placeholder="Ask about runs, benches or actuators…"
                className="field-sizing-content max-h-48 min-h-12 w-full resize-none bg-transparent px-2 pt-1 text-callout text-foreground outline-none placeholder:text-subtle-foreground"
              />
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="icon" aria-label="Attach a run or file">
                  <PaperclipIcon aria-hidden="true" />
                </Button>
                <span className="hidden items-center gap-1.5 text-caption text-subtle-foreground sm:flex">
                  <Kbd>↵</Kbd> to send · <Kbd>⇧↵</Kbd> new line
                </span>
                <Button
                  type="submit"
                  variant="primary"
                  size="icon"
                  className="ml-auto rounded-full"
                  aria-label="Send"
                  disabled={!draft.trim() || pending}
                >
                  <ArrowUpIcon aria-hidden="true" />
                </Button>
              </div>
            </form>
          </div>
        </main>
      </AppShell>
    </ThemeScope>
  );
}

function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-dialog rounded-br-item bg-secondary px-4 py-2.5 text-callout text-foreground">
        <span className="sr-only">You: </span>
        {text}
      </div>
    </div>
  );
}

function AssistantMessage({
  parts,
  onAction,
}: {
  parts: Part[];
  onAction: (toast: { title: string; description?: string; type?: string }) => void;
}) {
  return (
    <div className="flex gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary/20 text-primary ring-1 ring-primary/30"
      >
        <SparklesIcon className="size-3.5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3.5">
        <span className="sr-only">Assistant: </span>
        {parts.map((p) => {
          switch (p.type) {
            case 'text':
              return (
                <p key={partKey(p)} className="text-callout text-foreground text-pretty">
                  {p.text}
                </p>
              );
            case 'tool':
              return (
                <span
                  key={partKey(p)}
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-muted px-2.5 py-1 text-label font-normal text-muted-foreground"
                >
                  <DatabaseIcon className="size-3.5" aria-hidden="true" />
                  {p.summary}
                </span>
              );
            case 'checks':
              return (
                <MetricGroup
                  key={partKey(p)}
                  aria-label="Failed and near-limit checks"
                  className="grid-cols-2"
                >
                  <Metric
                    label="Overshoot"
                    value={fmt.n1.format(M.overshoot)}
                    unit="%"
                    status="fail"
                    progress={M.overshoot / 15}
                    limit={10 / 15}
                    limitLabel="Limit ≤ 10 %"
                  />
                  <Metric
                    label="Peak current"
                    value={fmt.n1.format(M.peakCurrent)}
                    unit="A"
                    status="warn"
                    progress={M.peakCurrent / 40}
                    limit={32 / 40}
                    limitLabel="Limit ≤ 32 A"
                  />
                </MetricGroup>
              );
            case 'chart':
              return (
                <Tabs
                  key={partKey(p)}
                  defaultValue="chart"
                  className="gap-2 rounded-card border border-border bg-card p-3.5"
                  data-slot="card"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-label">Output torque, N·m</span>
                    <TabsList aria-label="Show as" className="h-control-sm">
                      <TabsTab value="chart" className="h-full px-2 text-label">
                        Chart
                      </TabsTab>
                      <TabsTab value="data" className="h-full px-2 text-label">
                        Data
                      </TabsTab>
                    </TabsList>
                  </div>
                  <TabsPanel value="chart" className="flex flex-col gap-2">
                    <ChartLegend
                      items={[
                        { label: 'R-0412', tone: 'primary' },
                        { label: 'R-0409', tone: 'muted' },
                      ]}
                    />
                    <LineChart
                      ariaLabel={`R-0412 torque peaks at ${fmt.n1.format(M.peak)} N·m, above the ${OVERSHOOT_LIMIT} % overshoot limit; R-0409 stays under it.`}
                      x={measured.t}
                      xDomain={[0, 300]}
                      xUnit="ms"
                      yDomain={[0, 16]}
                      yTicks={[0, 8, 16]}
                      height={170}
                      series={[
                        {
                          id: 'cmd',
                          label: 'Command',
                          values: command,
                          tone: 'faint',
                          width: 1,
                          unit: 'N·m',
                          dot: false,
                        },
                        {
                          id: 'ref',
                          label: 'R-0409',
                          values: reference.torque,
                          tone: 'muted',
                          width: 1.5,
                          unit: 'N·m',
                        },
                        {
                          id: 'meas',
                          label: 'R-0412',
                          values: measured.torque,
                          tone: 'primary',
                          width: 2,
                          unit: 'N·m',
                        },
                      ]}
                      bands={[{ from: TARGET * 0.98, to: TARGET * 1.02, fromX: DELAY }]}
                      thresholds={[{ value: TARGET * 1.1, label: 'Limit +10 %', shadeSeries: 'meas' }]}
                      markers={[
                        {
                          x: M.peakAt,
                          y: M.peak,
                          label: `${fmt.n1.format(M.peak)} N·m`,
                          sublabel: `+${fmt.n1.format(M.overshoot)} %`,
                        },
                      ]}
                    />
                  </TabsPanel>
                  <TabsPanel value="data">
                    {/* The same trace as numbers: for screen readers, exact reading and copying into a report. */}
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead numeric>Time</TableHead>
                          <TableHead numeric>R-0412</TableHead>
                          <TableHead numeric>R-0409</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[20, 40, 60, M.peakAt, 120, 160, 200, 300].map((t) => {
                          const k = measured.t.findIndex((v) => v >= t);
                          return (
                            <TableRow key={t} aria-current={t === M.peakAt ? 'true' : undefined}>
                              <TableCell numeric>{fmt.n0.format(t)} ms</TableCell>
                              <TableCell numeric className={t === M.peakAt ? 'font-semibold' : undefined}>
                                {fmt.n2.format(measured.torque[k] ?? 0)}
                              </TableCell>
                              <TableCell numeric>{fmt.n2.format(reference.torque[k] ?? 0)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TabsPanel>
                </Tabs>
              );
            case 'current-table':
              return (
                <div
                  key={partKey(p)}
                  className="overflow-hidden rounded-card border border-border bg-card"
                  data-slot="card"
                >
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Actuator</TableHead>
                        <TableHead numeric>Peak</TableHead>
                        <TableHead className="w-40">Of limit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { name: 'RA-14 hip pitch', peak: M.peakCurrent, limit: 32 },
                        { name: 'RL-22 knee', peak: 27.8, limit: 30 },
                        { name: 'RW-05 wrist roll', peak: 6.1, limit: 10 },
                      ].map((a) => {
                        const ratio = (a.peak / a.limit) * 100;
                        return (
                          <TableRow key={a.name}>
                            <TableCell>{a.name}</TableCell>
                            <TableCell numeric>{fmt.n1.format(a.peak)} A</TableCell>
                            <TableCell>
                              <span className="flex items-center gap-2.5">
                                <Meter
                                  aria-label={`${a.name}: ${fmt.n0.format(ratio)} % of limit`}
                                  value={ratio}
                                  limit={90}
                                  tone={ratio > 90 ? 'warning' : 'neutral'}
                                  className="flex-1"
                                />
                                <span className="w-9 text-right text-label font-normal tabular-nums">
                                  {fmt.n0.format(ratio)} %
                                </span>
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              );
            case 'actions':
              return (
                <div key={partKey(p)} className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      onAction({
                        title: 'Retune run queued',
                        description: 'R-0413 · Kp 3.60, Kd 0.09 · Bench 3 at 15:10',
                        type: 'success',
                      })
                    }
                  >
                    <RotateCcwIcon aria-hidden="true" />
                    Queue retune (Kp 3.60)
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      onAction({ title: 'Comparison opened', description: 'R-0412 against R-0409' })
                    }
                  >
                    <GitCompareIcon aria-hidden="true" />
                    Compare with R-0409
                  </Button>
                  <Button size="sm" variant="ghost" render={<Link href="/examples/run-review" />}>
                    <SquareArrowOutUpRightIcon aria-hidden="true" />
                    Open run review
                  </Button>
                </div>
              );
          }
        })}
      </div>
    </div>
  );
}
