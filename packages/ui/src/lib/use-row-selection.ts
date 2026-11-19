import * as React from 'react';

/** Was Shift held for this change? Works for a click and for Space on a focused checkbox. */
export function withShift(details?: { event?: Event }) {
  const e = details?.event;
  return Boolean(e && 'shiftKey' in e && (e as MouseEvent | KeyboardEvent).shiftKey);
}

/**
 * Row selection that works like a mail inbox: click a checkbox, then Shift-click another, and every row between
 * them takes the new state. `order` is the rows as they are shown now (filtered, sorted, this page), so the range
 * follows what the user sees.
 *
 * ```tsx
 * const sel = useRowSelection(visible.map((r) => r.id));
 * <Checkbox checked={sel.isSelected(id)} onCheckedChange={(c, d) => sel.toggle(id, c, withShift(d))} />
 * ```
 */
export function useRowSelection(order: readonly string[]) {
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(() => new Set());
  // The last row clicked without Shift held, or the end of the last range: where the next range starts.
  const anchor = React.useRef<string | null>(null);

  const toggle = React.useCallback(
    (id: string, checked: boolean, shift = false) => {
      const from = anchor.current ? order.indexOf(anchor.current) : -1;
      const to = order.indexOf(id);
      const ids =
        shift && from >= 0 && to >= 0 ? order.slice(Math.min(from, to), Math.max(from, to) + 1) : [id];
      setSelected((s) => {
        const next = new Set(s);
        for (const r of ids) {
          if (checked) next.add(r);
          else next.delete(r);
        }
        return next;
      });
      anchor.current = id;
    },
    [order],
  );

  const setAll = React.useCallback((ids: readonly string[], checked: boolean) => {
    setSelected((s) => {
      const next = new Set(s);
      for (const r of ids) {
        if (checked) next.add(r);
        else next.delete(r);
      }
      return next;
    });
  }, []);

  const clear = React.useCallback(() => {
    anchor.current = null;
    setSelected(new Set());
  }, []);

  const isSelected = React.useCallback((id: string) => selected.has(id), [selected]);
  const all = order.length > 0 && order.every((id) => selected.has(id));
  const some = !all && order.some((id) => selected.has(id));

  return { selected, isSelected, toggle, setAll, clear, all, some, count: selected.size };
}
