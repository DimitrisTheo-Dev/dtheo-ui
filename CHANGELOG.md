# Changelog

What changed for people using the two npm packages. The docs site and the copy-in components deploy from `main`
and have no versions; their history is the merged pull requests.

## dtheo (the CLI)

### 0.1.3 (unreleased)

- `icon-button-label` catches a button whose only content is an inline `<svg>`, self-closing or with its shapes,
  such as `<button><svg /></button>`. An `<svg>` with a `<title>` or its own `aria-label` still names the button.

### 0.1.2 (2026-11-25)

- `dtheo check` with no path skips build output and test reports (`out`, `coverage`, `.vercel`, `.turbo`,
  `playwright-report`, `test-results`, `storybook-static`) as well as `node_modules`, `.next`, `dist` and `build`.
- `dtheo check` has 22 rules, up from 17:
  - `text-size-token`: Tailwind sizes such as `text-sm` instead of a type role.
  - `motion-duration`: transitions slower than the 120–240 ms motion scale.
  - `primary-text`: `text-primary` used for text, where `text-link` is the blue text role.
  - `status-text-on-fill`: status text on its own solid fill, such as `text-destructive-foreground` on
    `bg-destructive`.
  - `ignore-reason`: an ignore directive without a reason, or one naming a rule that does not exist.
- `dtheo check` reads whole JSX tags and class lists, not prose that mentions a class, and takes ignore directives
  only from comments. It tells a `#482` reference from a hex color, and stays fast on crafted input, because the
  same check answers the MCP tool `check_ui_code`.
- `dtheo list` matches by name, title, category (`dtheo list chart`) and kind, searches descriptions only when no
  name matches, and exits 1 when nothing matches.
- `dtheo add` writes a file that several items share only once, and leaves an existing stylesheet alone.
- `dtheo mcp` also prints the VS Code form (`servers`, and a `code --add-mcp` command).
- `--version` (`-v`) prints the version, and `-h` works like `--help`.

### 0.1.1 (2026-11-20)

First version published with provenance, by the Release workflow.

- `dtheo add` lists the `@types/d3-*` packages charts need, so `next build` passes in a new Next.js app.
- `dtheo init` adds the stylesheet import to your global CSS itself, with the path relative to that file.
- `dtheo init` lists the starter styles that override the theme (`:root` colors, the `@theme` fonts, the body font)
  with their line numbers.

### 0.1.0 (2026-11-20)

First release: `init`, `add`, `list`, `check` (17 rules), `rules` and `mcp`.

## @dtheo/tokens

### 0.2.0 (2026-11-25)

- **Breaking:** the `flight-deck` and `deep-space` presets are removed. `carbon` replaces them, in light and dark:
  neutral surfaces with no hue, an ink primary, 4 to 10 px radii and no glass, so the only colors left are status,
  links, the focus ring and chart data. `tokens.json`, `native` and the contrast report have `graphite` and `carbon`.
- Three more contrast pairs, for a value marked against its limit inside a checked table row: the over-limit and
  near-limit text colors and secondary text on `selection`. 43 pairs in four themes: 170 checks, all pass AA.

### 0.1.1 (not published; its changes ship in 0.2.0)

- Graphite dark's `ring` is lighter, `oklch(0.72 0.15 257)` (was `oklch(0.66 0.17 257)`), so the focus line clears
  3:1 on the lit segment of a segmented control.
- `contrast.json` checks the focus ring on every surface it is drawn on and against its own halo: 159 checks, up
  from 116. Each label names the layers under its pair ("ring on ring 12 % over card"), so no two labels are alike.
- The README gives the install command and says the package ships no CSS.

### 0.1.0 (2026-11-20)

First release: OKLCH tokens for Graphite (light and dark), Flight deck and Deep space, as `tokens.json` (DTCG
2025.10), `native` exports for React Native and Expo, and the measured contrast report.
