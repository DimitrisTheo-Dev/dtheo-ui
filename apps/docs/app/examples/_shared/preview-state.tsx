'use client';

import * as React from 'react';
import { ChevronDownIcon, RotateCcwIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { Alert, AlertActions, AlertContent, AlertDescription, AlertTitle } from '@dtheo/ui/components/alert';
import { Skeleton } from '@dtheo/ui/components/skeleton';
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

/**
 * The preview state, read from `?state=` and written back without a navigation. The server renders live data.
 * The third value retries: a moment of loading, then live data, the way a real retry reads.
 */
export function usePreviewState(): [PreviewState, (state: PreviewState) => void, () => void] {
  const state = React.useSyncExternalStore(subscribe, readState, () => 'live' as const);
  const set = React.useCallback((next: PreviewState) => {
    const url = new URL(window.location.href);
    if (next === 'live') url.searchParams.delete('state');
    else url.searchParams.set('state', next);
    // A null state is the form Next's router picks up; handing back its own state object makes it skip the URL.
    window.history.replaceState(null, '', url);
    for (const l of listeners) l();
  }, []);
  const pending = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const choose = React.useCallback(
    (next: PreviewState) => {
      // Choosing a state by hand cancels a retry still on its way back to live data.
      clearTimeout(pending.current);
      set(next);
    },
    [set],
  );
  const retry = React.useCallback(() => {
    clearTimeout(pending.current);
    set('loading');
    pending.current = setTimeout(() => set('live'), 700);
  }, [set]);
  React.useEffect(() => () => clearTimeout(pending.current), []);
  return [state, choose, retry];
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

// ---------- What each state draws in place of the content ----------

/** Placeholder cells in a MetricGroup: label, value and meter, so nothing moves when the numbers arrive. */
export function MetricSkeletons({ count }: { count: number }) {
  return Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      aria-hidden="true"
      className="flex flex-col gap-2.5 bg-card px-4 py-3.5 shadow-[-1px_0_0_0_var(--border),0_-1px_0_0_var(--border)]"
    >
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-1 w-full" />
      <Skeleton className="h-3 w-24" />
    </div>
  ));
}

/**
 * One region of a screen in the preview state: a placeholder its own height while loading, the error or the partial
 * note when given one, and the content otherwise. Each region fails on its own, so the rest of the screen stays useful.
 */
export function DataSlot({
  state,
  label,
  height,
  error,
  partial,
  children,
}: {
  state: PreviewState;
  /** What loads here, for screen readers: "step response". */
  label: string;
  height: number;
  error?: React.ReactNode;
  partial?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (state === 'loading')
    return (
      <div role="status" aria-label={`Loading ${label}`} style={{ height }} className="flex">
        <Skeleton className="flex-1 rounded-inset" />
      </div>
    );
  // An error takes only the room it needs: holding the chart's height would leave a hole under it.
  if (state === 'error' && error) return <>{error}</>;
  if (state === 'partial' && partial) return <>{partial}</>;
  return <>{children}</>;
}

/** A region that could not load: what failed, what is still right, and a retry. */
export function SlotError({
  title,
  children,
  onRetry,
}: {
  title: string;
  children: React.ReactNode;
  onRetry: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertContent>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{children}</AlertDescription>
      </AlertContent>
      <AlertActions>
        <Button size="sm" onClick={onRetry}>
          <RotateCcwIcon aria-hidden="true" />
          Retry
        </Button>
      </AlertActions>
    </Alert>
  );
}

/** Where data is missing for a known reason: the gap keeps its place and says why, in the space it would fill. */
export function SlotGap({
  title,
  children,
  height,
}: {
  title: string;
  children: React.ReactNode;
  height: number;
}) {
  return (
    <div
      style={{ minHeight: height }}
      className="flex flex-col items-center justify-center gap-1 rounded-inset border border-dashed border-border px-6 py-4 text-center"
    >
      <span className="text-body font-medium">{title}</span>
      <span className="max-w-md text-label font-normal text-muted-foreground text-pretty">{children}</span>
    </div>
  );
}
