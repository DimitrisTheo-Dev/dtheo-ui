import Link from 'next/link';
import { site } from '@/lib/site';
import { GithubMark } from './github-link';
import { LogoMark } from './logo';

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-6 gap-y-3 px-[max(1rem,env(safe-area-inset-left,0px))] py-6 text-label font-normal text-subtle-foreground sm:px-6">
        <span className="flex items-center gap-2 text-muted-foreground">
          <LogoMark px={16} />
          {site.name} {site.version}
        </span>
        <span>
          Created by{' '}
          <a
            href={site.author.url}
            className="font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            {site.author.site}
          </a>
          . Built on Base UI and Tailwind CSS. MIT licensed.
        </span>
        <nav aria-label="Footer" className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2">
          <a className="flex items-center gap-1.5 hover:text-foreground" href={site.repo}>
            <GithubMark className="size-3.5" />
            GitHub
          </a>
          {/* Plain links: these are files, and a Link would prefetch them as pages and log a 404. */}
          <a className="hover:text-foreground" href="/llms.txt">
            llms.txt
          </a>
          <a className="hover:text-foreground" href="/r/registry.json">
            Registry
          </a>
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
