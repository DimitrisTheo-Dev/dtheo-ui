// @vitest-environment jsdom
import './setup';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from '../src/components/checkbox';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldItem,
  FieldLabel,
  Fieldset,
  FieldsetLegend,
  Label,
} from '../src/components/field';
import { Input } from '../src/components/input';
import { NumberField } from '../src/components/number-field';
import { Textarea } from '../src/components/textarea';

// The pattern the docs use when validity comes from outside: `invalid` on the Field, `match={invalid}` on the error.
function ExternalGain({ value }: { value: number }) {
  const invalid = value < 0 || value > 10;
  return (
    <Field invalid={invalid}>
      <FieldLabel>Proportional gain</FieldLabel>
      <Input value={String(value)} readOnly />
      <FieldDescription>Between 0 and 10.</FieldDescription>
      <FieldError match={invalid}>Enter a gain between 0 and 10.</FieldError>
    </Field>
  );
}

/** A field whose own check decides the error, as the contract tells callers to write it. */
function GainError({ invalid }: { invalid: boolean }) {
  return (
    <Field invalid={invalid}>
      <FieldLabel>Proportional gain</FieldLabel>
      <Input defaultValue={invalid ? '14' : '4'} />
      <FieldError match={invalid}>Enter a gain between 0 and 10.</FieldError>
    </Field>
  );
}

describe('Field', () => {
  it('names the control with its label and describes it with the help text', () => {
    render(
      <Field>
        <FieldLabel>Run name</FieldLabel>
        <Input />
        <FieldDescription>Shown in the run history.</FieldDescription>
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Run name' });
    expect(input).toHaveAccessibleDescription('Shown in the run history.');
  });

  it('marks the control invalid and announces the error with it', () => {
    render(<ExternalGain value={14} />);
    const input = screen.getByRole('textbox', { name: 'Proportional gain' });
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription(expect.stringContaining('Enter a gain between 0 and 10.'));
    expect(input).toHaveAccessibleDescription(expect.stringContaining('Between 0 and 10.'));
  });

  it('hides the error, and drops it from the description, once the field is valid', async () => {
    const { rerender } = render(<ExternalGain value={14} />);
    rerender(<ExternalGain value={4} />);
    const input = screen.getByRole('textbox', { name: 'Proportional gain' });
    expect(input).not.toBeInvalid();
    await waitFor(() => expect(screen.queryByText('Enter a gain between 0 and 10.')).not.toBeInTheDocument());
    expect(input).toHaveAccessibleDescription('Between 0 and 10.');
  });

  // Base UI renders `match={true}` unconditionally, so the contract tells callers to pass their own check.
  it('shows a `match` error exactly when the caller says so: `match={invalid}`', () => {
    const { rerender } = render(<GainError invalid={false} />);
    expect(screen.queryByText('Enter a gain between 0 and 10.')).not.toBeInTheDocument();
    rerender(<GainError invalid />);
    expect(screen.getByText('Enter a gain between 0 and 10.')).toBeInTheDocument();
  });

  it('shows a matching error, validated on blur, only for the validity state it names', async () => {
    const user = userEvent.setup();
    render(
      <Field validationMode="onBlur">
        <FieldLabel>Rig</FieldLabel>
        <Input required />
        <FieldError match="valueMissing">Choose a rig to run on.</FieldError>
        <FieldError match="tooShort">Too short.</FieldError>
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Rig' });
    // Base UI reports valueMissing only once the value has been changed, so a field that was merely visited stays quiet.
    await user.type(input, 'B');
    await user.clear(input);
    expect(screen.queryByText('Choose a rig to run on.')).not.toBeInTheDocument();
    await user.tab();
    expect(await screen.findByText('Choose a rig to run on.')).toBeInTheDocument();
    expect(input).toHaveAccessibleDescription('Choose a rig to run on.');
    expect(screen.queryByText('Too short.')).not.toBeInTheDocument();
  });

  it('adds a quiet "Optional" after an optional label', () => {
    render(
      <Field>
        <FieldLabel optional>Notes</FieldLabel>
        <Textarea />
      </Field>,
    );
    expect(screen.getByText('Optional')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^Notes/ })).toBeInTheDocument();
  });

  it('wires a checkbox in a FieldItem to its own label', async () => {
    const user = userEvent.setup();
    render(
      <Field>
        <FieldItem>
          <Checkbox />
          <FieldLabel>Include aborted runs</FieldLabel>
        </FieldItem>
      </Field>,
    );
    const box = screen.getByRole('checkbox', { name: 'Include aborted runs' });
    await user.click(screen.getByText('Include aborted runs'));
    expect(box).toBeChecked();
  });

  it('groups fields in a fieldset named by its legend', () => {
    render(
      <Fieldset>
        <FieldsetLegend>Controller</FieldsetLegend>
        <Field>
          <FieldLabel>Kp</FieldLabel>
          <Input />
        </Field>
      </Fieldset>,
    );
    expect(screen.getByRole('group', { name: 'Controller' })).toContainElement(
      screen.getByRole('textbox', { name: 'Kp' }),
    );
  });

  it('Label names a control by htmlFor', () => {
    render(
      <>
        <Label htmlFor="serial">Serial number</Label>
        <Input id="serial" />
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'Serial number' })).toBeInTheDocument();
  });
});

function GainField(props: Partial<ComponentProps<typeof NumberField>>) {
  return <NumberField label="Gain" defaultValue={2} {...props} />;
}

describe('NumberField', () => {
  it('is named by its label, with named stepper buttons', () => {
    render(<GainField unit="dB" />);
    expect(screen.getByRole('textbox', { name: 'Gain' })).toHaveValue('2');
    expect(screen.getByRole('button', { name: 'Increase' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decrease' })).toBeInTheDocument();
    expect(screen.getByText('dB')).toBeInTheDocument();
  });

  it('keeps a passed id on the input, so the label still names it', () => {
    render(<GainField id="gain-input" />);
    expect(screen.getByRole('textbox', { name: 'Gain' })).toHaveAttribute('id', 'gain-input');
  });

  it('steps by `step` with the arrow keys', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<GainField step={0.5} onValueChange={onValueChange} />);
    const input = screen.getByRole('textbox', { name: 'Gain' });
    await user.click(input);
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('2.5');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(input).toHaveValue('1.5');
    expect(onValueChange).toHaveBeenLastCalledWith(1.5, expect.anything());
  });

  it('steps by `largeStep` with Shift and an arrow', async () => {
    const user = userEvent.setup();
    render(<GainField step={0.5} largeStep={5} />);
    const input = screen.getByRole('textbox', { name: 'Gain' });
    await user.click(input);
    await user.keyboard('{Shift>}{ArrowUp}{/Shift}');
    expect(input).toHaveValue('7');
    await user.keyboard('{Shift>}{ArrowDown}{ArrowDown}{/Shift}');
    expect(input).toHaveValue('-3');
  });

  // largeStep is an amount, not a multiple of `step`: with step={0.1}, Shift+ArrowUp still adds 10.
  it('steps by a largeStep of 10 by default, whatever the step', async () => {
    const user = userEvent.setup();
    render(<GainField step={0.1} />);
    const input = screen.getByRole('textbox', { name: 'Gain' });
    await user.click(input);
    await user.keyboard('{Shift>}{ArrowUp}{/Shift}');
    expect(input).toHaveValue('12');
  });

  it('stays within min and max', async () => {
    const user = userEvent.setup();
    render(<GainField min={0} max={3} />);
    const input = screen.getByRole('textbox', { name: 'Gain' });
    await user.click(input);
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(input).toHaveValue('3');
    await user.click(screen.getByRole('button', { name: 'Increase' }));
    expect(input).toHaveValue('3');
  });

  it('steps with the buttons', async () => {
    const user = userEvent.setup();
    render(<GainField />);
    await user.click(screen.getByRole('button', { name: 'Decrease' }));
    expect(screen.getByRole('textbox', { name: 'Gain' })).toHaveValue('1');
  });
});
