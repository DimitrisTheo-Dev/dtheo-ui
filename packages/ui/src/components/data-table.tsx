'use client';

import * as React from 'react';
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, CircleXIcon, TriangleAlertIcon } from 'lucide-react';
import { Checkbox } from './checkbox';
import { Skeleton } from './skeleton';
import { cn } from '../lib/utils';
import { useVirtualRows } from '../lib/use-virtual-rows';

/** An acceptance limit on a column. Over `max` (or under `min`) fails; within `near` of it is near the limit. */
export interface ColumnLimit {
  max?: number;
  min?: number;
  /** Where "near the limit" starts, as a fraction of it. Default 0.9: above 90 % of a maximum. */
  near?: number;
}

export type LimitStatus = 'fail' | 'warn' | 'pass';

/** One rule for every limit: past it fails, within `near` of it warns. The same rule the Metric states. */
export function limitStatus(value: number, { max, min, near = 0.9 }: ColumnLimit): LimitStatus {
  if (max !== undefined && value > max) return 'fail';
  if (min !== undefined && value < min) return 'fail';
  if (max !== undefined && value > near * max) return 'warn';
  if (min !== undefined && value < min / near) return 'warn';
  return 'pass';
}

export interface DataTableColumn<Row> {
  id: string;
  /** Plain text: the column head, and its name in menus and for screen readers. */
  header: string;
  /** Shown under the head, quieter, with the limit: "%" or "ms". */
  unit?: string;
  numeric?: boolean;
  /** Width in px. Columns without one share the space that is left. */
  width?: number;
  /** The value to sort by, and to show when there is no `cell`. Null and undefined sort last and show a dash. */
  value: (row: Row) => number | string | null | undefined;
  /** Text for a number. Default: the reader's locale, at most two decimals. */
  format?: (value: number) => string;
  /** Custom content for the cell. Limit marking still applies when `value` is a number. */
  cell?: (row: Row) => React.ReactNode;
  limit?: ColumnLimit;
  /** Default true. */
  sortable?: boolean;
  /** Keep this column in view while the table scrolls sideways. Only the first data column can stick. */
  sticky?: boolean;
}

export interface DataTableSort {
  id: string;
  dir: 'asc' | 'desc';
}

export interface DataTableProps<Row> {
  rows: readonly Row[];
  columns: ReadonlyArray<DataTableColumn<Row>>;
  getRowId: (row: Row) => string;
  /** Names the table for screen readers, and the scroll region around it. */
  'aria-label': string;
  sort?: DataTableSort | null;
  defaultSort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort | null) => void;
  /** Checked rows. Pass with `onSelectedChange` to show a checkbox column. */
  selected?: ReadonlySet<string>;
  onSelectedChange?: (selected: Set<string>) => void;
  /** The row the user is looking at: highlighted, and where the keyboard starts. */
  activeId?: string | null;
  onActiveChange?: (id: string, row: Row) => void;
  /** Enter or a double click. */
  onRowOpen?: (row: Row) => void;
  /** Row height: 32 px regular, 28 px compact. */
  density?: 'regular' | 'compact';
  /** Shows rows of placeholders shaped like the columns. */
  loading?: boolean;
  /** What to show when there are no rows: an Empty that says why, and what to do next. */
  empty?: React.ReactNode;
  className?: string;
}

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const HEAD_HEIGHT = 44;
const CHECK_WIDTH = 40;

function compare(a: unknown, b: unknown) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

/** A value marked against its limit: an icon, a color and, for screen readers, the words. Passing values stay plain. */
export function LimitValue({ status, children }: { status: LimitStatus; children: React.ReactNode }) {
  if (status === 'pass') return <>{children}</>;
  const Icon = status === 'fail' ? CircleXIcon : TriangleAlertIcon;
  return (
    <span
      data-limit={status}
      className={cn(
        'inline-flex items-center gap-1',
        status === 'fail' ? 'font-medium text-destructive-foreground' : 'text-warning-foreground',
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {children}
      <span className="sr-only">{status === 'fail' ? ', over the limit' : ', near the limit'}</span>
    </span>
  );
}

const n = (v: number) => numberFormat.format(v);

function limitText(limit: ColumnLimit) {
  if (limit.max !== undefined && limit.min !== undefined) return `${n(limit.min)}–${n(limit.max)}`;
  if (limit.max !== undefined) return `≤ ${n(limit.max)}`;
  if (limit.min !== undefined) return `≥ ${n(limit.min)}`;
  return '';
}

/**
 * A data table for thousands of rows: only the rows in view are drawn, the head and the first column stay put,
 * values past a column's limit carry an icon and a color, and the keyboard moves through rows. Filtering is yours:
 * pass the rows you want shown. Sorting, selection and the active row can be controlled or left to the table.
 */
export function DataTable<Row>({
  rows,
  columns,
  getRowId,
  'aria-label': ariaLabel,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  selected,
  onSelectedChange,
  activeId: activeProp,
  onActiveChange,
  onRowOpen,
  density = 'regular',
  loading = false,
  empty,
  className,
}: DataTableProps<Row>) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const bodyRef = React.useRef<HTMLTableSectionElement>(null);
  const rowHeight = density === 'compact' ? 28 : 32;
  const selectable = selected !== undefined && onSelectedChange !== undefined;

  const [sortState, setSortState] = React.useState(defaultSort);
  const sort = sortProp !== undefined ? sortProp : sortState;
  const setSort = (next: DataTableSort | null) => {
    if (sortProp === undefined) setSortState(next);
    onSortChange?.(next);
  };

  const sorted = React.useMemo(() => {
    const col = sort && columns.find((c) => c.id === sort.id);
    if (!col) return rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return rows
      .map((row) => ({ row, v: col.value(row) }))
      .sort((a, b) => {
        const an = a.v === null || a.v === undefined;
        const bn = b.v === null || b.v === undefined;
        if (an || bn) return an === bn ? 0 : an ? 1 : -1;
        return compare(a.v, b.v) * dir;
      })
      .map((d) => d.row);
  }, [rows, columns, sort]);
  const ids = React.useMemo(() => sorted.map(getRowId), [sorted, getRowId]);

  const [activeState, setActiveState] = React.useState<string | null>(null);
  const activeId = activeProp !== undefined ? activeProp : activeState;
  const activeIndex = activeId ? ids.indexOf(activeId) : -1;

  const shown = loading ? 30 : sorted.length;
  const win = useVirtualRows({ count: shown, rowHeight, scrollRef, offset: HEAD_HEIGHT });

  // Where a Shift-click range starts: the last row checked or cleared without Shift.
  const anchor = React.useRef<string | null>(null);
  const toggle = (id: string, checked: boolean, shift: boolean) => {
    if (!selectable) return;
    const from = anchor.current ? ids.indexOf(anchor.current) : -1;
    const to = ids.indexOf(id);
    const range =
      shift && from >= 0 && to >= 0 ? ids.slice(Math.min(from, to), Math.max(from, to) + 1) : [id];
    const next = new Set(selected);
    for (const r of range) {
      if (checked) next.add(r);
      else next.delete(r);
    }
    anchor.current = id;
    onSelectedChange(next);
  };
  const checkedCount = selectable ? ids.filter((id) => selected.has(id)).length : 0;

  // Focus follows the active row when the keyboard moved it, once the window has drawn it.
  const focusNext = React.useRef(false);
  const activate = (index: number, focus: boolean) => {
    const row = sorted[index];
    if (!row) return;
    const id = ids[index]!;
    if (activeProp === undefined) setActiveState(id);
    onActiveChange?.(id, row);
    win.scrollToIndex(index);
    focusNext.current = focus;
  };
  React.useLayoutEffect(() => {
    if (!focusNext.current || activeIndex < 0) return;
    focusNext.current = false;
    bodyRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.focus({ preventScroll: true });
  });

  const onKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>, index: number) => {
    const last = sorted.length - 1;
    const go = (i: number) => {
      e.preventDefault();
      activate(Math.min(last, Math.max(0, i)), true);
    };
    if (e.key === 'ArrowDown') go(index + 1);
    else if (e.key === 'ArrowUp') go(index - 1);
    else if (e.key === 'PageDown') go(index + win.pageSize);
    else if (e.key === 'PageUp') go(index - win.pageSize);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(last);
    else if (e.key === 'Enter' && onRowOpen) {
      e.preventDefault();
      onRowOpen(sorted[index]!);
    } else if (e.key === ' ' && selectable) {
      e.preventDefault();
      const id = ids[index]!;
      toggle(id, !selected.has(id), e.shiftKey);
    }
  };

  // One row is the table's tab stop: the active one when it is drawn, else the first row drawn.
  const tabStop = activeIndex >= win.start && activeIndex < win.end ? activeIndex : win.start;
  const span = columns.length + (selectable ? 1 : 0);
  const sticky = columns[0]?.sticky;
  // Columns without a width get at least 140 px before the table scrolls sideways.
  const minWidth = columns.reduce((w, c) => w + (c.width ?? 140), selectable ? CHECK_WIDTH : 0);

  const head = (col: DataTableColumn<Row>, i: number) => {
    const sortable = col.sortable !== false;
    const active = sort?.id === col.id;
    const Icon = !active ? ArrowUpDownIcon : sort.dir === 'asc' ? ArrowUpIcon : ArrowDownIcon;
    const sub = [col.unit, col.limit && limitText(col.limit)].filter(Boolean).join(' ');
    const label = (
      <span className={cn('flex flex-col gap-px leading-none', col.numeric && 'items-end')}>
        {/* A number's sort arrow sits on the left, so the name, its unit and the values share one right edge. */}
        <span className={cn('flex items-center gap-1', col.numeric && 'flex-row-reverse')}>
          {col.header}
          {sortable ? (
            <Icon
              className={cn('size-3 shrink-0', !active && 'opacity-0 group-hover/head:opacity-60')}
              aria-hidden="true"
            />
          ) : null}
        </span>
        {sub ? <span className="text-caption font-normal text-subtle-foreground">{sub}</span> : null}
      </span>
    );
    return (
      <th
        key={col.id}
        scope="col"
        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
        className={cn(
          'group/head sticky top-0 z-10 h-11 border-b border-border bg-(--data-table-surface) px-3 text-left align-middle text-label font-medium whitespace-nowrap text-subtle-foreground first:pl-4 last:pr-4',
          col.numeric && 'text-right',
          active && 'text-foreground',
          i === 0 && sticky && 'z-20',
        )}
        style={i === 0 && sticky ? { left: selectable ? CHECK_WIDTH : 0 } : undefined}
      >
        {sortable ? (
          <button
            type="button"
            className={cn(
              'inline-flex rounded-control py-1 hover:text-foreground [--focus-offset:2px]',
              col.numeric && 'justify-end',
            )}
            // Numbers sort largest first: the worst run is usually the one you came for.
            onClick={() =>
              setSort({
                id: col.id,
                dir: active ? (sort.dir === 'asc' ? 'desc' : 'asc') : col.numeric ? 'desc' : 'asc',
              })
            }
          >
            {label}
          </button>
        ) : (
          label
        )}
      </th>
    );
  };

  const cell = (col: DataTableColumn<Row>, row: Row, i: number) => {
    const v = col.value(row);
    let content: React.ReactNode;
    if (v === null || v === undefined) {
      content = (
        <span className="text-subtle-foreground">
          <span aria-hidden="true">—</span>
          <span className="sr-only">No data</span>
        </span>
      );
    } else {
      content = col.cell ? col.cell(row) : typeof v === 'number' ? (col.format ?? numberFormat.format)(v) : v;
      if (typeof v === 'number' && col.limit)
        content = <LimitValue status={limitStatus(v, col.limit)}>{content}</LimitValue>;
    }
    return (
      <td
        key={col.id}
        className={cn(
          'overflow-hidden px-3 align-middle text-ellipsis whitespace-nowrap first:pl-4 last:pr-4',
          col.numeric && 'text-right tabular-nums',
          i === 0 && sticky && 'sticky z-[1]',
        )}
        data-sticky={i === 0 && sticky ? '' : undefined}
        style={i === 0 && sticky ? { left: selectable ? CHECK_WIDTH : 0 } : undefined}
      >
        {content}
      </td>
    );
  };

  return (
    <div
      ref={scrollRef}
      data-slot="data-table"
      role="region"
      aria-label={ariaLabel}
      // The region scrolls; the keyboard reaches it through its rows, so it is not a tab stop of its own.
      className={cn('dtheo-data-table relative max-h-[32rem] overflow-auto overscroll-contain', className)}
    >
      <table
        aria-label={ariaLabel}
        aria-rowcount={loading ? undefined : sorted.length + 1}
        aria-busy={loading || undefined}
        className="w-full table-fixed border-separate border-spacing-0 text-body"
        style={{ minWidth }}
      >
        <colgroup>
          {selectable ? <col style={{ width: CHECK_WIDTH }} /> : null}
          {columns.map((c) => (
            <col key={c.id} style={c.width ? { width: c.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr aria-rowindex={1}>
            {selectable ? (
              <th
                scope="col"
                className="sticky top-0 left-0 z-20 h-11 border-b border-border bg-(--data-table-surface) pr-0 pl-4 align-middle"
              >
                <Checkbox
                  aria-label={`Select all ${sorted.length} rows`}
                  checked={sorted.length > 0 && checkedCount === sorted.length}
                  indeterminate={checkedCount > 0 && checkedCount < sorted.length}
                  disabled={loading || sorted.length === 0}
                  onCheckedChange={(c) => {
                    const next = new Set(selected);
                    for (const id of ids) {
                      if (c) next.add(id);
                      else next.delete(id);
                    }
                    anchor.current = null;
                    onSelectedChange(next);
                  }}
                />
              </th>
            ) : null}
            {columns.map(head)}
          </tr>
        </thead>
        <tbody ref={bodyRef}>
          {win.before > 0 ? (
            <tr aria-hidden="true" style={{ height: win.before }}>
              {/* A spacer for the rows above the window: no content, hidden from assistive tech. */}
              <td colSpan={span} className="p-0" aria-hidden="true">
                {null}
              </td>
            </tr>
          ) : null}
          {loading
            ? Array.from({ length: win.end - win.start }, (_, k) => (
                <tr key={win.start + k} style={{ height: rowHeight }}>
                  {selectable ? (
                    <td className="border-b border-border pl-4">
                      <Skeleton className="size-3.5 rounded-item" />
                    </td>
                  ) : null}
                  {columns.map((c) => (
                    <td key={c.id} className="border-b border-border px-3 first:pl-4 last:pr-4">
                      <Skeleton className={cn('h-3', c.numeric ? 'ml-auto w-10' : 'w-3/5')} />
                    </td>
                  ))}
                </tr>
              ))
            : sorted.slice(win.start, win.end).map((row, k) => {
                const index = win.start + k;
                const id = ids[index]!;
                const isChecked = selectable && selected.has(id);
                return (
                  <tr
                    key={id}
                    data-index={index}
                    data-focus="none"
                    data-active={index === activeIndex || undefined}
                    aria-rowindex={index + 2}
                    aria-selected={selectable ? isChecked : undefined}
                    tabIndex={index === tabStop ? 0 : -1}
                    onClick={() => activate(index, false)}
                    onDoubleClick={onRowOpen ? () => onRowOpen(row) : undefined}
                    onFocus={(e) => {
                      if (e.target === e.currentTarget && index !== activeIndex) activate(index, false);
                    }}
                    onKeyDown={(e) => onKeyDown(e, index)}
                    style={{ height: rowHeight }}
                    className="cursor-default [--focus-offset:-2px] [&>td]:border-b [&>td]:border-border"
                  >
                    {selectable ? (
                      <td data-sticky="" className="sticky left-0 z-[1] pr-0 pl-4 align-middle">
                        <Checkbox
                          aria-label={`Select ${id}`}
                          tabIndex={-1}
                          checked={isChecked}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={(c, d) => {
                            const ev = d?.event as MouseEvent | KeyboardEvent | undefined;
                            toggle(id, c, Boolean(ev?.shiftKey));
                          }}
                        />
                      </td>
                    ) : null}
                    {columns.map((c, i) => cell(c, row, i))}
                  </tr>
                );
              })}
          {win.after > 0 ? (
            <tr aria-hidden="true" style={{ height: win.after }}>
              <td colSpan={span} className="p-0" aria-hidden="true">
                {null}
              </td>
            </tr>
          ) : null}
          {!loading && sorted.length === 0 && empty ? (
            <tr>
              <td colSpan={span} className="p-0">
                {empty}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
