'use client';

import * as React from 'react';
import { ChevronRightIcon, PauseIcon, PlayIcon, RotateCcwIcon } from 'lucide-react';
import { AppShell, AppToolbar, PageHeader } from '@dtheo/ui/components/app-shell';
import { Badge, StatusDot } from '@dtheo/ui/components/badge';
import { Button } from '@dtheo/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dtheo/ui/components/card';
import { Metric, MetricGroup } from '@dtheo/ui/components/metric';
import { useToast } from '@dtheo/ui/components/toast';
import { CAPABLE, FrequencyChart, Histogram, ScatterChart, StreamChart, createStream } from '@dtheo/charts';
import { LabPalette } from '../_shared/lab-palette';
import { LabSidebar } from '../_shared/lab-sidebar';
import { ThemeToggle } from '@/components/theme-controls';
import {
  CURRENT_LIMIT,
  OVERSHOOT_USL,
  TARGET,
  TORQUE_LIMIT,
  bode,
  createBench,
  fmt,
  gains,
  measuredMetrics as M,
  overshootStats as S,
  runs,
  spectrum,
} from '@/lib/lab-data';

const nf = (digits: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const m = bode.margins;
const ref = bode.referenceMargins;
const PM_MIN = 45;
const GM_MIN = 6;
// One scale for the scatter and the histogram, with room above the highest run.
const OVERSHOOT_MAX = Math.ceil(S.max / 5) * 5;

const points = runs.map((r) => ({
  x: r.kp,
  y: r.overshoot,
  label: r.id,
  group: r.overshoot > OVERSHOOT_USL ? 'fail' : 'pass',
}));

/** The bench feed: a 1 kHz simulation pushed in 20 ms batches, as a WebSocket would deliver it. */
function useBench() {
  // Six seconds of history up front, so the charts open full.
  const [{ stream, bench }] = React.useState(() => {
    const s = createStream(['command', 'torque', 'current'], 12_000);
    const b = createBench();
    for (let k = 0; k < 6000; k++) {
      const v = b(1);
      s.push(v.t, [v.command, v.torque, v.current]);
    }
    return { stream: s, bench: b };
  });
  React.useEffect(() => {
    const id = setInterval(() => {
      for (let k = 0; k < 20; k++) {
        const s = bench(1);
        stream.push(s.t, [s.command, s.torque, s.current]);
      }
    }, 20);
    return () => clearInterval(id);
  }, [stream, bench]);
  return stream;
}

function LiveBench() {
  const stream = useBench();
  const [paused, setPaused] = React.useState(false);
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <CardTitle level={2}>Live bench</CardTitle>
          <CardDescription>A {TARGET} N·m step every 1.5 s, sampled at 1 kHz</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-label font-normal text-muted-foreground">
            <StatusDot tone={paused ? 'neutral' : 'success'} />
            {paused ? 'Paused' : 'Live'}
          </span>
          <Button size="sm" onClick={() => setPaused((p) => !p)}>
            {paused ? <PlayIcon aria-hidden="true" /> : <PauseIcon aria-hidden="true" />}
            {paused ? 'Resume' : 'Pause'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 xl:grid-cols-2">
        <StreamChart
          stream={stream}
          paused={paused}
          window={6000}
          yDomain={[-4, 16]}
          yTicks={[0, 4, 8, 12, 16]}
          series={[
            { channel: 'command', label: 'Command', tone: 'faint', width: 1, unit: 'N·m' },
            { channel: 'torque', label: 'Torque', unit: 'N·m', digits: 2 },
          ]}
          limits={[
            {
              value: TORQUE_LIMIT,
              label: `Overshoot limit ${fmt.n1.format(TORQUE_LIMIT)} N·m`,
              channel: 'torque',
            },
          ]}
          height={180}
          ariaLabel={`Live output torque against the command. Each step overshoots past the ${fmt.n1.format(TORQUE_LIMIT)} N·m limit before settling.`}
        />
        <StreamChart
          stream={stream}
          paused={paused}
          window={6000}
          yDomain={[0, 40]}
          yTicks={[0, 10, 20, 30, 40]}
          series={[{ channel: 'current', label: 'Phase current', unit: 'A', tone: 'chart-2' }]}
          limits={[{ value: CURRENT_LIMIT, label: `Limit ${CURRENT_LIMIT} A`, channel: 'current' }]}
          height={180}
          ariaLabel={`Live phase current. It peaks near 30 A on each step; load bumps sometimes push it past the ${CURRENT_LIMIT} A limit.`}
        />
      </CardContent>
    </Card>
  );
}

export function Tuning() {
  const toast = useToast();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const queueRetune = () =>
    toast.add({
      title: 'Retune queued on Bench 3',
      description: 'Kp 3.60, Kd 0.09. Starts after the current run.',
    });
  return (
    <AppShell sidebar={<LabSidebar current="tuning" onSearch={() => setPaletteOpen(true)} />}>
      <AppToolbar>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-body">
          {/* The actuator list isn't part of this demo, so the trail names it without linking to nowhere. */}
          <span className="text-muted-foreground">Actuators</span>
          <ChevronRightIcon className="size-3.5 shrink-0 text-subtle-foreground" aria-hidden="true" />
          <span aria-current="page" className="truncate">
            RA-14 hip pitch
          </span>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline">Synthetic data</Badge>
          <ThemeToggle />
        </div>
      </AppToolbar>

      <main className="flex w-full max-w-[1400px] flex-col gap-5 px-4 pt-5 pb-16 sm:px-6 lg:pt-6">
        <PageHeader
          eyebrow="Bench 3 · firmware 4.18.2 · R-0412 against R-0409"
          title="Loop tuning"
          description="The high-gain tune responds faster but gives up phase margin, and the overshoot shows it."
          actions={
            <Button variant="primary" onClick={queueRetune}>
              <RotateCcwIcon aria-hidden="true" />
              Queue retune run
            </Button>
          }
        />

        {/* Failing checks first, then the one near its limit, then what passed: the eye meets the problem first. */}
        <MetricGroup
          aria-label="Loop health"
          className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 [&>:first-child]:col-span-2 sm:[&>:first-child]:col-span-1"
        >
          <Metric
            label="Overshoot Cpk"
            value={nf(2).format(S.cpk)}
            status={S.cpk < 1 ? 'fail' : S.cpk < CAPABLE ? 'warn' : 'pass'}
            progress={S.cpk / 2}
            limit={CAPABLE / 2}
            limitLabel={`Target ≥ ${CAPABLE} · Ppk ${nf(2).format(S.ppk)}`}
          />
          <Metric
            label="Runs over limit"
            value={S.over}
            unit={`of ${S.n}`}
            status={S.over ? 'fail' : 'pass'}
            limitLabel={`${nf(1).format((100 * S.over) / S.n)} % of runs over ${OVERSHOOT_USL} %`}
          />
          <Metric
            label="Phase margin"
            value={nf(0).format(m.phaseMargin)}
            unit="°"
            status={m.phaseMargin < PM_MIN ? 'fail' : m.phaseMargin < PM_MIN + 5 ? 'warn' : 'pass'}
            progress={m.phaseMargin / 90}
            limit={PM_MIN / 90}
            limitLabel={`Limit ≥ ${PM_MIN}°`}
            hint={`Was ${nf(0).format(ref.phaseMargin)}° on R-0409`}
          />
          <Metric
            label="Gain margin"
            value={nf(1).format(m.gainMargin)}
            unit="dB"
            status={m.gainMargin < GM_MIN ? 'fail' : 'pass'}
            progress={m.gainMargin / 40}
            limit={GM_MIN / 40}
            limitLabel={`Limit ≥ ${GM_MIN} dB`}
          />
          <Metric
            label="Crossover"
            value={nf(1).format(m.gainCrossover)}
            unit="Hz"
            hint={`Was ${nf(1).format(ref.gainCrossover)} Hz on R-0409`}
          />
        </MetricGroup>

        <LiveBench />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-0.5">
                <CardTitle level={2}>Frequency response</CardTitle>
                <CardDescription>Open loop, R-0412 against the R-0409 reference</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <FrequencyChart
                frequency={bode.frequency}
                magnitude={[
                  { id: 'ref', label: 'R-0409', values: bode.reference.magnitude, tone: 'muted', width: 1.5 },
                  { id: 'cur', label: 'R-0412', values: bode.current.magnitude },
                ]}
                phase={[
                  { id: 'ref', label: 'R-0409', values: bode.reference.phase, tone: 'muted', width: 1.5 },
                  { id: 'cur', label: 'R-0412', values: bode.current.phase },
                ]}
                magnitudeDomain={[-80, 30]}
                magnitudeTicks={[-60, -40, -20, 0, 20]}
                phaseDomain={[-315, -45]}
                phaseTicks={[-270, -180, -90]}
                references={{ magnitude: [0], phase: [-180] }}
                markers={[{ frequency: m.gainCrossover, label: `${nf(1).format(m.gainCrossover)} Hz` }]}
                spans={[
                  {
                    pane: 'phase',
                    frequency: m.gainCrossover,
                    from: -180,
                    to: m.phaseAtCrossover,
                    label: `PM ${nf(0).format(m.phaseMargin)}°`,
                  },
                  {
                    pane: 'magnitude',
                    frequency: m.phaseCrossover,
                    from: m.magnitudeAtPhaseCrossover,
                    to: 0,
                    label: `GM ${nf(1).format(m.gainMargin)} dB`,
                  },
                ]}
                paneHeight={160}
                ariaLabel={`Bode plot. R-0412 crosses 0 dB at ${nf(1).format(m.gainCrossover)} Hz with ${nf(0).format(m.phaseMargin)}° of phase margin, down from ${nf(0).format(ref.phaseMargin)}° on R-0409. Gain margin is ${nf(0).format(m.gainMargin)} dB.`}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-0.5">
                <CardTitle level={2}>Vibration</CardTitle>
                <CardDescription>Output flange, 2 s capture during R-0412</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <FrequencyChart
                frequency={spectrum.frequency}
                magnitude={[{ id: 'acc', label: 'Acceleration', values: spectrum.magnitude }]}
                magnitudeDomain={[-90, -10]}
                magnitudeTicks={[-80, -60, -40, -20]}
                magnitudeUnit="dB re 1 g"
                peaks={spectrum.peaks.filter((p) => p.value > -30)}
                paneHeight={300}
                ariaLabel="Vibration spectrum. The gearbox resonance at 182 Hz stands about 20 dB above everything else."
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-0.5">
                <CardTitle level={2}>Gain against overshoot</CardTitle>
                <CardDescription>Every step test on RA-14 since firmware 4.16</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ScatterChart
                points={points}
                groups={[
                  { id: 'fail', label: 'Over limit', tone: 'critical' },
                  { id: 'pass', label: 'Within limit', tone: 'muted' },
                ]}
                xDomain={[1.5, 4.75]}
                yDomain={[0, OVERSHOOT_MAX]}
                xLabel="Kp"
                yLabel="Overshoot"
                yUnit="%"
                limits={[{ axis: 'y', value: OVERSHOOT_USL, label: `Limit ${OVERSHOOT_USL} %` }]}
                highlight="R-0412"
                fit
                height={260}
                ariaLabel={`Overshoot rises with Kp across ${runs.length} runs; every run over the ${OVERSHOOT_USL} % limit has Kp of ${fmt.n2.format(S.minKpOver)} or more. R-0412, at Kp ${fmt.n2.format(gains.kp)}, overshoots ${fmt.n1.format(M.overshoot)} %.`}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-0.5">
                <CardTitle level={2}>Overshoot across runs</CardTitle>
                <CardDescription>Against the {OVERSHOOT_USL} % limit and the 5 % target</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Histogram
                values={runs.map((r) => r.overshoot)}
                domain={[0, OVERSHOOT_MAX]}
                binWidth={1}
                upper={OVERSHOOT_USL}
                target={5}
                marker={{ value: M.overshoot, label: 'R-0412' }}
                normal
                xLabel="Overshoot"
                unit="%"
                height={240}
                ariaLabel={`Overshoot of ${S.n} runs: ${S.over} exceed the ${OVERSHOOT_USL} % limit, and Cpk is ${nf(2).format(S.cpk)}, so the process is not capable at these gains. R-0412 is at ${fmt.n1.format(M.overshoot)} %.`}
              />
            </CardContent>
          </Card>
        </div>
      </main>
      <LabPalette
        current="tuning"
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        actions={[
          {
            value: 'retune',
            label: 'Queue retune run',
            group: 'Actions',
            icon: <RotateCcwIcon />,
            onSelect: queueRetune,
          },
        ]}
      />
    </AppShell>
  );
}
