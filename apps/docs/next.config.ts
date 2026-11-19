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
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async rewrites() {
    return [
      // Markdown mirrors for agents: /docs/components/button.md -> rendered from the same contract as the page
      { source: '/docs/:path*.md', destination: '/md/docs/:path*' },
      { source: '/.well-known/ai-catalog.json', destination: '/api/ai-catalog' },
    ];
  },
};

export default config;
