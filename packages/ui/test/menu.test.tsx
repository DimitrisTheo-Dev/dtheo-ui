// @vitest-environment jsdom
import './setup';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../src/components/button';
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from '../src/components/menu';

function RunActions({ onRun = () => {} }: { onRun?: (action: string) => void }) {
  return (
    <Menu>
      <MenuTrigger render={<Button />}>Run actions</MenuTrigger>
      <MenuContent>
        <MenuGroup>
          <MenuLabel>Run R-0412</MenuLabel>
          <MenuItem onClick={() => onRun('duplicate')}>
            Duplicate <MenuShortcut>⌘D</MenuShortcut>
          </MenuItem>
          <MenuItem onClick={() => onRun('compare')}>Compare</MenuItem>
          <MenuSub>
            <MenuSubTrigger>Export</MenuSubTrigger>
            <MenuSubContent>
              <MenuItem onClick={() => onRun('csv')}>CSV</MenuItem>
              <MenuItem onClick={() => onRun('parquet')}>Parquet</MenuItem>
            </MenuSubContent>
          </MenuSub>
        </MenuGroup>
        <MenuSeparator />
        <MenuCheckboxItem>Show reference</MenuCheckboxItem>
        <MenuRadioGroup defaultValue="1s">
          <MenuRadioItem value="400ms">400 ms</MenuRadioItem>
          <MenuRadioItem value="1s">1 s</MenuRadioItem>
        </MenuRadioGroup>
        <MenuItem variant="destructive" onClick={() => onRun('archive')}>
          Archive
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

const trigger = () => screen.getByRole('button', { name: 'Run actions' });

async function openWith(key: string) {
  const user = userEvent.setup();
  trigger().focus();
  await user.keyboard(key);
  const menu = await screen.findByRole('menu');
  return { user, menu };
}

describe('Menu', () => {
  it.each([['{Enter}'], [' '], ['{ArrowDown}']])('opens from the keyboard with %s', async (key) => {
    render(<RunActions />);
    await openWith(key);
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: /Duplicate/ })).toHaveFocus());
  });

  it('moves with the arrow keys and runs the highlighted item with Enter', async () => {
    const onRun = vi.fn();
    render(<RunActions onRun={onRun} />);
    const { user } = await openWith('{ArrowDown}');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: /Duplicate/ })).toHaveFocus());
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Compare' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onRun).toHaveBeenCalledWith('compare');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger()).toHaveFocus();
  });

  it('runs the highlighted item with Space', async () => {
    const onRun = vi.fn();
    render(<RunActions onRun={onRun} />);
    const { user } = await openWith('{ArrowDown}');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: /Duplicate/ })).toHaveFocus());
    await user.keyboard(' ');
    expect(onRun).toHaveBeenCalledWith('duplicate');
  });

  it('jumps to an item by typing its first letter', async () => {
    render(<RunActions />);
    const { user } = await openWith('{ArrowDown}');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: /Duplicate/ })).toHaveFocus());
    await user.keyboard('a');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Archive' })).toHaveFocus());
  });

  it('opens a submenu with the right arrow and closes it with the left', async () => {
    const onRun = vi.fn();
    render(<RunActions onRun={onRun} />);
    const { user } = await openWith('{ArrowDown}');
    const sub = screen.getByRole('menuitem', { name: 'Export' });
    await waitFor(() => expect(screen.getByRole('menuitem', { name: /Duplicate/ })).toHaveFocus());
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(sub).toHaveFocus();
    expect(sub).toHaveAttribute('aria-haspopup', 'menu');
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'CSV' })).toHaveFocus());
    expect(screen.getAllByRole('menu')).toHaveLength(2);
    await user.keyboard('{ArrowLeft}');
    await waitFor(() => expect(screen.getAllByRole('menu')).toHaveLength(1));
    expect(sub).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'CSV' })).toHaveFocus());
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onRun).toHaveBeenCalledWith('parquet');
  });

  it('closes with Escape and returns focus to the trigger', async () => {
    render(<RunActions />);
    const { user } = await openWith('{Enter}');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger()).toHaveFocus();
  });

  it('checks and selects items with the matching roles', async () => {
    const user = userEvent.setup();
    render(<RunActions />);
    await user.click(trigger());
    const show = await screen.findByRole('menuitemcheckbox', { name: 'Show reference' });
    expect(show).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('menuitemradio', { name: '1 s' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('group', { name: 'Run R-0412' })).toBeInTheDocument();
    await user.click(show);
    expect(show).toHaveAttribute('aria-checked', 'true');
  });
});
