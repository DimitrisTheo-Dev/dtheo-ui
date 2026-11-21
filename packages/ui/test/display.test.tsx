// @vitest-environment jsdom
import './setup';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Alert, AlertDescription, AlertTitle } from '../src/components/alert';
import {
  AppShell,
  AppToolbar,
  PageHeader,
  SidebarContent,
  SidebarItem,
  SidebarSection,
} from '../src/components/app-shell';
import { Avatar, initials } from '../src/components/avatar';
import { Card, CardTitle } from '../src/components/card';
import { Metric } from '../src/components/metric';
import { Meter, Progress } from '../src/components/progress';
import { Spinner } from '../src/components/spinner';

describe('Alert', () => {
  it.each([
    ['warning', 'alert'],
    ['destructive', 'alert'],
    ['info', 'status'],
    ['success', 'status'],
  ] as const)('a %s alert has role="%s"', (variant, role) => {
    render(
      <Alert variant={variant}>
        <AlertTitle>Bench A is offline</AlertTitle>
        <AlertDescription>Runs queue until it is back.</AlertDescription>
      </Alert>,
    );
    expect(screen.getByRole(role)).toHaveTextContent('Bench A is offline');
  });
});

function Shell() {
  return (
    <AppShell
      embedded
      sidebar={
        <SidebarContent>
          <SidebarSection title="Lab">
            <SidebarItem href="#runs" active>
              Runs
            </SidebarItem>
            <SidebarItem href="#rigs">Rigs</SidebarItem>
          </SidebarSection>
        </SidebarContent>
      }
    >
      <AppToolbar />
      <PageHeader title="Runs" level={2} />
    </AppShell>
  );
}

describe('AppShell', () => {
  it('marks the current page and labels each sidebar section as navigation', () => {
    render(<Shell />);
    const nav = screen.getByRole('navigation', { name: 'Lab' });
    expect(within(nav).getByRole('link', { name: 'Runs' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Rigs' })).not.toHaveAttribute('aria-current');
  });

  it('opens the sidebar as a named sheet from the toolbar, and closes it when a page is chosen', async () => {
    const user = userEvent.setup();
    render(<Shell />);
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    const sheet = await screen.findByRole('dialog', { name: 'Navigation' });
    await user.click(within(sheet).getByRole('link', { name: 'Rigs' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Navigation' })).not.toBeInTheDocument());
  });

  it('gives the page title the heading level asked for', () => {
    render(<Shell />);
    expect(screen.getByRole('heading', { name: 'Runs', level: 2 })).toBeInTheDocument();
  });
});

describe('CardTitle', () => {
  it('is an h3 by default and takes another level', () => {
    render(
      <>
        <Card>
          <CardTitle>Step response</CardTitle>
        </Card>
        <Card>
          <CardTitle level={2}>Acceptance</CardTitle>
        </Card>
      </>,
    );
    expect(screen.getByRole('heading', { name: 'Step response', level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Acceptance', level: 2 })).toBeInTheDocument();
  });
});

describe('Progress and Meter', () => {
  it('reports indeterminate progress without a value', () => {
    render(<Progress value={null} label="Analysing trace" />);
    const bar = screen.getByRole('progressbar', { name: 'Analysing trace' });
    expect(bar).not.toHaveAttribute('aria-valuenow');
  });

  it('reports determinate progress', () => {
    render(<Progress value={64} label="Uploading capture" showValue />);
    expect(screen.getByRole('progressbar', { name: 'Uploading capture' })).toHaveAttribute(
      'aria-valuenow',
      '64',
    );
  });

  it('shows a value with its unit', () => {
    render(<Meter value={4.25} max={10} label="Phase current" showValue unit="A" />);
    expect(screen.getByRole('meter', { name: 'Phase current' })).toHaveTextContent('4.3 A');
  });

  it('draws a tick at the limit, hidden from assistive tech', () => {
    render(<Meter value={40} min={0} max={200} limit={150} label="Load" />);
    const tick = screen.getByRole('meter', { name: 'Load' }).querySelector('[aria-hidden="true"]');
    expect(tick).toHaveStyle({ left: '75%' });
  });

  it('announces the share of the range in en-US by default, and in `locale` when given', () => {
    render(
      <>
        <Meter value={1250} max={5000} label="Speed" />
        <Meter value={1250} max={5000} label="Drehzahl" locale="de-DE" />
      </>,
    );
    expect(screen.getByRole('meter', { name: 'Speed' })).toHaveAttribute('aria-valuetext', '25%');
    // German puts a no-break space before the percent sign.
    expect(screen.getByRole('meter', { name: 'Drehzahl' })).toHaveAttribute('aria-valuetext', '25\u00a0%');
  });

  it('shows the value in `locale` when it has no unit', () => {
    render(<Meter value={1250} max={5000} label="Drehzahl" showValue locale="de-DE" />);
    expect(screen.getByRole('meter', { name: 'Drehzahl' })).toHaveTextContent('25 %');
  });

  // A unit used to bypass `locale` and always print en-US digits.
  it('formats the shown value with `locale` when it has a unit', () => {
    render(<Meter value={1234.5} max={5000} label="Speed" showValue unit="rpm" locale="de-DE" />);
    expect(screen.getByRole('meter', { name: 'Speed' })).toHaveTextContent('1.234,5 rpm');
    render(<Progress value={1234.5} max={5000} label="Upload" showValue unit="MB" locale="de-DE" />);
    expect(screen.getByRole('progressbar', { name: 'Upload' })).toHaveTextContent('1.234,5 MB');
  });
});

describe('Avatar', () => {
  it('takes the first and last initial, skipping suffixes', () => {
    expect(initials('Ada Lovelace')).toBe('AL');
    expect(initials('Grace Brewster Hopper')).toBe('GH');
    expect(initials('Martin Luther King Jr.')).toBe('MK');
    expect(initials('  ada  ')).toBe('A');
  });

  it('keeps whole graphemes: accents and emoji', () => {
    expect(initials('Ølaf Øvergaard')).toBe('ØØ');
    expect(initials('🧪 Lab')).toBe('🧪L');
    expect(initials('👩‍🔬 Rig team')).toBe('👩‍🔬T');
  });

  it('uppercases without the browser’s locale (a Turkish one would turn i into İ)', () => {
    expect(initials('ilker işık')).toBe('II');
  });

  it('shows initials, named after the person, when there is no image', () => {
    render(<Avatar name="Ada Lovelace" />);
    expect(screen.getByLabelText('Ada Lovelace')).toHaveTextContent('AL');
  });
});

describe('Metric', () => {
  it.each([
    ['fail', 'Fail'],
    ['warn', 'Near limit'],
    ['pass', 'Pass'],
  ] as const)('pairs the %s status with a word and an icon', (status, word) => {
    render(<Metric label="Overshoot" value="4.2" unit="%" status={status} />);
    const metric = screen.getByText('Overshoot').closest('[data-slot="metric"]') as HTMLElement;
    expect(metric).toHaveTextContent(word);
    expect(metric.querySelector('svg')).not.toBeNull();
  });
});

describe('Spinner', () => {
  it('is a status named "Loading" unless told otherwise', () => {
    render(
      <>
        <Spinner />
        <Spinner label="Loading traces" />
      </>,
    );
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading traces' })).toBeInTheDocument();
  });
});
