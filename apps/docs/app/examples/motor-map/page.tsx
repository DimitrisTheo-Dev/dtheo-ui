import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import { MotorMap } from './motor-map';

export const metadata: Metadata = pageMetadata({
  title: 'Motor map',
  description:
    'A traction-motor efficiency map with its torque–speed envelope, built with dtheo/ui in the Carbon preset. Synthetic data.',
  path: '/examples/motor-map',
  ownCard: true,
});

export default function Page() {
  return <MotorMap />;
}
