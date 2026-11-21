# @dtheo/tokens

The design tokens of [dtheo/ui](https://ui.dtheo.dev): one OKLCH source, with every text and UI color pair
checked against WCAG AA when it builds.

For React Native and Expo, where CSS variables do not exist:

```bash
npm install @dtheo/tokens
```

```ts
import { colors, oklch, radii } from '@dtheo/tokens/native';

const card = colors.graphite.dark.card; // hex for StyleSheet, which cannot parse oklch()
const accent = oklch.graphite.dark.primary; // the authored OKLCH, for Skia or the web
const corner = radii.graphite.card; // 10
```

Also included: `@dtheo/tokens/tokens.json` (DTCG 2025.10: OKLCH components with the format’s hex fallback) and
`@dtheo/tokens/contrast.json` (the measured contrast report).

The package ships no CSS. On the web, `npx dtheo init` adds it to your project.

Presets: `graphite` (light and dark), `flight-deck` and `deep-space` (dark). MIT
