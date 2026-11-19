'use client';

import * as React from 'react';

/**
 * Marks <html data-hydrated> once React has taken over the page. The browser tests wait for it, so they audit the
 * interactive page a person uses, not the instant before Base UI has wired up labels.
 */
export function HydrationMarker() {
  React.useEffect(() => {
    document.documentElement.dataset.hydrated = '';
  }, []);
  return null;
}
