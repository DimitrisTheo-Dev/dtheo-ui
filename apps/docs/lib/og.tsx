import * as React from 'react';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { colors } from '@dtheo/tokens/native';
import { getComponent } from '@dtheo/ui/meta';
import { brand, Mark, starPath } from './brand';
import {
  DELAY,
  OVERSHOOT_LIMIT,
  TARGET,
  TORQUE_LIMIT,
  fmt,
  measured,
  measuredMetrics as M,
} from './lab-data';
import { examples } from './nav';
import { plainText } from './parse-markdown';
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
 * from the token export (graphite, dark), never a literal; the mark's black and white come from lib/brand.ts.
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

/** The star alone, for large faint backdrops and the app icon. */
function Star({ size, opacity }: { size: number; opacity: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d={starPath} fill={brand.star} fillOpacity={opacity} />
    </svg>
  );
}

function Wordmark({ size }: { size: number }) {
  const [name, suffix] = site.name.split('/');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.45 }}>
      <Mark px={Math.round(size * 1.15)} id="wordmark" />
      <div
        style={{
          display: 'flex',
          fontSize: size,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: c.foreground,
        }}
      >
        {name}
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

/**
 * R-0412's step response, drawn from the same simulated trace as the run review: the first 400 ms, the 13.2 N·m
 * limit and the 17.6 % peak are where the numbers put them, so the card can't show more overshoot than it states.
 */
/** 0 N·m at y = 250 and the 12 N·m command at y = 108, with room above for the peak. */
const y = (v: number) => 250 - (v / TARGET) * 142;

function Trace() {
  const w = 430;
  const h = 300;
  const x = (t: number) => (t / 400) * w;
  const limitY = y(TORQUE_LIMIT);
  const samples = measured.t.filter((t) => t <= 400 && t % 2 === 0);
  const path = samples
    .map((t, k) => `${k ? 'L' : 'M'} ${x(t).toFixed(1)} ${y(measured.torque[t]!).toFixed(1)}`)
    .join(' ');
  // The part of the trace past the limit, closed along the limit line.
  const over = samples.filter((t) => measured.torque[t]! > TORQUE_LIMIT);
  const shade = over.length
    ? `M ${x(over[0]!).toFixed(1)} ${limitY.toFixed(1)} ${over
        .map((t) => `L ${x(t).toFixed(1)} ${y(measured.torque[t]!).toFixed(1)}`)
        .join(' ')} L ${x(over.at(-1)!).toFixed(1)} ${limitY.toFixed(1)} Z`
    : '';
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
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 999,
            fontSize: 16,
            fontWeight: 600,
            color: c['destructive-foreground'],
            backgroundColor: alpha(c['destructive-foreground'], 0.14),
          }}
        >
          {/* Status is an icon and a word, never color alone: the circled cross of a failed check. */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6M9 9l6 6" />
          </svg>
          {`Overshoot ${fmt.n1.format(M.overshoot)} %`}
        </span>
      </div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {[60, 120, 180, 240].map((gy) => (
          <line key={gy} x1="0" x2={w} y1={gy} y2={gy} stroke={alpha(c.foreground, 0.06)} />
        ))}
        <line x1="0" x2={w} y1={limitY} y2={limitY} stroke={alpha(c.foreground, 0.4)} strokeDasharray="6 6" />
        <path
          d={`M 0 ${y(0)} L ${x(DELAY)} ${y(0)} L ${x(DELAY)} ${y(TARGET)} L ${w} ${y(TARGET)}`}
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
          strokeLinejoin="round"
        />
        <path d={path} fill="none" stroke={c['chart-1']} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {shade ? <path d={shade} fill={alpha(c['destructive-foreground'], 0.28)} /> : null}
        <circle
          cx={x(M.peakAt)}
          cy={y(M.peak)}
          r="8"
          fill={c['destructive-foreground']}
          stroke={c.card}
          strokeWidth="3"
        />
      </svg>
      <span style={{ marginTop: 10, fontSize: 16, color: c['subtle-foreground'] }}>
        {`Limit ${OVERSHOOT_LIMIT} % · synthetic data`}
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
      <div style={{ position: 'absolute', right: -40, top: 35, display: 'flex' }}>
        <Star size={560} opacity={0.07} />
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

/** A component or chart page's share card: its category, name, what it is for and the line that installs it. */
export async function componentCard(slug: string) {
  const meta = getComponent(slug);
  return new ImageResponse(
    <DocCard
      eyebrow={meta?.category ?? 'Components'}
      title={meta?.title ?? slug}
      description={plainText(meta?.description ?? '')}
      command={`npx ${site.cli} add ${slug}`}
    />,
    { ...ogSize, fonts: await ogFonts() },
  );
}

/** An example app's share card: its name and what it shows, from the docs navigation. */
export async function exampleCard(href: string) {
  const page = examples.find((e) => e.href === href);
  return new ImageResponse(
    <DocCard eyebrow="Example app" title={page?.title ?? site.name} description={page?.description ?? ''} />,
    { ...ogSize, fonts: await ogFonts() },
  );
}

/**
 * The app icon: the mark's enamel, full bleed because iOS rounds the corners itself. The star sits at about two
 * thirds of the icon, as on the large tile.
 */
export function AppIcon({ size }: { size: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: brand.ink,
        backgroundImage: `radial-gradient(circle at 50% 50%, ${alpha(brand.star, 0.26)}, ${alpha(brand.star, 0.07)} 20%, transparent 42%), linear-gradient(to bottom, ${brand.top}, ${brand.middle} 55%, ${brand.ink})`,
      }}
    >
      <Star size={Math.round(size * 0.66)} opacity={1} />
    </div>
  );
}
