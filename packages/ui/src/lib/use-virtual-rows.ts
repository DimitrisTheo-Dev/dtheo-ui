import * as React from 'react';

export interface VirtualRowsOptions {
  /** How many rows there are in all. */
  count: number;
  /** Every row is this tall, in px. Fixed heights keep the scrollbar honest and the math exact. */
  rowHeight: number;
  /** The scrolling element. */
  scrollRef: React.RefObject<HTMLElement | null>;
  /** Space above the first row inside the scroller, such as a sticky header, in px. */
  offset?: number;
  /** Rows drawn beyond each edge, so a fast scroll or a keypress never shows a gap. */
  overscan?: number;
  /** The viewport height assumed before the first measurement: what the server renders. */
  initialHeight?: number;
}

/** Which rows a viewport shows. Pure, so it can be tested without a browser. */
export function virtualWindow(
  count: number,
  rowHeight: number,
  scrollTop: number,
  height: number,
  offset = 0,
  overscan = 6,
) {
  const top = Math.max(0, scrollTop - offset);
  // Clamped to the count: after a filter shortens the list, the scroll position is stale until the browser fixes it.
  const start = Math.min(count, Math.max(0, Math.floor(top / rowHeight) - overscan));
  const end = Math.min(count, Math.ceil((top + height) / rowHeight) + overscan);
  return {
    start,
    end: Math.max(start, end),
    /** Height of the rows above the window and below it, drawn as two spacers. */
    before: start * rowHeight,
    after: Math.max(0, count - Math.max(start, end)) * rowHeight,
  };
}

/**
 * Draws only the rows in view, plus a few on each side. The rows keep their real positions through two spacers, so
 * the scrollbar, `aria-rowindex` and Find in page still describe the whole list. `scrollToIndex` brings a row into
 * view and updates the window in the same render, so keyboard focus can land on it at once.
 *
 * ```tsx
 * const { start, end, before, after } = useVirtualRows({ count: rows.length, rowHeight: 32, scrollRef });
 * ```
 */
export function useVirtualRows({
  count,
  rowHeight,
  scrollRef,
  offset = 0,
  overscan = 6,
  initialHeight = 640,
}: VirtualRowsOptions) {
  const [viewport, setViewport] = React.useState({ top: 0, height: initialHeight });

  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () =>
      setViewport((v) =>
        v.top === el.scrollTop && v.height === el.clientHeight
          ? v
          : { top: el.scrollTop, height: el.clientHeight },
      );
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [scrollRef]);

  const scrollToIndex = React.useCallback(
    (index: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const rowTop = index * rowHeight;
      const visible = el.clientHeight - offset;
      let top = el.scrollTop;
      if (rowTop < top) top = rowTop;
      else if (rowTop + rowHeight > top + visible) top = rowTop + rowHeight - visible;
      if (top === el.scrollTop) return;
      el.scrollTop = top;
      setViewport({ top: el.scrollTop, height: el.clientHeight });
    },
    [scrollRef, rowHeight, offset],
  );

  const drawn = virtualWindow(count, rowHeight, viewport.top, viewport.height, offset, overscan);
  // The first row wholly in view, kept inside what is drawn: where focus should enter a list that has no active row.
  const first = Math.min(
    Math.max(drawn.start, Math.ceil(viewport.top / rowHeight)),
    Math.max(drawn.start, drawn.end - 1),
  );
  return {
    ...drawn,
    first,
    /** Rows that fit in the viewport: what Page Up and Page Down move by. */
    pageSize: Math.max(1, Math.floor((viewport.height - offset) / rowHeight) - 1),
    scrollToIndex,
  };
}
