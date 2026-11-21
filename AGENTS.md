# Working in this repo

Instructions for coding agents and people. Read [DESIGN.md](DESIGN.md) before changing anything visual.
The docs app runs Next.js 16; read `apps/docs/AGENTS.md` before writing Next code there.

## Commands

| Task | Command |
| --- | --- |
| Install | `corepack enable && pnpm install` |
| Docs dev server | `pnpm dev` (http://localhost:4100) |
| Everything that must pass | `pnpm check` |
| Browser tests | `pnpm test:e2e` (needs the dev server or starts one) |
| Visual diffs | `pnpm test:visual`, then `--update-snapshots` only for intended changes |
| Record the Linux baselines CI uses | `pnpm test:visual:linux` (Docker) |
| Rebuild tokens | `pnpm tokens` |
| Regenerate example index / usage graph | `pnpm examples` / `pnpm usage` |
| Recapture the example screenshots on the landing page | `pnpm screens` (dev server running) |
| Check UI code against the system | `node packages/cli/src/bin.mjs check <paths or globs>` |
| See what a release would publish | `pnpm release --dry-run` |

Use pnpm 11 through corepack. New dependencies must be at least two weeks old (`minimumReleaseAge`).

## Rules for UI code

- **Colors are roles, never values.** `bg-card`, `text-muted-foreground`, `border-border`. No hex, no `oklch()`, no
  Tailwind palette classes (`bg-blue-500` does nothing here). Blue text is `text-link`, not `text-primary`.
- **Text sizes are roles.** `text-caption` 11, `text-label` 12, `text-body` 13, `text-callout` 14, `text-prose` 15,
  `text-headline`, `text-title-3/2/1`, `text-large-title`, `text-display`. No `text-[13px]`.
- **Geometry is tokens.** `rounded-control`, `rounded-popover`, `rounded-card`, `rounded-dialog`; nested corners use
  `rounded-item` / `rounded-inset`. Control heights are `h-control-xs…lg`.
- **Motion:** name the properties (`transition-[scale,opacity]`, never `transition-all`; Tailwind’s `scale-*` and `translate-*` set `scale` and `translate`, not `transform`), ease out, 120–240 ms,
  scale from 0.96 (never 0), nothing animates on keyboard actions or things used a hundred times a day.
- **Status** carries an icon and a word, never color alone.
- **Every control has a name:** a visible label (via `Field` + `FieldLabel`) or `aria-label` on icon-only buttons.
- Exceptions to the design check need a reason: `// dtheo-check-ignore-next-line (why)`, or
  `// dtheo-check-disable-file rule-id -- why` in the first lines of a file.

## Adding or changing a component

1. Write it in `packages/ui/src/components/<slug>.tsx` (charts: `packages/charts/src`). Wrap Base UI; do not
   reimplement behavior it already has.
2. Add or update its contract in `packages/ui/src/meta/index.ts`: description, `use`, `avoid`, exports, files,
   registry dependencies, keyboard, props. The docs page, Markdown mirror, registry item and MCP answers all come
   from this.
3. Write an example in `apps/docs/examples/<id>.tsx` with real engineering content, then `pnpm examples`.
4. Use it in a real screen if it is new (an example app or a pattern), then `pnpm usage`. A test fails when a
   component is not used anywhere.
5. Run `pnpm check` and `pnpm test:e2e`. If the change is visual, run `pnpm test:visual` and look at the diff.

## Visual baselines

`pnpm test:visual` compares against `*-darwin.png` on a Mac and `*-linux.png` in CI, which runs the suite in the
Playwright Docker image on arm64 against a production build (`E2E_SERVER=production`). If no `*-linux.png` is
committed, the CI job records them and uploads them as the `visual-baselines-linux` artifact instead of comparing.

After an intended visual change, update both sets and commit them with the change: `pnpm test:visual
--update-snapshots` on a Mac, then `pnpm test:visual:linux`, which records the Linux set in that same image (Docker
needs about 6 GB free for the build), or run the "Record visual baselines" workflow on the branch and take its
artifact. When `@playwright/test` is upgraded, change the image tag in `ci.yml` and `visual-baselines.yml` to match;
the script refuses to run until they agree.

## Tokens

Edit `packages/tokens/src/index.ts`, then `pnpm tokens`. The build fails if any pair in `contrastPairs` drops below
its minimum. When a new surface or text combination appears in the UI, add the pair first (layered surfaces are
supported: `over: ['selection', 'card']`, `tint: 0.15`).

## Releasing

`@dtheo/tokens` and `dtheo` (the CLI) are published to npm by the **Release** workflow
(`.github/workflows/release.yml`), never from a laptop once a package exists. Bump `version` in the package's
`package.json` in a pull request; after it merges, the owner runs the workflow (`gh workflow run release.yml`). It
publishes every version that is not on npm yet through trusted publishing, with provenance; prereleases go to the
`next` tag. Packages are packed with pnpm because `publishConfig` swaps in the compiled exports.

## Boundaries

- `main` deploys ui.dtheo.dev. Land changes through a pull request with green CI; publish npm packages and change
  production settings only with the owner's go-ahead.
- Never commit secrets or `.env` files.
- Example data is synthetic and must say so. Do not use real company names or branding in examples.
