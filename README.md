<p align="center">
  <a href="https://ui.dtheo.dev"><img src=".github/assets/hero.png" alt="dtheo/ui: pixel-perfect UI, even when your agent writes it." width="100%" /></a>
</p>

<h1 align="center">dtheo/ui</h1>

<p align="center">
  Components and engineering charts for data-heavy React apps,<br />
  with an MCP server and a design linter built in.
</p>

<p align="center">
  <a href="https://ui.dtheo.dev"><strong>ui.dtheo.dev</strong></a> ·
  <a href="https://ui.dtheo.dev/docs/components">Components</a> ·
  <a href="https://ui.dtheo.dev/docs/agents">For agents</a> ·
  <a href="https://ui.dtheo.dev/examples/tuning">Live example</a>
</p>

<p align="center">
  <a href="https://github.com/DimitrisTheo-Dev/dtheo-ui/actions/workflows/ci.yml"><img src="https://github.com/DimitrisTheo-Dev/dtheo-ui/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/dtheo"><img src="https://img.shields.io/npm/v/dtheo?label=npx%20dtheo" alt="npm" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license" /></a>
</p>

---

## Start

**You:**

```bash
npx dtheo init
npx dtheo add button table line-chart
```

**Your agent:**

```bash
claude mcp add --transport http dtheo https://ui.dtheo.dev/mcp
```

Components are copied into your project, so you own the code. Every item also installs with the shadcn CLI
([setup](https://ui.dtheo.dev/docs/installation#using-the-shadcn-cli-instead)).

## Why it is different

- **Charts that know what a limit is.** Line, bar, heatmap, sparkline, a live 1 kHz stream, frequency response
  (spectrum and Bode with gain and phase margins), scatter with a fit, and a histogram that states Cpk. Most are
  readable with the arrow keys.
- **Your agent already knows it.** An MCP server with 7 tools, `llms.txt`, and a Markdown copy of every page. The
  page you read, the Markdown an agent reads and the MCP answer all come from one component contract.
- **Mistakes caught before review.** `npx dtheo check` runs 17 rules for what agents get wrong (raw colors,
  `transition-all`, icon buttons without a name, off-system radii…), each with the fix. It exits 1 in CI.
- **Contrast is proven, not promised.** 116 text and UI color pairs are measured on every token build, layered
  surfaces included. The build fails below WCAG AA.
- **Feels native.** System type, Mac materials, one accent, a focus ring you can always see. Three presets
  (Graphite, Flight deck, Deep space), light and dark, scoped to any element.

## What is inside

| | |
| --- | --- |
| **36 components** | On [Base UI](https://base-ui.com) and Tailwind CSS v4: fields, selects, menus, dialogs, sheets, toasts, tables with Shift-click range selection, metrics, an app shell… |
| **8 charts** | SVG drawn by React, canvas for live and dense data, d3 for the math. No chart library. |
| **Tokens** | OKLCH roles in shadcn's vocabulary, exported as CSS, DTCG JSON and hex for React Native and Expo |
| **4 example apps** | Run review, Motor map, Loop tuning, Lab assistant: full screens built only from the system, on synthetic data |
| **CLI** | `dtheo init`, `add`, `list`, `check`, `rules`, `mcp` |

## How it is built

```
packages/tokens   One OKLCH source → CSS, DTCG JSON, React Native hex and a contrast report
packages/ui       Components on Base UI, and the component contracts (src/meta) that drive everything else
packages/charts   Charts: SVG via React, canvas for live and dense data, d3 for scales and binning
packages/cli      `dtheo`: copies components from the registry and runs the design check
apps/docs         ui.dtheo.dev: docs, examples, the registry, the MCP server, llms.txt and Markdown mirrors
e2e               Playwright: every route at desktop and phone width, axe in both themes, interactions, pixels
```

Every change runs through:

| Gate | What it proves |
| --- | --- |
| `pnpm tokens:check` | Token outputs are current and every contrast pair passes AA |
| `pnpm lint` · `pnpm typecheck` | oxlint with React Compiler rules, strict TypeScript across the workspace |
| `pnpm test` | Contracts, registry, usage graph, CLI and every design-check rule |
| `pnpm design:check` | The repo passes its own design check, with every exception explained |
| `pnpm test:e2e` | No errors or sideways scroll on any route, no serious axe violations, real interactions |
| `pnpm test:visual` | Pixel diffs of the screens that define the look |

## Develop

```bash
corepack enable && pnpm install
pnpm dev            # http://localhost:4100
pnpm check          # tokens, lint, types, unit tests, design check
pnpm test:e2e       # browser tests
```

Start at [AGENTS.md](AGENTS.md) for the rules of the codebase and [DESIGN.md](DESIGN.md) for the decisions behind
the look.

## License

[MIT](LICENSE) © Dimitris Theodoropoulos
