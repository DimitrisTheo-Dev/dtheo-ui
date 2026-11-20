import { exampleCard, ogSize } from '@/lib/og';

export const alt = 'Motor map, an example app built with dtheo/ui';
export const size = ogSize;
export const contentType = 'image/png';

export default function Image() {
  return exampleCard('/examples/motor-map');
}
