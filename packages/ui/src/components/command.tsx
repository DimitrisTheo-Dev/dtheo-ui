'use client';

import * as React from 'react';
import { Autocomplete } from '@base-ui/react/autocomplete';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { SearchIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePortalContainer } from '../lib/theme';
import { Kbd } from './kbd';

export interface CommandItemData {
  value: string;
  label: string;
  group: string;
  hint?: string;
  /** More words that find the item: topics, synonyms, API names. Searched, never shown. */
  keywords?: string[];
  shortcut?: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
}

interface CommandGroup {
  value: string;
  items: CommandItemData[];
}

type Contains = (text: string, query: string) => boolean;

/**
 * The K of ⌘K. A Latin layout reports the letter it types, so Dvorak and AZERTY users press their own K. A Greek,
 * Cyrillic or Hebrew layout reports its own letter (κ, л, ל), so fall back to the physical key there.
 */
export function isKKey(event: Pick<KeyboardEvent, 'key' | 'code'>) {
  if (/^[a-z]$/i.test(event.key)) return event.key.toLowerCase() === 'k';
  return event.code === 'KeyK';
}

/**
 * Every word of the query must appear in the item's label, hint or keywords. Items whose label is the query come
 * first, then those whose label has every word, and their groups move up with them, so typing a name and pressing
 * Enter opens that item even when other items mention the word.
 */
function search(groups: CommandGroup[], query: string, contains: Contains): CommandGroup[] {
  const q = query.trim();
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length === 0) return groups;
  const matches = (text: string) => words.every((word) => contains(text, word));
  const score = (item: CommandItemData) => {
    if (item.label.length === q.length && contains(item.label, q)) return 3;
    if (matches(item.label)) return 2;
    return matches([item.label, item.hint, ...(item.keywords ?? [])].join(' ')) ? 1 : 0;
  };
  return groups
    .map((group) => {
      const found = group.items
        .map((item) => ({ item, score: score(item) }))
        .filter((f) => f.score > 0)
        .sort((a, b) => b.score - a.score);
      return { value: group.value, items: found.map((f) => f.item), best: found[0]?.score ?? 0 };
    })
    .filter((group) => group.items.length > 0)
    .sort((a, b) => b.best - a.best)
    .map(({ value, items }) => ({ value, items }));
}

/**
 * A ⌘K palette: type to filter, arrows to move, Enter to run. It opens and closes instantly; something used
 * a hundred times a day should never make you wait for an animation. Other props go to Base UI's Dialog root.
 */
export function CommandDialog({
  open,
  onOpenChange,
  items,
  placeholder = 'Search commands and pages…',
  emptyMessage = 'No matching commands.',
  shortcut = true,
  ...props
}: Omit<DialogPrimitive.Root.Props, 'open' | 'defaultOpen' | 'onOpenChange' | 'children'> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItemData[];
  placeholder?: string;
  /** Shown when nothing matches. Say what to try next; it can hold an action. */
  emptyMessage?: React.ReactNode;
  /** Toggle with ⌘K / Ctrl+K. Pass false when another palette on the page already owns the shortcut. */
  shortcut?: boolean;
}) {
  const container = usePortalContainer();
  const groups = React.useMemo(() => {
    const map = new Map<string, CommandItemData[]>();
    for (const item of items) map.set(item.group, [...(map.get(item.group) ?? []), item]);
    return [...map].map(([value, groupItems]) => ({ value, items: groupItems }));
  }, [items]);

  React.useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && isKKey(e)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange, shortcut]);

  return (
    <DialogPrimitive.Root {...props} open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal container={container}>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-overlay" />
        <DialogPrimitive.Viewport className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[12dvh] pb-3">
          <DialogPrimitive.Popup
            aria-label="Command palette"
            data-slot="command-dialog"
            className="flex max-h-[min(30rem,calc(100dvh-6rem))] w-full max-w-xl flex-col overflow-hidden rounded-dialog border border-border bg-popover text-popover-foreground shadow-dialog outline-none backdrop-blur-material"
          >
            <CommandSearch
              groups={groups}
              placeholder={placeholder}
              emptyMessage={emptyMessage}
              onRun={(item) => {
                item.onSelect?.();
                onOpenChange(false);
              }}
            />
          </DialogPrimitive.Popup>
        </DialogPrimitive.Viewport>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** The field and the list. It mounts with the popup, so every opening starts with an empty query. */
function CommandSearch({
  groups,
  placeholder,
  emptyMessage,
  onRun,
}: {
  groups: CommandGroup[];
  placeholder: string;
  emptyMessage: React.ReactNode;
  onRun: (item: CommandItemData) => void;
}) {
  const hintId = React.useId();
  const [query, setQuery] = React.useState('');
  const { contains } = Autocomplete.useFilter();
  const filtered = React.useMemo(() => search(groups, query, contains), [groups, query, contains]);

  return (
    <Autocomplete.Root
      open
      inline
      items={groups}
      filteredItems={filtered}
      value={query}
      onValueChange={setQuery}
      autoHighlight="always"
      keepHighlight
    >
      <Autocomplete.InputGroup className="flex items-center gap-2.5 border-b border-border px-3.5">
        <SearchIcon className="size-4 shrink-0 text-subtle-foreground" aria-hidden="true" />
        {/* The palette is one field in its own window: the caret shows focus, as in Spotlight, so no ring. */}
        <Autocomplete.Input
          data-focus="none"
          aria-label="Search commands"
          aria-describedby={hintId}
          placeholder={placeholder}
          className="h-11 w-full bg-transparent text-callout outline-none placeholder:text-subtle-foreground"
        />
        <Kbd>esc</Kbd>
      </Autocomplete.InputGroup>
      <DialogPrimitive.Close className="sr-only">Close command palette</DialogPrimitive.Close>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-py-1 p-1.5">
        <Autocomplete.Empty>
          <div className="flex flex-col items-center gap-3 px-3 py-8 text-center text-body text-muted-foreground">
            {emptyMessage}
          </div>
        </Autocomplete.Empty>
        <Autocomplete.List>
          {(group: CommandGroup) => (
            <Autocomplete.Group key={group.value} items={group.items} className="not-last:mb-1.5">
              <Autocomplete.GroupLabel className="px-2.5 pt-1.5 pb-1 text-caption font-medium text-subtle-foreground">
                {group.value}
              </Autocomplete.GroupLabel>
              <Autocomplete.Collection>
                {(item: CommandItemData) => (
                  <Autocomplete.Item
                    key={item.value}
                    value={item}
                    onClick={() => onRun(item)}
                    className={cn(
                      'group flex min-h-8 cursor-default items-center gap-2.5 rounded-item px-2.5 text-body outline-none select-none',
                      'scroll-my-1 data-highlighted:bg-primary data-highlighted:text-primary-foreground',
                      '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground data-highlighted:[&_svg]:text-primary-foreground',
                    )}
                  >
                    {item.icon}
                    {/* The name never gives way to the hint; a long hint truncates first. */}
                    <span className="max-w-full shrink-0 grow truncate">{item.label}</span>
                    {item.hint ? (
                      <span className="truncate text-caption text-subtle-foreground group-data-highlighted:text-primary-foreground/80">
                        {item.hint}
                      </span>
                    ) : null}
                    {item.shortcut ? (
                      <span className="text-caption tracking-wide text-subtle-foreground group-data-highlighted:text-primary-foreground/80">
                        {item.shortcut}
                      </span>
                    ) : null}
                  </Autocomplete.Item>
                )}
              </Autocomplete.Collection>
            </Autocomplete.Group>
          )}
        </Autocomplete.List>
      </div>
      <div className="flex items-center gap-4 border-t border-border px-3.5 py-2 text-caption text-subtle-foreground">
        <span id={hintId} className="sr-only">
          Use the arrow keys to move and Enter to run the highlighted command.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> Move
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd>↵</Kbd> Run
        </span>
      </div>
    </Autocomplete.Root>
  );
}
