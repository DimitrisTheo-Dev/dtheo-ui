// @vitest-environment jsdom
import './setup';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Slider } from '../src/components/slider';

describe('Slider', () => {
  it('names a single thumb with the slider’s aria-label', () => {
    render(<Slider aria-label="Threshold" defaultValue={40} />);
    const thumb = screen.getByRole('slider', { name: 'Threshold' });
    expect(thumb).toHaveAttribute('aria-valuenow', '40');
  });

  it('names each thumb of a range with thumbLabels', () => {
    render(<Slider defaultValue={[20, 80]} thumbLabels={['Window start', 'Window end']} />);
    expect(screen.getByRole('slider', { name: 'Window start' })).toHaveAttribute('aria-valuenow', '20');
    expect(screen.getByRole('slider', { name: 'Window end' })).toHaveAttribute('aria-valuenow', '80');
  });

  it('steps with the arrow keys', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Slider aria-label="Threshold" defaultValue={40} step={5} onValueChange={onValueChange} />);
    const thumb = screen.getByRole('slider', { name: 'Threshold' });
    thumb.focus();
    await user.keyboard('{ArrowRight}');
    expect(thumb).toHaveAttribute('aria-valuenow', '45');
    await user.keyboard('{ArrowUp}');
    expect(thumb).toHaveAttribute('aria-valuenow', '50');
    await user.keyboard('{ArrowLeft}{ArrowDown}{ArrowDown}');
    expect(thumb).toHaveAttribute('aria-valuenow', '35');
    expect(onValueChange).toHaveBeenLastCalledWith(35, expect.anything());
  });

  it('takes large steps with Page up and Page down', async () => {
    const user = userEvent.setup();
    render(<Slider aria-label="Threshold" defaultValue={40} largeStep={20} />);
    const thumb = screen.getByRole('slider', { name: 'Threshold' });
    thumb.focus();
    await user.keyboard('{PageUp}');
    expect(thumb).toHaveAttribute('aria-valuenow', '60');
    await user.keyboard('{PageDown}{PageDown}');
    expect(thumb).toHaveAttribute('aria-valuenow', '20');
  });

  it('jumps to the minimum and maximum with Home and End', async () => {
    const user = userEvent.setup();
    render(<Slider aria-label="Threshold" defaultValue={40} min={10} max={90} />);
    const thumb = screen.getByRole('slider', { name: 'Threshold' });
    thumb.focus();
    await user.keyboard('{End}');
    expect(thumb).toHaveAttribute('aria-valuenow', '90');
    await user.keyboard('{Home}');
    expect(thumb).toHaveAttribute('aria-valuenow', '10');
  });

  it('keeps range thumbs from crossing', async () => {
    const user = userEvent.setup();
    render(<Slider defaultValue={[20, 30]} thumbLabels={['Window start', 'Window end']} largeStep={50} />);
    const start = screen.getByRole('slider', { name: 'Window start' });
    start.focus();
    await user.keyboard('{PageUp}');
    expect(Number(start.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(30);
  });

  it('announces range values in en-US by default, whatever the browser locale', () => {
    render(<Slider defaultValue={[1500, 2500]} max={5000} thumbLabels={['Window start', 'Window end']} />);
    expect(screen.getByRole('slider', { name: 'Window start' })).toHaveAttribute(
      'aria-valuetext',
      '1,500 start range',
    );
  });

  it('formats the announced value with `locale`', () => {
    render(
      <Slider
        defaultValue={[1500, 2500]}
        max={5000}
        locale="de-DE"
        thumbLabels={['Window start', 'Window end']}
      />,
    );
    expect(screen.getByRole('slider', { name: 'Window end' })).toHaveAttribute(
      'aria-valuetext',
      '2.500 end range',
    );
  });
});
