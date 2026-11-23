import * as React from 'react';
import { CircleXIcon, TriangleAlertIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  formatNumber,
  formatLimit,
  limitStatus,
  statusWords,
  type Limit,
  type NumberOptions,
} from '../lib/quantity';

export {
  formatChange,
  formatDelta,
  formatLimit,
  formatNumber,
  formatQuantity,
  formatShareOfLimit,
  limitStatus,
  statusWords,
} from '../lib/quantity';
export type { Limit, LimitStatus, NumberOptions } from '../lib/quantity';

/**
 * A measured value with its unit, written the way the whole system writes it: fixed decimals, tabular figures, a
 * real minus sign, the unit quieter than the number. Give it a limit and a value past it carries an icon, a color
 * and, for screen readers, the words; `showLimit` writes the limit after it. A missing value is a dash and "No data",
 * never 0.
 */
export function Quantity({
  value,
  unit,
  digits = 0,
  signed = false,
  limit,
  showLimit = false,
  className,
  ...props
}: Omit<React.ComponentProps<'span'>, 'children'> &
  Pick<NumberOptions, 'digits' | 'signed'> & {
    value: number | null | undefined;
    unit?: string;
    limit?: Limit;
    /** Write the limit after the value, quieter: "30.9 A / ≤ 32 A". */
    showLimit?: boolean;
  }) {
  const missing = value === null || value === undefined || !Number.isFinite(value);
  const status = !missing && limit ? limitStatus(value, limit) : 'pass';
  const Icon = status === 'fail' ? CircleXIcon : status === 'warn' ? TriangleAlertIcon : null;
  // Plane angles sit against the number (45°); every other unit takes a space, % and °C included.
  const tight = unit === '°';
  // Whole-number limits read as written ("≤ 32 A"), others with the value's decimals ("≤ 13.2 N·m").
  const limitDigits =
    limit && [limit.max, limit.min].every((v) => v === undefined || Number.isInteger(v)) ? 0 : digits;
  return (
    <span
      data-slot="quantity"
      data-status={missing ? 'missing' : status}
      className={cn(
        'inline-flex items-baseline gap-1 whitespace-nowrap tabular-nums',
        status === 'fail' && 'font-medium text-destructive-foreground',
        status === 'warn' && 'text-warning-foreground',
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="size-3 shrink-0 self-center" aria-hidden="true" /> : null}
      {missing ? (
        <span className="text-subtle-foreground">
          <span aria-hidden="true">—</span>
          <span className="sr-only">{statusWords.missing}</span>
        </span>
      ) : (
        <span>
          {formatNumber(value, { digits, signed })}
          {unit ? (
            <span className={status === 'pass' ? 'text-muted-foreground' : undefined}>
              {tight ? unit : ` ${unit}`}
            </span>
          ) : null}
          {status !== 'pass' ? (
            <span className="sr-only">{status === 'fail' ? ', over the limit' : ', near the limit'}</span>
          ) : null}
        </span>
      )}
      {showLimit && limit ? (
        <span className="font-normal text-subtle-foreground">
          / {formatLimit(limit, unit, { digits: limitDigits })}
        </span>
      ) : null}
    </span>
  );
}
