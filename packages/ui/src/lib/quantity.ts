/**
 * Engineering quantities, written one way everywhere: a no-break space before the unit, a real minus sign, signed
 * differences, percentage points for the gap between two percentages, and one rule for limits. The Quantity
 * component, the data table and the docs all go through these, so "17.6 %" never also appears as "17.60%".
 */

/** An acceptance limit. Past `max` (or under `min`) fails; within `near` of it is near the limit. */
export interface Limit {
  max?: number;
  min?: number;
  /** Where "near the limit" starts, as a fraction of it. Default 0.9: above 90 % of a maximum. */
  near?: number;
}

export type LimitStatus = 'fail' | 'warn' | 'pass';

/** One rule for every limit: past it fails, within `near` of it warns. The same rule the Metric states. */
export function limitStatus(value: number, { max, min, near = 0.9 }: Limit): LimitStatus {
  if (max !== undefined && value > max) return 'fail';
  if (min !== undefined && value < min) return 'fail';
  if (max !== undefined && value > near * max) return 'warn';
  if (min !== undefined && value < min / near) return 'warn';
  return 'pass';
}

/** The words for each status, so no screen says "Warning" where another says "Near limit". */
export const statusWords = { fail: 'Fail', warn: 'Near limit', pass: 'Pass', missing: 'No data' } as const;

const NBSP = ' ';
const MINUS = '−';
/** Symbols written against the number, with no space: plane angles. Everything else takes a space, % and °C too. */
const attached = new Set(['°', '′', '″']);

const formatters = new Map<string, Intl.NumberFormat>();
function formatter(locale: string, digits: number) {
  const key = `${locale}:${digits}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    formatters.set(key, f);
  }
  return f;
}

export interface NumberOptions {
  /** Decimal places, fixed, so a column of values lines up on the decimal point. Default 0. */
  digits?: number;
  /** Always show the sign: "+3.7", "−1.2", and "±0.0" for a difference that rounds to nothing. */
  signed?: boolean;
  locale?: string;
}

/** A number with fixed decimals and a real minus sign (−, not -). A value that rounds to zero has no sign. */
export function formatNumber(
  value: number,
  { digits = 0, signed = false, locale = 'en-US' }: NumberOptions = {},
) {
  if (!Number.isFinite(value)) return '—';
  const magnitude = formatter(locale, digits).format(Math.abs(value));
  const zero = Number(Math.abs(value).toFixed(digits)) === 0;
  const sign = zero ? (signed ? '±' : '') : value < 0 ? MINUS : signed ? '+' : '';
  return sign + magnitude;
}

/** A value and its unit: "17.6 %", "30.9 A", "71.2 °C", "45°". Null and NaN are "—", never 0. */
export function formatQuantity(value: number | null | undefined, unit?: string, options: NumberOptions = {}) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const n = formatNumber(value, options);
  if (!unit) return n;
  return attached.has(unit) ? `${n}${unit}` : `${n}${NBSP}${unit}`;
}

/**
 * An absolute difference, signed. A difference between two percentages is in points: overshoot of 17.6 % against a
 * 10 % limit is "+7.6 points", because "+7.6 %" would mean 10.76 %.
 */
export function formatDelta(delta: number, unit?: string, options: Omit<NumberOptions, 'signed'> = {}) {
  if (unit === '%') return `${formatNumber(delta, { ...options, signed: true })}${NBSP}points`;
  return formatQuantity(delta, unit, { ...options, signed: true });
}

/** A relative change, as a percentage of where it started: Kp 2.80 → 4.20 is "+50 %". */
export function formatChange(from: number, to: number, options: Omit<NumberOptions, 'signed'> = {}) {
  if (from === 0) return '—';
  return formatQuantity(((to - from) / Math.abs(from)) * 100, '%', { ...options, signed: true });
}

/** A limit as people read it next to a value: "≤ 10 %", "≥ 45°", "4–20 mA". */
export function formatLimit({ max, min }: Limit, unit?: string, options: NumberOptions = {}) {
  const q = (v: number) => formatQuantity(v, unit, options);
  if (max !== undefined && min !== undefined) {
    const range = `${formatNumber(min, options)}–${formatNumber(max, options)}`;
    if (!unit) return range;
    return attached.has(unit) ? `${range}${unit}` : `${range}${NBSP}${unit}`;
  }
  if (max !== undefined) return `≤${NBSP}${q(max)}`;
  if (min !== undefined) return `≥${NBSP}${q(min)}`;
  return '';
}

/** How much of a maximum a value uses: "97 % of the limit". Reads better than a ratio for anything near it. */
export function formatShareOfLimit(value: number, max: number) {
  return `${formatQuantity((value / max) * 100, '%')} of the limit`;
}
