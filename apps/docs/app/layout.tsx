import type { Metadata, Viewport } from 'next';
import { colors } from '@dtheo/tokens/native';
import { TooltipProvider } from '@dtheo/ui/components/tooltip';
import { Toaster } from '@dtheo/ui/components/toast';
import { HydrationMarker } from '@/components/hydration-marker';
import { site } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name}: ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: '/' },
  // The homepage's share tags. Every other page sets its own through pageMetadata (lib/metadata.ts).
  openGraph: {
    title: `${site.name}: ${site.tagline}`,
    description: site.description,
    url: '/',
    siteName: site.name,
    type: 'website',
  },
  // X reads twitter:* tags. Next fills their title, text and image from openGraph, so X shows the same card as
  // LinkedIn and Slack on every page.
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // No themeColor here: the browser chrome follows the theme the page renders, not the OS (see themeScript).
};

// Browser chrome color per preset and mode, read from the tokens so it always matches --background.
const chrome = Object.fromEntries(
  Object.entries(colors).map(([preset, modes]) => [
    preset,
    Object.fromEntries(Object.entries(modes).map(([mode, c]) => [mode, c.background])),
  ]),
);

// Applies the saved theme before first paint, so there is no light flash in dark mode, and writes the theme-color
// meta for the theme the page renders: the site defaults to dark, so a light OS with no saved choice still gets a dark
// bar. It watches <html>, so every later switch (the toggle, a preset) updates the bar too. The script owns the meta
// (React does not render it): React would add a second one on hydration once the script had changed its content.
const themeScript = `(()=>{var C=${JSON.stringify(chrome)},d=document.documentElement;try{var t=localStorage.getItem('dtheo-theme')||'dark';var p=localStorage.getItem('dtheo-preset');d.classList.toggle('dark',t==='dark');if(p&&p!=='graphite')d.dataset.preset=p}catch(e){d.classList.add('dark')}var sync=function(){var s=C[d.dataset.preset||'graphite']||C.graphite,c=s[d.classList.contains('dark')?'dark':'light']||s.dark,m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement('meta');m.name='theme-color';document.head.appendChild(m)}m.content=c};sync();new MutationObserver(sync).observe(d,{attributes:true,attributeFilter:['class','data-preset']})})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* dtheo-check-ignore-next-line (a constant inline script that sets the theme before paint, so there is no flash) */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
        <link rel="ard" href="/.well-known/ard.json" />
        {/* WebMCP: offers the read-only docs tools to in-page agents when the browser supports document.modelContext */}
        <script src="/mcp?webmcp-script" defer />
      </head>
      <body className="min-h-dvh bg-background antialiased">
        <TooltipProvider>
          <Toaster>{children}</Toaster>
        </TooltipProvider>
        <HydrationMarker />
      </body>
    </html>
  );
}
