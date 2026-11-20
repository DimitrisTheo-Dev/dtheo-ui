// dtheo-check-disable-file raw-color -- the brand mark is pure black and white in every theme and preset.

/**
 * The mark: a north star, the fixed point you steer by. Four rays on a 24 × 24 box, taller than wide, with sides
 * that curve in to a thin waist. The logo, the favicon (app/icon.svg), the app icon and the share cards all draw
 * this one path.
 */
export const starPath =
  'M12 0.8C12 9.536 13.672 12 19.6 12C13.672 12 12 14.464 12 23.2C12 14.464 10.328 12 4.4 12C10.328 12 12 9.536 12 0.8Z';

/** White on black everywhere, so the mark looks the same on a light page, a dark page and a home screen. */
export const brand = { ink: '#000000', star: '#ffffff' } as const;

/** The tile around the star: rounded like an app icon, with the star at 84 % of its height, centered. */
export const tile = { radius: 5.4, star: 'translate(1.92 1.92) scale(0.84)' } as const;
