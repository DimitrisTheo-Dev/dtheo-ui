import { DocsSidebar } from '@/components/docs-sidebar';
import { MobileDocsNav } from '@/components/mobile-docs-nav';

/** The sidebar is its own surface, flush to the left edge like a Mac app's source list; the page scrolls beside it. */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-1">
      <aside className="sticky top-12 hidden h-[calc(100dvh-3rem)] w-64 shrink-0 overflow-y-auto overscroll-contain border-r border-border bg-sidebar px-3 pt-4 backdrop-blur-material lg:block">
        <DocsSidebar />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col px-[max(1rem,env(safe-area-inset-left,0px))] pt-6 pb-24 sm:px-8 lg:px-10 lg:pt-10">
        <MobileDocsNav />
        <main className="mx-auto w-full max-w-[1180px] min-w-0">{children}</main>
      </div>
    </div>
  );
}
