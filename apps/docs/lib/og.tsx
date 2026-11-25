import * as React from 'react';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { colors } from '@dtheo/tokens/native';
import { getComponent } from '@dtheo/ui/meta';
import { brand, Mark, starPath } from './brand';
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

/** The card's surface: the page's own background and nothing else, so a shared link looks like the page it opens. */
function Surface({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: c.background,
        fontFamily: 'Inter',
      }}
    >
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

const mono = { fontFamily: 'monospace' } as const;

/** Lucide's circle-x, circle-check and arrow-right, drawn inline: the card's font has none of these glyphs. */
const icon = (d: React.ReactNode) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    style={{ marginRight: 12 }}
  >
    {d}
  </svg>
);
const failIcon = icon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6M9 9l6 6" />
  </>,
);
const passIcon = icon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </>,
);
const arrowIcon = icon(<path d="M5 12h14M12 5l7 7-7 7" />);

/** One line of the check output. */
const line = (children: React.ReactNode, color: string, extra?: React.CSSProperties) => (
  <span style={{ display: 'flex', alignItems: 'center', fontSize: 20, color, ...mono, ...extra }}>
    {children}
  </span>
);

/** The loop the home page promises, as the agent sees it: one finding with its fix, then a clean check. */
function CheckCard() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: 500,
        padding: '26px 28px',
        borderRadius: 18,
        border: `1px solid ${c['border-strong']}`,
        backgroundColor: alpha(c.card, 0.82),
        boxShadow: `0 30px 80px ${alpha(c.background, 0.8)}`,
      }}
    >
      {line(
        <>
          <span style={{ color: c['subtle-foreground'], marginRight: 12 }}>$</span>
          <span>npx dtheo check</span>
        </>,
        c.foreground,
      )}
      {line(
        <>
          {failIcon}
          <span>notifications.tsx:21</span>
        </>,
        c['destructive-foreground'],
        { marginTop: 10 },
      )}
      {line('icon-button-label', c['muted-foreground'], { paddingLeft: 34 })}
      {line(
        <>
          {arrowIcon}
          <span>aria-label="Send a test message"</span>
        </>,
        c['muted-foreground'],
        { paddingLeft: 34 },
      )}
      {line(
        <>
          {passIcon}
          <span>0 errors in 12 files</span>
        </>,
        c['success-foreground'],
        { marginTop: 10 },
      )}
    </div>
  );
}

export function HomeCard() {
  return (
    <Surface>
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
              Build clean UIs with your coding agent.
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
          <CheckCard />
        </div>
      </div>
    </Surface>
  );
}

/**
 * The images carry Inter's Latin subset, which has no ⌘. A missing glyph makes next/og fetch a font from the network
 * at build time; that fails offline and leaves a blank in the card. Spell the key out instead.
 */
const ogText = (text: string) => text.replace(/⌘\s?/g, 'Cmd+');

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
    <Surface>
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
            {ogText(title)}
          </span>
          <span style={{ fontSize: 30, lineHeight: 1.35, color: c['muted-foreground'] }}>
            {ogText(description)}
          </span>
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
    </Surface>
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
