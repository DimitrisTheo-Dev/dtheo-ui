// dtheo-check-disable-file raw-color -- the fades are alpha ramps, not colors; the trails themselves use theme roles.
import * as React from 'react';
import { starPath } from '@/lib/brand';

/** A tiny LCG, so the server and every visit draw the same sky. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Five strengths of trail. Bright ones are the few bright stars; a few carry the link blue. */
const TIERS = {
  faint: { className: 'stroke-foreground', opacity: 0.1, width: 0.6 },
  soft: { className: 'stroke-foreground', opacity: 0.16, width: 0.7 },
  mid: { className: 'stroke-foreground', opacity: 0.24, width: 0.8 },
  bright: { className: 'stroke-foreground', opacity: 0.4, width: 1.4 },
  blue: { className: 'stroke-link', opacity: 0.3, width: 0.8 },
} as const;
type Tier = keyof typeof TIERS;

/**
 * Each variant is a sky size, a pole, and three fades applied one inside the other: one keeps the text clear,
 * one fades the trails toward the content below, and one fades them toward the sides, so no trail is ever cut
 * by an edge. Phones get a smaller clearing, or the narrow screen would be all clearing and no sky.
 */
const VARIANTS = {
  // Over the hero: the pole sits above the headline, and the trails fade before the demo.
  hero: {
    width: 1760,
    height: 1100,
    pole: [880, 44],
    count: 420,
    masks: [
      '[mask-image:radial-gradient(190px_170px_at_50%_230px,rgb(0_0_0/0.3)_45%,black_100%)] md:[mask-image:radial-gradient(520px_210px_at_50%_250px,rgb(0_0_0/0.16)_40%,black_100%)]',
      '[mask-image:linear-gradient(to_bottom,black_340px,transparent_860px)]',
      '[mask-image:radial-gradient(880px_1100px_at_50%_44px,black_70%,transparent_100%)]',
    ],
  },
  // Behind the closing call to action: a smaller sky, faded at the top as well, where the section begins.
  closing: {
    width: 1200,
    height: 560,
    pole: [600, 84],
    count: 240,
    masks: [
      '[mask-image:radial-gradient(170px_130px_at_50%_180px,rgb(0_0_0/0.25)_40%,black_100%)] md:[mask-image:radial-gradient(360px_140px_at_50%_190px,rgb(0_0_0/0.14)_40%,black_100%)]',
      '[mask-image:linear-gradient(to_bottom,transparent,black_64px,black_220px,transparent_500px)]',
      '[mask-image:radial-gradient(600px_480px_at_50%_84px,black_45%,transparent_100%)]',
    ],
  },
} as const;

/**
 * The light theme's sky: a long exposure around the north star, drawn in ink like a photographic plate. Every
 * star turns through the same angle, so every trail has the same sweep; the star at the pole holds still. The
 * night sky (SpaceBackdrop) is the dark theme's version of the same idea. Static SVG, drawn on the server.
 */
export function StarTrails({
  variant = 'hero',
  className,
}: {
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  const { width, height, pole, count, masks } = VARIANTS[variant];
  const [cx, cy] = pole;
  const rand = seeded(variant === 'hero' ? 11 : 23);
  const sweep = (32 * Math.PI) / 180;
  const reach = Math.hypot(width / 2, height);
  const paths: Record<Tier, string[]> = { faint: [], soft: [], mid: [], bright: [], blue: [] };
  for (let i = 0; i < count; i++) {
    // Uniform over the area of the sky, so trails thin out with distance as they would in a photograph.
    const r = Math.round(26 + Math.sqrt(rand()) * reach);
    const from = rand() * Math.PI * 2;
    const at = (a: number) => `${Math.round(cx + r * Math.cos(a))} ${Math.round(cy + r * Math.sin(a))}`;
    const roll = rand();
    const tier: Tier =
      roll < 0.07 ? 'bright' : roll < 0.2 ? 'blue' : roll < 0.45 ? 'mid' : roll < 0.75 ? 'soft' : 'faint';
    paths[tier].push(`M${at(from)}A${r} ${r} 0 0 1 ${at(from + sweep)}`);
  }

  const sky = (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute top-0 left-1/2 max-w-none -translate-x-1/2"
    >
      {(Object.keys(TIERS) as Tier[]).map((tier) => (
        <path
          key={tier}
          d={paths[tier].join('')}
          className={TIERS[tier].className}
          fill="none"
          strokeOpacity={TIERS[tier].opacity}
          strokeWidth={TIERS[tier].width}
          strokeLinecap="round"
        />
      ))}
      <circle cx={cx} cy={cy} r="18" className="fill-link/8" />
      <path d={starPath} transform={`translate(${cx - 11} ${cy - 11}) scale(0.92)`} className="fill-foreground" />
    </svg>
  );
  // One wrapper per fade, innermost last, so the fades multiply.
  return masks.reduceRight<React.ReactNode>(
    (inner, mask, i) => (
      <div
        aria-hidden={i === 0 ? true : undefined}
        className={`pointer-events-none absolute inset-0 overflow-hidden ${mask} ${i === 0 ? (className ?? '') : ''}`}
      >
        {inner}
      </div>
    ),
    sky,
  );
}
