// @vitest-environment jsdom
import './setup';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsList, TabsPanel, TabsTab } from '../src/components/tabs';

function RunTabs({ variant }: { variant?: 'segmented' | 'underline' }) {
  return (
    <Tabs defaultValue="overview">
      <TabsList aria-label="Run R-0412" variant={variant}>
        <TabsTab value="overview">Overview</TabsTab>
        <TabsTab value="traces">Traces</TabsTab>
        <TabsTab value="notes">Notes</TabsTab>
      </TabsList>
      <TabsPanel value="overview">Settled in 182 ms.</TabsPanel>
      <TabsPanel value="traces">Torque and speed traces.</TabsPanel>
      <TabsPanel value="notes">No notes yet.</TabsPanel>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('is a named tab list whose panel is named by its tab', () => {
    render(<RunTabs />);
    expect(screen.getByRole('tablist', { name: 'Run R-0412' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Overview' })).toHaveTextContent('Settled in 182 ms.');
  });

  it.each(['segmented', 'underline'] as const)(
    'moves between tabs with the arrow keys (%s)',
    async (variant) => {
      const user = userEvent.setup();
      render(<RunTabs variant={variant} />);
      await user.tab();
      expect(screen.getByRole('tab', { name: 'Overview' })).toHaveFocus();
      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('tab', { name: 'Traces' })).toHaveFocus();
      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('tab', { name: 'Notes' })).toHaveFocus();
      await user.keyboard('{ArrowLeft}');
      expect(screen.getByRole('tab', { name: 'Traces' })).toHaveFocus();
    },
  );

  it('shows the focused tab’s panel when it is activated', async () => {
    const user = userEvent.setup();
    render(<RunTabs />);
    await user.tab();
    await user.keyboard('{ArrowRight}{Enter}');
    expect(screen.getByRole('tab', { name: 'Traces' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Traces' })).toHaveTextContent('Torque and speed traces.');
  });

  it('is one tab stop: Tab leaves the list for the panel', async () => {
    const user = userEvent.setup();
    render(<RunTabs />);
    await user.tab();
    await user.tab();
    expect(screen.getByRole('tabpanel', { name: 'Overview' })).toHaveFocus();
  });
});
