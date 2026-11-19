/**
 * A fixed-size ring buffer of timestamped samples. Push as fast as data arrives; the chart reads it on the next
 * animation frame, so a 1 kHz feed costs one draw per frame, not one React render per sample.
 */
export interface Stream {
  readonly channels: readonly string[];
  readonly capacity: number;
  /** Samples currently held, oldest first. */
  readonly size: number;
  /** Increments on every push or clear; the chart redraws when it changes. */
  readonly version: number;
  /** Append one sample. `t` is in milliseconds and must not go backwards; `values` follow `channels`. */
  push(t: number, values: readonly number[]): void;
  clear(): void;
  time(i: number): number;
  value(channel: number, i: number): number;
  /** Index of the first sample at or after `t`. */
  indexAt(t: number): number;
}

export function createStream(channels: readonly string[], capacity = 20_000): Stream {
  const times = new Float64Array(capacity);
  const data = channels.map(() => new Float32Array(capacity));
  let start = 0;
  let size = 0;
  let version = 0;
  const slot = (i: number) => (start + i) % capacity;
  const stream: Stream = {
    channels,
    capacity,
    get size() {
      return size;
    },
    get version() {
      return version;
    },
    push(t, values) {
      const at = size < capacity ? slot(size) : start;
      times[at] = t;
      data.forEach((d, c) => {
        d[at] = values[c] ?? Number.NaN;
      });
      if (size < capacity) size++;
      else start = (start + 1) % capacity;
      version++;
    },
    clear() {
      start = 0;
      size = 0;
      version++;
    },
    time: (i) => times[slot(i)]!,
    value: (c, i) => data[c]![slot(i)]!,
    indexAt(t) {
      let lo = 0;
      let hi = size;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (times[slot(mid)]! < t) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    },
  };
  return stream;
}
