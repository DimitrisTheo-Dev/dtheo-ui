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
  openGraph: {
    title: site.name,
    description: site.description,
    url: site.url,
    siteName: site.name,
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Browser chrome color, read from the tokens so it always matches --background in each mode.
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: colors.graphite.dark.background },
    { media: '(prefers-color-scheme: light)', color: colors.graphite.light.background },
  ],
};

// Applies the saved theme before first paint, so there is no light flash in dark mode.
const themeScript = `(()=>{try{var t=localStorage.getItem('dtheo-theme')||'dark';var p=localStorage.getItem('dtheo-preset');var d=document.documentElement;d.classList.toggle('dark',t==='dark');if(p&&p!=='graphite')d.dataset.preset=p}catch(e){document.documentElement.classList.add('dark')}})()`;

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
