// @vitest-environment jsdom
import './setup';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Toaster, useToast, type ToastType } from '../src/components/toast';

function QueueButton({ type, onUndo }: { type?: ToastType; onUndo?: () => void }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        toast.add({
          title: 'Run queued',
          description: 'R-0412 starts on Bench A in about 2 minutes.',
          type,
          actionProps: onUndo ? { children: 'Undo', onClick: onUndo } : undefined,
        })
      }
    >
      Queue run
    </button>
  );
}

async function queue(props: Parameters<typeof QueueButton>[0] = {}, timeout?: number) {
  const user = userEvent.setup();
  render(
    <Toaster timeout={timeout}>
      <QueueButton {...props} />
    </Toaster>,
  );
  await user.click(screen.getByRole('button', { name: 'Queue run' }));
  return user;
}

describe('Toast', () => {
  it('is announced politely, in a named region', async () => {
    await queue();
    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(region).toHaveAttribute('aria-live', 'polite');
    const toast = await within(region).findByRole('dialog', { name: 'Run queued' });
    expect(toast).toHaveAccessibleDescription('R-0412 starts on Bench A in about 2 minutes.');
  });

  it('pairs a status with an icon and a word', async () => {
    await queue({ type: 'success' });
    const toast = await screen.findByRole('dialog', { name: 'Run queued' });
    expect(toast.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(toast).toHaveTextContent('Run queued');
  });

  it('has no status icon for a default toast', async () => {
    await queue();
    const toast = await screen.findByRole('dialog', { name: 'Run queued' });
    // Only the dismiss button's icon.
    expect(toast.querySelectorAll('svg')).toHaveLength(1);
  });

  it('expands on hover, which reveals a named Dismiss button', async () => {
    const user = await queue();
    const toast = await screen.findByRole('dialog', { name: 'Run queued' });
    // Collapsed, the close button is hidden from assistive tech so every toast is not read out with it.
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
    await user.hover(toast);
    expect(toast).toHaveAttribute('data-expanded');
    await user.click(await screen.findByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Run queued' })).not.toBeInTheDocument());
  });

  it('reveals the Dismiss button to a keyboard user who reaches it', async () => {
    await queue();
    const toast = await screen.findByRole('dialog', { name: 'Run queued' });
    act(() => toast.querySelector<HTMLElement>('[aria-label="Dismiss"]')!.focus());
    expect(await screen.findByRole('button', { name: 'Dismiss' })).toHaveFocus();
  });

  it('runs its action', async () => {
    const onUndo = vi.fn();
    const user = await queue({ onUndo });
    await screen.findByRole('dialog', { name: 'Run queued' });
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('dismisses itself after the timeout', async () => {
    await queue({}, 50);
    await screen.findByRole('dialog', { name: 'Run queued' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Run queued' })).not.toBeInTheDocument());
  });
});
