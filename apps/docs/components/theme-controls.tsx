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

/** Light/dark switch for the whole site. The icon crossfades with a light blur so the swap reads as one object. */
export function ThemeToggle() {
  const dark = React.useSyncExternalStore(subscribeRoot, isDark, () => true);
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    write('dtheo-theme', next ? 'dark' : 'light');
  };
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggle}
          />
        }
      >
        <span className="relative grid size-4 place-items-center">
          <SunIcon
            aria-hidden="true"
            className={`absolute transition-[opacity,filter,scale] duration-200 ease-out ${dark ? 'scale-75 opacity-0 blur-[2px]' : 'scale-100 opacity-100 blur-0'}`}
          />
          <MoonIcon
            aria-hidden="true"
            className={`absolute transition-[opacity,filter,scale] duration-200 ease-out ${dark ? 'scale-100 opacity-100 blur-0' : 'scale-75 opacity-0 blur-[2px]'}`}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent>{dark ? 'Light mode' : 'Dark mode'}</TooltipContent>
    </Tooltip>
  );
}
