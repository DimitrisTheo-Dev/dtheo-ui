'use client';

import * as React from 'react';
import { cn } from './utils';

export type ThemeMode = 'light' | 'dark';
export type ThemePreset = 'graphite' | 'carbon';

const PortalContainerContext = React.createContext<HTMLElement | null>(null);

/**
 * Where overlays (menus, dialogs, tooltips) mount. Inside a <ThemeScope> they mount inside the scope,
 * so a popup opened from a themed preview keeps that preview's theme.
 */
export function usePortalContainer(): HTMLElement | undefined {
  return React.useContext(PortalContainerContext) ?? undefined;
}

export interface ThemeScopeProps extends React.ComponentProps<'div'> {
  mode?: ThemeMode;
  preset?: ThemePreset;
}

/**
 * Applies a mode and preset to a subtree. Use it for previews, side-by-side comparisons or an app region
 * with its own character. The whole app can instead set `class="dark"` and `data-preset` on <html>.
 */
export function ThemeScope({ mode, preset, className, children, ...props }: ThemeScopeProps) {
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  return (
    <div
      data-slot="theme-scope"
      data-preset={preset && preset !== 'graphite' ? preset : undefined}
      className={cn(mode, 'bg-background text-foreground', className)}
      {...props}
    >
      <PortalContainerContext.Provider value={container}>{children}</PortalContainerContext.Provider>
      <div data-slot="portal-root" ref={setContainer} className="contents" />
    </div>
  );
}
