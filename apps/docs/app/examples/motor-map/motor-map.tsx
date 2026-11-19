'use client';

import * as React from 'react';
import { ChevronRightIcon, DownloadIcon } from 'lucide-react';
import { ThemeScope } from '@dtheo/ui/lib/theme';
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
import { Slider } from '@dtheo/ui/components/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@dtheo/ui/components/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@dtheo/ui/components/table';
import { useToast } from '@dtheo/ui/components/toast';
import { ChartLegend, Heatmap, LineChart, Sparkline } from '@dtheo/charts';
import { LabSidebar } from '../_shared/lab-sidebar';

// ---- Synthetic permanent-magnet traction motor (PM-220) ----
const T_MAX = 220; // N·m
const N_BASE = 5600; // rpm, end of constant torque
const N_MAX = 16000; // rpm
const P_PEAK = (T_MAX * N_BASE * Math.PI) / 30 / 1000; // kW at base speed
const peakTorque = (n: number) => (n <= N_BASE ? T_MAX : (T_MAX * N_BASE) / n);
const contTorque = (n: number) => 0.55 * peakTorque(n) * (n > 12000 ? 1 - (n - 12000) / 14000 : 1);

const inside = (n: number, t: number) => n > 0 && t > 0 && t <= peakTorque(n);

/** Losses in watts: copper ∝ T², iron ∝ n^1.6, friction and windage ∝ n, plus a constant. */
function losses(n: number, t: number) {
  const copper = 0.072 * t * t;
  const iron = 0.0021 * Math.pow(n, 1.6) * (0.4 + (0.6 * t) / T_MAX);
  const mech = 0.06 * n + 120;
  return copper + iron + mech;
}

function efficiency(n: number, t: number) {
  if (!inside(n, t)) return Number.NaN;
  const pOut = (t * n * Math.PI) / 30;
  return (100 * pOut) / (pOut + losses(n, t));
}

function totalLosses(n: number, t: number) {
  return inside(n, t) ? losses(n, t) / 1000 : Number.NaN;
}

/** Power factor: low at light load, highest mid-map, falling once field weakening starts above base speed. */
function powerFactor(n: number, t: number) {
  if (!inside(n, t)) return Number.NaN;
  const light = 0.3 * Math.exp(-t / 35);
  const weakening = n > N_BASE ? 0.16 * Math.pow((n - N_BASE) / (N_MAX - N_BASE), 1.4) : 0;
  return Math.max(0.55, 0.975 - light - weakening);
}

const speeds = Array.from({ length: 32 }, (_, i) => 500 + i * 500);
const torques = Array.from({ length: 22 }, (_, i) => 10 + i * 10);
const gridOf = (f: (n: number, t: number) => number) => torques.map((t) => speeds.map((n) => f(n, t)));
const grid = gridOf(efficiency);
const peakEff = Math.max(...grid.flat().filter(Number.isFinite));
const lossGrid = gridOf(totalLosses);
const maxLoss = Math.max(...lossGrid.flat().filter(Number.isFinite));

const envelopeX = Array.from({ length: 161 }, (_, i) => i * 100);
const envelopePeak = envelopeX.map((n) => (n === 0 ? T_MAX : peakTorque(n)));
const envelopeCont = envelopeX.map((n) => (n === 0 ? contTorque(1) : contTorque(n)));

const sweeps = [
  // SW-118 is the sweep on screen: its trend peaks at the map's computed peak.
  {
    id: 'SW-118',
    label: 'Full map, 65 °C coolant',
    points: 704,
    eff: [93.1, 94.0, 94.8, 95.3, 95.6, peakEff, 95.7, 95.4],
    when: 'Today, 09:40',
    status: 'current',
  },
  {
    id: 'SW-117',
    label: 'High speed, field weakening',
    points: 212,
    eff: [91.2, 92.4, 93.0, 93.3, 93.1, 92.6, 92.0, 91.1],
    when: 'Yesterday',
    status: 'ok',
  },
  {
    id: 'SW-116',
    label: 'Full map, 90 °C coolant',
    points: 468,
    eff: [92.0, 92.9, 93.6, 94.1, 94.4, 94.5, 94.3, 94.0],
    when: '16 Nov',
    status: 'warn',
  },
  {
    id: 'SW-115',
    label: 'Low speed, high torque',
    points: 144,
    eff: [88.0, 90.6, 92.1, 93.0, 93.4, 93.5, 93.3, 93.0],
    when: '14 Nov',
    status: 'ok',
  },
];

const nf = (d: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

/** The three maps the selector offers, each computed from the same motor model. */
const quantities = {
  efficiency: {
    label: 'Efficiency',
    unit: '%',
    digits: 1,
    grid,
    domain: [86, Math.ceil(peakEff)] as [number, number],
    at: efficiency,
    summary: `Peak ${nf(1).format(peakEff)} % at mid speed and mid torque.`,
  },
  losses: {
    label: 'Total losses',
    unit: 'kW',
    digits: 2,
    grid: lossGrid,
    domain: [0, Math.ceil(maxLoss)] as [number, number],
    at: totalLosses,
    summary: `Losses grow with torque and speed, up to ${nf(1).format(maxLoss)} kW at the envelope.`,
  },
  'power-factor': {
    label: 'Power factor',
    unit: '',
    digits: 2,
    grid: gridOf(powerFactor),
    domain: [0.6, 1] as [number, number],
    at: powerFactor,
    summary: 'Power factor is highest mid-map and falls at light load and in field weakening.',
  },
};
type Quantity = keyof typeof quantities;
const maps = (Object.keys(quantities) as Quantity[]).map((value) => ({
  value,
  label: quantities[value].label,
}));
const SWEEP = sweeps[0]!;

export function MotorMap() {
  const toast = useToast();
  const [quantity, setQuantity] = React.useState<Quantity>('efficiency');
  const q = quantities[quantity];
  const [speed, setSpeed] = React.useState(7400);
  const [torque, setTorque] = React.useState(120);
  const maxAtSpeed = peakTorque(speed);
  const clampedTorque = Math.min(torque, maxAtSpeed);
  const pointEff = efficiency(speed, clampedTorque);
  const pointValue = q.at(speed, clampedTorque);
  const fmtQ = (v: number) =>
    Number.isFinite(v) ? `${nf(q.digits).format(v)}${q.unit ? ` ${q.unit}` : ''}` : '–';
  const power = (clampedTorque * speed * Math.PI) / 30 / 1000;

  return (
    <ThemeScope mode="dark" preset="flight-deck">
      <AppShell sidebar={<LabSidebar current="motors" />}>
        <AppToolbar>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-body">
            <a href="#maps" className="text-muted-foreground hover:text-foreground">
              Motor maps
            </a>
            <ChevronRightIcon className="size-3.5 shrink-0 text-subtle-foreground" aria-hidden="true" />
            <span aria-current="page" className="truncate font-mono text-label">
              PM-220
            </span>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex">
              Flight deck preset
            </Badge>
            <Badge variant="outline">Synthetic data</Badge>
          </div>
        </AppToolbar>

        <main className="flex w-full max-w-[1400px] flex-col gap-5 px-4 pt-5 pb-16 sm:px-6 lg:pt-6">
          <PageHeader
            eyebrow={`Dyno 2 · 400 V DC bus · 65 °C coolant · Sweep ${SWEEP.id} · ${SWEEP.points} points`}
            title={`PM-220 ${q.label.toLowerCase()} map`}
            description="Where the motor converts power best, and where your drive cycle actually operates."
            actions={
              <>
                <Select items={maps} value={quantity} onValueChange={(v) => setQuantity(v as Quantity)}>
                  <SelectTrigger aria-label="Map quantity" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {maps.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() =>
                    toast.add({
                      title: 'Map exported',
                      description: `pm-220-${SWEEP.id.toLowerCase()}-${quantity}.csv · ${SWEEP.points} points`,
                    })
                  }
                >
                  <DownloadIcon aria-hidden="true" />
                  Export
                </Button>
              </>
            }
          />

          <MetricGroup aria-label="Map summary">
            <Metric label="Peak efficiency" value={nf(1).format(peakEff)} unit="%" />
            <Metric
              label="At operating point"
              value={Number.isFinite(pointEff) ? nf(1).format(pointEff) : '–'}
              unit="%"
              status={pointEff < 90 ? 'warn' : 'none'}
            />
            <Metric label="Shaft power" value={nf(1).format(power)} unit="kW" progress={power / P_PEAK} />
            <Metric label="Peak torque" value={String(T_MAX)} unit="N·m" />
            <Metric
              label="Coolant ΔT"
              value="8.4"
              unit="K"
              status="warn"
              progress={8.4 / 12}
              limit={10 / 12}
              limitLabel="Limit ≤ 10 K"
            />
          </MetricGroup>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-0.5">
                  <CardTitle level={2}>{q.label}</CardTitle>
                  <CardDescription>
                    Shaft speed against torque, within the peak torque envelope
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <Heatmap
                  ariaLabel={`${q.label} map. ${q.summary} Operating point ${nf(0).format(speed)} rpm, ${nf(0).format(clampedTorque)} N·m: ${fmtQ(pointValue)}.`}
                  xValues={speeds}
                  yValues={torques}
                  values={q.grid}
                  domain={q.domain}
                  xTicks={[500, 4000, 8000, 12000, 16000]}
                  yTicks={[10, 60, 110, 160, 210]}
                  xLabel="Speed, rpm"
                  yLabel="Torque, N·m"
                  valueLabel={q.label}
                  valueUnit={q.unit}
                  digits={q.digits}
                  marker={{ x: speed, y: clampedTorque, label: fmtQ(pointValue) }}
                  height={320}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between text-label">
                      <span>Operating speed</span>
                      <span className="text-muted-foreground tabular-nums">{nf(0).format(speed)} rpm</span>
                    </div>
                    <Slider
                      aria-label="Operating speed"
                      value={speed}
                      onValueChange={(v) => setSpeed(v as number)}
                      min={500}
                      max={16000}
                      step={100}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between text-label">
                      <span>Operating torque</span>
                      <span className="text-muted-foreground tabular-nums">
                        {nf(0).format(clampedTorque)} N·m{torque > maxAtSpeed ? ' (envelope)' : ''}
                      </span>
                    </div>
                    <Slider
                      aria-label="Operating torque"
                      value={torque}
                      onValueChange={(v) => setTorque(v as number)}
                      min={10}
                      max={220}
                      step={1}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                Each cell is a 1 s dwell at constant speed and torque. Empty cells are outside the envelope.
              </CardFooter>
            </Card>

            <div className="flex min-w-0 flex-col gap-5">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-0.5">
                    <CardTitle level={2}>Torque–speed envelope</CardTitle>
                    <CardDescription>
                      Constant torque to {nf(0).format(N_BASE)} rpm, then constant power (
                      {nf(0).format(P_PEAK)} kW)
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pt-2">
                  <ChartLegend
                    items={[
                      { label: 'Peak, 10 s', tone: 'primary' },
                      { label: 'Continuous', tone: 'muted' },
                    ]}
                  />
                  <LineChart
                    ariaLabel={`Torque–speed envelope. Peak torque ${T_MAX} N·m up to ${N_BASE} rpm, falling with constant power to ${nf(0).format(peakTorque(N_MAX))} N·m at ${N_MAX} rpm.`}
                    x={envelopeX}
                    yDomain={[0, 240]}
                    yTicks={[0, 60, 120, 180, 240]}
                    xTicks={[0, 4000, 8000, 12000, 16000]}
                    xUnit="rpm"
                    height={220}
                    formatX={(v) => `${nf(0).format(v)} rpm`}
                    series={[
                      {
                        id: 'cont',
                        label: 'Continuous',
                        values: envelopeCont,
                        tone: 'muted',
                        width: 1.5,
                        unit: 'N·m',
                        digits: 0,
                      },
                      {
                        id: 'peak',
                        label: 'Peak',
                        values: envelopePeak,
                        tone: 'primary',
                        width: 2,
                        unit: 'N·m',
                        digits: 0,
                      },
                    ]}
                    markers={[
                      {
                        x: speed,
                        y: clampedTorque,
                        label: `${nf(0).format(clampedTorque)} N·m`,
                        sublabel: `${nf(0).format(speed)} rpm`,
                        tone: 'primary',
                        placement: 'below',
                      },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle level={2}>Recent sweeps</CardTitle>
                  <CardAction>
                    <Badge variant="outline">4 of 118</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="px-0 pb-1">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Sweep</TableHead>
                        <TableHead className="w-28">Efficiency trend</TableHead>
                        <TableHead numeric>Peak</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sweeps.map((s) => (
                        <TableRow key={s.id} aria-selected={s.status === 'current' || undefined}>
                          <TableCell className="max-w-48 whitespace-normal">
                            <span className="font-mono text-label">{s.id}</span>
                            <span className="block truncate text-caption text-muted-foreground">
                              {s.label} · {s.when}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Sparkline
                              values={s.eff}
                              tone={
                                s.status === 'warn' ? 'warning' : s.status === 'current' ? 'primary' : 'muted'
                              }
                              ariaLabel={`${s.id} efficiency trend`}
                              height={22}
                            />
                          </TableCell>
                          <TableCell numeric>{nf(1).format(Math.max(...s.eff))} %</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </AppShell>
    </ThemeScope>
  );
}
