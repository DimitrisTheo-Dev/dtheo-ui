import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import { RunReview } from './run-review';

export const metadata: Metadata = pageMetadata({
  title: 'Run review',
  description:
    'An actuator step-response review built with dtheo/ui: what failed, by how much, and what to do next. Synthetic data.',
  path: '/examples/run-review',
  ownCard: true,
});

export default function Page() {
  return <RunReview />;
}
