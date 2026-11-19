import { ImageResponse } from 'next/og';
import { AppIcon } from '@/lib/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(<AppIcon size={180} />, size);
}
