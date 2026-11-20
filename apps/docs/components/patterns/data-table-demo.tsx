'use client';

import * as React from 'react';
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  CircleXIcon,
  DownloadIcon,
  GitCompareIcon,
  InboxIcon,
  MoreHorizontalIcon,
  RotateCcwIcon,
  SearchIcon,
  SearchXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { Badge } from '@dtheo/ui/components/badge';
import { Checkbox } from '@dtheo/ui/components/checkbox';
import { useRowSelection, withShift } from '@dtheo/ui/lib/use-row-selection';
import { Input } from '@dtheo/ui/components/input';
import { InputGroup, InputGroupAddon } from '@dtheo/ui/components/input-group';
import { Kbd } from '@dtheo/ui/components/kbd';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@dtheo/ui/components/select';
import { SegmentedControl, SegmentedControlItem } from '@dtheo/ui/components/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@dtheo/ui/components/table';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@dtheo/ui/components/menu';
import { Skeleton } from '@dtheo/ui/components/skeleton';
import { Empty, EmptyActions, EmptyDescription, EmptyMedia, EmptyTitle } from '@dtheo/ui/components/empty';
import { Alert, AlertActions, AlertContent, AlertDescription, AlertTitle } from '@dtheo/ui/components/alert';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@dtheo/ui/components/popover';
import { Radio, RadioGroup } from '@dtheo/ui/components/radio-group';
import { Label } from '@dtheo/ui/components/field';
import { useToast } from '@dtheo/ui/components/toast';
import { Sparkline } from '@dtheo/charts';
import { OVERSHOOT_LIMIT, fmt, runHistory, type RunRow } from '@/lib/lab-data';

type Sort = { key: 'id' | 'overshoot' | 'settle' | 'current'; dir: 'asc' | 'desc' };
type View = 'data' | 'loading' | 'empty' | 'error';

const statuses = [
  { value: 'all', label: 'All results' },
  { value: 'fail', label: 'Fail' },
  { value: 'review', label: 'Review' },
  { value: 'pass', label: 'Pass' },
];

const resultMeta = {
  fail: { label: 'Fail', variant: 'destructive', Icon: CircleXIcon },
  review: { label: 'Review', variant: 'warning', Icon: TriangleAlertIcon },
  pass: { label: 'Pass', variant: 'success', Icon: CircleCheckIcon },
} as const;

/** Export options sit next to the button that uses them: a popover, not a dialog, because the table stays in view. */
function ExportPopover({ count }: { count: number }) {
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [format, setFormat] = React.useState<unknown>('csv');
  const [traces, setTraces] = React.useState(false);
  const formatId = React.useId();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button size="sm" variant="ghost" />}>
        <DownloadIcon aria-hidden="true" />
        Export
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-64 flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <PopoverTitle>Export {count} runs</PopoverTitle>
          <PopoverDescription>Uses the current search and filter.</PopoverDescription>
        </div>
        <div className="flex flex-col gap-2">
          <span id={formatId} className="text-label">
            Format
          </span>
          <RadioGroup aria-labelledby={formatId} value={format} onValueChange={setFormat} className="gap-2">
            <Label className="flex items-center gap-2.5 font-normal">
              <Radio value="csv" />
              CSV, one row per run
            </Label>
            <Label className="flex items-center gap-2.5 font-normal">
              <Radio value="json" />
              JSON, with limits and gains
            </Label>
          </RadioGroup>
        </div>
        <Label className="flex items-center gap-2.5 font-normal">
          <Checkbox checked={traces} onCheckedChange={setTraces} />
          Include raw traces (≈ {count * 1.2} MB)
        </Label>
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            setOpen(false);
            toast.add({
              title: 'Export started',
              description: `runs.${format === 'json' ? 'json' : 'csv'}, ${count} runs${traces ? ' with traces' : ''}.`,
            });
          }}
        >
          Export
        </Button>
      </PopoverContent>
    </Popover>
  );
}

const PAGE = 5;
const trend = (r: RunRow) => [
  r.overshoot * 0.6,
  r.overshoot * 0.85,
  r.overshoot * 1.1,
  r.overshoot * 0.97,
  r.overshoot,
];

/** The data table pattern: search, filter, sort, select, act, paginate, and every state it can be in. */
export function DataTableDemo() {
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState<string | null>('all');
  const [sort, setSort] = React.useState<Sort>({ key: 'id', dir: 'desc' });
  const [page, setPage] = React.useState(0);
  const [view, setView] = React.useState<View>('data');

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = runHistory.filter(
      (r) =>
        (status === 'all' || r.result === status) &&
        (!q || `${r.id} ${r.profile} ${r.note ?? ''}`.toLowerCase().includes(q)),
    );
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort(
      (a, b) => (sort.key === 'id' ? a.id.localeCompare(b.id) : a[sort.key] - b[sort.key]) * dir,
    );
  }, [query, status, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const visible = React.useMemo(() => rows.slice(page * PAGE, page * PAGE + PAGE), [rows, page]);
  const visibleIds = React.useMemo(() => visible.map((r) => r.id), [visible]);
  // Shift-click selects every row between the last click and this one, like a mail inbox.
  const sel = useRowSelection(visibleIds);
  const filtering = query !== '' || status !== 'all';

  const sortHead = (key: Sort['key'], label: string, numeric = false) => {
    const active = sort.key === key;
    const Icon = !active ? ArrowUpDownIcon : sort.dir === 'asc' ? ArrowUpIcon : ArrowDownIcon;
    return (
      <TableHead
        numeric={numeric}
        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <button
          type="button"
          onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))}
          className={`inline-flex items-center gap-1 rounded-control hover:text-foreground ${numeric ? 'flex-row-reverse' : ''} ${active ? 'text-foreground' : ''}`}
        >
          {label}
          <Icon className={`size-3 ${active ? '' : 'opacity-50'}`} aria-hidden="true" />
        </button>
      </TableHead>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption text-subtle-foreground">Preview state</span>
        <SegmentedControl
          aria-label="Preview state"
          value={[view]}
          onValueChange={(v) => v[0] && setView(v[0] as View)}
        >
          <SegmentedControlItem value="data">Data</SegmentedControlItem>
          <SegmentedControlItem value="loading">Loading</SegmentedControlItem>
          <SegmentedControlItem value="empty">No data</SegmentedControlItem>
          <SegmentedControlItem value="error">Error</SegmentedControlItem>
        </SegmentedControl>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <InputGroup className="w-full sm:w-64">
            <InputGroupAddon>
              <SearchIcon aria-hidden="true" />
            </InputGroupAddon>
            <Input
              aria-label="Search runs"
              placeholder="Search runs"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
            <InputGroupAddon>
              <Kbd>/</Kbd>
            </InputGroupAddon>
          </InputGroup>
          <Select
            items={statuses}
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(0);
            }}
          >
            <SelectTrigger aria-label="Filter by result" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            {sel.count ? (
              <>
                <span className="text-label font-normal text-muted-foreground tabular-nums">
                  {sel.count} selected
                  <span className="hidden text-subtle-foreground lg:inline"> · Shift-click for a range</span>
                </span>
                <Button size="sm" disabled={sel.count < 2}>
                  <GitCompareIcon aria-hidden="true" />
                  Compare
                </Button>
                <Button size="sm" variant="ghost" onClick={sel.clear}>
                  Clear
                </Button>
              </>
            ) : (
              <ExportPopover count={rows.length} />
            )}
          </div>
        </div>

        {view === 'error' ? (
          <div className="p-3">
            <Alert variant="destructive">
              <AlertContent>
                <AlertTitle>Runs could not be loaded</AlertTitle>
                <AlertDescription>
                  The bench database did not answer within 10 s. Your search and filters are kept.
                </AlertDescription>
              </AlertContent>
              <AlertActions>
                <Button size="sm" onClick={() => setView('data')}>
                  <RotateCcwIcon aria-hidden="true" />
                  Retry
                </Button>
              </AlertActions>
            </Alert>
          </div>
        ) : view === 'empty' ? (
          <Empty>
            <EmptyMedia>
              <InboxIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No runs for RA-14 yet</EmptyTitle>
            <EmptyDescription>
              Runs appear here when a bench finishes a test profile on this actuator.
            </EmptyDescription>
            <EmptyActions>
              <Button variant="primary">Schedule a run</Button>
            </EmptyActions>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Select runs on this page"
                    checked={sel.all}
                    indeterminate={sel.some}
                    onCheckedChange={(c) => sel.setAll(visibleIds, c)}
                  />
                </TableHead>
                {sortHead('id', 'Run')}
                <TableHead>Profile</TableHead>
                {sortHead('overshoot', 'Overshoot', true)}
                <TableHead className="hidden w-24 md:table-cell">Trend</TableHead>
                {sortHead('settle', 'Settling', true)}
                <TableHead>Result</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view === 'loading'
                ? Array.from({ length: PAGE }, (_, i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                      <TableCell>
                        <Skeleton className="size-3.5 rounded-item" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-3 w-14" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-3 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-3 w-12" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-3 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-3 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-14 rounded-full" />
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                : visible.map((r) => {
                    const meta = resultMeta[r.result];
                    return (
                      <TableRow key={r.id} aria-selected={sel.isSelected(r.id) || undefined}>
                        <TableCell>
                          <Checkbox
                            aria-label={`Select ${r.id}`}
                            checked={sel.isSelected(r.id)}
                            onCheckedChange={(c, d) => sel.toggle(r.id, c, withShift(d))}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-label">{r.id}</TableCell>
                        <TableCell className="max-w-44 truncate">{r.profile}</TableCell>
                        <TableCell
                          numeric
                          className={
                            r.overshoot > OVERSHOOT_LIMIT ? 'font-medium text-destructive-foreground' : ''
                          }
                        >
                          {fmt.n1.format(r.overshoot)} %
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Sparkline
                            values={trend(r)}
                            tone={r.overshoot > OVERSHOOT_LIMIT ? 'critical' : 'muted'}
                            height={20}
                            ariaLabel={`${r.id} overshoot trend`}
                          />
                        </TableCell>
                        <TableCell numeric>{fmt.n0.format(r.settle)} ms</TableCell>
                        <TableCell>
                          <Badge variant={meta.variant}>
                            <meta.Icon aria-hidden="true" />
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-2">
                          <Menu>
                            <MenuTrigger
                              render={
                                <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${r.id}`} />
                              }
                            >
                              <MoreHorizontalIcon aria-hidden="true" />
                            </MenuTrigger>
                            <MenuContent align="end">
                              <MenuItem>Open {r.id}</MenuItem>
                              <MenuItem>Set as reference</MenuItem>
                            </MenuContent>
                          </Menu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        )}

        {view === 'data' && rows.length === 0 ? (
          <Empty className="py-8">
            <EmptyMedia>
              <SearchXIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No runs match {query ? `“${query}”` : 'this filter'}</EmptyTitle>
            <EmptyDescription>
              {status !== 'all' ? `Only ${status} results are shown.` : 'Try another run ID or profile.'}
            </EmptyDescription>
            <EmptyActions>
              <Button
                size="sm"
                onClick={() => {
                  setQuery('');
                  setStatus('all');
                  setPage(0);
                }}
              >
                Clear search and filter
              </Button>
            </EmptyActions>
          </Empty>
        ) : null}

        {view === 'data' || view === 'loading' ? (
          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-label font-normal text-muted-foreground">
            <span className="tabular-nums">
              {view === 'loading'
                ? 'Loading runs…'
                : rows.length
                  ? `${page * PAGE + 1}–${page * PAGE + visible.length} of ${rows.length} runs${filtering ? ' (filtered)' : ''}`
                  : '0 runs'}
            </span>
            <span className="flex items-center gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Previous page"
                disabled={page === 0 || view === 'loading'}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeftIcon aria-hidden="true" />
              </Button>
              <span className="tabular-nums">
                {page + 1} / {pages}
              </span>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Next page"
                disabled={page >= pages - 1 || view === 'loading'}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRightIcon aria-hidden="true" />
              </Button>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
