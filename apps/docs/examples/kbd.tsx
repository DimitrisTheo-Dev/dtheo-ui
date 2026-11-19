'use client';

import { Kbd } from '@dtheo/ui/components/kbd';

const shortcuts = [
  { action: 'Search runs and commands', keys: ['⌘', 'K'] },
  { action: 'Next run', keys: ['J'] },
  { action: 'Previous run', keys: ['K'] },
  { action: 'Show or hide the reference trace', keys: ['⇧', 'R'] },
  { action: 'Export the visible traces as CSV', keys: ['⌘', '⇧', 'E'] },
];

export default function KbdExample() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <p className="text-body text-muted-foreground">
        Press{' '}
        <span className="inline-flex gap-0.5 align-middle">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>{' '}
        to jump to any run on Bench 3.
      </p>
      <dl className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
        {shortcuts.map((s) => (
          <div key={s.action} className="flex items-center justify-between gap-4 px-3.5 py-2">
            <dt className="text-body">{s.action}</dt>
            <dd className="flex shrink-0 gap-0.5">
              {s.keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
