'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDownIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@dtheo/ui/components/sheet';
import { DocsSidebar } from './docs-sidebar';
import { allPages } from '@/lib/nav';

/** Below 1024px the docs index lives in a bottom sheet, opened from a bar that names the current page. */
export function MobileDocsNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const current = allPages.find((p) => p.href === pathname);
  return (
    <div className="mb-6 lg:hidden">
      <Sheet side="bottom" open={open} onOpenChange={setOpen}>
        <SheetTrigger className="flex h-10 w-full items-center gap-2 rounded-card border border-border bg-card px-3.5 text-left text-body">
          <span className="text-subtle-foreground">{current?.section ?? 'Docs'}</span>
          <span className="text-subtle-foreground">/</span>
          <span className="min-w-0 flex-1 truncate font-medium">{current?.title ?? 'Browse'}</span>
          <ChevronDownIcon className="size-4 text-subtle-foreground" aria-hidden="true" />
        </SheetTrigger>
        <SheetContent>
          <SheetTitle className="sr-only">Documentation</SheetTitle>
          <div className="overflow-y-auto px-4 pt-3">
            <DocsSidebar onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
