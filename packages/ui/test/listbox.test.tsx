// @vitest-environment jsdom
import './setup';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Combobox, type ComboboxOption } from '../src/components/combobox';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../src/components/select';

// Synthetic rigs and actuators.
const rigs = [
  { value: 'bench-a', label: 'Bench A' },
  { value: 'bench-b', label: 'Bench B' },
  { value: 'climate', label: 'Climate chamber' },
  { value: 'dyno', label: 'Dynamometer' },
];

function RigSelect({ onValueChange }: { onValueChange?: (value: string | null) => void }) {
  return (
    <Select items={rigs} defaultValue="bench-a" onValueChange={onValueChange}>
      <SelectTrigger aria-label="Test rig">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectGroupLabel>Rigs</SelectGroupLabel>
          {rigs.map((rig) => (
            <SelectItem key={rig.value} value={rig.value}>
              {rig.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

const trigger = () => screen.getByRole('combobox', { name: 'Test rig' });
const highlighted = () => screen.getAllByRole('option').find((o) => o.hasAttribute('data-highlighted'));

describe('Select', () => {
  it('shows the selected label in a named trigger', () => {
    render(<RigSelect />);
    expect(trigger()).toHaveTextContent('Bench A');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it.each([['{Enter}'], [' '], ['{ArrowDown}']])('opens the list with %s', async (key) => {
    const user = userEvent.setup();
    render(<RigSelect />);
    trigger().focus();
    await user.keyboard(key);
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
  });

  it('moves the highlight with the arrow keys and chooses with Enter', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<RigSelect onValueChange={onValueChange} />);
    trigger().focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('listbox');
    await waitFor(() => expect(highlighted()).toHaveAccessibleName('Bench A'));
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(highlighted()).toHaveAccessibleName('Climate chamber');
    await user.keyboard('{ArrowUp}');
    expect(highlighted()).toHaveAccessibleName('Bench B');
    await user.keyboard('{Enter}');
    expect(onValueChange).toHaveBeenLastCalledWith('bench-b', expect.anything());
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(trigger()).toHaveTextContent('Bench B');
    expect(trigger()).toHaveFocus();
  });

  it('marks the selected option', async () => {
    const user = userEvent.setup();
    render(<RigSelect />);
    await user.click(trigger());
    expect(await screen.findByRole('option', { name: 'Bench A' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Dynamometer' })).toHaveAttribute('aria-selected', 'false');
  });

  it('jumps to an option by typing its first letter', async () => {
    const user = userEvent.setup();
    render(<RigSelect />);
    trigger().focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('listbox');
    await user.keyboard('d');
    await waitFor(() => expect(highlighted()).toHaveAccessibleName('Dynamometer'));
  });

  it('closes with Escape without changing the value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<RigSelect onValueChange={onValueChange} />);
    trigger().focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('listbox');
    await user.keyboard('{ArrowDown}{ArrowDown}{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(onValueChange).not.toHaveBeenCalled();
    expect(trigger()).toHaveTextContent('Bench A');
    expect(trigger()).toHaveFocus();
  });

  it('names a group by its label', async () => {
    const user = userEvent.setup();
    render(<RigSelect />);
    await user.click(trigger());
    expect(await screen.findByRole('group', { name: 'Rigs' })).toBeInTheDocument();
  });
});

const actuators: ComboboxOption[] = [
  { value: 'act-01', label: 'Pitch actuator', description: 'Left wing, 48 V' },
  { value: 'act-02', label: 'Roll actuator', description: 'Right wing, 48 V' },
  { value: 'act-03', label: 'Réglage trim', description: 'Synthetic, accented label' },
  { value: 'act-04', label: 'Yaw damper' },
];

function ActuatorPicker({ onValueChange }: { onValueChange?: (value: ComboboxOption | null) => void }) {
  return <Combobox aria-label="Actuator" items={actuators} onValueChange={onValueChange} />;
}

const input = () => screen.getByRole('combobox', { name: 'Actuator' });
const shown = () => screen.queryAllByRole('option').map((o) => o.querySelector('.truncate')?.textContent);

describe('Combobox', () => {
  it('filters the list as you type', async () => {
    const user = userEvent.setup();
    render(<ActuatorPicker />);
    await user.type(input(), 'actuator');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(shown()).toEqual(['Pitch actuator', 'Roll actuator']);
  });

  it('matches without regard to case or accents', async () => {
    const user = userEvent.setup();
    render(<ActuatorPicker />);
    await user.type(input(), 'REGLAGE');
    await screen.findByRole('listbox');
    expect(shown()).toEqual(['Réglage trim']);
  });

  it('moves the highlight with the arrow keys and selects with Enter', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ActuatorPicker onValueChange={onValueChange} />);
    await user.type(input(), 'actuator');
    await screen.findByRole('listbox');
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onValueChange).toHaveBeenLastCalledWith(actuators[1], expect.anything());
    expect(input()).toHaveValue('Roll actuator');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('says so when nothing matches', async () => {
    const user = userEvent.setup();
    render(<ActuatorPicker />);
    await user.type(input(), 'flux');
    expect(await screen.findByText('No matches.')).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('closes with Escape', async () => {
    const user = userEvent.setup();
    render(<ActuatorPicker />);
    await user.type(input(), 'yaw');
    await screen.findByRole('listbox');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(input()).toHaveFocus();
  });

  it('names its buttons and clears the value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Combobox
        aria-label="Actuator"
        items={actuators}
        defaultValue={actuators[3]}
        onValueChange={onValueChange}
      />,
    );
    expect(input()).toHaveValue('Yaw damper');
    expect(screen.getByRole('button', { name: 'Show options' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onValueChange).toHaveBeenLastCalledWith(null, expect.anything());
    expect(input()).toHaveValue('');
  });
});
