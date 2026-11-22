/**
 * A best-effort, per-client request limit for one server instance. It lives in that instance's memory, so it slows a
 * runaway agent loop rather than stopping a determined client; abuse protection belongs to the platform's firewall.
 */

/**
 * Who sent a request. On Vercel, `x-real-ip` and `x-forwarded-for` are set by the platform, which overwrites what the
 * client sent. An IPv6 client usually holds a whole /64 and can rotate through it, so it counts as one client.
 */
export function clientKey(headers: Headers) {
  const ip = (headers.get('x-real-ip') ?? headers.get('x-forwarded-for')?.split(',')[0] ?? '').trim();
  if (!ip) return 'local';
  if (!ip.includes(':')) return ip;
  // An IPv4 client seen through an IPv6 socket: ::ffff:203.0.113.7.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return mapped[1]!;
  const [head = '', tail] = ip.toLowerCase().split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const groups =
    tail === undefined
      ? left
      : [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right];
  return `${groups
    .slice(0, 4)
    .map((g) => g.replace(/^0+(?=.)/, ''))
    .join(':')}::/64`;
}

interface Window {
  n: number;
  reset: number;
}

/**
 * Allows `limit` requests per client in each `windowMs`. It remembers at most `maxClients` clients: ended windows are
 * forgotten first (at most once a second), and past the cap the clients seen longest ago go, so many one-off clients
 * can't grow memory without bound or reset everyone else's count.
 */
export function createLimiter({
  limit,
  windowMs,
  maxClients,
}: {
  limit: number;
  windowMs: number;
  maxClients: number;
}) {
  const windows = new Map<string, Window>();
  let swept = 0;
  const check = (key: string, now = Date.now()): { ok: true } | { ok: false; retryAfter: number } => {
    if (windows.size >= maxClients && now - swept > 1000) {
      swept = now;
      for (const [k, w] of windows) if (w.reset < now) windows.delete(k);
    }
    const w = windows.get(key);
    if (!w || w.reset < now) {
      if (w) windows.delete(key);
      // A Map keeps insertion order, so the first keys are the clients whose current window began longest ago.
      for (const k of windows.keys()) {
        if (windows.size < maxClients) break;
        windows.delete(k);
      }
      windows.set(key, { n: 1, reset: now + windowMs });
      return { ok: true };
    }
    if (++w.n > limit) return { ok: false, retryAfter: Math.ceil((w.reset - now) / 1000) };
    return { ok: true };
  };
  return { check, size: () => windows.size };
}
