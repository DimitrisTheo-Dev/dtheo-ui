// @vitest-environment jsdom
import './setup';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from '../src/components/accordion';

function Faq() {
  return (
    <Accordion>
      <AccordionItem value="units">
        <AccordionTrigger>Which units do traces use?</AccordionTrigger>
        <AccordionPanel>SI units: N·m, rad/s and A.</AccordionPanel>
      </AccordionItem>
      <AccordionItem value="retention">
        <AccordionTrigger>How long are runs kept?</AccordionTrigger>
        <AccordionPanel>Ninety days, then archived.</AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}

const trigger = (name: string) => screen.getByRole('button', { name });

describe('Accordion', () => {
  it('puts each trigger in a heading and starts collapsed', () => {
    render(<Faq />);
    expect(screen.getAllByRole('heading')).toHaveLength(2);
    expect(trigger('Which units do traces use?')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('SI units: N·m, rad/s and A.')).not.toBeInTheDocument();
  });

  it.each([['{Enter}'], [' ']])('expands and collapses with %s', async (key) => {
    const user = userEvent.setup();
    render(<Faq />);
    trigger('Which units do traces use?').focus();
    await user.keyboard(key);
    expect(trigger('Which units do traces use?')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Which units do traces use?' })).toHaveTextContent(
      'SI units: N·m, rad/s and A.',
    );
    await user.keyboard(key);
    expect(trigger('Which units do traces use?')).toHaveAttribute('aria-expanded', 'false');
  });

  it('controls its panel', async () => {
    const user = userEvent.setup();
    render(<Faq />);
    await user.click(trigger('How long are runs kept?'));
    const panel = screen.getByRole('region', { name: 'How long are runs kept?' });
    expect(trigger('How long are runs kept?')).toHaveAttribute('aria-controls', panel.id);
  });
});

describe('Collapsible', () => {
  it('expands its panel from the trigger', async () => {
    const user = userEvent.setup();
    render(
      <Collapsible>
        <CollapsibleTrigger>Advanced options</CollapsibleTrigger>
        <CollapsiblePanel>Sample rate: 10 kHz</CollapsiblePanel>
      </Collapsible>,
    );
    const button = trigger('Advanced options');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    button.focus();
    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Sample rate: 10 kHz')).toBeVisible();
  });
});
