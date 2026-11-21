// @vitest-environment jsdom
import './setup';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox, CheckboxGroup } from '../src/components/checkbox';
import { Radio, RadioGroup } from '../src/components/radio-group';
import { Switch } from '../src/components/switch';
import { SegmentedControl, SegmentedControlItem, Toggle } from '../src/components/toggle-group';

describe('Checkbox', () => {
  it('toggles with Space', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Include aborted runs" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole('checkbox', { name: 'Include aborted runs' });
    box.focus();
    await user.keyboard(' ');
    expect(box).toBeChecked();
    await user.keyboard(' ');
    expect(box).not.toBeChecked();
    expect(onCheckedChange.mock.calls.map(([checked]) => checked)).toEqual([true, false]);
  });

  it('does not toggle with Enter', async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Include aborted runs" />);
    const box = screen.getByRole('checkbox', { name: 'Include aborted runs' });
    box.focus();
    await user.keyboard('{Enter}');
    expect(box).not.toBeChecked();
  });

  it('is named by a wrapping label, whose text toggles it', async () => {
    const user = userEvent.setup();
    render(
      <label>
        <Checkbox /> Include aborted runs
      </label>,
    );
    const box = screen.getByRole('checkbox', { name: 'Include aborted runs' });
    await user.click(screen.getByText('Include aborted runs'));
    expect(box).toBeChecked();
  });

  it('shows "some selected" as mixed', () => {
    render(<Checkbox aria-label="Select all runs" indeterminate />);
    expect(screen.getByRole('checkbox', { name: 'Select all runs' })).toBePartiallyChecked();
  });

  it('cannot be toggled while disabled', async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Include aborted runs" disabled />);
    const box = screen.getByRole('checkbox', { name: 'Include aborted runs' });
    await user.click(box);
    expect(box).not.toBeChecked();
    expect(box).toHaveAttribute('aria-disabled', 'true');
  });

  it('reports the checked values of a group', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <CheckboxGroup aria-label="Channels" defaultValue={['torque']} onValueChange={onValueChange}>
        <label>
          <Checkbox value="torque" /> Torque
        </label>
        <label>
          <Checkbox value="speed" /> Speed
        </label>
      </CheckboxGroup>,
    );
    expect(screen.getByRole('group', { name: 'Channels' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Torque' })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: 'Speed' }));
    expect(onValueChange).toHaveBeenLastCalledWith(['torque', 'speed'], expect.anything());
  });
});

describe('Switch', () => {
  it('toggles with Space and with Enter', async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Live telemetry" />);
    const toggle = screen.getByRole('switch', { name: 'Live telemetry' });
    toggle.focus();
    await user.keyboard(' ');
    expect(toggle).toBeChecked();
    await user.keyboard('{Enter}');
    expect(toggle).not.toBeChecked();
  });

  it('is named by a wrapping label', async () => {
    const user = userEvent.setup();
    render(
      <label>
        <Switch /> Live telemetry
      </label>,
    );
    await user.click(screen.getByText('Live telemetry'));
    expect(screen.getByRole('switch', { name: 'Live telemetry' })).toBeChecked();
  });
});

function Profiles() {
  return (
    <RadioGroup aria-label="Load profile" defaultValue="step">
      <label>
        <Radio value="step" /> Step
      </label>
      <label>
        <Radio value="ramp" /> Ramp
      </label>
      <label>
        <Radio value="sine" /> Sine sweep
      </label>
    </RadioGroup>
  );
}

describe('RadioGroup', () => {
  it('is a named group of radios', () => {
    render(<Profiles />);
    expect(screen.getByRole('radiogroup', { name: 'Load profile' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Step' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Ramp' })).not.toBeChecked();
  });

  it('moves and selects with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<Profiles />);
    await user.tab();
    expect(screen.getByRole('radio', { name: 'Step' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Ramp' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Ramp' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Step' })).not.toBeChecked();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Sine sweep' })).toBeChecked();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('radio', { name: 'Ramp' })).toBeChecked();
  });

  it('is one tab stop', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Profiles />
        <button type="button">Run</button>
      </>,
    );
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Run' })).toHaveFocus();
  });
});

function TimeWindow({ onValueChange }: { onValueChange?: (value: string[]) => void }) {
  return (
    <SegmentedControl aria-label="Time window" defaultValue={['1s']} onValueChange={onValueChange}>
      <SegmentedControlItem value="400ms">400 ms</SegmentedControlItem>
      <SegmentedControlItem value="1s">1 s</SegmentedControlItem>
      <SegmentedControlItem value="10s">10 s</SegmentedControlItem>
    </SegmentedControl>
  );
}

describe('SegmentedControl', () => {
  it('is a named group whose segments say which one is pressed', () => {
    render(<TimeWindow />);
    expect(screen.getByRole('group', { name: 'Time window' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 s' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '400 ms' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('moves between segments with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<TimeWindow />);
    screen.getByRole('button', { name: '1 s' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: '10 s' })).toHaveFocus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('button', { name: '400 ms' })).toHaveFocus();
  });

  it('selects the focused segment with Enter or Space, and only one at a time', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TimeWindow onValueChange={onValueChange} />);
    screen.getByRole('button', { name: '1 s' }).focus();
    await user.keyboard('{ArrowRight}{Enter}');
    expect(screen.getByRole('button', { name: '10 s' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '1 s' })).toHaveAttribute('aria-pressed', 'false');
    await user.keyboard('{ArrowLeft}{ArrowLeft} ');
    expect(screen.getByRole('button', { name: '400 ms' })).toHaveAttribute('aria-pressed', 'true');
    expect(onValueChange.mock.calls.map(([value]) => value)).toEqual([['10s'], ['400ms']]);
  });
});

describe('Toggle', () => {
  it('reports its pressed state and flips with Space', async () => {
    const user = userEvent.setup();
    render(<Toggle aria-label="Show reference" />);
    const toggle = screen.getByRole('button', { name: 'Show reference' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    toggle.focus();
    await user.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });
});
