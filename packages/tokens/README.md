# @dtheo/tokens

The design tokens of [dtheo/ui](https://ui.dtheo.dev): one OKLCH source, with every text and UI color pair
checked against WCAG AA when it builds.

For React Native and Expo, where CSS variables do not exist:

```ts
import { colors, radii } from '@dtheo/tokens/native';

const card = colors.graphite.dark.card; // hex, gamut-mapped from OKLCH
const corner = radii.graphite.card; // 10
```

Also included: `@dtheo/tokens/tokens.json` (DTCG) and `@dtheo/tokens/contrast.json` (the measured contrast report).
On the web, `npx dtheo init` adds the CSS.

Presets: `graphite` (light and dark), `flight-deck` and `deep-space` (dark). MIT
