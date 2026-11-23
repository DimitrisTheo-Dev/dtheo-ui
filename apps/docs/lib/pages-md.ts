// dtheo-check-disable-file raw-color, transition-all, scale-zero, ease-in -- documentation that quotes the rules and token values; no UI styling here.
import { site } from './site';
import { agentsMarkdown } from './agents';
import { chartCount, componentCount } from './counts';

/**
 * Long-form docs pages, authored once in Markdown. The HTML page renders this text and the `.md` mirror serves it
 * verbatim, so people and agents read the same words.
 */
export const pagesMarkdown: Record<string, string> = {
  index: `# Introduction

> ${site.description}

${site.name} is built for the tools engineers use every day: run reviews, dashboards, trackers and assistants. The interfaces are dense where the data needs it and calm everywhere else, so a first-time user can find the problem and the next step without asking.

## Principles

- **Color marks attention.** Surfaces are neutral. Green, amber and red appear only when something needs a person, and always with a word or an icon.
- **Native by default.** System fonts, Mac-like materials, a focus ring you can always see, motion that responds immediately and never makes you wait.
- **Summary before detail.** Checks first, then the evidence (charts, tables), then the record.
- **One source of truth.** Each component has one contract that drives its page, its Markdown, the registry, the MCP server and the CLI.
- **Proof over claims.** Every declared color pair is contrast-checked in every theme when tokens build; the build fails below WCAG AA.

## What is in the box

- ${componentCount} components on Base UI, styled with Tailwind CSS v4 and OKLCH tokens.
- ${chartCount} engineering charts: line (limits, bands, synced crosshair, keyboard reading), bar, heatmap, sparkline, a live stream chart, frequency (spectrum and Bode with margins), scatter and histogram (spec limits and Cpk).
- 2 presets, each in light and dark: Graphite (default) with one accent, and Carbon with none, where the only colors are status, links, focus and data.
- Agent surfaces: \`/llms.txt\`, a \`.md\` mirror of every docs page, a shadcn-compatible registry, an MCP server at \`/mcp\` and the \`dtheo\` CLI with a design checker.
`,

  installation: `# Installation

> Add ${site.name} to a Next.js or Vite app with Tailwind CSS v4.

## 1. Initialize

Run this in a React project that already uses Tailwind CSS v4 and the \`@/\` import alias:

\`\`\`bash
npx ${site.cli}@latest init
\`\`\`

It adds three things: \`lib/utils.ts\` (the \`cn\` helper), \`lib/theme.tsx\` (\`ThemeScope\` for scoped themes) and \`styles/dtheo.css\` (tokens, theme and base styles). Then it imports the stylesheet in your global CSS, right after Tailwind.

## 2. Clear the starter styles

A new Next.js app's \`app/globals.css\` sets its own colors, font and body styles, and they override the theme. \`init\` lists them with their line numbers. Delete them and keep the two imports:

\`\`\`css
@import "tailwindcss";
@import "../styles/dtheo.css";
\`\`\`

If \`init\` cannot find your global CSS, add these two lines yourself, with the path relative to that file.

## 3. Choose a mode and preset

Set the mode with a class and the preset with an attribute on \`<html>\` (or on any element, see Theming):

\`\`\`tsx
<html lang="en" className="dark" data-preset="graphite">
\`\`\`

## 4. Add components

\`\`\`bash
npx ${site.cli}@latest add button field select table line-chart tooltip toast
\`\`\`

Components are copied into \`components/ui\` (charts into \`components/charts\`). You own the code. The command prints what to install: the npm packages, and for charts the TypeScript types they need. Run those install commands before you build.

## 5. Mount the providers

The root layout wraps the app in the tooltip and toast providers you added in step 4, and keeps the mode and preset from step 3. In Next.js, make \`app/layout.tsx\`:

\`\`\`tsx
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" data-preset="graphite">
      <body>
        <TooltipProvider>
          <Toaster>{children}</Toaster>
        </TooltipProvider>
      </body>
    </html>
  );
}
\`\`\`

In a Vite app, wrap \`<App />\` the same way in \`src/main.tsx\`.

## Using the shadcn CLI instead

Every item is also a shadcn registry item, and brings the stylesheet (\`styles/dtheo.css\`) with it. In a project without \`components.json\`, run \`npx shadcn@latest init\` first and pick any options: ${site.name} replaces the theme it writes. Then add components with \`--overwrite\`:

\`\`\`bash
npx shadcn@latest add --overwrite ${site.url}/r/button.json ${site.url}/r/tooltip.json ${site.url}/r/toast.json
\`\`\`

\`--overwrite\` replaces the \`lib/utils.ts\` and \`components/ui/button.tsx\` that shadcn init wrote (and any component of yours with the same name). Without it, shadcn keeps its own button and a \`cn()\` that does not know the ${site.name} type and radius scales.

Then make \`app/globals.css\` exactly these two lines, deleting the theme shadcn added (\`tw-animate-css\`, \`shadcn/tailwind.css\`, \`@custom-variant dark\`, \`@theme inline\`, \`:root\`, \`.dark\` and \`@layer base\`), because it overrides this one:

\`\`\`css
@import "tailwindcss";
@import "../styles/dtheo.css";
\`\`\`

Finish with steps 3 and 5: the mode and preset on \`<html>\`, and the providers in the root layout. Later components need no flags: \`npx shadcn@latest add ${site.url}/r/table.json\`.

## Check your UI code

\`\`\`bash
npx ${site.cli}@latest check app components
\`\`\`

Name the folders that hold your UI code (\`src\` in a Vite app). It flags raw colors, palette classes, \`transition-all\`, unlabeled icon buttons and other mistakes, with the fix for each. Add it to CI; it exits with 1 on errors.
`,

  theming: `# Theming

> The mode is a class and the preset an attribute, not separate stylesheets. Components never change.

## Light and dark

The \`dark\` class switches every color role. Put it on \`<html>\` for the whole app, or on any element to scope it:

\`\`\`tsx
import { ThemeScope } from "@/lib/theme";

<ThemeScope mode="light" preset="graphite">
  <RunReview />
</ThemeScope>
\`\`\`

Overlays opened inside a \`ThemeScope\` (menus, dialogs, tooltips, toasts) mount inside it, so they keep the scope’s theme.

## Presets

| Preset | Character | Modes |
| --- | --- | --- |
| \`graphite\` | Native and neutral, Mac-like materials, system blue | light, dark |
| \`carbon\` | No hue in the interface: neutral surfaces, an ink primary, square corners, no glass | light, dark |

A preset follows the page’s mode unless its own element sets one. Carbon suits monitoring and maps, where the data should be the only color on screen.

## Tokens

Colors use the shadcn role names (\`background\`, \`foreground\`, \`card\`, \`primary\`, \`muted-foreground\`, …) plus \`subtle-foreground\`, \`selection\`, status roles (\`success\`, \`warning\`, \`info\`, \`destructive\`, each with a readable \`-foreground\` text color) and chart roles. Use them as classes: \`bg-card\`, \`text-muted-foreground\`.

On the web, \`npx ${site.cli}@latest init\` writes every role to \`styles/dtheo.css\` as CSS variables, for each preset and mode. There is nothing else to install.

For code that cannot read CSS (React Native, canvas, image renderers, design tools), install \`@dtheo/tokens\`. It has three entry points:

| Import | What it holds |
| --- | --- |
| \`@dtheo/tokens/native\` | \`colors\` (hex) and \`oklch\` (as authored) for every preset and mode, and \`radii\` per preset |
| \`@dtheo/tokens/tokens.json\` | Every role, radius and foundation value in DTCG 2025.10 format, with a hex fallback for each color |
| \`@dtheo/tokens/contrast.json\` | The measured contrast of every declared pair in every theme |

Every declared pair passes WCAG AA in every theme; the token build fails if one does not.

## React Native and Expo

Native apps cannot read CSS variables. Install the tokens and import the generated values instead: \`oklch\` has every role as authored, \`colors\` has the same roles as hex for React Native’s \`StyleSheet\`, which cannot parse \`oklch()\`.

\`\`\`bash
npm install @dtheo/tokens
\`\`\`

\`\`\`ts
import { colors, oklch, radii } from "@dtheo/tokens/native";

const card = colors.graphite.dark.card; // "#1e1f20", for StyleSheet
const accent = oklch.graphite.dark.primary; // "oklch(…)", for Skia or the web
\`\`\`
`,

  agents: agentsMarkdown(),

  cli: `# CLI

> \`${site.cli}\` copies components into your project and checks UI code against the system. It is built for scripts and agents: every command takes \`--json\`.

## Commands

\`\`\`bash
npx ${site.cli} init                 # utils, ThemeScope and styles
npx ${site.cli} add button table     # components and what they need
npx ${site.cli} list chart           # search the registry
npx ${site.cli} check src            # design check, exits 1 on errors
npx ${site.cli} rules                # what each check means
npx ${site.cli} mcp                  # MCP config for your editor or agent
\`\`\`

## Options

| Option | Meaning |
| --- | --- |
| \`--registry <url>\` | Use another registry (default ${site.url}, or \`$DTHEO_REGISTRY\`) |
| \`--cwd <dir>\` | Run against another project directory |
| \`--overwrite\` | Replace files that already exist (skipped by default) |
| \`--dry-run\` | Show what would be written |
| \`--json\` | Machine-readable output |

## Safety

The CLI only reads from the registry, over HTTPS unless the host is local. It refuses absolute paths, \`..\` segments and anything that would land outside your project, and never runs code it downloads. Dependencies are printed for you to install.
`,

  'atomic-design': `# Atomic design

> The system is layered the way Brad Frost describes it, but navigation uses the names engineers search for.

| Level | In ${site.name} | Examples |
| --- | --- | --- |
| Atoms | Foundations and single-purpose controls | tokens, Button, Input, Checkbox, Badge, Kbd, Sparkline |
| Molecules | Small groups with one job | Field, Select, Combobox, Menu, Metric, Card, Table |
| Organisms | Complex sections | Dialog, Sheet, Command palette, Line chart, Heatmap |
| Templates | Page structures without content | App shell, Data table, Forms, States |
| Pages | Templates filled with synthetic data | Run review, Motor map, Loop tuning, Lab assistant |

Every component page has a **Used in** section: the templates and pages that depend on it. Before changing a component, look there; that is the blast radius of the change, and the list of screens to review.
`,

  'patterns/data-table': `# Data table

> A table people can search, filter, sort, select and recover from: the most common screen in an engineering tool.

## Structure

1. A toolbar above the table: search on the left, filters next to it, view options and the primary action on the right.
2. The table: identifiers in monospace, numbers right-aligned with tabular figures, units in the header or after the value, status as a badge with a word.
3. A footer with the count (“8 of 412 runs”) and pagination.

## States

- **Loading**: skeleton rows shaped like real rows, so nothing shifts when data arrives.
- **No data yet**: say what will appear here and how to create the first item.
- **No results**: name the filter that excluded everything and offer to clear it.
- **Failed to load**: say what failed, keep the filters, offer Retry.

## Rules

- Never truncate numbers, units or identifiers that people compare.
- Selection shows a count and the actions that apply to the selection.
- Row actions live in a “…” menu at the end of the row; the row itself opens the item.
- Wide tables scroll inside their container; the page never scrolls sideways.
`,

  'patterns/forms': `# Forms

> Labels above fields, help where the decision is made, validation that says what to do and a save that never loses work.

## Rules

- Every field has a visible label. Placeholders show format, not meaning.
- Mark the exception: if most fields are required, mark the optional ones.
- Validate on blur and on submit, not on every keystroke. The message names the problem and the fix: “Enter a gain between 0 and 10.”
- Show units in the field (N·m, ms) instead of in the label.
- Save buttons say what they do (“Save limits”). While saving, the button shows progress and keeps its width.
- A failed save keeps every value, says what went wrong and offers Retry. A successful save confirms with a toast.
- Warn before leaving with unsaved changes; offer to save or discard.
`,

  'patterns/states': `# Loading, empty and error states

> Each state has a different reason and a different next step. Write them deliberately.

| State | Say | Offer |
| --- | --- | --- |
| Loading (under 300 ms) | Nothing; show the content when ready | – |
| Loading (longer) | A skeleton shaped like the content, or a spinner with what is loading | Cancel, if it is long |
| No data yet | What will appear here | The action that creates the first item |
| No results | Which filter excluded everything | Clear the filter |
| No permission | Who can grant access | Request access |
| Error | What failed, in plain words; whether data was lost | Retry; a way to report it |
| Partial | What loaded and what did not | Retry the failed part |

Never show raw error codes or stack traces as the message. Never fake progress: use an indeterminate indicator when the duration is unknown.
`,
};
