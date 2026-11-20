// dtheo-check-disable-file raw-color -- the brand mark is graphite, black and white in every theme and preset.
import * as React from 'react';

/**
 * The north star, the fixed point you steer by: four rays on a 24 × 24 box, taller than wide, with a softly
 * rounded waist. The logo, the favicon (app/icon.svg), the app icon and the share cards all draw this one path.
 */
export const starPath =
  'M12 0.6C12.6 9.036 13.82 11.4 19 12C13.82 12.6 12.6 14.964 12 23.4C11.4 14.964 10.18 12.6 5 12C10.18 11.4 11.4 9.036 12 0.6Z';

/** The tile: a superellipse (n = 5), the continuous corner of an app icon, as one curve per quadrant. */
export const tilePath =
  'M24 12C24 23.94 23.94 24 12 24C0.06 24 0 23.94 0 12C0 0.06 0.06 0 12 0C23.94 0 24 0.06 24 12Z';

/** Enamel: graphite at the top of the tile, black at the bottom, and a white star. */
export const brand = { top: '#26272b', middle: '#0b0b0d', ink: '#000000', star: '#ffffff' } as const;

/** Optical sizing: the smaller the tile, the more of it the star fills. */
export function starIn(px: number) {
  const scale = px >= 96 ? 0.68 : px >= 40 ? 0.74 : 0.84;
  const offset = Number(((24 - 24 * scale) / 2).toFixed(2));
  return `translate(${offset} ${offset}) scale(${scale})`;
}

/**
 * The mark at a given pixel size. From 22 px up it gains a rim of light along the top edge and a soft glow behind
 * the star; smaller, those would only blur it. `id` keeps the gradients apart when the mark appears twice on a
 * page. Plain SVG, so next/og can draw it too.
 */
export function Mark({ px, id, className }: { px: number; id: string; className?: string }) {
  const detail = px >= 22;
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={brand.top} />
          <stop offset="0.55" stopColor={brand.middle} />
          <stop offset="1" stopColor={brand.ink} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={brand.star} stopOpacity="0.26" />
          <stop offset="0.4" stopColor={brand.star} stopOpacity="0.07" />
          <stop offset="1" stopColor={brand.star} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={brand.star} stopOpacity="0.22" />
          <stop offset="0.22" stopColor={brand.star} stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={tilePath} />
        </clipPath>
      </defs>
      <path d={tilePath} fill={`url(#${id}-tile)`} />
      {detail ? (
        <g clipPath={`url(#${id}-clip)`}>
          <circle cx="12" cy="12" r="10" fill={`url(#${id}-glow)`} />
          <path d={tilePath} fill="none" stroke={`url(#${id}-rim)`} strokeWidth={px >= 64 ? 0.5 : 0.8} />
        </g>
      ) : null}
      <path d={starPath} transform={starIn(px)} fill={brand.star} />
    </svg>
  );
}
