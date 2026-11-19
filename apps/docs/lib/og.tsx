import * as React from 'react';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { colors } from '@dtheo/tokens/native';
import { site } from './site';

const fontFile = (weight: number) =>
  readFile(join(process.cwd(), `node_modules/@fontsource/inter/files/inter-latin-${weight}-normal.woff`));

/**
 * Inter for the images (next/og's built-in face has no bold). The site itself uses the system font; images cannot,
 * since they render on a server that has none of the reader's fonts.
 */
export async function ogFonts() {
  const [regular, semibold, bold] = await Promise.all([fontFile(400), fontFile(600), fontFile(700)]);
  return [
    { name: 'Inter', data: regular, weight: 400 as const, style: 'normal' as const },
    { name: 'Inter', data: semibold, weight: 600 as const, style: 'normal' as const },
    { name: 'Inter', data: bold, weight: 700 as const, style: 'normal' as const },
  ];
}

/**
 * Share cards and icons, rendered by next/og at build time. Images live outside the CSS theme, so every color comes
 * from the token export (graphite, dark), never a literal.
 */
const c = colors.graphite.dark;
const alpha = (hex: string, a: number) =>
  `${hex.slice(0, 7)}${Math.round(a * 255)
    .toString(16)
    .padStart(2, '0')}`;

export const ogSize = { width: 1200, height: 630 };

/** The same seeded sky as the site's hero, so a shared link looks like the page it opens. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function Stars({ width, height, count = 170 }: { width: number; height: number; count?: number }) {
  const rand = seeded(7);
  const stars = Array.from({ length: count }, () => {
    const near = rand() < 0.08;
    return {
      x: rand() * width,
      y: rand() * height,
      r: near ? 1.3 + rand() * 0.9 : 0.4 + rand() * 0.7,
      a: near ? 0.9 : 0.25 + rand() * 0.5,
      tint: rand() < 0.3 ? c['chart-4'] : c.foreground,
      near,
    };
  });
  return (
    <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
      {stars.map((s, i) => (
        <g key={i}>
          {s.near ? <circle cx={s.x} cy={s.y} r={s.r * 4} fill={alpha(s.tint, 0.12)} /> : null}
          <circle cx={s.x} cy={s.y} r={s.r} fill={alpha(s.tint, s.a)} />
        </g>
      ))}
    </svg>
  );
}

/** The orbit mark: two bodies and the five points between them; the two stable points carry the accent. */
export function Mark({ size, ring = true }: { size: number; ring?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {ring ? (
        <circle cx="12" cy="12" r="10.25" fill="none" stroke={alpha(c.foreground, 0.28)} strokeWidth="1" />
      ) : null}
      <circle cx="7" cy="12" r="2.6" fill={c.foreground} />
      <circle cx="17.6" cy="12" r="1.15" fill={alpha(c.foreground, 0.7)} />
      <circle cx="12.3" cy="3.35" r="1.35" fill={c['chart-1']} />
      <circle cx="12.3" cy="20.65" r="1.35" fill={c['chart-1']} />
      <circle cx="21.1" cy="12" r="0.8" fill={alpha(c.foreground, 0.45)} />
      <circle cx="15.2" cy="12" r="0.8" fill={alpha(c.foreground, 0.45)} />
      <circle cx="1.6" cy="12" r="0.8" fill={alpha(c.foreground, 0.45)} />
    </svg>
  );
}

function Wordmark({ size }: { size: number }) {
  const [brand, suffix] = site.name.split('/');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.45 }}>
      <Mark size={size * 1.15} />
      <div
        style={{
          display: 'flex',
          fontSize: size,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: c.foreground,
        }}
      >
        {brand}
        <span style={{ color: c['muted-foreground'] }}>/{suffix}</span>
      </div>
    </div>
  );
}

function Sky({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: c.background,
        backgroundImage: `radial-gradient(900px 520px at 6% -12%, ${alpha(c['chart-4'], 0.42)}, transparent 62%), radial-gradient(760px 520px at 104% 18%, ${alpha(c['chart-3'], 0.24)}, transparent 60%), radial-gradient(1000px 600px at 50% 130%, ${alpha(c['chart-1'], 0.22)}, transparent 62%)`,
        fontFamily: 'Inter',
      }}
    >
      <Stars width={ogSize.width} height={ogSize.height} />
      {children}
    </div>
  );
}

function Command({ text }: { text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 22px',
        borderRadius: 12,
        border: `1px solid ${c['border-strong']}`,
        backgroundColor: alpha(c.card, 0.85),
        fontSize: 26,
        fontFamily: 'monospace',
        color: c.foreground,
      }}
    >
      <span style={{ color: c['subtle-foreground'] }}>$</span>
      {text}
    </div>
  );
}

/** A step response that overshoots its limit, glowing: the product's own chart, as the card's picture. */
function Trace() {
  const w = 430;
  const h = 300;
  const limitY = 92;
  const path =
    'M 0 250 L 70 250 C 110 250 118 66 168 66 C 212 66 214 128 252 116 C 290 104 300 110 340 108 C 380 106 400 108 430 108';
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: w + 48,
        padding: 24,
        borderRadius: 18,
        border: `1px solid ${c['border-strong']}`,
        backgroundColor: alpha(c.card, 0.82),
        boxShadow: `0 30px 80px ${alpha(c.background, 0.8)}`,
      }}
    >
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
          <span style={{ fontSize: 18, fontFamily: 'monospace', color: c['muted-foreground'] }}>R-0412</span>
          <span style={{ fontSize: 22, fontWeight: 600, color: c.foreground }}>High-gain step</span>
        </div>
        <span
          style={{
            display: 'flex',
            padding: '4px 12px',
            borderRadius: 999,
            fontSize: 16,
            fontWeight: 600,
            color: c['destructive-foreground'],
            backgroundColor: alpha(c['destructive-foreground'], 0.14),
          }}
        >
          Overshoot 17.6 %
        </span>
      </div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {[60, 120, 180, 240].map((y) => (
          <line key={y} x1="0" x2={w} y1={y} y2={y} stroke={alpha(c.foreground, 0.06)} />
        ))}
        <line x1="0" x2={w} y1={limitY} y2={limitY} stroke={alpha(c.foreground, 0.4)} strokeDasharray="6 6" />
        <path
          d="M 0 250 L 70 250 L 70 108 L 430 108"
          fill="none"
          stroke={alpha(c.foreground, 0.35)}
          strokeWidth="2"
        />
        <path
          d={path}
          fill="none"
          stroke={alpha(c['chart-1'], 0.35)}
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path d={path} fill="none" stroke={c['chart-1']} strokeWidth="4" strokeLinecap="round" />
        <path d="M 141 92 C 152 66 184 66 196 92" fill={alpha(c['destructive-foreground'], 0.28)} />
        <circle cx="168" cy="66" r="8" fill={c['destructive-foreground']} stroke={c.card} strokeWidth="3" />
      </svg>
      <span style={{ marginTop: 10, fontSize: 16, color: c['subtle-foreground'] }}>
        Limit 10 % · synthetic data
      </span>
    </div>
  );
}

export function HomeCard() {
  return (
    <Sky>
      <div style={{ position: 'relative', display: 'flex', width: '100%', padding: '64px 72px', gap: 48 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <Wordmark size={40} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span
              style={{
                fontSize: 66,
                fontWeight: 700,
                letterSpacing: '-0.035em',
                lineHeight: 1.04,
                color: c.foreground,
              }}
            >
              Pixel-perfect UI,
            </span>
            <span
              style={{
                fontSize: 66,
                fontWeight: 700,
                letterSpacing: '-0.035em',
                lineHeight: 1.04,
                color: c['muted-foreground'],
              }}
            >
              even when your agent writes it.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <Command text="npx dtheo init" />
            <span style={{ fontSize: 22, color: c['subtle-foreground'] }}>
              {site.url.replace('https://', '')}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Trace />
        </div>
      </div>
    </Sky>
  );
}

/** A docs page's card: where it sits, what it is, and the one line that installs it. */
export function DocCard({
  eyebrow,
  title,
  description,
  command,
}: {
  eyebrow: string;
  title: string;
  description: string;
  command?: string;
}) {
  return (
    <Sky>
      <div style={{ position: 'absolute', right: -120, top: 60, display: 'flex', opacity: 0.12 }}>
        <Mark size={560} />
      </div>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          padding: '64px 72px',
        }}
      >
        <Wordmark size={34} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 860 }}>
          <span style={{ fontSize: 26, fontWeight: 600, color: c.link }}>{eyebrow}</span>
          <span
            style={{
              fontSize: 88,
              fontWeight: 700,
              letterSpacing: '-0.035em',
              lineHeight: 1,
              color: c.foreground,
            }}
          >
            {title}
          </span>
          <span style={{ fontSize: 30, lineHeight: 1.35, color: c['muted-foreground'] }}>{description}</span>
        </div>
        {command ? (
          <div style={{ display: 'flex' }}>
            <Command text={command} />
          </div>
        ) : (
          <span style={{ fontSize: 22, color: c['subtle-foreground'] }}>
            {site.url.replace('https://', '')}
          </span>
        )}
      </div>
    </Sky>
  );
}

/** The app icon: the mark on a graphite tile, sized for a home screen. */
export function AppIcon({ size }: { size: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: c.background,
        backgroundImage: `radial-gradient(${size}px ${size}px at 20% 0%, ${alpha(c['chart-4'], 0.45)}, transparent 70%)`,
      }}
    >
      <Mark size={size * 0.72} />
    </div>
  );
}
