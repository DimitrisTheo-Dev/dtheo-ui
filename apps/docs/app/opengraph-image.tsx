import { ImageResponse } from 'next/og';
import { HomeCard, ogFonts, ogSize } from '@/lib/og';
import { site } from '@/lib/site';

export const alt = `${site.name}: ${site.tagline}`;
export const size = ogSize;
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(<HomeCard />, { ...size, fonts: await ogFonts() });
}
