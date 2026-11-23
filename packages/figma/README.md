# dtheo/ui for Figma

A development plugin that builds the dtheo/ui library in any Figma file, from the same token build that writes the
CSS. Run it again after a token change: it updates its variables and styles in place, which the components are bound
to, and leaves the rest of the file alone. Components made by an earlier run are kept, so their instances and their
keys in a published library survive; delete a component set to have it drawn again.

Themes are variable modes, and a file on Figma's free Starter plan has one mode per collection. There the plugin
still builds everything, in Graphite light only, and says so when it finishes.

## What it makes

- **Variables.** `Color`: every role (`background`, `primary`, `destructive-foreground`…) with a mode per theme:
  Graphite and Carbon, each in light and dark. `Geometry`: radii per preset, nested radii included
  (`radius/item`, `radius/inset`). `Size`: control heights. Each variable shows its CSS name in Dev Mode
  (`var(--primary)`, `rounded-control`, `h-control-md`).
- **Styles.** A text style per type role (`dtheo/body`, `dtheo/title-2`…) in SF Pro where it is installed, Inter
  elsewhere, and the raised, popover and dialog shadows for light and dark.
- **Components** on the `dtheo/ui · Components` page, with variants and auto-layout, every fill, stroke, radius and
  height bound to a variable: Button (5 variants × 3 sizes), Badge, Input (5 states), Checkbox, Metric (fail, near
  limit, pass, missing) and the data table's header and row states.

Switch a frame's `Color` mode and everything in it changes theme; switch its `Geometry` mode and the corners follow
the preset.

## Run it

1. `pnpm tokens && pnpm figma` (only after a token or plugin change; the built `dist/code.js` is committed).
2. In Figma desktop: **Plugins → Development → Import plugin from manifest…** and pick `packages/figma/manifest.json`.
3. Open the file that holds your library and run **Plugins → Development → dtheo/ui library**.

The plugin has no network access. `src/plugin.js` is type-checked against `@figma/plugin-typings` and compiled to
ES2017 for Figma's sandbox, and `test/plugin.test.mjs` runs the built plugin against a fake of the Plugin API that
enforces Figma's own rules: unique variable names, a resize pinning auto-layout sizes, fonts loaded before text
changes, and the Starter plan's limits.
