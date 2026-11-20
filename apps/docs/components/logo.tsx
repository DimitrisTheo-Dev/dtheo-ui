import * as React from 'react';
import { Mark } from '@/lib/brand';
import { site } from '@/lib/site';

/** The mark: a white north star on an enamel tile, the same in both themes and in the browser tab. */
export function LogoMark({ px = 22 }: { px?: number }) {
  const id = `mark${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return <Mark px={px} id={id} className="shrink-0" />;
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
