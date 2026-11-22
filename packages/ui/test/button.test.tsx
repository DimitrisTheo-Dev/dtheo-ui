// @vitest-environment jsdom
/* oxlint-disable jsx-a11y/control-has-associated-label -- every <a /> passed to `render` takes its text from the Button's children, which is what these tests check. */
import './setup';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MouseEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../src/components/button';

describe('Button', () => {
  it('activates with Enter and Space', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Run test</Button>);
    const button = screen.getByRole('button', { name: 'Run test' });
    button.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('moves focus to the next control with Tab, and skips a disabled one', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Button>Queue run</Button>
        <Button disabled>Archive</Button>
        <Button>Compare</Button>
      </>,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'Queue run' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Compare' })).toHaveFocus();
  });

  describe('loading', () => {
    it('keeps its accessible name and says it is busy', () => {
      render(<Button loading>Save run</Button>);
      const button = screen.getByRole('button', { name: 'Save run' });
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('stays focusable but does not act', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <>
          <Button>Before</Button>
          <Button loading onClick={onClick}>
            Save run
          </Button>
        </>,
      );
      await user.tab();
      await user.tab();
      const button = screen.getByRole('button', { name: 'Save run' });
      expect(button).toHaveFocus();
      expect(button).not.toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
      await user.keyboard('{Enter}');
      await user.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('drops aria-busy once it finishes', () => {
      const { rerender } = render(<Button loading>Save run</Button>);
      rerender(<Button>Save run</Button>);
      expect(screen.getByRole('button', { name: 'Save run' })).not.toHaveAttribute('aria-busy');
    });
  });

  describe('rendered as a link', () => {
    it('stays a link: link role, its href, no button role', () => {
      render(<Button render={<a href="/runs/R-0412" />}>Open run</Button>);
      const link = screen.getByRole('link', { name: 'Open run' });
      expect(link).toHaveAttribute('href', '/runs/R-0412');
      expect(link).not.toHaveAttribute('role');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('follows with Enter but not with Space, like any link', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn((e: MouseEvent) => e.preventDefault());
      render(
        <Button render={<a href="/runs" />} onClick={onClick}>
          All runs
        </Button>,
      );
      screen.getByRole('link', { name: 'All runs' }).focus();
      await user.keyboard(' ');
      expect(onClick).not.toHaveBeenCalled();
      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not leak button-only options into the DOM', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      render(
        <Button render={<a href="/runs" />} nativeButton={false} focusableWhenDisabled>
          All runs
        </Button>,
      );
      const link = screen.getByRole('link', { name: 'All runs' });
      expect(link).not.toHaveAttribute('nativebutton');
      expect(link).not.toHaveAttribute('focusablewhendisabled');
      expect(error).not.toHaveBeenCalled();
      error.mockRestore();
    });

    describe('disabled', () => {
      it('stays a link with its href, and says it is disabled', () => {
        render(
          <Button render={<a href="/runs/R-0412/retune" />} disabled>
            Retune
          </Button>,
        );
        const link = screen.getByRole('link', { name: 'Retune' });
        expect(link).toHaveAttribute('href', '/runs/R-0412/retune');
        expect(link).toHaveAttribute('aria-disabled', 'true');
        expect(link).toHaveAttribute('data-disabled');
        expect(link).toHaveAttribute('tabindex', '-1');
      });

      it('leaves the tab order', async () => {
        const user = userEvent.setup();
        render(
          <>
            <Button>Before</Button>
            <Button render={<a href="/runs" />} disabled>
              All runs
            </Button>
            <Button>After</Button>
          </>,
        );
        await user.tab();
        await user.tab();
        expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
      });

      it('does not navigate, and does not run its click handler', () => {
        const onClick = vi.fn();
        render(
          <Button render={<a href="/runs" />} disabled onClick={onClick}>
            All runs
          </Button>,
        );
        const notCancelled = fireEvent.click(screen.getByRole('link', { name: 'All runs' }));
        expect(notCancelled).toBe(false);
        expect(onClick).not.toHaveBeenCalled();
      });

      it('becomes a normal link again when enabled', () => {
        const { rerender } = render(
          <Button render={<a href="#runs" />} disabled>
            All runs
          </Button>,
        );
        rerender(<Button render={<a href="#runs" />}>All runs</Button>);
        const link = screen.getByRole('link', { name: 'All runs' });
        expect(link).not.toHaveAttribute('aria-disabled');
        expect(link).not.toHaveAttribute('data-disabled');
        expect(link).not.toHaveAttribute('tabindex');
        expect(fireEvent.click(link)).toBe(true);
      });
    });
  });
});
