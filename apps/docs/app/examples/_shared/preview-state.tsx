'use client';

import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { StatusDot } from '@dtheo/ui/components/badge';
import {
  Menu,
  MenuContent,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
  MenuGroup,
} from '@dtheo/ui/components/menu';

/**
 * The states every data screen has to design for. The toolbar switch shows each one on real content, and the URL
 * keeps it (`?state=error`), so a review, a screenshot or a test can link straight to a state.
 */
export const previewStates = {
  live: { label: 'Live data', hint: 'What an engineer sees on a normal day' },
  loading: { label: 'Loading', hint: 'Shaped like the content, so nothing jumps' },
  empty: { label: 'No data yet', hint: 'Why it is empty, and the first step' },
  'no-results': { label: 'Filtered to nothing', hint: 'Says which filters hide what, and clears them' },
  error: { label: 'Error', hint: 'What failed, what is kept, and a retry' },
  partial: { label: 'Partial data', hint: 'Shows what loaded, marks what did not' },
} as const;

export type PreviewState = keyof typeof previewStates;

const isState = (v: string | null): v is PreviewState => v !== null && v in previewStates;

// The URL is the only place the state lives: a link, a reload and the back button all agree with the screen.
const listeners = new Set<() => void>();
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('popstate', onChange);
  };
}
function readState(): PreviewState {
  const v = new URLSearchParams(window.location.search).get('state');
  return isState(v) ? v : 'live';
}

/** The preview state, read from `?state=` and written back without a navigation. The server renders live data. */
export function usePreviewState(): [PreviewState, (state: PreviewState) => void] {
  const state = React.useSyncExternalStore(subscribe, readState, () => 'live' as const);
  const set = React.useCallback((next: PreviewState) => {
    const url = new URL(window.location.href);
    if (next === 'live') url.searchParams.delete('state');
    else url.searchParams.set('state', next);
    window.history.replaceState(window.history.state, '', url);
    for (const l of listeners) l();
  }, []);
  return [state, set];
}

/** The toolbar switch. Each screen lists the states it can be in; the rest are not offered. */
export function PreviewStateMenu({
  value,
  onValueChange,
  states,
}: {
  value: PreviewState;
  onValueChange: (state: PreviewState) => void;
  states: readonly PreviewState[];
}) {
  const live = value === 'live';
  return (
    <Menu>
      <MenuTrigger render={<Button variant="ghost" size="sm" />}>
        <StatusDot tone={live ? 'success' : 'warning'} />
        {/* The visible words are the name, so a voice command can say what it reads. */}
        <span className="sr-only sm:not-sr-only">
          {live ? 'States' : `State: ${previewStates[value].label}`}
        </span>
        <ChevronDownIcon aria-hidden="true" className="text-subtle-foreground" />
      </MenuTrigger>
      <MenuContent align="end" className="w-72">
        <MenuGroup>
          <MenuLabel>Preview this screen as</MenuLabel>
          <MenuRadioGroup value={value} onValueChange={(v) => onValueChange(v as PreviewState)}>
            {states.map((s) => (
              <MenuRadioItem key={s} value={s}>
                <span className="flex flex-col gap-0.5 py-0.5">
                  <span>{previewStates[s].label}</span>
                  <span className="text-caption text-subtle-foreground in-data-highlighted:text-primary-foreground">
                    {previewStates[s].hint}
                  </span>
                </span>
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuGroup>
      </MenuContent>
    </Menu>
  );
}
