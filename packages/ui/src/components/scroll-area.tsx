'use client';

import * as React from 'react';
import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';
import { cn } from '../lib/utils';

function useOverflowing(ref: React.RefObject<HTMLDivElement | null>) {
  const [overflowing, setOverflowing] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setOverflowing(el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [ref]);
  return overflowing;
}

/**
 * A scroll container with thin overlay scrollbars and edge fades that appear only where content
 * actually overflows (masked edges).
 */
export function ScrollArea({
  className,
  children,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  orientation?: 'vertical' | 'horizontal' | 'both';
}) {
  const viewport = React.useRef<HTMLDivElement>(null);
  const scrolls = useOverflowing(viewport);
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('relative min-h-0 overflow-hidden', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewport}
        // Keyboard users can only scroll what they can focus, so the viewport joins the tab order while it overflows.
        tabIndex={scrolls ? 0 : undefined}
        className={cn(
          'size-full overscroll-contain rounded-[inherit] [--focus-offset:-2px]',
          '[--fade:24px] mask-[linear-gradient(to_bottom,transparent,black_min(var(--scroll-area-overflow-y-start,0px),var(--fade)),black_calc(100%-min(var(--scroll-area-overflow-y-end,0px),var(--fade))),transparent)]',
        )}
      >
        <ScrollAreaPrimitive.Content>{children}</ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      {orientation !== 'horizontal' ? <ScrollBar orientation="vertical" /> : null}
      {orientation !== 'vertical' ? <ScrollBar orientation="horizontal" /> : null}
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({ orientation }: { orientation: 'vertical' | 'horizontal' }) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      orientation={orientation}
      className={cn(
        'flex touch-none p-0.5 opacity-0 transition-opacity duration-150 select-none data-hovering:opacity-100 data-scrolling:opacity-100',
        orientation === 'vertical' ? 'w-2.5' : 'h-2.5 flex-col',
      )}
    >
      <ScrollAreaPrimitive.Thumb className="flex-1 rounded-full bg-foreground/25" />
    </ScrollAreaPrimitive.Scrollbar>
  );
}
