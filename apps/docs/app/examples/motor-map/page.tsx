import type { Metadata } from 'next';
import { MotorMap } from './motor-map';

export const metadata: Metadata = {
  title: 'Motor map',
  description:
    'A traction-motor efficiency map with its torque–speed envelope, built with dtheo/ui in the Flight deck preset. Synthetic data.',
  alternates: { canonical: '/examples/motor-map' },
};

export default function Page() {
  return <MotorMap />;
}
