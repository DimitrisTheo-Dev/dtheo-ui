import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Static pages cannot carry per-request nonces, so inline scripts (the theme script, Next's hydration data) are
  // allowed; everything else is locked to this origin, and nothing can frame the site or change its base URL.
  ...(process.env.NODE_ENV === 'production'
    ? [
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "font-src 'self'",
            "connect-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
          ].join('; '),
        },
      ]
    : []),
];

const config: NextConfig = {
  // NEXT_BUILD_CPUS caps the build's workers. Next counts every core it can see, and in a memory-limited container
  // (the Linux visual baselines, scripts/visual-linux.sh) one worker per core runs out of memory. Unset: Next's default.
  ...(process.env.NEXT_BUILD_CPUS ? { experimental: { cpus: Number(process.env.NEXT_BUILD_CPUS) } } : {}),
  transpilePackages: ['@dtheo/ui', '@dtheo/charts', '@dtheo/tokens'],
  // The floating dev badge sits over the sidebar footer and would end up in visual baselines.
  devIndicators: false,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  // The MCP route answers from the component sources, the stylesheet and the examples on every call (through
  // lib/source.ts). Build-time tracing cannot see paths built at run time, so ship those files with the function.
  // test/mcp.test.ts fails when a tool reads a file these globs miss.
  outputFileTracingIncludes: {
    '/mcp': [
      '../../packages/ui/src/**/*.{ts,tsx,css}',
      '../../packages/charts/src/**/*.{ts,tsx}',
      './examples/*.tsx',
      './lib/lab-data.ts',
      // get_guidelines serves the writing rules from the design principles.
      '../../DESIGN.md',
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // Section addresses people type or trim a URL down to. Each lands where the nav starts that section; temporary, so
  // a real index page can take the address later.
  async redirects() {
    return [
      { source: '/examples', destination: '/examples/run-review', permanent: false },
      { source: '/docs/foundations', destination: '/docs/foundations/color', permanent: false },
      { source: '/docs/patterns', destination: '/docs/patterns/data-table', permanent: false },
      // Charts have no page of their own: the component index shows every chart, live, in its Charts section.
      { source: '/docs/charts', destination: '/docs/components#cat-charts', permanent: false },
      // The page was called The loop until it became How it works; links to the old address keep working.
      { source: '/docs/loop', destination: '/docs/how-it-works', permanent: true },
      { source: '/docs/loop.md', destination: '/docs/how-it-works.md', permanent: true },
    ];
  },
  async rewrites() {
    return [
      // Markdown mirrors for agents: /docs/components/button.md -> rendered from the same contract as the page
      { source: '/docs/:path*.md', destination: '/md/docs/:path*' },
      // Agentic Resource Discovery; ai-catalog.json is the name the spec had before
      { source: '/.well-known/ard.json', destination: '/api/ard' },
      { source: '/.well-known/ai-catalog.json', destination: '/api/ard' },
    ];
  },
};

export default config;
