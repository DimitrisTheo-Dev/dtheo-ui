'use client';

import * as React from 'react';
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from '@dtheo/ui/components/accordion';

// Non-breaking spaces (&nbsp;) keep each number with its unit; run IDs never wrap at the hyphen.
const Id = ({ children }: { children: React.ReactNode }) => (
  <span className="whitespace-nowrap">{children}</span>
);

const faqs = [
  {
    id: 'overshoot',
    question: 'How is overshoot measured?',
    answer: (
      <>
        The peak torque above the commanded step, as a percentage of the step. <Id>R-0412</Id> peaked at
        9.41&nbsp;N·m on an 8.0&nbsp;N·m step: 17.6&nbsp;%. The limit is 10&nbsp;%.
      </>
    ),
  },
  {
    id: 'settling',
    question: 'When does a run count as settled?',
    answer: (
      <>
        From the step command until torque stays inside ±2&nbsp;% of the setpoint for good. The limit is
        200&nbsp;ms; samples before the step are ignored.
      </>
    ),
  },
  {
    id: 'temperature',
    question: 'Why do runs pause between high-gain steps?',
    answer: (
      <>
        The winding must cool below 40&nbsp;°C before the next step, so every run starts from the same thermal
        state. Above 90&nbsp;°C the bench stops the run.
      </>
    ),
  },
  {
    id: 'firmware',
    question: 'Which firmware is approved on Bench 3?',
    answer: (
      <>
        Firmware 4.18.2. Runs on older builds stay in the history but are not compared against the current
        reference, <Id>R-0409</Id>.
      </>
    ),
  },
];

export default function AccordionExample() {
  return (
    <Accordion defaultValue={['overshoot']} className="w-full max-w-lg">
      {faqs.map((f) => (
        <AccordionItem key={f.id} value={f.id}>
          <AccordionTrigger>{f.question}</AccordionTrigger>
          <AccordionPanel>{f.answer}</AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
