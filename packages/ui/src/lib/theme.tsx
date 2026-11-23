'use client';

import * as React from 'react';
import { cn } from './utils';

export type ThemeMode = 'light' | 'dark';
export type ThemePreset = 'graphite' | 'carbon';

const PortalContainerContext = React.createContext<HTMLElement | null>(null);
/** The mode of the nearest ThemeScope that sets one, so a preset scope inside it can take that mode by name. */
const ModeContext = React.createContext<ThemeMode | undefined>(undefined);

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
 *
 * A preset scope with no mode of its own takes the mode of the ThemeScope around it and writes it on its own
 * element, so scopes nest to any depth; with no ThemeScope around it, it follows the page.
 */
export function ThemeScope({ mode, preset, className, children, ...props }: ThemeScopeProps) {
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  const inherited = React.useContext(ModeContext);
  const custom = preset && preset !== 'graphite' ? preset : undefined;
  return (
    <div
      data-slot="theme-scope"
      data-preset={custom}
      className={cn(mode ?? (custom ? inherited : undefined), 'bg-background text-foreground', className)}
      {...props}
    >
      <ModeContext.Provider value={mode ?? inherited}>
        <PortalContainerContext.Provider value={container}>{children}</PortalContainerContext.Provider>
      </ModeContext.Provider>
      <div data-slot="portal-root" ref={setContainer} className="contents" />
    </div>
  );
}
