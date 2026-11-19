'use client';

import * as React from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@dtheo/ui/components/tooltip';

/** Copies text; the icon swaps to a check with a short blurred crossfade, then swaps back. */
export function CopyButton({
  value,
  label = 'Copy',
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={className}
            aria-label={copied ? 'Copied' : label}
            onClick={copy}
          />
        }
      >
        <span className="relative grid size-3.5 place-items-center">
          <CopyIcon
            aria-hidden="true"
            className={`absolute size-3.5 transition-[opacity,filter,scale] duration-200 ease-out ${copied ? 'scale-50 opacity-0 blur-[2px]' : ''}`}
          />
          <CheckIcon
            aria-hidden="true"
            className={`absolute size-3.5 text-success-foreground transition-[opacity,filter,scale] duration-200 ease-out ${copied ? '' : 'scale-50 opacity-0 blur-[2px]'}`}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent>{copied ? 'Copied' : label}</TooltipContent>
    </Tooltip>
  );
}
