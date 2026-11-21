import { cn } from './utils';

/** Shared floating-surface recipe for menus, selects, comboboxes and popovers. */
export const popupSurfaceClass = cn(
  'rounded-popover border border-border bg-popover text-popover-foreground shadow-popover',
  // dtheo-check-ignore-next-line (popups hand focus to the item or control inside, which shows its own focus)
  'backdrop-blur-material backdrop-saturate-150 outline-none',
  // Tailwind's scale-96 sets the `scale` property, not `transform`: name it, or the grow snaps in one frame.
  'origin-(--transform-origin) transition-[scale,opacity] duration-180 ease-out',
  'data-starting-style:scale-96 data-starting-style:opacity-0 data-ending-style:scale-96 data-ending-style:opacity-0',
);

/** Shared row recipe for items inside floating surfaces. Highlight follows the macOS menu: accent fill, white text. */
export const popupItemClass = cn(
  'relative flex min-h-control-sm cursor-default items-center gap-2 rounded-item px-2 py-1 text-body outline-none select-none',
  'pointer-coarse:min-h-10',
  'data-highlighted:bg-primary data-highlighted:text-primary-foreground',
  'data-disabled:pointer-events-none data-disabled:opacity-45',
  '[&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
);
