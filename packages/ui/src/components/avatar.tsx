'use client';

import * as React from 'react';
import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import { cn } from '../lib/utils';

/** Initials from grapheme clusters: first and last word, skipping suffixes. Handles emoji and accents. */
// One segmenter for every avatar: grapheme-aware, so "Ølaf" and emoji names keep whole characters. Initials render
// on the server too, so nothing here may depend on the browser's locale: a fixed segmenter locale, and a plain
// uppercase (a Turkish browser would turn "i" into "İ" and break hydration).
const graphemes =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter('en', { granularity: 'grapheme' })
    : null;
const firstGrapheme = (w?: string) =>
  !w ? '' : graphemes ? ([...graphemes.segment(w)][0]?.segment ?? '') : (Array.from(w)[0] ?? '');

export function initials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => !/^(jr|sr|ii|iii|iv)\.?$/i.test(w));
  const parts =
    words.length > 1 ? [firstGrapheme(words[0]), firstGrapheme(words.at(-1))] : [firstGrapheme(words[0])];
  return parts.join('').toUpperCase();
}

/** A person or team. Falls back to initials when the image is missing or fails to load. */
export function Avatar({
  className,
  src,
  name,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & { src?: string; name: string }) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        'relative inline-grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-caption font-semibold text-muted-foreground select-none',
        'shadow-[inset_0_0_0_1px_var(--border)]',
        className,
      )}
      {...props}
    >
      {src ? <AvatarPrimitive.Image src={src} alt={name} className="size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback aria-label={name}>{initials(name)}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
