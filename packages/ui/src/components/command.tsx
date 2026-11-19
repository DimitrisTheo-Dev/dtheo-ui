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
  shortcut?: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
}

/**
 * A ⌘K palette: type to filter, arrows to move, Enter to run. It opens and closes instantly; something used
 * a hundred times a day should never make you wait for an animation.
 */
export function CommandDialog({
  open,
  onOpenChange,
  items,
  placeholder = 'Search commands and pages…',
  emptyMessage = 'No matching commands.',
  shortcut = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItemData[];
  placeholder?: string;
  emptyMessage?: string;
  /** Toggle with ⌘K / Ctrl+K. Pass false when another palette on the page already owns the shortcut. */
  shortcut?: boolean;
}) {
  const container = usePortalContainer();
  const hintId = React.useId();
  const groups = React.useMemo(() => {
    const map = new Map<string, CommandItemData[]>();
    for (const item of items) map.set(item.group, [...(map.get(item.group) ?? []), item]);
    return [...map].map(([value, groupItems]) => ({ value, items: groupItems }));
  }, [items]);

  React.useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange, shortcut]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal container={container}>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-overlay" />
        <DialogPrimitive.Viewport className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[12dvh] pb-3">
          <DialogPrimitive.Popup
            aria-label="Command palette"
            data-slot="command-dialog"
            className="flex max-h-[min(30rem,calc(100dvh-6rem))] w-full max-w-xl flex-col overflow-hidden rounded-dialog border border-border bg-popover text-popover-foreground shadow-dialog outline-none backdrop-blur-material"
          >
            <Autocomplete.Root open inline items={groups} autoHighlight="always" keepHighlight>
              <Autocomplete.InputGroup className="flex items-center gap-2.5 border-b border-border px-3.5">
                <SearchIcon className="size-4 shrink-0 text-subtle-foreground" aria-hidden="true" />
                <Autocomplete.Input
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
                  <p className="px-3 py-8 text-center text-body text-muted-foreground">{emptyMessage}</p>
                </Autocomplete.Empty>
                <Autocomplete.List>
                  {(group: { value: string; items: CommandItemData[] }) => (
                    <Autocomplete.Group key={group.value} items={group.items} className="not-last:mb-1.5">
                      <Autocomplete.GroupLabel className="px-2.5 pt-1.5 pb-1 text-caption font-medium text-subtle-foreground">
                        {group.value}
                      </Autocomplete.GroupLabel>
                      <Autocomplete.Collection>
                        {(item: CommandItemData) => (
                          <Autocomplete.Item
                            key={item.value}
                            value={item}
                            onClick={() => {
                              item.onSelect?.();
                              onOpenChange(false);
                            }}
                            className={cn(
                              'group flex min-h-8 cursor-default items-center gap-2.5 rounded-item px-2.5 text-body outline-none select-none',
                              'scroll-my-1 data-highlighted:bg-primary data-highlighted:text-primary-foreground',
                              '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground data-highlighted:[&_svg]:text-primary-foreground',
                            )}
                          >
                            {item.icon}
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
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
          </DialogPrimitive.Popup>
        </DialogPrimitive.Viewport>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
