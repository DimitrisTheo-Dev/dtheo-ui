// @vitest-environment jsdom
import './setup';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Quantity,
  formatChange,
  formatDelta,
  formatLimit,
  formatNumber,
  formatQuantity,
  formatShareOfLimit,
} from '../src/components/quantity';

const NBSP = ' ';

describe('format functions', () => {
  it('put a no-break space before a unit, except an angle’s degree sign', () => {
    expect(formatQuantity(17.6038, '%', { digits: 1 })).toBe(`17.6${NBSP}%`);
    expect(formatQuantity(71.2, '°C', { digits: 1 })).toBe(`71.2${NBSP}°C`);
    expect(formatQuantity(48, '°')).toBe('48°');
  });

  it('use a real minus, and no sign on a value that rounds to zero', () => {
    expect(formatNumber(-13.7, { digits: 1 })).toBe('−13.7');
    expect(formatNumber(-0.04, { digits: 1 })).toBe('0.0');
    expect(formatNumber(-0.04, { digits: 1, signed: true })).toBe('±0.0');
    expect(formatNumber(3.25, { digits: 2, signed: true })).toBe('+3.25');
  });

  it('write a missing value as a dash, never 0', () => {
    expect(formatQuantity(null, 'A')).toBe('—');
    expect(formatQuantity(Number.NaN, 'A')).toBe('—');
  });

  it('give the gap between two percentages in points, and a relative change in percent', () => {
    expect(formatDelta(17.6 - 10, '%', { digits: 1 })).toBe(`+7.6${NBSP}points`);
    expect(formatDelta(-1.5, 'A', { digits: 1 })).toBe(`−1.5${NBSP}A`);
    expect(formatChange(2.8, 4.2)).toBe(`+50${NBSP}%`);
    expect(formatShareOfLimit(30.9, 32)).toBe(`97${NBSP}% of the limit`);
  });

  it('write limits as people read them', () => {
    expect(formatLimit({ max: 32 }, 'A')).toBe(`≤${NBSP}32${NBSP}A`);
    expect(formatLimit({ min: 45 }, '°')).toBe(`≥${NBSP}45°`);
    expect(formatLimit({ min: 4, max: 20 }, 'mA')).toBe(`4–20${NBSP}mA`);
  });
});

describe('Quantity', () => {
  it('marks a value past its limit in words, not only color', () => {
    render(<Quantity value={17.6} unit="%" digits={1} limit={{ max: 10 }} />);
    expect(screen.getByText(', over the limit')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="quantity"]')).toHaveAttribute('data-status', 'fail');
  });

  it('says "No data" for a missing value, and still states the limit', () => {
    render(<Quantity value={null} unit="ms" limit={{ max: 80 }} showLimit />);
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="quantity"]')).toHaveTextContent(/\/ ≤\s80\sms/);
  });
});
