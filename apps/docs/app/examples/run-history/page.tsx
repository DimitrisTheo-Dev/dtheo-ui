import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import { RunHistory } from './run-history';

export const metadata: Metadata = pageMetadata({
  title: 'Run history',
  description:
    'Every run on one actuator in a virtualized data table: filters with live counts, column presets, limit marking, an inspector and side-by-side comparison, built with dtheo/ui. Synthetic data.',
  path: '/examples/run-history',
  ownCard: true,
});

export default function Page() {
  return <RunHistory />;
}
