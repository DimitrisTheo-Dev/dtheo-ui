import { describe, expect, it } from 'vitest';
import { clientKey, createLimiter } from '@/lib/rate-limit';

const headers = (h: Record<string, string>) => new Headers(h);

describe('clientKey', () => {
  it('prefers the platform-set x-real-ip, then the first x-forwarded-for address', () => {
    expect(clientKey(headers({ 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '198.51.100.1' }))).toBe(
      '203.0.113.7',
    );
    expect(clientKey(headers({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }))).toBe('198.51.100.1');
    expect(clientKey(headers({}))).toBe('local');
  });

  it('counts an IPv6 client by its /64, however it writes the address', () => {
    const a = clientKey(headers({ 'x-real-ip': '2001:db8:85a3:12::1' }));
    expect(a).toBe('2001:db8:85a3:12::/64');
    expect(clientKey(headers({ 'x-real-ip': '2001:0db8:85a3:0012:ffff:1:2:3' }))).toBe(a);
    expect(clientKey(headers({ 'x-real-ip': '2001:db8::1' }))).toBe('2001:db8:0:0::/64');
    expect(clientKey(headers({ 'x-real-ip': '::ffff:203.0.113.7' }))).toBe('203.0.113.7');
  });
});

describe('createLimiter', () => {
  it('refuses the request past the limit until the window ends', () => {
    const limiter = createLimiter({ limit: 3, windowMs: 60_000, maxClients: 100 });
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) expect(limiter.check('a', t).ok).toBe(true);
    expect(limiter.check('a', t + 1_000)).toEqual({ ok: false, retryAfter: 59 });
    expect(limiter.check('b', t + 1_000).ok).toBe(true);
    expect(limiter.check('a', t + 60_001).ok).toBe(true);
  });

  it('stops a client that rotates through its IPv6 /64', () => {
    const limiter = createLimiter({ limit: 120, windowMs: 60_000, maxClients: 5000 });
    const results = Array.from(
      { length: 200 },
      (_, i) =>
        limiter.check(clientKey(headers({ 'x-real-ip': `2001:db8:1:2::${i.toString(16)}` })), 1_000).ok,
    );
    expect(results.filter((ok) => !ok)).toHaveLength(80);
  });

  it('remembers at most maxClients, dropping the ones seen longest ago', () => {
    const limiter = createLimiter({ limit: 2, windowMs: 60_000, maxClients: 1000 });
    for (let i = 0; i < 50_000; i++) limiter.check(`10.0.${i >> 8}.${i & 255}`, 1_000 + i);
    expect(limiter.size()).toBeLessThanOrEqual(1000);
    // The newest client is still counted.
    limiter.check('10.0.195.79', 60_000);
    expect(limiter.check('10.0.195.79', 60_000).ok).toBe(false);
  });
});
