import { describe, expect, it } from 'vitest';
import { formatNumber } from '../src/index';

describe('formatNumber', () => {
  it('prints the same digits in every locale, with a true minus sign', () => {
    expect(formatNumber(5.64, 1)).toBe('5.6');
    expect(formatNumber(17278.4, 0)).toBe('17,278');
    expect(formatNumber(-2.5, 2)).toBe('−2.50');
  });

  it('drops the sign of a value that rounds to zero and dashes a missing value', () => {
    expect(formatNumber(-0.004, 2)).toBe('0.00');
    expect(formatNumber(Number.NaN)).toBe('–');
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('–');
  });
});
