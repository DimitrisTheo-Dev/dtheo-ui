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
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
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
