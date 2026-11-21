import Link from 'next/link';

// Footer links are 16px text. The hit area reaches 24px everywhere (WCAG 2.5.8) through a pseudo-element, so the
// desktop layout does not move; on touch screens the links grow to 40px for a thumb.
const target =
  'relative inline-flex items-center gap-1.5 after:absolute after:-inset-x-1 after:-inset-y-1 hover:text-foreground pointer-coarse:min-h-10 pointer-coarse:after:inset-y-0';
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
          Created by {/* In a sentence, so it stays inline; only its hit area grows. */}
          <a
            href={site.author.url}
            className="relative font-medium text-muted-foreground transition-colors duration-150 after:absolute after:-inset-x-1 after:-inset-y-1.5 hover:text-foreground pointer-coarse:after:-inset-y-3"
          >
            {site.author.site}
          </a>
          . Built on Base UI and Tailwind CSS. MIT licensed.
        </span>
        <nav
          aria-label="Footer"
          className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2 pointer-coarse:gap-y-0"
        >
          <a className={target} href={site.repo}>
            <GithubMark className="size-3.5" />
            GitHub
          </a>
          {/* Plain links: these are files, and a Link would prefetch them as pages and log a 404. */}
          <a className={target} href="/llms.txt">
            llms.txt
          </a>
          <a className={target} href="/r/registry.json">
            Registry
          </a>
          <Link className={target} href="/docs/agents">
            MCP server
          </Link>
          <Link className={target} href="/docs/foundations/color">
            Contrast report
          </Link>
        </nav>
      </div>
    </footer>
  );
}
