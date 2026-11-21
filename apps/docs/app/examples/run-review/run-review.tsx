'use client';

import * as React from 'react';
import {
  ArchiveIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  CircleXIcon,
  CopyIcon,
  DownloadIcon,
  GitCompareIcon,
  MoreHorizontalIcon,
  RotateCcwIcon,
  ShareIcon,
  TableIcon,
  TriangleAlertIcon,
  MessageSquarePlusIcon,
} from 'lucide-react';
import { AppShell, AppToolbar, PageHeader } from '@dtheo/ui/components/app-shell';
import { Button } from '@dtheo/ui/components/button';
import { Badge } from '@dtheo/ui/components/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@dtheo/ui/components/card';
import { Metric, MetricGroup } from '@dtheo/ui/components/metric';
import { SegmentedControl, SegmentedControlItem, Toggle } from '@dtheo/ui/components/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@dtheo/ui/components/table';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
} from '@dtheo/ui/components/menu';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@dtheo/ui/components/dialog';
import { NumberField } from '@dtheo/ui/components/number-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@dtheo/ui/components/select';
import { Field, FieldDescription, FieldError, FieldLabel } from '@dtheo/ui/components/field';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@dtheo/ui/components/alert-dialog';
import { Separator } from '@dtheo/ui/components/separator';
import { Textarea } from '@dtheo/ui/components/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@dtheo/ui/components/tooltip';
import { Empty, EmptyDescription, EmptyTitle } from '@dtheo/ui/components/empty';
import { Avatar } from '@dtheo/ui/components/avatar';
import { useToast } from '@dtheo/ui/components/toast';
import { BarChart, ChartLegend, LineChart } from '@dtheo/charts';
import { LabPalette } from '../_shared/lab-palette';
import { LabSidebar, labUser } from '../_shared/lab-sidebar';
import { ThemeToggle } from '@/components/theme-controls';
import {
  CURRENT_LIMIT,
  DELAY,
  OVERSHOOT_LIMIT,
  RISE_LIMIT,
  SAMPLES,
  SETTLE_LIMIT,
  TARGET,
  TEMP_LIMIT,
  TORQUE_LIMIT,
  WINDING_TEMP,
  checkStatus,
  command,
  fmt,
  gains,
  measured,
  measuredMetrics as M,
  reference,
  referenceGains,
  referenceMetrics as R,
  runHistory,
} from '@/lib/lab-data';

/** The run under review, and the run it is compared against. */
const RUN = 'R-0412';
const REFERENCE = 'R-0409';
const kpRise = (gains.kp / referenceGains.kp - 1) * 100;
const failed = runHistory.filter((r) => r.overshoot > OVERSHOOT_LIMIT).map((r) => r.id);
const overLimit = `${failed.slice(0, -1).join(', ')} and ${failed.at(-1)}`;

const resultMeta = {
  fail: { label: 'Fail', variant: 'destructive', Icon: CircleXIcon },
  review: { label: 'Review', variant: 'warning', Icon: TriangleAlertIcon },
  pass: { label: 'Pass', variant: 'success', Icon: CircleCheckIcon },
} as const;

interface Note {
  id: number;
  author: string;
  text: string;
  at: string;
}

export function RunReview() {
  const toast = useToast();
  const [timeWindow, setTimeWindow] = React.useState<string[]>(['400']);
  const [showSamples, setShowSamples] = React.useState(false);
  const [retuneOpen, setRetuneOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [notes, setNotes] = React.useState<Note[]>([]);
  const span = Number(timeWindow[0] ?? 400);

  const status = {
    overshoot: checkStatus(M.overshoot, OVERSHOOT_LIMIT),
    current: checkStatus(M.peakCurrent, CURRENT_LIMIT),
    settle: checkStatus(M.settle, SETTLE_LIMIT),
    rise: checkStatus(M.rise, RISE_LIMIT),
    temp: checkStatus(WINDING_TEMP, TEMP_LIMIT),
  };
  const failing = Object.values(status).filter((s) => s === 'fail').length;
  const exportSamples = React.useCallback(
    () =>
      toast.add({
        title: 'Export started',
        description: `r-0412-samples.csv, ${fmt.n0.format(SAMPLES)} rows.`,
      }),
    [toast],
  );
  // ⌘E / Ctrl+E exports, as the menu and the palette say it does.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        exportSamples();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exportSamples]);
  const nearLimit = Object.values(status).filter((s) => s === 'warn').length;

  return (
    <AppShell sidebar={<LabSidebar current="runs" onSearch={() => setPaletteOpen(true)} />}>
      <AppToolbar>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-body">
          {/* The runs list isn't part of this demo, so the trail names it without linking to nowhere. */}
          <span className="text-muted-foreground">Runs</span>
          <ChevronRightIcon className="size-3.5 shrink-0 text-subtle-foreground" aria-hidden="true" />
          <span aria-current="page" className="truncate font-mono text-label text-foreground">
            R-0412
          </span>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Badge variant="outline" className="hidden sm:inline-flex">
            Synthetic data
          </Badge>
          <Separator orientation="vertical" className="mx-1.5 hidden h-4 sm:block" />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Copy link to run"
                  onClick={() =>
                    toast.add({ title: 'Link copied', description: 'Anyone on the team can open R-0412.' })
                  }
                />
              }
            >
              <ShareIcon aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>Copy link</TooltipContent>
          </Tooltip>
          <ThemeToggle />
          <Menu>
            <MenuTrigger render={<Button variant="ghost" size="icon" aria-label="More actions" />}>
              <MoreHorizontalIcon aria-hidden="true" />
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem onClick={exportSamples}>
                <DownloadIcon aria-hidden="true" />
                Export samples (CSV)
                <MenuShortcut>⌘E</MenuShortcut>
              </MenuItem>
              <MenuItem onClick={() => setRetuneOpen(true)}>
                <RotateCcwIcon aria-hidden="true" />
                Queue retune run
              </MenuItem>
              <MenuItem>
                <CopyIcon aria-hidden="true" />
                Duplicate test profile
              </MenuItem>
              <MenuSeparator />
              <MenuItem variant="destructive" onClick={() => setArchiveOpen(true)}>
                <ArchiveIcon aria-hidden="true" />
                Archive run…
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </AppToolbar>

      <main className="flex w-full max-w-[1400px] flex-col gap-6 px-4 pt-5 pb-16 sm:px-6 lg:pt-6">
        <PageHeader
          eyebrow={
            <span className="flex flex-wrap gap-x-3 gap-y-0.5 sm:gap-x-2">
              <span>RA-14 hip pitch</span>
              <span aria-hidden="true" className="hidden sm:inline">
                ·
              </span>
              <span>Bench 3</span>
              <span aria-hidden="true" className="hidden sm:inline">
                ·
              </span>
              <span>Firmware 4.18.2</span>
              <span aria-hidden="true" className="hidden sm:inline">
                ·
              </span>
              <span>18 Nov 2026, 14:32</span>
            </span>
          }
          title={
            <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-title-3 font-medium text-muted-foreground">R-0412</span>
              High-gain step
            </span>
          }
          actions={
            <>
              {failing ? (
                <Badge variant="destructive">
                  <CircleXIcon aria-hidden="true" />
                  {failing} failed
                </Badge>
              ) : null}
              {nearLimit ? (
                <Badge variant="warning">
                  <TriangleAlertIcon aria-hidden="true" />
                  {nearLimit} near limit
                </Badge>
              ) : null}
            </>
          }
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          {/* Below xl the two columns dissolve so the order reads: checks, decision, evidence, record. */}
          <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-5">
            {/* Five checks never leave one alone on a row: on a phone the first (failing) check spans the width. */}
            <MetricGroup
              aria-label="Acceptance checks"
              className="order-1 grid-cols-2 xl:order-none sm:grid-cols-3 lg:grid-cols-5 [&>:first-child]:col-span-2 sm:[&>:first-child]:col-span-1"
            >
              <Metric
                label="Overshoot"
                value={fmt.n1.format(M.overshoot)}
                unit="%"
                status={status.overshoot}
                progress={M.overshoot / (OVERSHOOT_LIMIT * 1.5)}
                limit={1 / 1.5}
                limitLabel={`Limit ≤ ${OVERSHOOT_LIMIT} %`}
                hint={`Peak above the ${TARGET} N·m command`}
              />
              <Metric
                label="Peak current"
                value={fmt.n1.format(M.peakCurrent)}
                unit="A"
                status={status.current}
                progress={M.peakCurrent / (CURRENT_LIMIT * 1.25)}
                limit={1 / 1.25}
                limitLabel={`Limit ≤ ${CURRENT_LIMIT} A`}
                hint="Peak phase current"
              />
              <Metric
                label="Settling, 2 %"
                value={fmt.n0.format(M.settle)}
                unit="ms"
                status={status.settle}
                progress={M.settle / (SETTLE_LIMIT * 1.5)}
                limit={1 / 1.5}
                limitLabel={`Limit ≤ ${SETTLE_LIMIT} ms`}
                hint="Time after the step until torque stays inside ±2 %"
              />
              <Metric
                label="Rise, 10–90 %"
                value={fmt.n0.format(M.rise)}
                unit="ms"
                status={status.rise}
                progress={M.rise / (RISE_LIMIT * 1.5)}
                limit={1 / 1.5}
                limitLabel={`Limit ≤ ${RISE_LIMIT} ms`}
              />
              <Metric
                label="Winding temp"
                value={fmt.n1.format(WINDING_TEMP)}
                unit="°C"
                status={status.temp}
                progress={WINDING_TEMP / (TEMP_LIMIT * 1.5)}
                limit={1 / 1.5}
                limitLabel={`Limit ≤ ${TEMP_LIMIT} °C`}
              />
            </MetricGroup>

            <Card className="order-3 xl:order-none">
              <CardHeader>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <CardTitle level={2}>Step response</CardTitle>
                  <CardDescription>
                    Torque command 0 → {TARGET} N·m at {DELAY} ms, against the last passing run
                  </CardDescription>
                </div>
                <CardAction>
                  <SegmentedControl
                    aria-label="Time window"
                    value={timeWindow}
                    onValueChange={(v) => v.length && setTimeWindow(v)}
                  >
                    <SegmentedControlItem value="400">400 ms</SegmentedControlItem>
                    <SegmentedControlItem value="1000">1 s</SegmentedControlItem>
                  </SegmentedControl>
                  <Toggle
                    pressed={showSamples}
                    onPressedChange={setShowSamples}
                    aria-label="Samples"
                  >
                    <TableIcon aria-hidden="true" />
                    <span className="hidden sm:inline">Samples</span>
                  </Toggle>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 pt-3">
                <ChartLegend
                  items={[
                    { label: 'R-0412 measured', tone: 'primary' },
                    { label: 'R-0409 reference', tone: 'muted' },
                    { label: 'Command', tone: 'faint', kind: 'thin' },
                    { label: '±2 % settling band', kind: 'band' },
                    { label: 'Over limit', tone: 'critical', kind: 'area' },
                  ]}
                />
                {showSamples ? (
                  <SampleTable span={span} />
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="text-label text-muted-foreground">Output torque</span>
                    <LineChart
                      ariaLabel={`Output torque. R-0412 peaks at ${fmt.n1.format(M.peak)} N·m, ${fmt.n1.format(M.overshoot)} % over the command, above the ${OVERSHOOT_LIMIT} % limit. R-0409 overshoots ${fmt.n1.format(R.overshoot)} %.`}
                      x={measured.t}
                      xDomain={[0, span]}
                      xUnit="ms"
                      yDomain={[0, 16]}
                      yTicks={[0, 4, 8, 12, 16]}
                      height={250}
                      syncId="r-0412"
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
                      thresholds={[
                        {
                          value: TORQUE_LIMIT,
                          label: `Overshoot limit ${fmt.n1.format(TORQUE_LIMIT)} N·m`,
                          shortLabel: `Limit +${OVERSHOOT_LIMIT} %`,
                          shadeSeries: 'meas',
                        },
                      ]}
                      markers={[
                        {
                          x: M.peakAt,
                          y: M.peak,
                          label: `${fmt.n1.format(M.peak)} N·m`,
                          sublabel: `+${fmt.n1.format(M.overshoot)} %`,
                          tone: 'critical',
                        },
                      ]}
                      verticals={[
                        {
                          x: DELAY + M.settle,
                          label: `Settled ${fmt.n0.format(M.settle)} ms after the step`,
                        },
                      ]}
                      extraReadout={(i) => [
                        {
                          label: 'R-0412 current',
                          value: `${fmt.n1.format(measured.current[i]!)} A`,
                          tone: 'primary',
                        },
                      ]}
                    />
                    <span className="mt-3 text-label text-muted-foreground">Phase current</span>
                    <LineChart
                      ariaLabel={`Phase current. R-0412 peaks at ${fmt.n1.format(M.peakCurrent)} A, ${fmt.n0.format((M.peakCurrent / CURRENT_LIMIT) * 100)} % of the ${CURRENT_LIMIT} A limit.`}
                      x={measured.t}
                      xDomain={[0, span]}
                      xUnit="ms"
                      yDomain={[0, 40]}
                      yTicks={[0, 20, 40]}
                      height={130}
                      syncId="r-0412"
                      series={[
                        {
                          id: 'ref',
                          label: 'R-0409',
                          values: reference.current,
                          tone: 'muted',
                          width: 1.5,
                          unit: 'A',
                          digits: 1,
                        },
                        {
                          id: 'meas',
                          label: 'R-0412',
                          values: measured.current,
                          tone: 'primary',
                          width: 2,
                          unit: 'A',
                          digits: 1,
                        },
                      ]}
                      thresholds={[{ value: CURRENT_LIMIT, label: `Limit ${CURRENT_LIMIT} A` }]}
                      markers={[
                        {
                          x: M.peakCurrentAt,
                          y: M.peakCurrent,
                          label: `${fmt.n1.format(M.peakCurrent)} A`,
                          sublabel: `${fmt.n0.format((M.peakCurrent / CURRENT_LIMIT) * 100)} % of limit`,
                          tone: 'warning',
                        },
                      ]}
                    />
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-between">
                <span>Sampled at 1 kHz · load cell and phase shunt, Bench 3</span>
                <span className="hidden sm:inline">Hover or focus a chart, then use the arrow keys</span>
              </CardFooter>
            </Card>

            <Card className="order-4 xl:order-none">
              <CardHeader>
                <div className="flex flex-col gap-0.5">
                  <CardTitle level={2}>Run history</CardTitle>
                  <CardDescription>RA-14 hip pitch, last 8 runs</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-1">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Run</TableHead>
                      <TableHead>Profile</TableHead>
                      <TableHead numeric className="hidden sm:table-cell">
                        Kp
                      </TableHead>
                      <TableHead numeric>Overshoot</TableHead>
                      <TableHead numeric className="hidden md:table-cell">
                        Settling
                      </TableHead>
                      <TableHead numeric className="hidden md:table-cell">
                        Peak current
                      </TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead className="hidden lg:table-cell">Started</TableHead>
                      <TableHead>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runHistory.map((run) => {
                      const meta = resultMeta[run.result];
                      return (
                        <TableRow key={run.id} aria-selected={run.id === RUN || undefined}>
                          <TableCell className="font-mono text-label">{run.id}</TableCell>
                          <TableCell className="max-w-40 truncate text-muted-foreground sm:max-w-none">
                            <span className="text-foreground">{run.profile}</span>
                            {run.note ? (
                              <span className="ml-1.5 text-caption text-subtle-foreground">{run.note}</span>
                            ) : null}
                          </TableCell>
                          <TableCell numeric className="hidden sm:table-cell">
                            {fmt.n2.format(run.kp)}
                          </TableCell>
                          <TableCell
                            numeric
                            className={
                              run.overshoot > OVERSHOOT_LIMIT ? 'font-medium text-destructive-foreground' : ''
                            }
                          >
                            {fmt.n1.format(run.overshoot)} %
                          </TableCell>
                          <TableCell numeric className="hidden md:table-cell">
                            {fmt.n0.format(run.settle)} ms
                          </TableCell>
                          <TableCell
                            numeric
                            className={`hidden md:table-cell ${checkStatus(run.current, CURRENT_LIMIT) === 'pass' ? '' : 'font-medium text-warning-foreground'}`}
                          >
                            {fmt.n1.format(run.current)} A
                          </TableCell>
                          <TableCell>
                            <Badge variant={meta.variant}>
                              <meta.Icon aria-hidden="true" />
                              {meta.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground lg:table-cell">
                            {run.started}
                          </TableCell>
                          <TableCell className="w-10 pr-2">
                            <Menu>
                              <MenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Actions for ${run.id}`}
                                  />
                                }
                              >
                                <MoreHorizontalIcon aria-hidden="true" />
                              </MenuTrigger>
                              <MenuContent align="end">
                                <MenuItem>Open {run.id}</MenuItem>
                                {/* A run is never compared with itself, and the reference is already set. */}
                                {run.id === RUN ? null : (
                                  <MenuItem>
                                    <GitCompareIcon aria-hidden="true" />
                                    Compare with {RUN}
                                  </MenuItem>
                                )}
                                {run.id === REFERENCE ? null : <MenuItem>Set as reference</MenuItem>}
                              </MenuContent>
                            </Menu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <aside
            aria-label="Run inspector"
            className="contents xl:sticky xl:top-18 xl:flex xl:min-w-0 xl:flex-col xl:gap-5 xl:self-start"
          >
            <Card className="order-2 xl:order-none">
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-control bg-destructive/15 text-destructive-foreground">
                    <CircleXIcon className="size-4.5" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col">
                    <h2 className="text-headline">Needs retune</h2>
                    <span className="text-caption text-subtle-foreground">Not ready for sign-off</span>
                  </div>
                </div>
                <p className="text-body text-muted-foreground text-pretty">
                  Overshoot is{' '}
                  <strong className="font-semibold text-foreground">
                    {fmt.n1.format(M.overshoot - OVERSHOOT_LIMIT)} points over
                  </strong>{' '}
                  the {OVERSHOOT_LIMIT}&nbsp;% limit, and phase current peaked at{' '}
                  <strong className="font-semibold text-foreground">
                    {fmt.n0.format((M.peakCurrent / CURRENT_LIMIT) * 100)}&nbsp;%
                  </strong>{' '}
                  of its {CURRENT_LIMIT}&nbsp;A limit. Kp rose {fmt.n0.format(kpRise)}&nbsp;% since the
                  reference run.
                </p>
                <p className="text-body text-muted-foreground">
                  Lower Kp or raise Kd, then rerun the same step on Bench&nbsp;3.
                </p>
                <div className="mt-1 flex flex-col gap-2">
                  <Button variant="primary" onClick={() => setRetuneOpen(true)}>
                    <RotateCcwIcon aria-hidden="true" />
                    Queue retune run
                  </Button>
                  <Button
                    onClick={() =>
                      toast.add({
                        title: `Comparing with ${REFERENCE}`,
                        description: 'Reference overlay is on the chart.',
                      })
                    }
                  >
                    <GitCompareIcon aria-hidden="true" />
                    Compare with {REFERENCE}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="order-5 xl:order-none">
              <CardHeader className="pb-1">
                <CardTitle level={2} className="text-label text-muted-foreground">
                  Overshoot by run
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1 pb-2">
                <BarChart
                  ariaLabel={`Overshoot for the last ${runHistory.length} runs. ${overLimit} exceed the ${OVERSHOOT_LIMIT} % limit.`}
                  bars={runHistory.toReversed().map((r) => ({
                    id: r.id,
                    label: r.id.slice(-2),
                    value: r.overshoot,
                    current: r.id === RUN,
                  }))}
                  limit={OVERSHOOT_LIMIT}
                  limitLabel={`Limit ${OVERSHOOT_LIMIT} %`}
                  unit="%"
                  height={170}
                />
              </CardContent>
            </Card>

            <Card className="order-6 xl:order-none">
              <CardHeader className="pb-1">
                <CardTitle level={2} className="text-label text-muted-foreground">
                  Controller gains
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                <dl className="grid grid-cols-[auto_1fr] text-body">
                  {[
                    [
                      'Kp',
                      fmt.n2.format(gains.kp),
                      `was ${fmt.n2.format(referenceGains.kp)}`,
                      `+${fmt.n0.format(kpRise)} %`,
                    ],
                    ['Ki', fmt.n2.format(gains.ki), '', ''],
                    ['Kd', fmt.n2.format(gains.kd), '', ''],
                    ['Supply', '48.0 V', '', ''],
                    ['Ambient', '23.4 °C', '', ''],
                  ].map(([k, v, was, delta], i) => (
                    <React.Fragment key={k}>
                      <dt className={`py-1.5 text-muted-foreground ${i ? 'border-t border-border' : ''}`}>
                        {k}
                      </dt>
                      <dd className={`py-1.5 text-right tabular-nums ${i ? 'border-t border-border' : ''}`}>
                        {v}
                        {was ? (
                          <span className="ml-1.5 text-caption text-subtle-foreground">{was}</span>
                        ) : null}
                        {delta ? (
                          <span className="ml-1.5 font-semibold text-warning-foreground">{delta}</span>
                        ) : null}
                      </dd>
                    </React.Fragment>
                  ))}
                </dl>
              </CardContent>
            </Card>

            <NotesCard
              className="order-7 xl:order-none"
              notes={notes}
              onAdd={(text) =>
                setNotes((n) => [...n, { id: Date.now(), author: labUser.first, text, at: 'Just now' }])
              }
            />
          </aside>
        </div>
      </main>

      <RetuneDialog open={retuneOpen} onOpenChange={setRetuneOpen} />
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Archive R-0412?</AlertDialogTitle>
          <AlertDialogDescription>
            It leaves the run history and the weekly review. Its traces and notes are kept, and you can
            restore it from Archive for 30 days.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Keep run</AlertDialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                setArchiveOpen(false);
                toast.add({
                  title: 'R-0412 archived',
                  description: 'Restore it from Archive within 30 days.',
                  actionProps: { children: 'Undo', onClick: () => toast.add({ title: 'R-0412 restored' }) },
                });
              }}
            >
              Archive run
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <LabPalette
        current="runs"
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        actions={[
          {
            value: 'retune',
            label: 'Queue retune run',
            group: 'Actions',
            icon: <RotateCcwIcon />,
            onSelect: () => setRetuneOpen(true),
          },
          {
            value: 'samples',
            label: 'Show sample table',
            group: 'Actions',
            icon: <TableIcon />,
            onSelect: () => setShowSamples(true),
          },
          {
            value: 'export',
            label: 'Export samples (CSV)',
            group: 'Actions',
            shortcut: '⌘E',
            icon: <DownloadIcon />,
            onSelect: exportSamples,
          },
          ...runHistory.map((r) => ({
            value: r.id,
            label: `${r.id} · ${r.profile}`,
            group: 'Runs',
            hint: resultMeta[r.result].label,
          })),
        ]}
      />
    </AppShell>
  );
}

function SampleTable({ span }: { span: number }) {
  const rows = Array.from({ length: span / 10 + 1 }, (_, k) => k * 10);
  return (
    <div className="max-h-96 overflow-auto rounded-inset border border-border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow className="hover:bg-transparent">
            <TableHead numeric>Time</TableHead>
            <TableHead numeric>R-0412 torque</TableHead>
            <TableHead numeric>R-0409 torque</TableHead>
            <TableHead numeric>R-0412 current</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => (
            <TableRow key={t}>
              <TableCell numeric>{t} ms</TableCell>
              <TableCell
                numeric
                className={measured.torque[t]! > TORQUE_LIMIT ? 'text-destructive-foreground' : ''}
              >
                {fmt.n2.format(measured.torque[t]!)} N·m
              </TableCell>
              <TableCell numeric>{fmt.n2.format(reference.torque[t]!)} N·m</TableCell>
              <TableCell numeric>{fmt.n1.format(measured.current[t]!)} A</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const benches = [
  { value: 'bench-3', label: 'Bench 3 · free from 15:10' },
  { value: 'bench-1', label: 'Bench 1 · free tomorrow' },
  { value: 'bench-5', label: 'Bench 5 · thermal chamber' },
];

function RetuneDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const toast = useToast();
  const [kp, setKp] = React.useState<number | null>(3.6);
  const [kd, setKd] = React.useState<number | null>(0.09);
  const [saving, setSaving] = React.useState(false);
  const invalid = kp === null || kp <= 0 || kp >= gains.kp;
  const submit = () => {
    if (invalid) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      onOpenChange(false);
      toast.add({
        title: 'Retune run queued',
        description: `R-0413 · Kp ${fmt.n2.format(kp!)}, Kd ${fmt.n2.format(kd ?? 0)} · Bench 3 at 15:10.`,
        type: 'success',
      });
    }, 900);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Queue a retune run</DialogTitle>
          <DialogDescription>
            Rerun the high-gain step with new gains. The current run stays as it is for comparison.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field invalid={invalid}>
            <NumberField
              label="Kp"
              value={kp}
              onValueChange={setKp}
              step={0.05}
              min={0}
              max={10}
              format={{ minimumFractionDigits: 2 }}
            />
            <FieldError match={invalid}>
              Lower Kp below {fmt.n2.format(gains.kp)} to reduce overshoot.
            </FieldError>
          </Field>
          <NumberField
            label="Kd"
            value={kd}
            onValueChange={setKd}
            step={0.01}
            min={0}
            max={1}
            format={{ minimumFractionDigits: 2 }}
          />
        </div>
        <Field>
          <FieldLabel>Bench</FieldLabel>
          <Select items={benches} defaultValue="bench-3">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {benches.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>Same load inertia and supply as R-0412.</FieldDescription>
        </Field>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button variant="primary" onClick={submit} loading={saving} disabled={invalid}>
            Queue run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NotesCard({
  notes,
  onAdd,
  className,
}: {
  notes: Note[];
  onAdd: (text: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = React.useState('');
  const [editing, setEditing] = React.useState(false);
  const [error, setError] = React.useState(false);
  const save = () => {
    if (!draft.trim()) {
      setError(true);
      return;
    }
    onAdd(draft.trim());
    setDraft('');
    setEditing(false);
    setError(false);
  };
  return (
    <Card className={className}>
      <CardHeader className="pb-1">
        <CardTitle level={2} className="text-label text-muted-foreground">
          Notes
        </CardTitle>
        {notes.length && !editing ? (
          <CardAction>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Add note
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-2">
        {notes.map((n) => (
          <div key={n.id} className="flex gap-2.5">
            <Avatar name={labUser.name} className="size-6" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-label">
                {n.author} <span className="font-normal text-subtle-foreground">· {n.at}</span>
              </span>
              <p className="text-body break-words text-muted-foreground">{n.text}</p>
            </div>
          </div>
        ))}
        {!notes.length && !editing ? (
          <Empty className="gap-2 border border-dashed border-border-strong px-4 py-6">
            <EmptyTitle className="text-body">No notes yet</EmptyTitle>
            <EmptyDescription className="text-label font-normal">
              Notes appear in the run report and in the weekly review.
            </EmptyDescription>
            <Button size="sm" className="mt-1" onClick={() => setEditing(true)}>
              <MessageSquarePlusIcon aria-hidden="true" />
              Add note
            </Button>
          </Empty>
        ) : null}
        {editing ? (
          <Field invalid={error}>
            <FieldLabel>New note</FieldLabel>
            <Textarea
              value={draft}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                setDraft(e.target.value);
                if (error) setError(false);
              }}
              placeholder="What did you see, and what should happen next?"
              autoFocus
            />
            <FieldError match={error}>Write the note before saving.</FieldError>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={save}>
                Save note
              </Button>
            </div>
          </Field>
        ) : null}
      </CardContent>
    </Card>
  );
}
