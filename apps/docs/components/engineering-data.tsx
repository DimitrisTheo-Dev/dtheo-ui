import * as React from 'react';
import { CheckIcon, XIcon } from 'lucide-react';
import { Badge } from '@dtheo/ui/components/badge';
import {
  Quantity,
  formatChange,
  formatDelta,
  formatQuantity,
  formatShareOfLimit,
  statusWords,
} from '@dtheo/ui/components/quantity';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@dtheo/ui/components/table';
import {
  CURRENT_LIMIT,
  OVERSHOOT_LIMIT,
  RISE_LIMIT,
  TEMP_LIMIT,
  WINDING_TEMP,
  bode,
  gains,
  measuredMetrics as M,
  referenceGains,
  referenceMetrics as R,
} from '@/lib/lab-data';
import { DocSection } from './doc-page';

/** A written-out pair: how the system writes a value, and the way it is not written. */
function DoDont({ items }: { items: Array<[good: React.ReactNode, bad: string, why: string]> }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-card">
      <Table aria-label="Write it like this, not like that">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Write</TableHead>
            <TableHead>Not</TableHead>
            <TableHead className="hidden sm:table-cell">Why</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(([good, bad, why]) => (
            <TableRow key={bad} className="hover:bg-transparent">
              <TableCell>
                <span className="inline-flex items-center gap-2">
                  <CheckIcon className="size-3.5 text-success-foreground" aria-hidden="true" />
                  <span className="sr-only">Write </span>
                  {good}
                </span>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <XIcon className="size-3.5 text-destructive-foreground" aria-hidden="true" />
                  <span className="sr-only">Not </span>
                  <span className="line-through decoration-subtle-foreground">{bad}</span>
                </span>
              </TableCell>
              <TableCell className="hidden whitespace-normal text-muted-foreground sm:table-cell">
                {why}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Rules({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="docs-prose flex list-disc flex-col gap-1 pl-5 marker:text-subtle-foreground">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/** Decimals per quantity: set by what the sensor resolves, the same on every screen that shows it. */
const precision: Array<[quantity: string, unit: string, digits: string, why: string]> = [
  ['Torque', 'N·m', '2 in samples, 1 in summaries', 'The load cell resolves 0.01 N·m'],
  ['Phase current', 'A', '1', 'The shunt resolves 0.1 A'],
  ['Time after a step', 'ms', '0', 'Sampled at 1 kHz: 1 ms is the resolution'],
  ['Overshoot, efficiency', '%', '1', 'A tenth of a point changes a decision; a hundredth never does'],
  ['Winding temperature', '°C', '1', 'Thermocouple class 1'],
  ['Controller gains', '', '2', 'As the firmware stores them'],
  ['Phase margin', '°', '0', 'Read from a 260-point sweep'],
  ['Gain margin', 'dB', '1', 'Read from the same sweep'],
];

/** The words the tools use, so the same thing has the same name on every screen and in every export. */
const words: Array<[say: string, not: string, because: string]> = [
  ['Run', 'Test, job, execution', 'One profile, executed once on one bench'],
  ['Check', 'Criterion, test', 'One measured value held to one limit'],
  ['Limit', 'Threshold, spec, max', 'The number a check holds a value to, written next to it'],
  ['Near limit', 'Warning', 'A warning is the software’s word; this is a measurement'],
  ['Fail', 'Error', 'An error is the software failing; a run fails a check'],
  ['Review', 'Flagged, yellow', 'A run that passed with a check near its limit'],
  ['Reference run', 'Baseline, golden run', 'The run others are compared against'],
  ['No data', 'N/A, 0, null', 'Says nothing was measured, without implying a value'],
];

/**
 * The guide to engineering data: units, precision, differences, limits, status, missing data, time, files and
 * words. Every specimen is drawn by the Quantity component and the format functions, so the page cannot disagree
 * with the code.
 */
export function EngineeringDataFoundation() {
  return (
    <>
      <DocSection
        title="Units"
        description="The SI symbol after a no-break space. The unit is quieter than the value."
      >
        <DoDont
          items={[
            [
              <Quantity key="a" value={M.overshoot} unit="%" digits={1} />,
              '17.6%',
              'SI puts a space before %, as before any unit',
            ],
            [
              <Quantity key="b" value={WINDING_TEMP} unit="°C" digits={1} />,
              '71.2C',
              '°C is one symbol, after a space',
            ],
            [
              <Quantity key="c" value={12} unit="N·m" />,
              '12 Nm',
              'A middle dot joins the units of a product',
            ],
            [
              <Quantity key="d" value={bode.margins.phaseMargin} unit="°" />,
              '45 °',
              'An angle’s degree sign sits against the number',
            ],
            [
              <Quantity key="e" value={M.peakCurrent} unit="A" digits={1} />,
              '30.9 amps',
              'Symbols, not words, in the interface',
            ],
          ]}
        />
        <Rules
          items={[
            'In a table the unit goes in the column head, once. Cells hold numbers.',
            'A column keeps one unit: a current column is all A, never A and mA mixed.',
          ]}
        />
      </DocSection>

      <DocSection
        title="Precision"
        description="Decimals follow what the sensor resolves, never the space on screen. A summary may drop a decimal; nothing adds one."
      >
        <div className="overflow-hidden rounded-card border border-border bg-card">
          <Table aria-label="Decimals by quantity">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Decimals</TableHead>
                <TableHead className="hidden md:table-cell">Why</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {precision.map(([q, unit, digits, why]) => (
                <TableRow key={q} className="hover:bg-transparent">
                  <TableCell>{q}</TableCell>
                  <TableCell className="text-muted-foreground">{unit || '—'}</TableCell>
                  <TableCell className="tabular-nums">{digits}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{why}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Rules
          items={[
            'Fixed decimals, tabular figures, right-aligned: a column of values lines up on the point.',
            'One value, one spelling: R-0412 overshoots 17.6 % on every screen, and a test fails the build if one disagrees.',
          ]}
        />
      </DocSection>

      <DocSection
        title="Differences and change"
        description="A sign on every difference, a real minus, and points for the gap between two percentages."
      >
        <DoDont
          items={[
            [
              formatDelta(M.overshoot - OVERSHOOT_LIMIT, '%', { digits: 1 }),
              '+7.6 %',
              '17.6 % against a 10 % limit is 7.6 points over; 7.6 % over would be 10.76 %',
            ],
            [
              formatChange(referenceGains.kp, gains.kp),
              '+0.5',
              'Kp 2.80 → 4.20 is a relative change, in percent',
            ],
            [
              formatDelta(R.overshoot - M.overshoot, '%', { digits: 1 }),
              '-13.7 points',
              'A minus sign (−), not a hyphen (-)',
            ],
            [
              formatShareOfLimit(M.peakCurrent, CURRENT_LIMIT),
              '0.97',
              'Near a limit, the share of it reads at a glance',
            ],
          ]}
        />
      </DocSection>

      <DocSection
        title="Limits and status"
        description="One rule for every check: past the limit fails, above 90 % of it is near the limit. Status is an icon and a word, never color alone."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2.5 rounded-card border border-border bg-card p-4 text-body">
            {(
              [
                ['Overshoot', M.overshoot, '%', 1, OVERSHOOT_LIMIT],
                ['Peak current', M.peakCurrent, 'A', 1, CURRENT_LIMIT],
                ['Winding temp', WINDING_TEMP, '°C', 1, TEMP_LIMIT],
                ['Rise, 10–90 %', null, 'ms', 0, RISE_LIMIT],
              ] as const
            ).map(([label, value, unit, digits, max]) => (
              <div key={label} className="flex items-baseline justify-between gap-4">
                <span className="text-muted-foreground">{label}</span>
                <Quantity value={value} unit={unit} digits={digits} limit={{ max }} showLimit />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2.5 rounded-card border border-border bg-card p-4 text-body">
            <span className="flex items-center justify-between gap-4">
              <Badge variant="destructive">{statusWords.fail}</Badge>
              <span className="text-muted-foreground">Past the limit</span>
            </span>
            <span className="flex items-center justify-between gap-4">
              <Badge variant="warning">{statusWords.warn}</Badge>
              <span className="text-muted-foreground">Above 90 % of it</span>
            </span>
            <span className="flex items-center justify-between gap-4">
              <Badge variant="success">{statusWords.pass}</Badge>
              <span className="text-muted-foreground">Inside it</span>
            </span>
            <span className="flex items-center justify-between gap-4">
              <Badge variant="outline">{statusWords.missing}</Badge>
              <span className="text-muted-foreground">Not measured: not passed</span>
            </span>
          </div>
        </div>
        <Rules
          items={[
            'Write the limit next to the value, or under its column head: “≤ 32 A”.',
            'A run with any failing check fails; with any check near its limit it goes to review.',
            'On a chart the limit is a dashed, labeled line, and the part of a trace past it is shaded.',
            'Red is for failure only. If everything passes, the screen is nearly gray.',
          ]}
        />
      </DocSection>

      <DocSection
        title="Missing data"
        description="A dash for the eye, “No data” for a screen reader, and the reason where the data would be."
      >
        <Rules
          items={[
            'Never 0 for a value that was not measured, and never a pass: the check is open.',
            'Say why in the space the chart would fill: “Phase current was not recorded. Bench 3’s shunt did not report.”',
            'Say what still holds: “Torque, overshoot, settling and rise are complete.”',
          ]}
        />
      </DocSection>

      <DocSection title="Time" description="Lab local time, 24-hour, as precise as the decision needs.">
        <DoDont
          items={[
            [
              '18 Nov, 14:32',
              '11/18/26 2:32 PM',
              'Day before month in words reads the same in every country',
            ],
            ['18 Nov 2026, 14:32', 'Wednesday', 'A run’s own page states the year'],
            ['2026-11-18T14:32', '18 Nov, 14:32', 'Files and URLs use ISO 8601, which sorts'],
            [formatQuantity(203, 'ms'), '0.203 s', 'Milliseconds below a second, seconds above'],
          ]}
        />
      </DocSection>

      <DocSection
        title="In files"
        description="Exports are read by scripts, so they carry no formatting: a dot for decimals, no separators, no units in cells."
      >
        <pre className="overflow-x-auto rounded-card border border-border bg-card p-4 font-mono text-label">
          {`run,started_at,overshoot_pct,peak_current_A,settle_ms,result
R-0412,2026-11-18T14:32,17.6038,30.9145,203,fail`}
        </pre>
        <Rules
          items={[
            'The unit goes in the column name: overshoot_pct, peak_current_A, torque_Nm.',
            'Full precision in the file; rounding is for the screen.',
          ]}
        />
      </DocSection>

      <DocSection
        title="Words"
        description="Each thing has one name across every tool, every export and every message."
      >
        <div className="overflow-hidden rounded-card border border-border bg-card">
          <Table aria-label="Terms">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Say</TableHead>
                <TableHead>Not</TableHead>
                <TableHead className="hidden md:table-cell">Because</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {words.map(([say, not, because]) => (
                <TableRow key={say} className="hover:bg-transparent">
                  <TableCell className="font-medium">{say}</TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">{not}</TableCell>
                  <TableCell className="hidden whitespace-normal text-muted-foreground md:table-cell">
                    {because}
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

/** The same guide as Markdown, for agents and the .md mirror. */
export const engineeringDataMarkdown = [
  '# Engineering data',
  '',
  '> How the tools write a number: its unit, its precision, its limit and its status, one way on every screen. Use the `Quantity` component and the format functions in `@dtheo/ui/components/quantity` instead of writing these by hand.',
  '',
  '## Units',
  '',
  '- The SI symbol after a no-break space: `17.6 %`, `30.9 A`, `71.2 °C`, `12 N·m`. An angle’s degree sign sits against the number: `45°`.',
  '- In a table the unit goes in the column head, once; cells hold numbers. The unit is quieter than the value.',
  '',
  '## Precision',
  '',
  '| Quantity | Unit | Decimals | Why |',
  '| --- | --- | --- | --- |',
  ...precision.map(([q, u, d, w]) => `| ${q} | ${u || '—'} | ${d} | ${w} |`),
  '',
  'Fixed decimals, tabular figures, right-aligned. One value has one spelling on every screen.',
  '',
  '## Differences and change',
  '',
  '- Every difference is signed and uses a real minus (−).',
  `- The gap between two percentages is in points: ${formatDelta(M.overshoot - OVERSHOOT_LIMIT, '%', { digits: 1 })}, not +7.6 %.`,
  `- A relative change is in percent: Kp 2.80 → 4.20 is ${formatChange(referenceGains.kp, gains.kp)}.`,
  `- Near a limit, state the share of it: ${formatShareOfLimit(M.peakCurrent, CURRENT_LIMIT)}.`,
  '',
  '## Limits and status',
  '',
  '- One rule (`limitStatus`): past the limit fails; above 90 % of it is near the limit.',
  `- Words: ${statusWords.fail}, ${statusWords.warn}, ${statusWords.pass}, ${statusWords.missing}. A run with a near-limit check goes to Review.`,
  '- Status is an icon and a word, never color alone. Red is for failure only.',
  '- Write the limit next to the value (“≤ 32 A”). On charts, a dashed labeled line; the part past it is shaded.',
  '',
  '## Missing data',
  '',
  '- A dash for the eye and “No data” for screen readers. Never 0, never a pass: the check is open.',
  '- Say why where the data would be, and what still holds.',
  '',
  '## Time',
  '',
  '- Lab local time, 24-hour: `18 Nov, 14:32` in lists, `18 Nov 2026, 14:32` on a run’s page, ISO 8601 (`2026-11-18T14:32`) in files and URLs.',
  '- Milliseconds below a second, seconds above.',
  '',
  '## In files',
  '',
  '- Plain numbers with a dot, no separators, no units in cells; the unit goes in the column name (`peak_current_A`). Full precision; rounding is for the screen.',
  '',
  '## Words',
  '',
  '| Say | Not | Because |',
  '| --- | --- | --- |',
  ...words.map(([s, n, b]) => `| ${s} | ${n} | ${b} |`),
  '',
].join('\n');
