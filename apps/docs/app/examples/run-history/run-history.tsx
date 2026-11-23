'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRightIcon,
  CircleCheckIcon,
  CircleXIcon,
  Columns3Icon,
  DownloadIcon,
  GitCompareIcon,
  InboxIcon,
  RotateCcwIcon,
  SearchIcon,
  SearchXIcon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react';
import { AppShell, AppToolbar, PageHeader } from '@dtheo/ui/components/app-shell';
import { Button } from '@dtheo/ui/components/button';
import { Badge } from '@dtheo/ui/components/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@dtheo/ui/components/card';
import {
  DataTable,
  LimitValue,
  limitStatus,
  type DataTableColumn,
  type DataTableSort,
} from '@dtheo/ui/components/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@dtheo/ui/components/dialog';
import { Empty, EmptyActions, EmptyDescription, EmptyMedia, EmptyTitle } from '@dtheo/ui/components/empty';
import { Alert, AlertActions, AlertContent, AlertDescription, AlertTitle } from '@dtheo/ui/components/alert';
import { Input } from '@dtheo/ui/components/input';
import { InputGroup, InputGroupAddon } from '@dtheo/ui/components/input-group';
import { Kbd } from '@dtheo/ui/components/kbd';
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
} from '@dtheo/ui/components/menu';
import { Meter } from '@dtheo/ui/components/progress';
import { Separator } from '@dtheo/ui/components/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@dtheo/ui/components/table';
import { Skeleton } from '@dtheo/ui/components/skeleton';
import { SegmentedControl, SegmentedControlItem } from '@dtheo/ui/components/toggle-group';
import { useToast } from '@dtheo/ui/components/toast';
import { LabPalette } from '../_shared/lab-palette';
import { LabSidebar } from '../_shared/lab-sidebar';
import { PreviewStateMenu, usePreviewState } from '../_shared/preview-state';
import { ThemeToggle } from '@/components/theme-controls';
import { checkStatus, fmt, runChecks, runLog, type RunRow } from '@/lib/lab-data';

/** A run as this screen holds it: peak current can be missing when the phase shunt did not record. */
type Row = Omit<RunRow, 'current'> & { current: number | null };

const REVIEWED = 'R-0412';
const REFERENCE = 'R-0409';
const MAX_COMPARE = 4;

const resultMeta = {
  fail: { label: 'Fail', plural: 'failed', variant: 'destructive', Icon: CircleXIcon },
  review: { label: 'Review', plural: 'near a limit', variant: 'warning', Icon: TriangleAlertIcon },
  pass: { label: 'Pass', plural: 'passed', variant: 'success', Icon: CircleCheckIcon },
} as const;
const resultRank = { fail: 0, review: 1, pass: 2 } as const;

/** The same rule as the run review: any failing check fails the run, any check near its limit sends it to review. */
function resultOf(row: Row): Row['result'] {
  const s = runChecks.map((c) => (row[c.key] === null ? 'pass' : checkStatus(row[c.key]!, c.limit)));
  return s.includes('fail') ? 'fail' : s.includes('warn') ? 'review' : 'pass';
}

// ---------- Partial data: a sensor that stopped reporting for a stretch ----------

const SHUNT = { bench: 'Bench 1', from: '2026-10-26', to: '2026-11-07' };
const shuntOut = (r: RunRow) =>
  r.bench === SHUNT.bench && r.startedAt >= SHUNT.from && r.startedAt < SHUNT.to;
const partialRows: Row[] = runLog.map((r) => {
  if (!shuntOut(r)) return r;
  const row: Row = { ...r, current: null };
  return { ...row, result: resultOf(row) };
});
const missingCount = runLog.filter(shuntOut).length;

// ---------- Columns and the presets that pick them ----------

const n = (digits: 0 | 1 | 2) => [fmt.n0, fmt.n1, fmt.n2][digits]!.format;
const check = (key: (typeof runChecks)[number]['key'], header: string, width: number, digits: 0 | 1) => {
  const c = runChecks.find((x) => x.key === key)!;
  return {
    id: key,
    header,
    unit: c.unit,
    numeric: true,
    width,
    value: (r: Row) => r[key],
    format: n(digits),
    limit: { max: c.limit },
  } satisfies DataTableColumn<Row>;
};

const allColumns: Array<DataTableColumn<Row>> = [
  {
    id: 'id',
    header: 'Run',
    width: 88,
    sticky: true,
    value: (r) => r.id,
    cell: (r) => <span className="font-mono text-label">{r.id}</span>,
  },
  {
    id: 'started',
    header: 'Started',
    width: 120,
    value: (r) => r.startedAt,
    cell: (r) => <span className="text-muted-foreground tabular-nums">{r.started}</span>,
  },
  {
    id: 'profile',
    header: 'Profile',
    value: (r) => r.profile,
    cell: (r) => (
      <span className="flex min-w-0 items-baseline gap-1.5">
        {/* When space runs out the note gives way first, so the profile stays readable. */}
        <span className="min-w-8 truncate">{r.profile}</span>
        {r.note ? (
          <span className="min-w-0 shrink-[100] truncate text-caption text-subtle-foreground">{r.note}</span>
        ) : null}
      </span>
    ),
  },
  check('overshoot', 'Overshoot', 100, 1),
  check('current', 'Peak current', 108, 1),
  check('settle', 'Settling', 92, 0),
  check('rise', 'Rise', 76, 0),
  check('temp', 'Winding', 92, 1),
  { id: 'kp', header: 'Kp', numeric: true, width: 72, value: (r) => r.kp, format: n(2) },
  { id: 'ki', header: 'Ki', numeric: true, width: 72, value: (r) => r.ki, format: n(2) },
  { id: 'kd', header: 'Kd', numeric: true, width: 72, value: (r) => r.kd, format: n(2) },
  { id: 'bench', header: 'Bench', width: 96, value: (r) => r.bench },
  {
    id: 'firmware',
    header: 'Firmware',
    width: 96,
    value: (r) => r.firmware,
    cell: (r) => <span className="font-mono text-label">{r.firmware}</span>,
  },
  { id: 'operator', header: 'Operator', width: 128, value: (r) => r.operator },
  {
    id: 'result',
    header: 'Result',
    width: 96,
    // Sorted by severity, not by name: the first click puts failures on top.
    value: (r) => resultRank[r.result],
    cell: (r) => {
      const m = resultMeta[r.result];
      return (
        <Badge variant={m.variant}>
          <m.Icon aria-hidden="true" />
          {m.label}
        </Badge>
      );
    },
  },
];

/** Presets are named for the question they answer, not for the columns they hold. */
const presets = {
  checks: {
    label: 'Checks',
    columns: ['id', 'profile', 'overshoot', 'current', 'settle', 'rise', 'temp', 'result'],
  },
  tuning: {
    label: 'Tuning',
    columns: ['id', 'profile', 'kp', 'ki', 'kd', 'overshoot', 'settle', 'rise', 'result'],
  },
  setup: { label: 'Setup', columns: ['id', 'started', 'bench', 'firmware', 'operator', 'profile', 'result'] },
} as const;
type Preset = keyof typeof presets;

// ---------- Filters ----------

type FacetId = 'result' | 'profile' | 'bench' | 'firmware' | 'limits';
type Filters = Record<FacetId, string[]>;
const noFilters: Filters = { result: [], profile: [], bench: [], firmware: [], limits: [] };

const byCount = (rows: readonly Row[], of: (r: Row) => string) => {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(of(r), (counts.get(of(r)) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => ({ value: v, label: v }));
};

const facets: Array<{
  id: FacetId;
  label: string;
  /** What the menu is asking. */
  title: string;
  of: (r: Row) => string[];
  options: Array<{ value: string; label: string }>;
}> = [
  {
    id: 'result',
    label: 'Result',
    title: 'Result',
    of: (r) => [r.result],
    options: (['fail', 'review', 'pass'] as const).map((v) => ({ value: v, label: resultMeta[v].label })),
  },
  {
    id: 'limits',
    label: 'Limits',
    title: 'Over or near the limit on',
    of: (r) =>
      runChecks
        .filter((c) => r[c.key] !== null && checkStatus(r[c.key]!, c.limit) !== 'pass')
        .map((c) => c.key),
    options: runChecks.map((c) => ({ value: c.key, label: c.label })),
  },
  {
    id: 'profile',
    label: 'Profile',
    title: 'Test profile',
    of: (r) => [r.profile],
    options: byCount(runLog, (r) => r.profile),
  },
  {
    id: 'bench',
    label: 'Bench',
    title: 'Bench',
    of: (r) => [r.bench],
    options: byCount(runLog, (r) => r.bench).sort((a, b) => a.value.localeCompare(b.value)),
  },
  {
    id: 'firmware',
    label: 'Firmware',
    title: 'Firmware',
    of: (r) => [r.firmware],
    options: [...new Set(runLog.map((r) => r.firmware))].map((v) => ({ value: v, label: v })),
  },
];

function matches(r: Row, filters: Filters, query: string, except?: FacetId) {
  for (const f of facets) {
    if (f.id === except || filters[f.id].length === 0) continue;
    if (!f.of(r).some((v) => filters[f.id].includes(v))) return false;
  }
  if (!query) return true;
  return `${r.id} ${r.profile} ${r.note ?? ''} ${r.operator} ${r.bench} ${r.firmware}`
    .toLowerCase()
    .includes(query);
}

/** The filters "Filtered to nothing" applies: each is reasonable, together they match no run. */
const impossible: Filters = { ...noFilters, result: ['fail'], bench: ['Bench 5'], firmware: ['4.18.2'] };

function describeFilters(filters: Filters, query: string) {
  const parts = facets
    .filter((f) => filters[f.id].length)
    .map(
      (f) =>
        `${f.label}: ${filters[f.id].map((v) => f.options.find((o) => o.value === v)?.label ?? v).join(' or ')}`,
    );
  if (query) parts.unshift(`“${query}”`);
  return parts.join(' · ');
}

// ---------- Export ----------

const csvCell = (v: string | number | null | undefined) =>
  v === null || v === undefined
    ? ''
    : /[",\n]/.test(String(v))
      ? `"${String(v).replaceAll('"', '""')}"`
      : String(v);

function csv(rows: readonly Row[]) {
  const head =
    'run,started_at,profile,note,bench,firmware,operator,kp,ki,kd,overshoot_pct,peak_current_A,settle_ms,rise_ms,winding_temp_C,result';
  const lines = rows.map((r) =>
    [
      r.id,
      r.startedAt,
      r.profile,
      r.note,
      r.bench,
      r.firmware,
      r.operator,
      r.kp,
      r.ki,
      r.kd,
      r.overshoot,
      r.current,
      r.settle,
      r.rise,
      r.temp,
      r.result,
    ]
      .map(csvCell)
      .join(','),
  );
  return `${[head, ...lines].join('\n')}\n`;
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// ---------- The screen ----------

export function RunHistory() {
  const toast = useToast();
  const router = useRouter();
  const [preview, setPreview] = usePreviewState();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [ownFilters, setFilters] = React.useState<Filters>(noFilters);
  const [preset, setPreset] = React.useState<Preset | null>('checks');
  const [visible, setVisible] = React.useState<string[]>([...presets.checks.columns]);
  const [sort, setSort] = React.useState<DataTableSort | null>({ id: 'id', dir: 'desc' });
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(() => new Set());
  const [activeId, setActiveId] = React.useState<string | null>(REVIEWED);
  const [compareOpen, setCompareOpen] = React.useState(false);
  const [retrying, setRetrying] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);

  // "Filtered to nothing" is a set of filters that together match no run. While it is the state, those are the
  // filters; touching any of them makes the result live data again, starting from what was shown.
  const noResults = preview === 'no-results';
  const filters = noResults ? impossible : ownFilters;
  const q = noResults ? '' : query.trim().toLowerCase();

  const loading = preview === 'loading' || retrying;
  const source = preview === 'empty' ? noRows : preview === 'partial' ? partialRows : runLog;
  const rows = React.useMemo(() => source.filter((r) => matches(r, filters, q)), [source, filters, q]);
  const filtering = q !== '' || facets.some((f) => filters[f.id].length > 0);
  const columns = React.useMemo(() => allColumns.filter((c) => visible.includes(c.id)), [visible]);
  const rowById = React.useMemo(() => new Map(source.map((r) => [r.id, r])), [source]);
  const active = activeId ? rowById.get(activeId) : undefined;
  const comparing = [...selected].map((id) => rowById.get(id)).filter((r): r is Row => Boolean(r));

  const setFacet = (id: FacetId, values: string[]) => {
    setFilters({ ...filters, [id]: values });
    if (noResults) setPreview('live');
  };
  const clearFilters = () => {
    setFilters(noFilters);
    setQuery('');
    if (noResults) setPreview('live');
  };

  // "/" jumps to the search, as the hint in the field says.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== '/' || e.metaKey || e.ctrlKey || t?.closest('input, textarea, [contenteditable="true"]'))
        return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const retry = () => {
    setRetrying(true);
    setPreview('live');
    setTimeout(() => setRetrying(false), 700);
  };

  const exportRows = () => {
    download('ra-14-runs.csv', csv(rows));
    toast.add({
      title: 'Exported ra-14-runs.csv',
      description: `${fmt.n0.format(rows.length)} runs${filtering ? ', as filtered' : ''}, with every check and gain.`,
    });
  };

  const openRun = (r: Row) => {
    if (r.id === REVIEWED) router.push('/examples/run-review');
    else
      toast.add({
        title: `${r.id} has no full review in this demo`,
        description: `The panel beside the table shows its checks. Only ${REVIEWED} has a review page.`,
      });
  };

  const compareWith = (r: Row) => {
    const other = r.id === REFERENCE ? REVIEWED : REFERENCE;
    setSelected(new Set([r.id, other]));
    setCompareOpen(true);
  };

  const counts = { fail: 0, review: 0, pass: 0 };
  for (const r of rows) counts[r.result]++;

  return (
    <AppShell sidebar={<LabSidebar current="runs" onSearch={() => setPaletteOpen(true)} />}>
      <AppToolbar>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-body">
          <span aria-current="page" className="truncate text-foreground">
            Runs
          </span>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Badge variant="outline" className="hidden sm:inline-flex">
            Synthetic data
          </Badge>
          <Separator orientation="vertical" className="mx-1.5 hidden h-4 sm:block" />
          <PreviewStateMenu
            value={preview}
            onValueChange={setPreview}
            states={['live', 'loading', 'empty', 'no-results', 'error', 'partial']}
          />
          <ThemeToggle />
        </div>
      </AppToolbar>

      <main className="flex w-full max-w-[1600px] flex-col gap-5 px-4 pt-5 pb-10 sm:px-6 lg:pt-6 xl:h-[calc(100dvh-3rem)] xl:pb-6">
        <PageHeader
          eyebrow="RA-14 hip pitch · every run since firmware 4.16"
          title="Runs"
          actions={
            <Button onClick={exportRows} disabled={loading || preview === 'error' || rows.length === 0}>
              <DownloadIcon aria-hidden="true" />
              Export CSV
            </Button>
          }
        />

        <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] 2xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section
            aria-label="Run list"
            className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card"
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
              <InputGroup className="w-full sm:w-56">
                <InputGroupAddon>
                  <SearchIcon aria-hidden="true" />
                </InputGroupAddon>
                <Input
                  ref={searchRef}
                  aria-label="Search runs"
                  placeholder="Run, profile, note, operator"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (noResults) {
                      setFilters(impossible);
                      setPreview('live');
                    }
                  }}
                />
                <InputGroupAddon>
                  <Kbd>/</Kbd>
                </InputGroupAddon>
              </InputGroup>
              {facets.map((f) => (
                <FacetMenu
                  key={f.id}
                  facet={f}
                  value={filters[f.id]}
                  onValueChange={(v) => setFacet(f.id, v)}
                  // Each option counts the runs it would show with every other filter as it is.
                  counts={countOptions(source, f, filters, q)}
                />
              ))}
              {filtering ? (
                <Button variant="ghost" onClick={clearFilters}>
                  <XIcon aria-hidden="true" />
                  Clear
                </Button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
              <SegmentedControl
                aria-label="Column preset"
                value={preset ? [preset] : []}
                onValueChange={(v) => {
                  const p = v[0] as Preset | undefined;
                  if (!p) return;
                  setPreset(p);
                  setVisible([...presets[p].columns]);
                }}
              >
                {(Object.keys(presets) as Preset[]).map((p) => (
                  <SegmentedControlItem key={p} value={p}>
                    {presets[p].label}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
              <ColumnsMenu
                visible={visible}
                onVisibleChange={(v) => {
                  setVisible(v);
                  const match = (Object.keys(presets) as Preset[]).find(
                    (p) =>
                      presets[p].columns.length === v.length &&
                      presets[p].columns.every((c) => v.includes(c)),
                  );
                  setPreset(match ?? null);
                }}
                custom={preset === null}
              />
              <div className="ml-auto flex items-center gap-2" aria-live="polite">
                {selected.size ? (
                  <>
                    <span className="text-label font-normal text-muted-foreground tabular-nums">
                      {selected.size} selected
                      {compareHint(selected.size) ? (
                        <span className="text-subtle-foreground"> · {compareHint(selected.size)}</span>
                      ) : null}
                    </span>
                    <CompareButton count={selected.size} onClick={() => setCompareOpen(true)} />
                    <Button variant="ghost" onClick={() => setSelected(new Set())}>
                      Clear
                    </Button>
                  </>
                ) : (
                  <span className="hidden text-label font-normal text-subtle-foreground lg:inline">
                    Check runs to compare · Shift-click for a range
                  </span>
                )}
              </div>
            </div>

            {preview === 'partial' ? (
              <div className="border-b border-border p-3">
                <Alert variant="warning">
                  <AlertContent>
                    <AlertTitle>Peak current is missing for {missingCount} runs</AlertTitle>
                    <AlertDescription>
                      {SHUNT.bench}’s phase shunt did not report from 26 Oct to 6 Nov. Those runs show a dash,
                      and their current check is not counted in the result.
                    </AlertDescription>
                  </AlertContent>
                  <AlertActions>
                    <Button
                      size="sm"
                      onClick={() => {
                        setFilters({ ...noFilters, bench: [SHUNT.bench] });
                        setSort({ id: 'current', dir: 'asc' });
                      }}
                    >
                      Show {SHUNT.bench}
                    </Button>
                  </AlertActions>
                </Alert>
              </div>
            ) : null}

            {preview === 'error' ? (
              <div className="flex flex-1 items-start p-3">
                <Alert variant="destructive" className="w-full">
                  <AlertContent>
                    <AlertTitle>Runs could not be loaded</AlertTitle>
                    <AlertDescription>
                      The bench database did not answer within 10 s. Your search, filters and columns are
                      kept.
                    </AlertDescription>
                  </AlertContent>
                  <AlertActions>
                    <Button size="sm" onClick={retry}>
                      <RotateCcwIcon aria-hidden="true" />
                      Retry
                    </Button>
                  </AlertActions>
                </Alert>
              </div>
            ) : (
              <DataTable
                aria-label="Runs on RA-14 hip pitch"
                rows={rows}
                columns={columns}
                getRowId={getId}
                sort={sort}
                onSortChange={setSort}
                selected={selected}
                onSelectedChange={setSelected}
                activeId={activeId}
                onActiveChange={setActiveId}
                onRowOpen={openRun}
                loading={loading}
                className="h-[34rem] max-h-none xl:h-auto xl:min-h-0 xl:flex-1"
                empty={
                  preview === 'empty' ? (
                    <Empty className="py-16">
                      <EmptyMedia>
                        <InboxIcon aria-hidden="true" />
                      </EmptyMedia>
                      <EmptyTitle>No runs on RA-14 yet</EmptyTitle>
                      <EmptyDescription>
                        Runs appear here when a bench finishes a test profile on this actuator.
                      </EmptyDescription>
                      <EmptyActions>
                        <Button
                          variant="primary"
                          onClick={() =>
                            toast.add({
                              title: 'Step test queued on Bench 3',
                              description: 'Nominal step, Kp 2.80.',
                            })
                          }
                        >
                          Queue a step test
                        </Button>
                      </EmptyActions>
                    </Empty>
                  ) : (
                    <Empty className="py-16">
                      <EmptyMedia>
                        <SearchXIcon aria-hidden="true" />
                      </EmptyMedia>
                      <EmptyTitle>No runs match these filters</EmptyTitle>
                      <EmptyDescription>{describeFilters(filters, q)}</EmptyDescription>
                      <EmptyActions>
                        <Button onClick={clearFilters}>Clear filters</Button>
                      </EmptyActions>
                    </Empty>
                  )
                }
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 text-label font-normal text-muted-foreground">
              <span className="tabular-nums" aria-live="polite">
                {loading
                  ? 'Loading runs…'
                  : preview === 'error'
                    ? 'No runs loaded'
                    : `${fmt.n0.format(rows.length)} of ${fmt.n0.format(source.length)} runs${filtering ? ', filtered' : ''}`}
              </span>
              {!loading && preview !== 'error' && rows.length ? (
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
                  {(['fail', 'review', 'pass'] as const).map((k) => {
                    const m = resultMeta[k];
                    return (
                      <span key={k} className="inline-flex items-center gap-1">
                        <m.Icon
                          aria-hidden="true"
                          className={`size-3.5 ${k === 'fail' ? 'text-destructive-foreground' : k === 'review' ? 'text-warning-foreground' : 'text-success-foreground'}`}
                        />
                        {fmt.n0.format(counts[k])} {m.plural}
                      </span>
                    );
                  })}
                </span>
              ) : null}
            </div>
          </section>

          <RunInspector
            run={preview === 'error' || preview === 'empty' ? undefined : active}
            loading={loading}
            onOpen={openRun}
            onCompare={compareWith}
          />
        </div>
      </main>

      <CompareDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        runs={comparing.slice(0, MAX_COMPARE)}
      />
      <LabPalette
        current="history"
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        actions={[
          { value: 'export', label: 'Export runs as CSV', group: 'Runs', onSelect: exportRows },
          { value: 'clear', label: 'Clear filters', group: 'Runs', onSelect: clearFilters },
          ...(Object.keys(presets) as Preset[]).map((p) => ({
            value: `preset-${p}`,
            label: `Show ${presets[p].label.toLowerCase()} columns`,
            group: 'Runs',
            onSelect: () => {
              setPreset(p);
              setVisible([...presets[p].columns]);
            },
          })),
        ]}
      />
    </AppShell>
  );
}

const getId = (r: Row) => r.id;
const noRows: Row[] = [];

function countOptions(source: readonly Row[], facet: (typeof facets)[number], filters: Filters, q: string) {
  const counts = new Map<string, number>();
  for (const r of source) {
    if (!matches(r, filters, q, facet.id)) continue;
    for (const v of facet.of(r)) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}

function FacetMenu({
  facet,
  value,
  onValueChange,
  counts,
}: {
  facet: (typeof facets)[number];
  value: string[];
  onValueChange: (value: string[]) => void;
  counts: Map<string, number>;
}) {
  const chosen = facet.options.filter((o) => value.includes(o.value));
  return (
    <Menu>
      <MenuTrigger
        render={<Button variant="outline" className={chosen.length ? 'border-border-strong' : undefined} />}
      >
        {/* "Filter by" tells this button from the column of the same name; the visible word stays in the name. */}
        <span className="sr-only">Filter by </span>
        {facet.label}
        {chosen.length ? (
          <>
            <Separator orientation="vertical" className="mx-0.5 h-3.5" />
            <span className="max-w-40 truncate font-medium text-foreground">
              {chosen.length > 2 ? `${chosen.length} chosen` : chosen.map((o) => o.label).join(', ')}
            </span>
          </>
        ) : null}
      </MenuTrigger>
      <MenuContent className="w-60">
        <MenuGroup>
          <MenuLabel>{facet.title}</MenuLabel>
          {facet.options.map((o) => (
            <MenuCheckboxItem
              key={o.value}
              checked={value.includes(o.value)}
              onCheckedChange={(c) =>
                onValueChange(c ? [...value, o.value] : value.filter((v) => v !== o.value))
              }
            >
              <span className="flex w-full items-center">
                <span className="truncate">{o.label}</span>
                <MenuShortcut className="tabular-nums">
                  {fmt.n0.format(counts.get(o.value) ?? 0)}
                </MenuShortcut>
              </span>
            </MenuCheckboxItem>
          ))}
        </MenuGroup>
        {value.length ? (
          <>
            <MenuSeparator />
            <MenuItem onClick={() => onValueChange([])}>Clear {facet.label.toLowerCase()}</MenuItem>
          </>
        ) : null}
      </MenuContent>
    </Menu>
  );
}

function ColumnsMenu({
  visible,
  onVisibleChange,
  custom,
}: {
  visible: string[];
  onVisibleChange: (v: string[]) => void;
  custom: boolean;
}) {
  return (
    <Menu>
      <MenuTrigger render={<Button variant="ghost" />}>
        <Columns3Icon aria-hidden="true" />
        {custom ? 'Custom columns' : 'Columns'}
      </MenuTrigger>
      <MenuContent className="w-52">
        <MenuGroup>
          <MenuLabel>Show columns</MenuLabel>
          {allColumns.map((c) => (
            <MenuCheckboxItem
              key={c.id}
              // The run ID names each row; it stays.
              disabled={c.id === 'id'}
              checked={visible.includes(c.id)}
              onCheckedChange={(checked) =>
                // Keep the table's column order, whatever order they are switched on in.
                onVisibleChange(
                  allColumns.map((x) => x.id).filter((id) => (id === c.id ? checked : visible.includes(id))),
                )
              }
            >
              <span className="flex w-full items-center">
                {c.header}
                {c.unit ? <MenuShortcut>{c.unit}</MenuShortcut> : null}
              </span>
            </MenuCheckboxItem>
          ))}
        </MenuGroup>
      </MenuContent>
    </Menu>
  );
}

function CompareButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <Button variant="primary" onClick={onClick} disabled={count < 2 || count > MAX_COMPARE}>
      <GitCompareIcon aria-hidden="true" />
      Compare
    </Button>
  );
}

/** Why Compare is off, in words next to it rather than in a tooltip a disabled button cannot show. */
const compareHint = (count: number) =>
  count < 2
    ? 'check one more to compare'
    : count > MAX_COMPARE
      ? `compare up to ${MAX_COMPARE} at a time`
      : null;

// ---------- The inspector ----------

function RunInspector({
  run,
  loading,
  onOpen,
  onCompare,
}: {
  run: Row | undefined;
  loading: boolean;
  onOpen: (r: Row) => void;
  onCompare: (r: Row) => void;
}) {
  if (loading) {
    return (
      <Card role="region" aria-label="Run details" aria-busy="true" className="xl:min-h-0 xl:overflow-y-auto">
        <CardHeader className="flex-col items-start gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-40" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {runChecks.map((c) => (
            <div key={c.key} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-1 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  if (!run) {
    return (
      <Card role="region" aria-label="Run details" className="justify-center xl:min-h-0">
        <Empty className="py-10">
          <EmptyTitle>No run selected</EmptyTitle>
          <EmptyDescription>
            Click a run, or move to one with the arrow keys, to see its checks here.
          </EmptyDescription>
        </Empty>
      </Card>
    );
  }
  const m = resultMeta[run.result];
  const facts: Array<[string, React.ReactNode]> = [
    ['Started', run.started],
    ['Bench', run.bench],
    [
      'Firmware',
      <span key="fw" className="font-mono text-label">
        {run.firmware}
      </span>,
    ],
    ['Operator', run.operator],
    [
      'Gains',
      <span key="g" className="tabular-nums">
        Kp {fmt.n2.format(run.kp)} · Ki {fmt.n2.format(run.ki)} · Kd {fmt.n2.format(run.kd)}
      </span>,
    ],
  ];
  return (
    <Card role="region" aria-label={`${run.id} details`} className="xl:min-h-0 xl:overflow-y-auto">
      <CardHeader className="items-start">
        <div className="flex min-w-0 flex-col gap-0.5">
          <CardTitle level={2} className="flex items-baseline gap-2">
            <span className="font-mono">{run.id}</span>
            <span className="truncate text-body font-normal text-muted-foreground">{run.profile}</span>
          </CardTitle>
          {run.note ? <span className="text-caption text-subtle-foreground">{run.note}</span> : null}
        </div>
        <Badge variant={m.variant} className="ml-auto shrink-0">
          <m.Icon aria-hidden="true" />
          {m.label}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-3.5" aria-label="Checks">
          {runChecks.map((c) => {
            const v = run[c.key];
            const status = v === null ? null : limitStatus(v, { max: c.limit });
            const word =
              status === 'fail'
                ? 'Fail'
                : status === 'warn'
                  ? 'Near limit'
                  : status === 'pass'
                    ? 'Pass'
                    : 'No data';
            return (
              <li key={c.key} className="flex flex-col gap-1.5">
                <span className="flex items-baseline justify-between gap-2 text-label">
                  <span className="text-muted-foreground">{c.label}</span>
                  <span className="tabular-nums">
                    {v === null ? (
                      <span className="text-subtle-foreground">—</span>
                    ) : (
                      <LimitValue status={status!}>
                        {(c.unit === 'ms' ? fmt.n0 : fmt.n1).format(v)} {c.unit}
                      </LimitValue>
                    )}
                    <span className="text-subtle-foreground">
                      {' '}
                      / {fmt.n0.format(c.limit)} {c.unit}
                    </span>
                  </span>
                </span>
                <Meter
                  aria-label={`${c.label}: ${v === null ? 'no data' : `${v} ${c.unit}`}, limit ${c.limit} ${c.unit}, ${word}`}
                  value={v === null ? 0 : Math.min(v, c.limit * 1.5)}
                  max={c.limit * 1.5}
                  limit={c.limit}
                  tone={status === 'fail' ? 'destructive' : status === 'warn' ? 'warning' : 'neutral'}
                />
              </li>
            );
          })}
        </ul>
        <Separator />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-label">
          {facts.map(([k, v]) => (
            <React.Fragment key={k}>
              <dt className="font-normal text-muted-foreground">{k}</dt>
              <dd className="text-right">{v}</dd>
            </React.Fragment>
          ))}
        </dl>
      </CardContent>
      <CardFooter className="mt-auto flex-col items-stretch gap-2">
        {run.id === REVIEWED ? (
          <Button variant="primary" render={<Link href="/examples/run-review" />}>
            Open the run review
            <ArrowUpRightIcon aria-hidden="true" />
          </Button>
        ) : (
          <Button onClick={() => onOpen(run)}>Open {run.id}</Button>
        )}
        <Button variant="ghost" onClick={() => onCompare(run)}>
          <GitCompareIcon aria-hidden="true" />
          Compare with {run.id === REFERENCE ? REVIEWED : `${REFERENCE}, the reference`}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ---------- Compare ----------

function CompareDialog({
  open,
  onOpenChange,
  runs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runs: Row[];
}) {
  const ordered = [...runs].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const base = ordered[0];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Compare {ordered.length} runs</DialogTitle>
          <DialogDescription>
            Values past a limit are marked. Differences are against {base?.id ?? 'the newest run'}, the
            newest.
          </DialogDescription>
        </DialogHeader>
        {base ? (
          <div className="-mx-5 border-y border-border">
            <Table aria-label={`${ordered.map((r) => r.id).join(', ')} side by side`}>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="first:pl-5">
                    <span className="sr-only">Measure</span>
                  </TableHead>
                  {ordered.map((r) => (
                    <TableHead key={r.id} numeric className="h-auto py-2 last:pr-5">
                      <span className="flex flex-col items-end gap-0.5">
                        <span className="font-mono text-foreground">{r.id}</span>
                        <span className="text-caption font-normal">{r.profile}</span>
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {runChecks.map((c) => (
                  <TableRow key={c.key} className="hover:bg-transparent">
                    <TableHead scope="row" className="font-normal text-muted-foreground first:pl-5">
                      {c.label}{' '}
                      <span className="text-caption text-subtle-foreground">
                        {c.unit} ≤ {c.limit}
                      </span>
                    </TableHead>
                    {ordered.map((r) => {
                      const v = r[c.key];
                      const b = base[c.key];
                      const digits = c.unit === 'ms' ? fmt.n0 : fmt.n1;
                      const delta = v !== null && b !== null && r !== base ? v - b : null;
                      return (
                        <TableCell key={r.id} numeric className="last:pr-5">
                          {v === null ? (
                            <span className="text-subtle-foreground">—</span>
                          ) : (
                            <LimitValue status={limitStatus(v, { max: c.limit })}>
                              {digits.format(v)}
                            </LimitValue>
                          )}
                          {delta !== null ? (
                            <span className="ml-1.5 text-caption text-subtle-foreground">
                              {delta > 0 ? '+' : delta < 0 ? '−' : '±'}
                              {digits.format(Math.abs(delta))}
                            </span>
                          ) : null}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                {(['kp', 'ki', 'kd'] as const).map((k) => (
                  <TableRow key={k} className="hover:bg-transparent">
                    <TableHead scope="row" className="font-normal text-muted-foreground first:pl-5">
                      {k === 'kp' ? 'Kp' : k === 'ki' ? 'Ki' : 'Kd'}
                    </TableHead>
                    {ordered.map((r) => (
                      <TableCell key={r.id} numeric className="last:pr-5">
                        {fmt.n2.format(r[k])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
        <DialogFooter>
          {ordered.some((r) => r.id === REVIEWED) ? (
            <Button render={<Link href="/examples/run-review" />}>Open the {REVIEWED} review</Button>
          ) : null}
          <DialogClose render={<Button variant="primary" />}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
