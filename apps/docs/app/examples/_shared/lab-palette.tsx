'use client';

import { useRouter } from 'next/navigation';
import { CommandDialog, type CommandItemData } from '@dtheo/ui/components/command';

/** Where the palette can take you: every tool in the suite but the one you are in, and the docs. */
const destinations = [
  { value: 'history', label: 'Runs', href: '/examples/run-history' },
  { value: 'runs', label: 'Run review: R-0412', href: '/examples/run-review' },
  { value: 'motors', label: 'Motor maps', href: '/examples/motor-map' },
  { value: 'tuning', label: 'Loop tuning', href: '/examples/tuning' },
  { value: 'assistant', label: 'Lab assistant', href: '/examples/assistant' },
] as const;

/**
 * The ⌘K palette every Actuator Lab tool shares: this tool's own actions first, then the other tools. The sidebar's
 * Search button opens it, and ⌘K / Ctrl+K toggles it from anywhere on the page.
 */
export function LabPalette({
  current,
  open,
  onOpenChange,
  actions = [],
}: {
  current: (typeof destinations)[number]['value'];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions?: CommandItemData[];
}) {
  const router = useRouter();
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      items={[
        ...actions,
        ...destinations
          .filter((d) => d.value !== current)
          .map((d) => ({ value: `go-${d.value}`, label: d.label, group: 'Go to', onSelect: () => router.push(d.href) })),
        { value: 'go-docs', label: 'dtheo/ui docs', group: 'Go to', onSelect: () => router.push('/docs') },
      ]}
    />
  );
}
