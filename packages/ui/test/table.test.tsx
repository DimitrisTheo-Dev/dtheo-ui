// @vitest-environment jsdom
import { resize, setBox } from './setup';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Checkbox } from '../src/components/checkbox';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../src/components/table';
import { useRowSelection, withShift } from '../src/lib/use-row-selection';

// Synthetic run ids, as in the docs examples.
const runs = ['R-0410', 'R-0411', 'R-0412', 'R-0413', 'R-0414'];

function RunTable({ caption }: { caption?: string }) {
  return (
    <Table>
      {caption ? <TableCaption>{caption}</TableCaption> : null}
      <TableHeader>
        <TableRow>
          <TableHead>Run</TableHead>
          <TableHead numeric>Overshoot</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((id) => (
          <TableRow key={id}>
            <TableCell>{id}</TableCell>
            <TableCell numeric>4.2 %</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const container = () => document.querySelector<HTMLElement>('[data-slot="table-container"]')!;

describe('Table', () => {
  it('uses native table semantics, not an ARIA grid', () => {
    render(<RunTable caption="Run history" />);
    expect(screen.getByRole('table', { name: 'Run history' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Run', 'Overshoot']);
    expect(screen.getAllByRole('row')).toHaveLength(runs.length + 1);
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  describe('scroll container', () => {
    it('is neither a region nor focusable while the table fits', () => {
      render(<RunTable caption="Run history" />);
      setBox(container(), { scrollWidth: 400, clientWidth: 400 });
      resize(container());
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
      expect(container()).not.toHaveAttribute('tabindex');
    });

    it('becomes a focusable region named after the caption while the table overflows', async () => {
      const user = userEvent.setup();
      render(<RunTable caption="Run history." />);
      setBox(container(), { scrollWidth: 960, clientWidth: 400 });
      resize(container());
      const region = screen.getByRole('region', { name: 'Run history, scrolls sideways' });
      expect(region).toBe(container());
      await user.tab();
      expect(region).toHaveFocus();
    });

    it('falls back to "Table" when there is no caption', () => {
      render(<RunTable />);
      setBox(container(), { scrollWidth: 960, clientWidth: 400 });
      resize(container());
      expect(screen.getByRole('region', { name: 'Table, scrolls sideways' })).toBeInTheDocument();
    });

    it('leaves the tab order again once the table fits', () => {
      render(<RunTable caption="Run history" />);
      setBox(container(), { scrollWidth: 960, clientWidth: 400 });
      resize(container());
      expect(screen.getByRole('region')).toHaveAttribute('tabindex', '0');
      setBox(container(), { scrollWidth: 960, clientWidth: 960 });
      resize(container());
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
      expect(container()).not.toHaveAttribute('tabindex');
      expect(container()).not.toHaveAttribute('aria-label');
    });

    it('ignores a one-pixel rounding difference', () => {
      render(<RunTable caption="Run history" />);
      setBox(container(), { scrollWidth: 401, clientWidth: 400 });
      resize(container());
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });

    it('re-checks when the table itself changes size', () => {
      render(<RunTable caption="Run history" />);
      setBox(container(), { scrollWidth: 960, clientWidth: 400 });
      resize(screen.getByRole('table'));
      expect(screen.getByRole('region', { name: 'Run history, scrolls sideways' })).toBeInTheDocument();
    });
  });
});

const renderSelection = (order: readonly string[] = runs) =>
  renderHook(({ ids }) => useRowSelection(ids), { initialProps: { ids: order } });

describe('useRowSelection', () => {
  it('toggles one row at a time without Shift', () => {
    const { result } = renderSelection();
    act(() => result.current.toggle('R-0411', true));
    act(() => result.current.toggle('R-0413', true));
    expect([...result.current.selected]).toEqual(['R-0411', 'R-0413']);
    act(() => result.current.toggle('R-0411', false));
    expect([...result.current.selected]).toEqual(['R-0413']);
    expect(result.current.isSelected('R-0413')).toBe(true);
    expect(result.current.isSelected('R-0411')).toBe(false);
  });

  it('selects every row between the anchor and a Shift-clicked row, in either direction', () => {
    const { result } = renderSelection();
    act(() => result.current.toggle('R-0413', true));
    act(() => result.current.toggle('R-0411', true, true));
    expect([...result.current.selected].sort()).toEqual(['R-0411', 'R-0412', 'R-0413']);
    expect(result.current.count).toBe(3);
  });

  it('gives the whole range the new state, so Shift-clearing clears it', () => {
    const { result } = renderSelection();
    act(() => result.current.setAll(runs, true));
    act(() => result.current.toggle('R-0411', false));
    act(() => result.current.toggle('R-0413', false, true));
    expect([...result.current.selected].sort()).toEqual(['R-0410', 'R-0414']);
  });

  it('starts the next range where the last one ended', () => {
    const { result } = renderSelection();
    act(() => result.current.toggle('R-0410', true));
    act(() => result.current.toggle('R-0412', true, true));
    // The anchor is now R-0412, so this clears R-0412…R-0414, not R-0410…R-0414.
    act(() => result.current.toggle('R-0414', false, true));
    expect([...result.current.selected].sort()).toEqual(['R-0410', 'R-0411']);
  });

  it('selects only the clicked row when Shift is held but there is no anchor yet', () => {
    const { result } = renderSelection();
    act(() => result.current.toggle('R-0412', true, true));
    expect([...result.current.selected]).toEqual(['R-0412']);
  });

  it('forgets the anchor on clear', () => {
    const { result } = renderSelection();
    act(() => result.current.toggle('R-0410', true));
    act(() => result.current.clear());
    expect(result.current.count).toBe(0);
    act(() => result.current.toggle('R-0413', true, true));
    expect([...result.current.selected]).toEqual(['R-0413']);
  });

  it('follows the rows as they are shown now', () => {
    const { result, rerender } = renderSelection();
    act(() => result.current.toggle('R-0414', true));
    // Sorted newest first: R-0414 is now at the top.
    rerender({ ids: runs.toReversed() });
    act(() => result.current.toggle('R-0412', true, true));
    expect([...result.current.selected].sort()).toEqual(['R-0412', 'R-0413', 'R-0414']);
  });

  it('selects only the clicked row when the anchor has been filtered out', () => {
    const { result, rerender } = renderSelection();
    act(() => result.current.toggle('R-0410', true));
    rerender({ ids: runs.filter((id) => id !== 'R-0410') });
    act(() => result.current.toggle('R-0413', true, true));
    expect([...result.current.selected].sort()).toEqual(['R-0410', 'R-0413']);
  });

  it('reports all and some for the rows shown now', () => {
    const { result, rerender } = renderSelection();
    expect(result.current.all).toBe(false);
    expect(result.current.some).toBe(false);
    act(() => result.current.toggle('R-0410', true));
    expect(result.current.all).toBe(false);
    expect(result.current.some).toBe(true);
    act(() => result.current.setAll(runs, true));
    expect(result.current.all).toBe(true);
    expect(result.current.some).toBe(false);
    // A filter that hides a selected row does not count it.
    rerender({ ids: ['R-0410', 'R-0411'] });
    expect(result.current.all).toBe(true);
    act(() => result.current.setAll(['R-0410', 'R-0411'], false));
    expect(result.current.all).toBe(false);
    expect(result.current.some).toBe(false);
    // …and keeps the hidden rows selected.
    expect(result.current.count).toBe(3);
  });

  it('is never "all" with no rows', () => {
    const { result } = renderSelection([]);
    expect(result.current.all).toBe(false);
    expect(result.current.some).toBe(false);
  });
});

describe('withShift', () => {
  it('reads Shift from a click or a key event', () => {
    expect(withShift({ event: new MouseEvent('click', { shiftKey: true }) })).toBe(true);
    expect(withShift({ event: new KeyboardEvent('keydown', { key: ' ', shiftKey: true }) })).toBe(true);
    expect(withShift({ event: new MouseEvent('click') })).toBe(false);
  });

  it('is false without an event, or for an event that has no Shift state', () => {
    expect(withShift()).toBe(false);
    expect(withShift({})).toBe(false);
    expect(withShift({ event: new Event('change') })).toBe(false);
  });
});

/** The pattern from the docs: a checkbox per row, named after it, and aria-selected on the row. */
function SelectableRuns() {
  const sel = useRowSelection(runs);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Checkbox
              aria-label="Select all runs"
              checked={sel.all}
              indeterminate={sel.some}
              onCheckedChange={(c) => sel.setAll(runs, c)}
            />
          </TableHead>
          <TableHead>Run</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((id) => (
          <TableRow key={id} aria-selected={sel.isSelected(id) || undefined}>
            <TableCell>
              <Checkbox
                aria-label={`Select ${id}`}
                checked={sel.isSelected(id)}
                onCheckedChange={(c, d) => sel.toggle(id, c, withShift(d))}
              />
            </TableCell>
            <TableCell>{id}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const box = (id: string) => screen.getByRole('checkbox', { name: `Select ${id}` });
const checkedRuns = () => runs.filter((id) => box(id).getAttribute('aria-checked') === 'true');

describe('Table with row selection', () => {
  it('selects the focused row with Space and marks the row aria-selected', async () => {
    const user = userEvent.setup();
    render(<SelectableRuns />);
    box('R-0411').focus();
    await user.keyboard(' ');
    expect(box('R-0411')).toBeChecked();
    expect(box('R-0411').closest('tr')).toHaveAttribute('aria-selected', 'true');
    await user.keyboard(' ');
    expect(box('R-0411')).not.toBeChecked();
    expect(box('R-0411').closest('tr')).not.toHaveAttribute('aria-selected');
  });

  it('selects a range with Shift-click', async () => {
    const user = userEvent.setup();
    render(<SelectableRuns />);
    await user.click(box('R-0410'));
    await user.keyboard('{Shift>}');
    await user.click(box('R-0413'));
    await user.keyboard('{/Shift}');
    expect(checkedRuns()).toEqual(['R-0410', 'R-0411', 'R-0412', 'R-0413']);
  });

  it('selects a range with Shift + Space', async () => {
    const user = userEvent.setup();
    render(<SelectableRuns />);
    box('R-0414').focus();
    await user.keyboard(' ');
    box('R-0412').focus();
    await user.keyboard('{Shift>} {/Shift}');
    expect(checkedRuns()).toEqual(['R-0412', 'R-0413', 'R-0414']);
  });

  it('shows "some" as mixed on the header checkbox, and selects all from it', async () => {
    const user = userEvent.setup();
    render(<SelectableRuns />);
    const all = screen.getByRole('checkbox', { name: 'Select all runs' });
    expect(all).not.toBeChecked();
    await user.click(box('R-0412'));
    expect(all).toBePartiallyChecked();
    await user.click(all);
    expect(all).toBeChecked();
    expect(checkedRuns()).toEqual(runs);
  });
});
