import * as React from 'react';
import { brand, starPath, tile } from '@/lib/brand';
import { site } from '@/lib/site';

/** The mark: a white north star on a black tile, the same in both themes and in the browser tab. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className ?? 'size-5.5'}>
      <rect width="24" height="24" rx={tile.radius} fill={brand.ink} />
      <path d={starPath} transform={tile.star} fill={brand.star} />
    </svg>
  );
}

/** The wordmark reads as one word with a quieter suffix: dtheo, then /ui. */
const [brandName, suffix] = site.name.split('/');

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-headline tracking-tight">
        {brandName}
        <span className="text-muted-foreground">/{suffix}</span>
      </span>
    </span>
  );
}
