// dtheo-check-disable-file arbitrary-radius -- the concentric-corners demo exaggerates radii (16, 8, 4) to teach the rule.
import * as React from 'react';
import { colorRoles, contrastPairs, foundation, presets, type ColorScheme } from '@dtheo/tokens';
import contrast from '@dtheo/tokens/contrast.json';
import { ThemeScope } from '@dtheo/ui/lib/theme';
import { Button } from '@dtheo/ui/components/button';
import { Badge } from '@dtheo/ui/components/badge';
import { Input } from '@dtheo/ui/components/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@dtheo/ui/components/table';
import { CircleCheckIcon, CircleXIcon, TriangleAlertIcon } from 'lucide-react';
import { DocSection } from './doc-page';
import { AlignmentWorkbench, MotionDemos } from './foundations-client';

const purpose: Partial<Record<(typeof colorRoles)[number], string>> = {
  background: 'Window and page canvas',
  foreground: 'Primary text',
  card: 'Grouped surfaces',
  popover: 'Menus, popovers, tooltips',
  primary: 'The one primary action, selection',
  secondary: 'Secondary buttons, segmented tracks',
  muted: 'Subtle fills, read-only fields',
  'muted-foreground': 'Secondary text',
  'subtle-foreground': 'Captions, axis labels, placeholders',
  accent: 'Hover and pressed fills',
  selection: 'Selected rows and text',
  destructive: 'Destructive fills',
  'destructive-foreground': 'Error and failure text',
  success: 'Success icons and marks',
  'success-foreground': 'Success text',
  warning: 'Warning icons and marks',
  'warning-foreground': 'Warning text',
  info: 'Information icons and marks',
  border: 'Hairlines between groups',
  'border-strong': 'Outlines that need presence',
  input: 'Field boundaries (≥ 3:1)',
  ring: 'Keyboard focus (≥ 3:1)',
  sidebar: 'Translucent sidebar material',
  'chart-1': 'The series the story is about',
  'chart-muted': 'Reference series',
  'chart-grid': 'Chart gridlines',
};

function Swatch({ value, ground }: { value: string; ground: string }) {
  return (
    <span
      className="inline-grid size-5 shrink-0 place-items-center rounded-item shadow-[inset_0_0_0_1px_var(--border)]"
      style={{ background: ground }}
    >
      <span className="size-5 rounded-item" style={{ background: value }} />
    </span>
  );
}

function RatioCell({ r }: { r?: { ratio: number; ok: boolean } }) {
  if (!r) return '–';
  return (
    <span className={`inline-flex items-center gap-1 ${r.ok ? '' : 'text-destructive-foreground'}`}>
      {r.ok ? (
        <CircleCheckIcon className="size-3.5 text-success" aria-label="Pass" />
      ) : (
        <TriangleAlertIcon className="size-3.5" aria-label="Fail" />
      )}
      {r.ratio.toFixed(2)}
    </span>
  );
}

export function ColorFoundation() {
  const g = presets[0]!;
  const light = g.modes.light as ColorScheme;
  const dark = g.modes.dark as ColorScheme;
  const rows = contrast as Array<{
    preset: string;
    mode: string;
    pair: string;
    ratio: number;
    min: number;
    ok: boolean;
    note: string;
  }>;
  const passed = rows.filter((r) => r.ok).length;
  return (
    <>
      <DocSection
        title="Presets"
        description="The same components in three characters. Pick one per tool; the suite still reads as one family."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {presets.map((p) => (
            <ThemeScope
              key={p.id}
              mode="dark"
              preset={p.id as 'graphite'}
              className="flex flex-col gap-3 rounded-card border border-border p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-headline">{p.name}</span>
                <code className="text-caption text-subtle-foreground">{p.id}</code>
              </div>
              <p className="min-h-12 text-label font-normal text-muted-foreground">{p.description}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="primary">
                  Queue run
                </Button>
                <Button size="sm">Compare</Button>
                <Badge variant="destructive">
                  <CircleXIcon aria-hidden="true" />
                  Fail
                </Badge>
              </div>
              <div className="flex gap-1">
                {(
                  [
                    'background',
                    'card',
                    'popover',
                    'primary',
                    'chart-1',
                    'chart-muted',
                    'destructive-foreground',
                    'warning',
                  ] as const
                ).map((r) => (
                  <span
                    key={r}
                    title={r}
                    className="h-6 flex-1 rounded-item shadow-[inset_0_0_0_1px_var(--border)]"
                    style={{ background: `var(--${r})` }}
                  />
                ))}
              </div>
            </ThemeScope>
          ))}
        </div>
      </DocSection>

      <DocSection
        title="Roles"
        description="Graphite, both modes on one row. Components use role classes such as bg-card or text-muted-foreground, never values."
      >
        <div className="overflow-hidden rounded-card border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Role</TableHead>
                <TableHead>Light</TableHead>
                <TableHead>Dark</TableHead>
                <TableHead className="hidden md:table-cell">Use</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colorRoles.map((r) => (
                <TableRow key={r}>
                  <TableCell className="font-mono text-label">--{r}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <Swatch value={light[r]} ground={light.background} />
                      <code className="text-caption text-muted-foreground">
                        {light[r].replace('oklch', '')}
                      </code>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <Swatch value={dark[r]} ground={dark.background} />
                      <code className="text-caption text-muted-foreground">
                        {dark[r].replace('oklch', '')}
                      </code>
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {purpose[r] ?? ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DocSection>

      <DocSection
        title="Measured contrast"
        description={`${passed} of ${rows.length} declared pairs pass across all presets and modes. The token build fails if any pair drops below its minimum; translucent colors are composited over their real surface first.`}
      >
        <div className="overflow-hidden rounded-card border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Pair</TableHead>
                <TableHead className="hidden sm:table-cell">Use</TableHead>
                <TableHead numeric>Light</TableHead>
                <TableHead numeric>Dark</TableHead>
                <TableHead numeric>Needs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contrastPairs.map((p) => {
                const pair = `${p.fg} on ${p.bg}`;
                const l = rows.find((r) => r.preset === 'graphite' && r.mode === 'light' && r.pair === pair);
                const d = rows.find((r) => r.preset === 'graphite' && r.mode === 'dark' && r.pair === pair);
                return (
                  <TableRow key={pair}>
                    <TableCell className="font-mono text-label">{pair}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{p.note}</TableCell>
                    <TableCell numeric>
                      <RatioCell r={l} />
                    </TableCell>
                    <TableCell numeric>
                      <RatioCell r={d} />
                    </TableCell>
                    <TableCell numeric className="text-muted-foreground">
                      {p.min}:1
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DocSection>
    </>
  );
}

export function TypographyFoundation() {
  const samples: Record<string, string> = {
    display: 'Calm tools for hard data',
    'large-title': 'R-0412 High-gain step',
    'title-1': 'Actuator Lab',
    'title-2': 'Step response',
    'title-3': 'Queue a retune run',
    headline: 'Needs retune',
    prose: 'Overshoot is 7.6 points over the limit. Lower Kp, then rerun the step.',
    callout: 'Torque command 0 → 12 N·m at 20 ms',
    body: 'Phase current peaked at 97 % of its 32 A limit.',
    label: 'Peak current',
    caption: 'Sampled at 1 kHz · Bench 3',
  };
  return (
    <>
      <DocSection
        title="Roles"
        description="Use the role class (text-body, text-headline). Each sets size, line height, tracking and weight together."
      >
        <div className="flex flex-col overflow-hidden rounded-card border border-border bg-card">
          {Object.entries(foundation.text)
            .toReversed()
            .map(([role, [size, lh, track, weight]]) => (
              <div
                key={role}
                className="grid gap-x-6 gap-y-1 border-b border-border px-4 py-4 last:border-0 sm:grid-cols-[9rem_1fr]"
              >
                <div className="flex flex-col">
                  <code className="text-label text-foreground">text-{role}</code>
                  <span className="text-caption text-subtle-foreground tabular-nums">
                    {size}/{lh} · {weight} · {track}
                  </span>
                </div>
                <span className={`text-${role} min-w-0 text-balance`}>{samples[role]}</span>
              </div>
            ))}
        </div>
      </DocSection>
      <DocSection
        title="Greek and English"
        description="Accented capitals, long words and mixed scripts keep their rhythm."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 rounded-card border border-border bg-card p-4">
            <span className="text-title-3">Ροπή εξόδου και ρεύμα φάσης</span>
            <span className="text-body text-muted-foreground">
              Η υπερύψωση είναι 7,6 μονάδες πάνω από το όριο. Μειώστε το Kp και επαναλάβετε τη δοκιμή στον
              Πάγκο 3.
            </span>
          </div>
          <div className="flex flex-col gap-1.5 rounded-card border border-border bg-card p-4">
            <span className="text-title-3">ΑΠΟΤΥΧΙΑ ΕΛΕΓΧΟΥ · Ά Έ Ή Ί Ό Ύ Ώ</span>
            <span className="text-body text-muted-foreground">
              Benachrichtigungseinstellungen · Paramètres de sécurité · 1 284 δείγματα
            </span>
          </div>
        </div>
      </DocSection>
      <DocSection
        title="Numbers"
        description="Tabular figures where numbers stack and compare; proportional figures for a single large value. Units follow with a non-breaking space."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(['proportional-nums', 'tabular-nums'] as const).map((variant) => (
            <div key={variant} className="flex flex-col gap-2 rounded-card border border-border bg-card p-4">
              <code className="text-caption text-subtle-foreground">{variant}</code>
              <div className={`flex flex-col items-end text-callout ${variant}`}>
                <span>11.1 N·m</span>
                <span>14.08 N·m</span>
                <span>101.0 N·m</span>
                <span>7.7 N·m</span>
              </div>
            </div>
          ))}
        </div>
      </DocSection>
    </>
  );
}

export function GeometryFoundation() {
  return (
    <>
      <DocSection
        title="Alignment"
        description="Every control of a size shares one height, so a toolbar or a form row lines up without adjustment. The guides mark the shared edges."
      >
        <AlignmentWorkbench />
      </DocSection>
      <DocSection
        title="Concentric corners"
        description="A surface inset inside another uses the outer radius minus the inset, so the corners stay parallel. In code: rounded-item (popover − 4px) and rounded-inset (card − 4px)."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Outer 16px, inset 8px → inner 8px', inner: 'rounded-[8px]', ok: true },
            { label: 'Outer 16px, inset 8px → inner 4px: too sharp', inner: 'rounded-[4px]', ok: false },
            { label: 'Outer 16px, inset 8px → inner 16px: bulges', inner: 'rounded-[16px]', ok: false },
          ].map((d) => (
            <div key={d.label} className="flex flex-col gap-2">
              <div className="rounded-[16px] border border-border-strong bg-card p-2">
                <div className={`${d.inner} h-20 ${d.ok ? 'bg-selection' : 'bg-muted'}`} />
              </div>
              <span className="text-label font-normal text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
      </DocSection>
      <DocSection
        title="Borders, focus and elevation"
        description="One quiet 1px border at rest. Focus adds a ring outside the border; an invalid field keeps its 1px red border and gets a soft red ring, never a thick red frame."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Input defaultValue="4.20" aria-label="At rest" />
            <span className="text-label font-normal text-muted-foreground">At rest</span>
          </div>
          <div className="flex flex-col gap-2">
            <Input defaultValue="4.20" aria-label="Focused" className="border-ring ring-3 ring-ring/25" />
            <span className="text-label font-normal text-muted-foreground">Keyboard focus</span>
          </div>
          <div className="flex flex-col gap-2">
            <Input
              defaultValue="12.5"
              aria-label="Invalid and focused"
              aria-invalid="true"
              className="ring-3 ring-destructive-foreground/25"
            />
            <span className="text-label font-normal text-muted-foreground">Invalid and focused</span>
          </div>
        </div>
        <div className="grid gap-4 pt-2 sm:grid-cols-3">
          {(['raised', 'popover', 'dialog'] as const).map((s) => (
            <div
              key={s}
              className={`grid h-20 place-items-center rounded-card bg-popover text-label text-muted-foreground shadow-${s}`}
            >
              shadow-{s}
            </div>
          ))}
        </div>
      </DocSection>
    </>
  );
}

const curve = (p: string) =>
  (p.match(/[\d.]+/g) ?? ['0', '0', '1', '1']).map(Number) as [number, number, number, number];

export function MotionFoundation() {
  return (
    <>
      <DocSection title="Curves">
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(foundation.ease).map(([name, value]) => {
            const [x1, y1, x2, y2] = curve(value);
            const s = 120;
            return (
              <div key={name} className="flex flex-col gap-2 rounded-card border border-border bg-card p-4">
                <svg viewBox={`-8 -8 ${s + 16} ${s + 16}`} className="h-32 w-full" aria-hidden="true">
                  <rect x="0" y="0" width={s} height={s} className="fill-none stroke-chart-grid" />
                  <path
                    d={`M0 ${s} C ${x1 * s} ${s - y1 * s}, ${x2 * s} ${s - y2 * s}, ${s} 0`}
                    className="fill-none stroke-chart-1"
                    strokeWidth={2}
                  />
                  <line
                    x1="0"
                    y1={s}
                    x2={x1 * s}
                    y2={s - y1 * s}
                    className="stroke-subtle-foreground"
                    strokeDasharray="2 2"
                  />
                  <line
                    x1={s}
                    y1="0"
                    x2={x2 * s}
                    y2={s - y2 * s}
                    className="stroke-subtle-foreground"
                    strokeDasharray="2 2"
                  />
                </svg>
                <code className="text-label text-foreground">ease-{name}</code>
                <code className="text-caption text-subtle-foreground">{value}</code>
              </div>
            );
          })}
        </div>
      </DocSection>
      <DocSection
        title="Try it"
        description="Press feedback is immediate. Popovers grow from their trigger. Repeat actions and keyboard-opened surfaces do not animate at all."
      >
        <MotionDemos />
      </DocSection>
      <DocSection title="Durations">
        <div className="overflow-hidden rounded-card border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Token</TableHead>
                <TableHead numeric>Duration</TableHead>
                <TableHead>Used for</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(foundation.duration).map(([k, v]) => (
                <TableRow key={k}>
                  <TableCell className="font-mono text-label">--duration-{k}</TableCell>
                  <TableCell numeric>{v}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {
                      {
                        press: 'Button press and release',
                        hover: 'Hover and color changes',
                        popover: 'Menus, selects, popovers',
                        dialog: 'Dialogs and their backdrop',
                        toast: 'Toasts, slightly slower to feel elegant',
                      }[k]
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DocSection>
    </>
  );
}
