import { ImageResponse } from 'next/og';
import { HomeCard, ogFonts, ogSize } from '@/lib/og';

export const alt = 'dtheo/ui: pixel-perfect UI, even when your agent writes it.';
export const size = ogSize;
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(<HomeCard />, { ...size, fonts: await ogFonts() });
}
