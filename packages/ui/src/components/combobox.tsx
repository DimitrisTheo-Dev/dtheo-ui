'use client';

import * as React from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePortalContainer } from '../lib/theme';
import { popupItemClass, popupSurfaceClass } from '../lib/popup';

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * A searchable select for long lists (actuators, firmware builds, people). Type to filter; the list
 * says so when nothing matches. Values are matched case- and accent-insensitively. Other props (name,
 * required, open, onOpenChange…) go to Base UI's Combobox root.
 */
export function Combobox({
  items,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Search…',
  emptyMessage = 'No matches.',
  className,
  disabled,
  'aria-label': ariaLabel,
  ...props
}: Omit<
  ComboboxPrimitive.Root.Props<ComboboxOption>,
  'items' | 'value' | 'defaultValue' | 'onValueChange' | 'multiple' | 'itemToStringLabel' | 'children'
> & {
  items: ComboboxOption[];
  value?: ComboboxOption | null;
  defaultValue?: ComboboxOption | null;
  onValueChange?: (value: ComboboxOption | null) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  const container = usePortalContainer();
  return (
    <ComboboxPrimitive.Root
      {...props}
      items={items}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      itemToStringLabel={(item: ComboboxOption) => item.label}
    >
      <ComboboxPrimitive.InputGroup
        data-slot="combobox-group"
        className={cn(
          'flex h-control-md w-full min-w-0 items-center rounded-control border border-input bg-card text-body',
          'has-[input:focus-visible]:border-ring has-[input:focus-visible]:inset-ring has-[input:focus-visible]:inset-ring-ring has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/12',
          'data-disabled:opacity-45',
          className,
        )}
      >
        <ComboboxPrimitive.Input
          data-focus="field"
          aria-label={ariaLabel}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent pl-2.5 outline-none placeholder:text-subtle-foreground"
        />
        <ComboboxPrimitive.Clear
          aria-label="Clear"
          className="grid size-6 shrink-0 place-items-center rounded-[calc(var(--radius-control)-2px)] text-subtle-foreground hover:text-foreground data-ending-style:opacity-0"
        >
          <XIcon className="size-3.5" aria-hidden="true" />
        </ComboboxPrimitive.Clear>
        <ComboboxPrimitive.Trigger
          aria-label="Show options"
          aria-labelledby={undefined}
          className="mr-1 grid size-6 shrink-0 place-items-center rounded-[calc(var(--radius-control)-2px)] text-subtle-foreground hover:text-foreground"
        >
          <ChevronsUpDownIcon className="size-3.5" aria-hidden="true" />
        </ComboboxPrimitive.Trigger>
      </ComboboxPrimitive.InputGroup>
      <ComboboxPrimitive.Portal container={container}>
        <ComboboxPrimitive.Positioner className="z-50 outline-none" sideOffset={4}>
          <ComboboxPrimitive.Popup
            data-slot="combobox-content"
            className={cn(
              popupSurfaceClass,
              'w-(--anchor-width) max-h-[min(var(--available-height),20rem)] overflow-y-auto p-1',
            )}
          >
            <ComboboxPrimitive.Empty className="px-2 py-3 text-body text-muted-foreground empty:hidden">
              {emptyMessage}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List>
              {(item: ComboboxOption) => (
                <ComboboxPrimitive.Item
                  key={item.value}
                  value={item}
                  className={cn(popupItemClass, 'grid grid-cols-[1rem_1fr] gap-1.5 pr-3')}
                >
                  <ComboboxPrimitive.ItemIndicator className="col-start-1 flex">
                    <CheckIcon className="size-3.5" aria-hidden="true" />
                  </ComboboxPrimitive.ItemIndicator>
                  <span className="col-start-2 flex min-w-0 flex-col">
                    <span className="truncate">{item.label}</span>
                    {item.description ? (
                      <span className="truncate text-caption opacity-70">{item.description}</span>
                    ) : null}
                  </span>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}
