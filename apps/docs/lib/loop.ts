import { contrastPairs } from '@dtheo/tokens';
import { ruleList } from 'dtheo/check';
import { site } from './site';

/**
 * One source for the loop page and its Markdown mirror: the three tools, the moment each runs and a
 * real finding from each. Text uses inline Markdown (code, bold, links).
 */
const repo = 'https://github.com/DimitrisTheo-Dev';
const skills = `${repo}/agent-skills`;
const gate = `${repo}/product-engineering-quality-gate`;

export const loopDescription =
  'Three open source tools check the UI your agent builds: while it writes, when the screen ' +
  'renders and on every pull request. Use one or all three.';

export interface LoopStep {
  step: string;
  tool: string;
  text: string;
  /** Where a failure sends the work. */
  again?: string;
}

export const loopSteps: LoopStep[] = [
  {
    step: 'Plan',
    tool: 'dtheo plugin',
    text: 'Decide who the screen is for, what it must show and the smallest flow that works.',
  },
  {
    step: 'Write',
    tool: 'dtheo/ui',
    text: 'The agent reads each component’s contract over MCP and copies its source.',
  },
  {
    step: 'Check',
    tool: 'dtheo/ui',
    text: `\`${site.cli} check\` runs ${ruleList.length} rules. Each finding has the line and the fix.`,
    again: 'Fix, check again',
  },
  {
    step: 'Review',
    tool: 'dtheo plugin',
    text:
      'Render the screen at phone and desktop widths, light and dark. A second agent, not the ' +
      'one that built it, reviews it.',
    again: 'Fix, review again',
  },
  {
    step: 'Merge',
    tool: 'Quality gate',
    text: 'The pull request runs the project’s own checks and reports each one.',
    again: 'Fix, push again',
  },
];

export interface LoopTool {
  name: string;
  href: string;
  /** Rows of the comparison, in the order of loopRows. */
  is: string;
  when: string;
  does: string;
  found: string;
  with: string;
  start: string;
}

export const loopRows: Array<[keyof Omit<LoopTool, 'name' | 'href'>, string]> = [
  ['is', 'What it is'],
  ['when', 'When it runs'],
  ['does', 'What it does'],
  ['found', 'What it finds'],
  ['with', 'Works with'],
  ['start', 'Start'],
];

export const loopTools: LoopTool[] = [
  {
    name: site.name,
    href: '/docs',
    is: 'React components, charts and tokens, with an MCP server and a CLI.',
    when: 'While your agent writes the code.',
    does: 'Gives the agent each component’s contract and source, then checks the code it wrote.',
    found:
      '`run-card.tsx:5 palette-color`: `bg-blue-600` has no effect in the theme. ' +
      'Pick the role: `bg-primary`.',
    with: 'Any agent that speaks MCP, or none: the CLI runs the same checks.',
    start: `\`npx ${site.cli} init\`, then [connect your agent](/docs/agents).`,
  },
  {
    name: 'dtheo plugin',
    href: skills,
    is:
      '5 agent skills for Claude Code and Codex: plan, design and build, review, landing pages ' +
      'and launch.',
    when: 'Before the code, and after the screen renders.',
    does:
      'Plans the screen, then checks the render at phone and desktop widths and has a second ' +
      'agent review it.',
    found:
      'On this site, at phone width, Tab moved focus to a table header whose focus ring was cut ' +
      `off. [Fixed](${repo}/dtheo-ui/pull/26).`,
    with: 'Any web project. In Claude Code it adds the dtheo/ui MCP server too.',
    start: `\`/plugin install dtheo@dtheo\` ([setup](${skills}#install)).`,
  },
  {
    name: 'Quality gate',
    href: gate,
    is: 'A reusable GitHub Actions workflow.',
    when: 'On every pull request.',
    does:
      'Runs the project’s own scripts (format, lint, types, tests, design check, build) and ' +
      'reports each one.',
    found:
      'Its first run on dtheo/ui: 31 files the formatter had never checked. ' +
      `[The pull request](${repo}/dtheo-ui/pull/20).`,
    with: 'Any JavaScript or TypeScript repository with a lockfile.',
    start: `[Adopt it](${gate}#adopt-it) with one onboarding script.`,
  },
];

export const loopReasons: Array<[string, string]> = [
  [
    'Your agent checks its own work',
    `${ruleList.length} rules for mistakes agents often make, each with the line and the fix. ` +
      'The agent runs them over MCP or the CLI, and CI runs them on every pull request.',
  ],
  [
    'Charts that know what a limit is',
    'Line, bar, stream, scatter and histogram charts draw limits and mark the readings past ' +
      'them. The histogram shows process capability (Cpk).',
  ],
  [
    'Contrast is a build step',
    `${contrastPairs.length} color pairs are measured in Graphite and Carbon, light and dark. ` +
      'The build fails below WCAG AA.',
  ],
  [
    'Names your agent already knows',
    'shadcn color roles and registry format, with Base UI underneath. Components are copied into ' +
      'your project, so you own the code.',
  ],
];

const cell = (text: string) => text.replace(/\|/g, '\\|');
const absolute = (href: string) => (href.startsWith('/') ? site.url + href : href);

/** The Markdown mirror of the loop page. */
export function loopMarkdown() {
  return [
    '# The loop',
    '',
    `> ${loopDescription}`,
    '',
    '## How a screen gets built',
    '',
    ...loopSteps.map(
      (s, i) => `${i + 1}. **${s.step}** (${s.tool}). ${s.text}${s.again ? ` ${s.again}.` : ''}`,
    ),
    '',
    '## Which tool does what',
    '',
    `| | ${loopTools.map((t) => `[${t.name}](${absolute(t.href)})`).join(' | ')} |`,
    `| --- | ${loopTools.map(() => '---').join(' | ')} |`,
    ...loopRows.map(([key, label]) => `| ${label} | ${loopTools.map((t) => cell(t[key])).join(' | ')} |`),
    '',
    `## Why ${site.name}`,
    '',
    ...loopReasons.map(([title, text]) => `- **${title}.** ${text}`),
    '',
  ]
    .join('\n')
    .replaceAll('](/', `](${site.url}/`);
}
