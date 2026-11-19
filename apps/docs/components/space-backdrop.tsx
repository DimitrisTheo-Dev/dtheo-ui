'use client';
// dtheo-check-disable-file raw-color -- atmosphere art: star and nebula tints are not UI roles.

import * as React from 'react';

/** A tiny LCG so the starfield is the same on every visit and every resize. */
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * Five canvases, three depths. Far stars are many, small and still; mid stars twinkle on three rhythms that never
 * line up; near stars are few, bright and haloed. Each depth drifts at its own pace, so the sky has parallax.
 */
const CANVASES = [
  { depth: 0, twinkle: 0 },
  { depth: 1, twinkle: 1 },
  { depth: 1, twinkle: 2 },
  { depth: 1, twinkle: 3 },
  { depth: 2, twinkle: 4 },
] as const;

/** How far each depth moves with the pointer, in pixels: far barely, near the most. */
const PARALLAX = [3, 9, 18];

function drawSky(canvases: HTMLCanvasElement[]) {
  const first = canvases[0];
  if (!first) return;
  const { width, height } = first.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const ctx = canvases.map((c) => {
    c.width = width * dpr;
    c.height = height * dpr;
    const x = c.getContext('2d');
    x?.scale(dpr, dpr);
    return x;
  });
  const rand = seededRandom(7);
  const count = Math.round((width * height) / 3600);
  for (let i = 0; i < count; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const tint = rand() < 0.3 ? '214,204,255' : rand() < 0.15 ? '190,226,255' : '255,255,255';
    const roll = rand();
    // About one in fifteen is near and bright; a third twinkle; the rest are far and still.
    const slot = roll < 0.07 ? 4 : roll < 0.42 ? 1 + Math.floor(rand() * 3) : 0;
    const c = ctx[slot];
    if (!c) continue;
    const r = slot === 4 ? 1.2 + rand() * 0.8 : slot === 0 ? 0.35 + rand() * 0.5 : 0.5 + rand() * 0.65;
    const a = slot === 0 ? 0.28 + rand() * 0.4 : 0.5 + rand() * 0.5;
    if (slot === 4) {
      // A soft halo makes the near stars glow instead of reading as dots.
      const g = c.createRadialGradient(x, y, 0, x, y, r * 5);
      g.addColorStop(0, `rgba(${tint},0.45)`);
      g.addColorStop(1, `rgba(${tint},0)`);
      c.fillStyle = g;
      c.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
    }
    c.fillStyle = `rgba(${tint},${a.toFixed(2)})`;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
}

/**
 * Leans each depth toward the pointer, eased so it trails a little behind the hand. Runs only while the pointer
 * moves and stops once the layers settle; the layers move by transform only.
 */
function trackPointer(host: HTMLElement, layers: HTMLElement[]) {
  const target = { x: 0, y: 0 };
  const now = { x: 0, y: 0 };
  let raf = 0;
  const step = () => {
    now.x += (target.x - now.x) * 0.06;
    now.y += (target.y - now.y) * 0.06;
    layers.forEach((el, i) => {
      el.style.transform = `translate3d(${(now.x * PARALLAX[i]!).toFixed(2)}px, ${(now.y * PARALLAX[i]!).toFixed(2)}px, 0)`;
    });
    raf = Math.abs(target.x - now.x) + Math.abs(target.y - now.y) > 0.002 ? requestAnimationFrame(step) : 0;
  };
  const onMove = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    if (e.clientY > r.bottom) return;
    target.x = ((e.clientX - r.left) / r.width - 0.5) * -2;
    target.y = ((e.clientY - r.top) / r.height - 0.5) * -2;
    if (!raf) raf = requestAnimationFrame(step);
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  return () => {
    window.removeEventListener('pointermove', onMove);
    cancelAnimationFrame(raf);
  };
}

/** Every 7 to 15 seconds, while the sky is on screen, one faint streak crosses its upper half. */
function shootingStars(host: HTMLElement, star: HTMLElement) {
  let timer = 0;
  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e?.isIntersecting ?? true));
  io.observe(host);
  const rand = Math.random;
  const fire = () => {
    timer = window.setTimeout(fire, 7000 + rand() * 8000);
    if (!visible || document.hidden) return;
    const { width, height } = host.getBoundingClientRect();
    const fromLeft = rand() < 0.5;
    // Start at a side edge in the upper sky and streak inward through the margin beside the headline.
    const x = width * (fromLeft ? 0.01 + rand() * 0.12 : 0.87 + rand() * 0.12);
    const y = 30 + rand() * Math.min(height * 0.28, 240);
    const theta = ((20 + rand() * 14) * Math.PI) / 180;
    const distance = 150 + rand() * 90;
    const dx = (fromLeft ? 1 : -1) * Math.cos(theta) * distance;
    const dy = Math.sin(theta) * distance;
    const rotate = `rotate(${((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(1)}deg)`;
    star.animate(
      [
        { transform: `translate3d(${x}px, ${y}px, 0) ${rotate} scaleX(0.3)`, opacity: 0 },
        { opacity: 0.9, offset: 0.15 },
        { transform: `translate3d(${x + dx}px, ${y + dy}px, 0) ${rotate} scaleX(1)`, opacity: 0 },
      ],
      { duration: 900 + rand() * 300, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    );
  };
  timer = window.setTimeout(fire, 2500);
  return () => {
    clearTimeout(timer);
    io.disconnect();
  };
}

/**
 * Deep space atmosphere: nebula light and a starfield. Atmosphere only, never behind dense data you must read.
 * Stars are drawn once per size; twinkle and drift are CSS on the compositor. `alive` adds pointer parallax and the
 * occasional shooting star, for heroes only. Reduced motion keeps a still sky.
 */
export function SpaceBackdrop({
  className,
  starsClassName,
  alive = false,
}: {
  className?: string;
  starsClassName?: string;
  alive?: boolean;
}) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const canvasRefs = React.useRef<Array<HTMLCanvasElement | null>>([]);
  const depthRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const starRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const canvases = canvasRefs.current.filter((c): c is HTMLCanvasElement => c !== null);
    if (!canvases[0]) return;
    drawSky(canvases);
    const ro = new ResizeObserver(() => drawSky(canvases));
    ro.observe(canvases[0]);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    const host = hostRef.current;
    const star = starRef.current;
    const layers = depthRefs.current.filter((d): d is HTMLDivElement => d !== null);
    if (!alive || !host || !star) return;
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const fine = globalThis.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
    const stopPointer = fine ? trackPointer(host, layers) : undefined;
    const stopStars = shootingStars(host, star);
    return () => {
      stopPointer?.();
      stopStars();
    };
  }, [alive]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}
    >
      <div className="nebula-breathe absolute inset-0 bg-[radial-gradient(1100px_700px_at_8%_-14%,oklch(0.46_0.18_302/0.55),transparent_62%),radial-gradient(900px_640px_at_104%_16%,oklch(0.52_0.12_205/0.28),transparent_60%),radial-gradient(1300px_800px_at_52%_132%,oklch(0.4_0.15_275/0.45),transparent_62%)]" />
      <div className={`absolute inset-0 ${starsClassName ?? ''}`}>
        {[0, 1, 2].map((depth) => (
          <div
            key={depth}
            ref={(el) => {
              depthRefs.current[depth] = el;
            }}
            className="absolute -inset-6"
          >
            <div className="star-drift absolute inset-0" data-depth={depth}>
              {CANVASES.map((c, i) =>
                c.depth === depth ? (
                  <canvas
                    key={i}
                    ref={(el) => {
                      canvasRefs.current[i] = el;
                    }}
                    data-layer={c.twinkle}
                    className={`absolute inset-0 size-full ${c.twinkle ? 'star-twinkle' : ''}`}
                  />
                ) : null,
              )}
            </div>
          </div>
        ))}
      </div>
      {alive ? (
        <span
          ref={starRef}
          className="absolute top-0 left-0 h-0.5 w-40 origin-left rounded-full bg-[linear-gradient(to_right,transparent,rgba(255,255,255,0.95))] opacity-0 shadow-[0_0_8px_rgba(214,204,255,0.9)]"
        />
      ) : null}
    </div>
  );
}
