import type { Metadata } from 'next';
import { RunReview } from './run-review';

export const metadata: Metadata = {
  title: 'Run review',
  description:
    'An actuator step-response review built with dtheo/ui: what failed, by how much, and what to do next. Synthetic data.',
  alternates: { canonical: '/examples/run-review' },
};

export default function Page() {
  return <RunReview />;
}
