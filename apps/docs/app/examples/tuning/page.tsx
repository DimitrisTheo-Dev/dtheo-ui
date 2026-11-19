import type { Metadata } from 'next';
import { Tuning } from './tuning';

export const metadata: Metadata = {
  title: 'Loop tuning',
  description:
    'Live bench telemetry, a Bode plot with margins, a vibration spectrum and 412 runs as a scatter and a histogram, built with dtheo/ui. Synthetic data.',
  alternates: { canonical: '/examples/tuning' },
};

export default function Page() {
  return <Tuning />;
}
