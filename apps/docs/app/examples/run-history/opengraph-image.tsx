import { exampleCard, ogSize } from '@/lib/og';

export const alt = 'Run history, an example app built with dtheo/ui';
export const size = ogSize;
export const contentType = 'image/png';

export default function Image() {
  return exampleCard('/examples/run-history');
}
