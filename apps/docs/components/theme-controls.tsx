'use client';

import * as React from 'react';
import { MoonIcon, SunIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@dtheo/ui/components/tooltip';

// The theme lives on <html> (set before paint by the inline script in the root layout), so components
// subscribe to that element instead of copying it into state.
function subscribeRoot(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-preset'] });
  return () => observer.disconnect();
}
const isDark = () => document.documentElement.classList.contains('dark');

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
}

/**
 * Light/dark switch for the whole site. The icon crossfades with a light blur so the swap reads as one object.
 *
 * The server cannot know the visitor's theme, so the icon and the name are not rendered from state: both versions are
 * in the HTML and the `dark` class on <html> (set before first paint) shows one and hides the other. The button is
 * right before hydration, and stays right if hydration is slow.
 */
export function ThemeToggle() {
  // Only for the tooltip, which opens after hydration; the button itself reads the class at click time.
  const dark = React.useSyncExternalStore(subscribeRoot, isDark, () => true);
  const toggle = () => {
    const next = !isDark();
    document.documentElement.classList.toggle('dark', next);
    write('dtheo-theme', next ? 'dark' : 'light');
  };
  return (
    <Tooltip>
      {/* dtheo-check-ignore-next-line (named by the sr-only text inside, which follows the theme class even before hydration) */}
      <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={toggle} />}>
        {/* display:none drops the hidden name from the accessibility tree, so exactly one is announced. */}
        <span className="sr-only hidden dark:inline">Switch to light mode</span>
        <span className="sr-only dark:hidden">Switch to dark mode</span>
        <span aria-hidden="true" className="relative grid size-4 place-items-center">
          <SunIcon className="absolute scale-100 opacity-100 transition-[opacity,filter,scale] duration-200 ease-out dark:scale-75 dark:opacity-0 dark:blur-[2px]" />
          <MoonIcon className="absolute scale-75 opacity-0 blur-[2px] transition-[opacity,filter,scale] duration-200 ease-out dark:scale-100 dark:opacity-100 dark:blur-[0px]" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{dark ? 'Light mode' : 'Dark mode'}</TooltipContent>
    </Tooltip>
  );
}
