import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge must know dtheo/ui's custom scales, otherwise `text-body` (a size) and
 * `text-foreground` (a color) look like the same group and one silently wins.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ['control', 'popover', 'card', 'dialog', 'item', 'inset'],
      blur: ['material'],
      shadow: ['raised', 'popover', 'dialog'],
      ease: ['drawer'],
      spacing: ['control-xs', 'control-sm', 'control-md', 'control-lg', 'control-touch'],
    },
    classGroups: {
      'font-size': [
        {
          text: [
            'caption',
            'label',
            'body',
            'callout',
            'prose',
            'headline',
            'title-3',
            'title-2',
            'title-1',
            'large-title',
            'display',
          ],
        },
      ],
    },
  },
});

/** Merge class names; later classes win over earlier conflicting ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
