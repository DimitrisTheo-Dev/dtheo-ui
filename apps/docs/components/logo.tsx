import * as React from 'react';
import { site } from '@/lib/site';

/**
 * The mark: two bodies and the five points where a small object can hold position between them, a nod to the
 * space theme. The two stable points are filled with the accent.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className ?? 'size-5'}>
      <circle cx="12" cy="12" r="10.25" className="fill-none stroke-foreground/25" strokeWidth="1" />
      <circle cx="7" cy="12" r="2.6" className="fill-foreground" />
      <circle cx="17.6" cy="12" r="1.15" className="fill-foreground/70" />
      <circle cx="12.3" cy="3.35" r="1.35" className="fill-primary" />
      <circle cx="12.3" cy="20.65" r="1.35" className="fill-primary" />
      <circle cx="21.1" cy="12" r="0.8" className="fill-foreground/45" />
      <circle cx="15.2" cy="12" r="0.8" className="fill-foreground/45" />
      <circle cx="1.6" cy="12" r="0.8" className="fill-foreground/45" />
    </svg>
  );
}

/** The wordmark reads as one word with a quieter suffix: dtheo, then /ui. */
const [brand, suffix] = site.name.split('/');

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-headline tracking-tight">
        {brand}
        <span className="text-muted-foreground">/{suffix}</span>
      </span>
    </span>
  );
}
