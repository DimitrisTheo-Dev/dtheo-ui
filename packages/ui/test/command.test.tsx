// @vitest-environment jsdom
import './setup';
import * as React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommandDialog, isKKey, type CommandItemData } from '../src/components/command';

// Synthetic commands for a fictional test-rig suite.
const items: CommandItemData[] = [
  { value: 'runs', label: 'Runs', group: 'Pages', hint: 'Every step response on the rig' },
  { value: 'step-test', label: 'Step test', group: 'Pages', keywords: ['response', 'overshoot'] },
  { value: 'response-step', label: 'Response of a step', group: 'Charts' },
  { value: 'step-response', label: 'Step response', group: 'Charts' },
  { value: 'retune', label: 'Retune gains', group: 'Actions', keywords: ['pid', 'controller'] },
  { value: 'archive', label: 'Archive run', group: 'Actions', shortcut: '⌘⌫' },
];

function Palette({
  initialOpen = true,
  onOpenChange,
  ...props
}: Partial<React.ComponentProps<typeof CommandDialog>> & { initialOpen?: boolean }) {
  const [open, setOpen] = React.useState(initialOpen);
  return (
    <CommandDialog
      items={items}
      open={open}
      onOpenChange={(next) => {
        onOpenChange?.(next);
        setOpen(next);
      }}
      {...props}
    />
  );
}

const input = () => screen.getByRole('combobox', { name: 'Search commands' });
/** The label of every option, in order (an option's text also holds its hint and shortcut). */
const options = () => screen.getAllByRole('option').map((o) => o.querySelector('span')?.textContent);
/** Group names in the list, in order. Each group is labelled by its heading. */
const groups = () =>
  within(screen.getByRole('listbox'))
    .getAllByRole('group')
    .map((g) => document.getElementById(g.getAttribute('aria-labelledby') ?? '')?.textContent);

async function search(query: string) {
  const user = userEvent.setup();
  render(<Palette />);
  await user.type(input(), query);
  return user;
}

describe('isKKey', () => {
  it('takes the letter a Latin layout reports, wherever the key sits', () => {
    expect(isKKey({ key: 'k', code: 'KeyK' })).toBe(true);
    expect(isKKey({ key: 'K', code: 'KeyK' })).toBe(true);
    // Dvorak: the K sits where QWERTY has V, and the physical K key types T.
    expect(isKKey({ key: 'k', code: 'KeyV' })).toBe(true);
    expect(isKKey({ key: 't', code: 'KeyK' })).toBe(false);
  });

  it('falls back to the physical key on a non-Latin layout', () => {
    expect(isKKey({ key: 'κ', code: 'KeyK' })).toBe(true); // Greek
    expect(isKKey({ key: 'л', code: 'KeyK' })).toBe(true); // Russian
    expect(isKKey({ key: 'ל', code: 'KeyK' })).toBe(true); // Hebrew
    expect(isKKey({ key: 'ξ', code: 'KeyJ' })).toBe(false);
  });

  it('ignores named keys', () => {
    expect(isKKey({ key: 'Enter', code: 'Enter' })).toBe(false);
    expect(isKKey({ key: 'Meta', code: 'MetaLeft' })).toBe(false);
  });
});

describe('CommandDialog', () => {
  describe('search', () => {
    it('lists every group, named, in its original order before anything is typed', () => {
      render(<Palette />);
      expect(groups()).toEqual(['Pages', 'Charts', 'Actions']);
      expect(within(screen.getByRole('group', { name: 'Actions' })).getAllByRole('option')).toHaveLength(2);
      expect(options()).toEqual(items.map((i) => i.label));
    });

    it('needs every word of the query, from the label, hint or keywords', async () => {
      await search('step overshoot');
      expect(options()).toEqual(['Step test']);
    });

    it('finds an item by a keyword it never shows', async () => {
      await search('pid');
      expect(options()).toEqual(['Retune gains']);
      expect(screen.queryByText('pid')).not.toBeInTheDocument();
    });

    it('ranks the exact label first, then labels with every word, then hints and keywords', async () => {
      await search('step response');
      // Charts holds the exact label, so it moves above Pages, whose items match through a hint and a keyword.
      expect(groups()).toEqual(['Charts', 'Pages']);
      expect(options()).toEqual(['Step response', 'Response of a step', 'Runs', 'Step test']);
    });

    it('lists label matches before hint matches inside a group', async () => {
      await search('step');
      expect(options()).toEqual(['Step test', 'Runs', 'Response of a step', 'Step response']);
    });

    it('moves the group of an exact match to the top, so Enter opens it', async () => {
      const onSelect = vi.fn();
      const user = userEvent.setup();
      render(
        <CommandDialog
          open
          onOpenChange={() => {}}
          items={[
            { value: 'a', label: 'Overshoot chart', group: 'Charts' },
            { value: 'b', label: 'Overshoot', group: 'Metrics', onSelect },
          ]}
        />,
      );
      await user.type(input(), 'overshoot');
      expect(groups()).toEqual(['Metrics', 'Charts']);
      await user.keyboard('{Enter}');
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('ignores case and surrounding spaces', async () => {
      await search('  ARCHIVE  ');
      expect(options()).toEqual(['Archive run']);
    });

    it('says what to try when nothing matches', async () => {
      await search('flux capacitor');
      expect(screen.queryAllByRole('option')).toHaveLength(0);
      expect(screen.getByText('No matching commands.')).toBeInTheDocument();
    });

    it('shows a custom empty message', async () => {
      const user = userEvent.setup();
      render(<Palette emptyMessage="Try a run id, such as R-0412." />);
      await user.type(input(), 'zzz');
      expect(screen.getByText('Try a run id, such as R-0412.')).toBeInTheDocument();
    });
  });

  describe('keyboard', () => {
    it('opens with focus in the search field, named and described', async () => {
      render(<Palette />);
      expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
      await waitFor(() => expect(input()).toHaveFocus());
      expect(input()).toHaveAccessibleDescription(
        'Use the arrow keys to move and Enter to run the highlighted command.',
      );
    });

    it('runs the highlighted command with Enter, then closes', async () => {
      const onSelect = vi.fn();
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      render(
        <Palette
          onOpenChange={onOpenChange}
          items={items.map((i) => (i.value === 'retune' ? { ...i, onSelect } : i))}
        />,
      );
      await user.type(input(), 'retune');
      await user.keyboard('{Enter}');
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('moves the highlight with the arrow keys', async () => {
      const onSelect = vi.fn();
      const user = userEvent.setup();
      render(<Palette items={items.map((i) => (i.value === 'step-test' ? { ...i, onSelect } : i))} />);
      await waitFor(() => expect(input()).toHaveFocus());
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('option', { name: 'Step test' })).toHaveAttribute('data-highlighted');
      await user.keyboard('{Enter}');
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('closes with Escape', async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      render(<Palette onOpenChange={onOpenChange} />);
      await waitFor(() => expect(input()).toHaveFocus());
      await user.keyboard('{Escape}');
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('starts every opening with an empty query', async () => {
      const user = userEvent.setup();
      render(<Palette />);
      await user.type(input(), 'retune');
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      fireEvent.keyDown(window, { key: 'k', code: 'KeyK', metaKey: true });
      expect(await screen.findByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
      expect(input()).toHaveValue('');
    });
  });

  describe('⌘K', () => {
    it('opens with ⌘K and closes with it again', async () => {
      render(<Palette initialOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      const notCancelled = fireEvent.keyDown(window, { key: 'k', code: 'KeyK', metaKey: true });
      expect(notCancelled).toBe(false);
      expect(await screen.findByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
      fireEvent.keyDown(window, { key: 'k', code: 'KeyK', metaKey: true });
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('opens with Ctrl+K', async () => {
      render(<Palette initialOpen={false} />);
      fireEvent.keyDown(window, { key: 'k', code: 'KeyK', ctrlKey: true });
      expect(await screen.findByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    });

    it('opens on a Greek layout, where the key reports κ', async () => {
      render(<Palette initialOpen={false} />);
      fireEvent.keyDown(window, { key: 'κ', code: 'KeyK', ctrlKey: true });
      expect(await screen.findByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    });

    it('needs ⌘ or Ctrl, and leaves other shortcuts alone', () => {
      const onOpenChange = vi.fn();
      render(<Palette initialOpen={false} onOpenChange={onOpenChange} />);
      expect(fireEvent.keyDown(window, { key: 'k', code: 'KeyK' })).toBe(true);
      expect(fireEvent.keyDown(window, { key: 'j', code: 'KeyJ', metaKey: true })).toBe(true);
      expect(fireEvent.keyDown(window, { key: 'κ', code: 'KeyJ', ctrlKey: true })).toBe(true);
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('leaves Ctrl+K to the text field on a Mac, where it deletes to the end of the line', async () => {
      const platform = vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
      try {
        render(<Palette initialOpen={false} />);
        expect(fireEvent.keyDown(window, { key: 'k', code: 'KeyK', ctrlKey: true })).toBe(true);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        fireEvent.keyDown(window, { key: 'k', code: 'KeyK', metaKey: true });
        expect(await screen.findByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
      } finally {
        platform.mockRestore();
      }
    });

    it('does nothing with shortcut={false}, so another palette can own it', () => {
      const onOpenChange = vi.fn();
      render(<Palette initialOpen={false} shortcut={false} onOpenChange={onOpenChange} />);
      expect(fireEvent.keyDown(window, { key: 'k', code: 'KeyK', metaKey: true })).toBe(true);
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
