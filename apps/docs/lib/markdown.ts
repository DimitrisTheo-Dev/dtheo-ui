// dtheo-check-disable-file transition-all, scale-zero, ease-in -- documentation that quotes the rules.
import 'server-only';
import { components, type ComponentMeta } from '@dtheo/ui/meta';
import { colorRoles, contrastPairs, foundation, presets } from '@dtheo/tokens';
import { ruleList } from 'dtheo/check';
import { installItems } from './registry';
import { exampleSource } from './source';
import { installCommand, shadcnCommand, site } from './site';
import { countLabel } from './counts';
import { foundations, getStarted, patterns, examples as exampleNav } from './nav';
import { engineeringDataMarkdown } from './engineering-data';
import { usedIn } from './usage';
import { pagesMarkdown } from './pages-md';
import { docsPath } from './paths';

/** The Markdown mirror of a component page. Same contract, same examples, readable without JavaScript. */
export function componentMarkdown(meta: ComponentMeta) {
  const { pages, composedBy } = usedIn(meta.slug);
  const lines = [
    `# ${meta.title}`,
    '',
    `> ${meta.description}`,
    '',
    `Category: ${meta.category} · Atomic level: ${meta.level}${meta.primitive ? ` · Built on Base UI ${meta.primitive}` : ''}`,
    `Page: ${site.url}${docsPath(meta)}`,
    '',
    '## Install',
    '',
    '```bash',
    installCommand(...installItems(meta)),
    '# or, with the shadcn CLI',
    shadcnCommand(...installItems(meta)),
    '```',
    '',
    `First time in this project? Run \`npx ${site.cli}@latest init\` first, or follow ${site.url}/docs/installation#using-the-shadcn-cli-instead to set up the shadcn CLI once.`,
    '',
    `Dependencies: ${meta.dependencies.join(', ') || 'none'}. Registry dependencies: ${meta.registryDependencies.join(', ') || 'none'}.`,
    '',
    '## Exports',
    '',
    meta.exports.map((e) => `\`${e}\``).join(', '),
    '',
    '## Use it for',
    '',
    ...meta.use.map((u) => `- ${u}`),
    ...(meta.avoid?.length
      ? ['', '## Reach for something else', '', ...meta.avoid.map((u) => `- ${u}`)]
      : []),
    ...(meta.props?.length
      ? [
          '',
          '## API',
          '',
          '| Prop | Type | Default | Description |',
          '| --- | --- | --- | --- |',
          ...meta.props.map(
            (p) =>
              `| \`${p.name}\` | \`${p.type.replace(/\|/g, '\\|')}\` | ${p.default ? `\`${p.default}\`` : p.required ? 'required' : '–'} | ${p.description} |`,
          ),
        ]
      : []),
    ...(meta.keyboard?.length
      ? [
          '',
          '## Keyboard',
          '',
          '| Keys | Action |',
          '| --- | --- |',
          ...meta.keyboard.map(([k, a]) => `| ${k} | ${a} |`),
        ]
      : []),
    ...(meta.a11y?.length ? ['', '## Accessibility', '', ...meta.a11y.map((a) => `- ${a}`)] : []),
    '',
    '## Examples',
    ...meta.examples.flatMap((id) => ['', `### ${id}`, '', '```tsx', exampleSource(id).trim(), '```']),
    '',
    '## Used in',
    '',
    ...(pages.length || composedBy.length
      ? [
          ...pages.map((p) => `- ${p.title} (${p.level}): ${site.url}${p.href}`),
          ...composedBy.map((c) => `- ${c.title} (${c.level}): ${site.url}${docsPath(c)}`),
        ]
      : ['- Not used by an example yet.']),
    '',
  ];
  return lines.join('\n');
}

/** Foundations pages rendered from the token source, so the numbers in Markdown are the numbers in CSS. */
export function foundationMarkdown(slug: string) {
  if (slug === 'engineering-data') return engineeringDataMarkdown;
  if (slug === 'color') {
    const rows = colorRoles.map(
      (r) => `| \`--${r}\` | \`${presets[0]!.modes.light![r]}\` | \`${presets[0]!.modes.dark![r]}\` |`,
    );
    return [
      '# Color',
      '',
      `> OKLCH roles in the shadcn vocabulary and three presets: Graphite in light and dark, Flight deck and Deep space in dark. ${contrastPairs.length} text, UI and focus-ring pairs are contrast-checked in every theme they apply to when tokens build; the build fails below WCAG AA.`,
      '',
      'Rules: color marks attention, not decoration. Neutral surfaces; one accent for the primary action and selection; success, warning and critical only when something needs a person, always with a word or icon. Status text uses the `*-foreground` roles, fills use the base role.',
      '',
      '## Graphite roles',
      '',
      '| Role | Light | Dark |',
      '| --- | --- | --- |',
      ...rows,
      '',
      '## Presets',
      '',
      ...presets.map(
        (p) =>
          `- **${p.name}** (\`data-preset="${p.id}"\`): ${p.description} Modes: ${Object.keys(p.modes).join(', ')}.`,
      ),
      '',
    ].join('\n');
  }
  if (slug === 'typography') {
    return [
      '# Typography',
      '',
      '> The system font (SF Pro on Apple platforms) and the system monospace. Roles, not sizes; tracking tightens as size grows.',
      '',
      '| Role | Class | Size / line height | Tracking | Weight |',
      '| --- | --- | --- | --- | --- |',
      ...Object.entries(foundation.text).map(
        ([k, v]) => `| ${k} | \`text-${k}\` | ${v[0]} / ${v[1]} | ${v[2]} | ${v[3]} |`,
      ),
      '',
      'Numbers that align in columns use `tabular-nums`. Large standalone figures keep proportional digits. In running text, a unit follows its value after a non-breaking space (17.6 %, 30.9 A), so the two never wrap apart. Metrics set the unit in its own smaller span.',
      '',
    ].join('\n');
  }
  if (slug === 'geometry') {
    return [
      '# Geometry',
      '',
      '> Control heights that align across components, concentric radii, quiet 1px borders and a small elevation scale.',
      '',
      '| Control | Height |',
      '| --- | --- |',
      ...Object.entries(foundation.control).map(([k, v]) => `| \`h-control-${k}\` | ${v} |`),
      '',
      `Coarse pointers (touch screens) raise \`h-control-md\` to ${foundation.control.touch} and \`h-control-lg\` to ${Number.parseInt(foundation.control.touch) + 4}px; xs and sm stay the same.`,
      '',
      '| Radius | Graphite | Flight deck | Deep space |',
      '| --- | --- | --- | --- |',
      ...(['radius-control', 'radius-popover', 'radius-card', 'radius-dialog'] as const).map(
        (k) =>
          `| \`rounded-${k.replace('radius-', '')}\` | ${presets[0]!.geometry[k]} | ${presets[1]!.geometry[k]} | ${presets[2]!.geometry[k]} |`,
      ),
      '',
      'Nested surfaces use concentric radii: `rounded-item` = popover radius − 4px (a menu item inset 4px), `rounded-inset` = card radius − 4px.',
      '',
    ].join('\n');
  }
  if (slug === 'motion') {
    return [
      '# Motion',
      '',
      '> Fast, interruptible and absent where it would slow people down.',
      '',
      '| Token | Value | Use |',
      '| --- | --- | --- |',
      `| \`ease-out\` | ${foundation.ease.out} | Entering and exiting |`,
      `| \`ease-in-out\` | ${foundation.ease['in-out']} | Moving on screen |`,
      `| \`ease-drawer\` | ${foundation.ease.drawer} | Sheets and drawers |`,
      ...Object.entries(foundation.duration).map(([k, v]) => `| \`--duration-${k}\` | ${v} | ${k} |`),
      '',
      '- No animation on keyboard-triggered or 100+/day actions (the command palette opens instantly).',
      '- Never ease-in on UI; never scale from 0; name transitioned properties.',
      '- Popovers grow from their trigger (`origin-(--transform-origin)`); dialogs stay centered.',
      '- Reduced motion makes every transition and animation instant (1 ms), fades included.',
      '',
    ].join('\n');
  }
  return null;
}

/** The Markdown mirror of /docs/components: every component by category, with its install command. */
export function componentsIndexMarkdown() {
  const lines = [
    '# Components',
    '',
    `> All ${countLabel}, grouped by the job they do. Install any of them with \`${installCommand('<name>')}\`.`,
    '',
  ];
  for (const cat of new Set(components.map((c) => c.category))) {
    lines.push(`## ${cat}`, '');
    for (const c of components.filter((x) => x.category === cat))
      lines.push(`- [${c.title}](${site.url}${docsPath(c)}.md) \`${c.slug}\`: ${c.description}`);
    lines.push('');
  }
  return lines.join('\n');
}

/** llms.txt: a short, described index of the pages agents should read, linking their Markdown mirrors. */
const mdUrl = (href: string) => `${site.url}${href === '/docs' ? '/docs/index' : href}.md`;

export function llmsTxt() {
  const md = mdUrl;
  return [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    'Every docs page has a Markdown mirror at the same URL with `.md`. The MCP server at /mcp (Streamable HTTP, read-only) exposes the same contracts as tools. The registry at /r/registry.json is shadcn-compatible.',
    '',
    `Source: ${site.repo} (MIT). Created by ${site.author.name} (${site.author.url}).`,
    '',
    '## Get started',
    '',
    ...getStarted.map((p) => `- [${p.title}](${md(p.href)}): ${p.description}`),
    '',
    '## Foundations',
    '',
    ...foundations.map((p) => `- [${p.title}](${md(p.href)}): ${p.description}`),
    '',
    '## Components',
    '',
    ...components
      .filter((c) => c.package === 'ui')
      .map((c) => `- [${c.title}](${md(docsPath(c))}): ${c.description}`),
    '',
    '## Charts',
    '',
    ...components
      .filter((c) => c.package === 'charts')
      .map((c) => `- [${c.title}](${md(docsPath(c))}): ${c.description}`),
    '',
    '## Patterns',
    '',
    ...patterns.map((p) => `- [${p.title}](${md(p.href)}): ${p.description}`),
    '',
    '## Optional',
    '',
    ...exampleNav.map((p) => `- [${p.title}](${site.url}${p.href}): ${p.description}`),
    `- [Registry index](${site.url}/r/registry.json): every installable item as JSON`,
    `- [Full text](${site.url}/llms-full.txt): all the docs in one file`,
    '',
  ].join('\n');
}

export function llmsFullTxt() {
  return [
    llmsTxt(),
    ...Object.values(pagesMarkdown),
    ...['color', 'typography', 'geometry', 'motion', 'engineering-data'].map((s) => foundationMarkdown(s)!),
    ...components.map(componentMarkdown),
    checkRulesMarkdown(),
  ].join('\n\n---\n\n');
}

export function checkRulesMarkdown() {
  return [
    '# Design check rules',
    '',
    'Run `npx dtheo check <paths>` or call the MCP tool `check_ui_code`. Errors fail the check.',
    '',
    '| Rule | Severity | Problem | Fix |',
    '| --- | --- | --- | --- |',
    ...ruleList.map(
      (r) =>
        `| \`${r.id}\` | ${r.severity} | ${r.message.replace(/\|/g, '\\|')} | ${r.fix.replace(/\|/g, '\\|')} |`,
    ),
    '',
  ].join('\n');
}
