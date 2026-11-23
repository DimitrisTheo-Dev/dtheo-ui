// @vitest-environment jsdom
import './setup';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../src/components/alert-dialog';
import { Button } from '../src/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../src/components/dialog';
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '../src/components/popover';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '../src/components/sheet';
import { ThemeScope } from '../src/lib/theme';

function RenameDialog() {
  return (
    <>
      <button type="button">Outside</button>
      <Dialog>
        <DialogTrigger render={<Button />}>Rename run</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename R-0412</DialogTitle>
            <DialogDescription>Names show in the run history.</DialogDescription>
          </DialogHeader>
          <label>
            Name <input defaultValue="Step test, 48 V" />
          </label>
          <DialogFooter>
            <DialogClose render={<Button />}>Cancel</DialogClose>
            <Button variant="primary">Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

async function open(name: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name }));
  return user;
}

describe('Dialog', () => {
  it('is a dialog named by its title and described by its description', async () => {
    render(<RenameDialog />);
    await open('Rename run');
    const dialog = await screen.findByRole('dialog', { name: 'Rename R-0412' });
    expect(dialog).toHaveAccessibleDescription('Names show in the run history.');
  });

  it('moves focus in', async () => {
    render(<RenameDialog />);
    await open('Rename run');
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
  });

  it('hides the page behind it from assistive tech', async () => {
    render(<RenameDialog />);
    await open('Rename run');
    await screen.findByRole('dialog');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Outside' })).not.toBeInTheDocument());
  });

  it('cycles Tab and Shift+Tab within the dialog', async () => {
    render(<RenameDialog />);
    const user = await open('Rename run');
    const dialog = await screen.findByRole('dialog');
    const focusIsInside = () =>
      waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
    await focusIsInside();
    // Input, Cancel, Rename, Close: five presses go all the way round and past the start.
    const seen = new Set<Element | null>();
    for (let i = 0; i < 5; i++) {
      await user.tab();
      await focusIsInside();
      seen.add(document.activeElement);
    }
    expect(seen).toContain(screen.getByRole('button', { name: 'Close' }));
    expect(seen).toContain(screen.getByRole('textbox', { name: 'Name' }));
    for (let i = 0; i < 5; i++) {
      await user.tab({ shift: true });
      await focusIsInside();
    }
  });

  it('closes with Escape and returns focus to the trigger', async () => {
    render(<RenameDialog />);
    const user = await open('Rename run');
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Rename run' })).toHaveFocus();
  });

  it('has a named close button', async () => {
    render(<RenameDialog />);
    const user = await open('Rename run');
    await user.click(await screen.findByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Rename run' })).toHaveFocus();
  });

  it('opens inside the ThemeScope it was opened from', async () => {
    render(
      <ThemeScope mode="dark" preset="carbon" data-testid="scope">
        <RenameDialog />
      </ThemeScope>,
    );
    await open('Rename run');
    const dialog = await screen.findByRole('dialog');
    expect(screen.getByTestId('scope')).toContainElement(dialog);
  });
});

function DeleteRuns({ onDelete = () => {} }: { onDelete?: () => void }) {
  return (
    <>
      <button type="button">Outside</button>
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive" />}>Delete runs</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Delete 3 runs?</AlertDialogTitle>
          <AlertDialogDescription>Their traces are removed for good.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button />}>Cancel</AlertDialogClose>
            <AlertDialogClose render={<Button variant="destructive" />} onClick={onDelete}>
              Delete runs
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

describe('AlertDialog', () => {
  it('is an alert dialog named by the consequence', async () => {
    render(<DeleteRuns />);
    await open('Delete runs');
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete 3 runs?' });
    expect(dialog).toHaveAccessibleDescription('Their traces are removed for good.');
  });

  it('cancels with Escape and returns focus to the trigger', async () => {
    const onDelete = vi.fn();
    render(<DeleteRuns onDelete={onDelete} />);
    const user = await open('Delete runs');
    const dialog = await screen.findByRole('alertdialog');
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete runs' })).toHaveFocus();
  });

  it('is not dismissed by clicking outside', async () => {
    render(<DeleteRuns />);
    const user = await open('Delete runs');
    await screen.findByRole('alertdialog');
    await user.click(document.body);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('runs the confirming action and closes', async () => {
    const onDelete = vi.fn();
    render(<DeleteRuns onDelete={onDelete} />);
    const user = await open('Delete runs');
    const dialog = await screen.findByRole('alertdialog');
    const confirm = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent === 'Delete runs',
    )!;
    await user.click(confirm);
    expect(onDelete).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });
});

describe('Popover', () => {
  it('closes with Escape and returns focus to the trigger', async () => {
    render(
      <Popover>
        <PopoverTrigger render={<Button />}>Filters</PopoverTrigger>
        <PopoverContent>
          <PopoverTitle>Filter runs</PopoverTitle>
          <label>
            Rig <input />
          </label>
        </PopoverContent>
      </Popover>,
    );
    const user = await open('Filters');
    const popover = await screen.findByRole('dialog', { name: 'Filter runs' });
    expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(popover).toContainElement(document.activeElement as HTMLElement));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Filters' })).toHaveFocus();
  });
});

describe('Sheet', () => {
  it('closes with Escape and returns focus to the trigger', async () => {
    render(
      <Sheet>
        <SheetTrigger render={<Button />}>Inspect R-0412</SheetTrigger>
        <SheetContent>
          <SheetTitle>R-0412</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    const user = await open('Inspect R-0412');
    const sheet = await screen.findByRole('dialog', { name: 'R-0412' });
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    await waitFor(() => expect(sheet).toContainElement(document.activeElement as HTMLElement));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Inspect R-0412' })).toHaveFocus();
  });
});
