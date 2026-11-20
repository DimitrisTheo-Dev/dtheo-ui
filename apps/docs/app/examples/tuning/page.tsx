import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import { Tuning } from './tuning';

export const metadata: Metadata = pageMetadata({
  title: 'Loop tuning',
  description:
    'Live bench telemetry, a Bode plot with margins, a vibration spectrum and 412 runs as a scatter and a histogram, built with dtheo/ui. Synthetic data.',
  path: '/examples/tuning',
  ownCard: true,
});

export default function Page() {
  return <Tuning />;
}
