// @vitest-environment jsdom
import './setup';
import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataTable, type DataTableColumn } from '../src/components/data-table';
import { limitStatus } from '../src/lib/quantity';
import { virtualWindow } from '../src/lib/use-virtual-rows';

interface Run {
  id: string;
  overshoot: number;
  current: number | null;
}

const runs: Run[] = Array.from({ length: 1000 }, (_, i) => ({
  id: `R-${String(i + 1).padStart(4, '0')}`,
  // A sawtooth, so sorting reorders the rows.
  overshoot: (i * 7) % 23,
  current: i === 3 ? null : 20 + (i % 13),
}));

const columns: Array<DataTableColumn<Run>> = [
  { id: 'id', header: 'Run', value: (r) => r.id, sticky: true },
  {
    id: 'overshoot',
    header: 'Overshoot',
    unit: '%',
    numeric: true,
    value: (r) => r.overshoot,
    limit: { max: 10 },
  },
  {
    id: 'current',
    header: 'Peak current',
    unit: 'A',
    numeric: true,
    value: (r) => r.current,
    limit: { max: 32 },
  },
];

function Harness(props: Partial<React.ComponentProps<typeof DataTable<Run>>>) {
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(() => new Set());
  return (
    <>
      <output data-testid="selected">{[...selected].sort().join(',')}</output>
      <DataTable
        aria-label="Runs"
        rows={runs}
        columns={columns}
        getRowId={(r) => r.id}
        selected={selected}
        onSelectedChange={setSelected}
        {...props}
      />
    </>
  );
}

const bodyRows = () => screen.getAllByRole('row').filter((r) => r.hasAttribute('data-index'));

describe('virtualWindow', () => {
  it('draws the rows in view plus the overscan, and spacers for the rest', () => {
    // 1000 rows of 32 px, 320 px tall viewport under a 44 px head, scrolled to row 100.
    const w = virtualWindow(1000, 32, 100 * 32 + 44, 320, 44, 6);
    expect(w.start).toBe(94);
    expect(w.end).toBe(100 + Math.ceil(320 / 32) + 6);
    expect(w.before).toBe(94 * 32);
    expect(w.before + (w.end - w.start) * 32 + w.after).toBe(1000 * 32);
  });

  it('never runs past either end', () => {
    expect(virtualWindow(5, 32, 0, 640)).toMatchObject({ start: 0, end: 5, before: 0, after: 0 });
    expect(virtualWindow(0, 32, 500, 640)).toMatchObject({ start: 0, end: 0, after: 0 });
  });
});

describe('limitStatus', () => {
  it('fails past the limit and warns above 90 % of it, like the Metric', () => {
    expect(limitStatus(10.1, { max: 10 })).toBe('fail');
    expect(limitStatus(10, { max: 10 })).toBe('warn');
    expect(limitStatus(9.01, { max: 10 })).toBe('warn');
    expect(limitStatus(9, { max: 10 })).toBe('pass');
  });

  it('handles minimums and a custom near band', () => {
    expect(limitStatus(4, { min: 5 })).toBe('fail');
    expect(limitStatus(5.2, { min: 5 })).toBe('warn');
    expect(limitStatus(6, { min: 5 })).toBe('pass');
    expect(limitStatus(13.0, { max: 13.2, near: 0.99 })).toBe('pass');
    expect(limitStatus(13.1, { max: 13.2, near: 0.99 })).toBe('warn');
  });
});

describe('DataTable', () => {
  // jsdom lays nothing out: give the scroller the height of 20 rows, as a browser would.
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(640 + 44);
    return () => vi.restoreAllMocks();
  });

  it('draws only a window of a long list, and says how long the list is', () => {
    render(<Harness />);
    const table = screen.getByRole('table', { name: 'Runs' });
    expect(table).toHaveAttribute('aria-rowcount', '1001');
    const rows = bodyRows();
    expect(rows.length).toBeLessThan(60);
    expect(rows[0]).toHaveAttribute('aria-rowindex', '2');
  });

  it('marks values past their limit with words, not only color', () => {
    render(<Harness rows={runs.slice(0, 20)} />);
    // R-0004 overshoots 21 %.
    const row = bodyRows().find((r) => within(r).queryByText('R-0004'))!;
    expect(within(row).getByText(', over the limit')).toBeInTheDocument();
    // Its current is missing: a dash for the eye, words for a screen reader.
    expect(within(row).getByText('No data')).toBeInTheDocument();
  });

  it('sorts numbers largest first, sets aria-sort and keeps missing values last', async () => {
    const user = userEvent.setup();
    render(<Harness rows={runs.slice(0, 20)} />);
    const head = screen.getByRole('columnheader', { name: /Peak current/ });
    await user.click(within(head).getByRole('button'));
    expect(head).toHaveAttribute('aria-sort', 'descending');
    expect(within(bodyRows()[0]!).getByText('32')).toBeInTheDocument();
    await user.click(within(head).getByRole('button'));
    expect(head).toHaveAttribute('aria-sort', 'ascending');
    expect(
      bodyRows()
        .map((r) => r.textContent)
        .at(-1),
    ).toMatch(/^R-0004/);
  });

  it('moves through rows with the arrow keys and opens one with Enter', async () => {
    const user = userEvent.setup();
    const onRowOpen = vi.fn();
    const onActiveChange = vi.fn();
    render(<Harness rows={runs.slice(0, 20)} onRowOpen={onRowOpen} onActiveChange={onActiveChange} />);
    // One tab stop for the whole body: the select-all box, then the sort buttons, then a row.
    bodyRows()[0]!.focus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(document.activeElement).toBe(bodyRows()[2]);
    expect(onActiveChange).toHaveBeenLastCalledWith('R-0003', runs[2]);
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(bodyRows().at(-1));
    await user.keyboard('{Home}{Enter}');
    expect(onRowOpen).toHaveBeenCalledWith(runs[0]);
    expect(bodyRows().filter((r) => r.tabIndex === 0)).toHaveLength(1);
  });

  it('checks a row with Space and a range with Shift + Space', async () => {
    const user = userEvent.setup();
    render(<Harness rows={runs.slice(0, 20)} />);
    bodyRows()[1]!.focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    await user.keyboard('{Shift>} {/Shift}');
    expect(screen.getByTestId('selected')).toHaveTextContent('R-0002,R-0003,R-0004,R-0005');
    expect(bodyRows()[2]).toHaveAttribute('aria-selected', 'true');
  });

  it('shows placeholders while loading and the empty state when there is nothing', () => {
    const { rerender } = render(<Harness loading />);
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    rerender(<Harness rows={[]} empty={<p>No runs match these filters</p>} />);
    expect(screen.getByText('No runs match these filters')).toBeInTheDocument();
  });
});
