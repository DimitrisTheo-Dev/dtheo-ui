import Link from 'next/link';
import { site } from '@/lib/site';
import { LogoMark } from './logo';

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-6 gap-y-3 px-[max(1rem,env(safe-area-inset-left,0px))] py-6 text-label font-normal text-subtle-foreground sm:px-6">
        <span className="flex items-center gap-2 text-muted-foreground">
          <LogoMark px={16} />
          {site.name} {site.version}
        </span>
        <span>Built on Base UI and Tailwind CSS. MIT licensed.</span>
        <nav aria-label="Footer" className="ml-auto flex flex-wrap gap-x-5 gap-y-2">
          <Link className="hover:text-foreground" href="/llms.txt">
            llms.txt
          </Link>
          <Link className="hover:text-foreground" href="/r/registry.json">
            Registry
          </Link>
          <Link className="hover:text-foreground" href="/docs/agents">
            MCP server
          </Link>
          <Link className="hover:text-foreground" href="/docs/foundations/color">
            Contrast report
          </Link>
        </nav>
      </div>
    </footer>
  );
}
