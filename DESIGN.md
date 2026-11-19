# dtheo/ui design

The design system for engineering tools, written for the people and agents who build with it. Values live in
`packages/tokens/src/index.ts`; this file explains the decisions behind them.

## Who it is for

Engineers who review test runs, read traces against limits, compare builds and decide what happens next. They
look at dense data for hours. The interface should stay out of the way, then make the one thing that needs
attention impossible to miss.

## Character

**Calm, native, precise.** It should feel like a well-made Mac app: system type, soft dark surfaces, translucent
sidebars, one accent. Color is information, not decoration. When everything passes, the screen is nearly
monochrome; a failure is the only red on it.

Three presets share every component and change only color, radius and material:

| Preset | For | Feel |
| --- | --- | --- |
| **Graphite** (default) | Day-to-day tools | Neutral graphite, system blue, Mac materials. Light and dark. |
| **Flight deck** | Monitoring, maps, dashboards | Blue-biased graphite, ice-blue action, depth from lightness, no glass. Dark. |
| **Deep space** | Assistants, onboarding, docs heroes | Near-black void, nebula light, frosted glass. Dark. |

## Color

- Roles follow shadcn names (`background`, `card`, `muted-foreground`, `primary`, `destructive`…) so agents already
  know them, plus `subtle-foreground` (a third text tier), `link` (primary as text), status pairs (`success`,
  `warning`, `info` with `-foreground`), `selection`, sidebar roles and chart roles.
- Defined in OKLCH. Hover and pressed states move lightness, not hue.
- Borders and fills on dark are white at low alpha, so they adapt to whatever surface they sit on.
- **Contrast is a build step.** 116 pairs, including layered cases such as a status badge on a selected table row,
  are composited the way the browser does and must pass WCAG AA in every preset and mode, or the build fails.
- Status always ships as icon + word + color. Red is for failure only, amber for near a limit, green for pass.

## Type

System fonts (SF Pro on Apple platforms), sized like macOS rather than the web: body is 13 px. Each text role sets
size, line height, tracking and weight together; tracking tightens as size grows.

| Role | Size / line | Use |
| --- | --- | --- |
| `caption` | 11 / 14 | Axis labels, units, timestamps |
| `label` | 12 / 16, 500 | Field labels, column heads |
| `body` | 13 / 18 | UI text, table cells |
| `callout` | 14 / 20 | Emphasized UI text |
| `prose` | 15 / 24 | Docs and long-form reading |
| `headline` | 15 / 20, 600 | Card titles |
| `title-3` → `title-1` | 17 → 24 | Section and page titles |
| `large-title`, `display` | 32, 44 | Page heroes |

Numbers in tables and metrics use tabular figures. Units are smaller and quieter than the value they follow.

## Geometry

Controls are 22, 24, 28 and 32 px tall (28 is the default), and grow to 36 on touch screens. Radius scales with
the size of the surface (Graphite: control 6, popover 8, card 10, dialog 12) and nested corners are concentric:
an item inside a popover is the popover's radius minus its 4 px padding.

## Focus

One ring for every control: a crisp 1.5 px line in the ring color, 1 px outside the edge, over a soft 4 px halo. The
line alone clears 3:1 on every surface; the halo gives it presence without weight. Fields draw the same idea on their
own border. Inside a segmented track the ring sits on the segment's edge so the halo never spills onto a neighbour, and
a control whose focused element is hidden or tiny (a slider's input, the checkbox in a selectable card) wears the ring
on the part you see.

## Motion

Motion explains a change; it is never decoration.

- Ease out (`cubic-bezier(0.23, 1, 0.32, 1)`) for things that enter, 120 ms for presses, 150 for hover, 180 for
  popovers, 240 for dialogs.
- Popovers grow from their trigger, scaling from 0.96, never from 0. Dialogs stay centered.
- Nothing animates on keyboard actions or high-frequency interactions: the command palette opens instantly.
- Reduced motion turns movement into simple fades or nothing.

## Data visualization

- One y-axis per chart. Two measures get two charts with a synced crosshair.
- Limits are dashed lines with a label; the part of a series beyond a limit is shaded, so the failure is visible
  before any number is read.
- Line weight shows role: 2 px for the run in question, 1.5 for the reference, 1 for context such as the command.
- Every chart has a text alternative, and offers a table where exact values matter. Charts of finished data can be
  read with the keyboard; the live stream chart states its latest values as text instead.
- Frequency is a log axis with labelled decades. Margins, peaks and Cpk carry their number and a word, not color.
- Live and dense data (a 1 kHz feed, thousands of points) draws on a canvas in token colors; axes, labels and
  limits stay vector. Live charts stop drawing off screen and step instead of glide under reduced motion.

## Writing

Plain, specific, active. Say what happened, by how much, and what to do next: "Overshoot is 7.6 points over the
10 % limit. Lower Kp or raise Kd, then rerun." Errors explain and keep the user's work. Empty states say why they
are empty and offer the next step.

## The docs site

Every screen should make sense in a few seconds, for a reader in a hurry and for an agent. One sentence per block,
a live example or picture before a paragraph, the command before the explanation. Each page has one obvious next
step and one button that hands it to an agent (copy as Markdown, a ready prompt, or open in a chat).

## What it is not

Not a marketing kit: no gradients on text, no glow on everything, no decorative charts. Not a theme for a
component library: the contracts, the checks and the examples are the product as much as the components.
