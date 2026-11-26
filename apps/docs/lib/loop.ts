import { ruleList } from 'dtheo/check';
import { site } from './site';

/**
 * One source for the "How it works" page and its Markdown mirror: the problem, one screen from
 * request to review, the three tools and which one to pick. Text uses inline Markdown (code, links).
 */
const repo = 'https://github.com/DimitrisTheo-Dev';
const skills = `${repo}/agent-skills`;
const gate = `${repo}/product-engineering-quality-gate`;

export const loopTitle = 'How it works';

export const loopDescription =
  'You ask your coding agent for a screen. Three free tools check its work, so the screen is ' +
  'already clean when you review it.';

export const loopProblem =
  'Coding agents write UI that works but drifts from your design: a new shade of blue, an icon ' +
  'button with no name, a placeholder used as a label. Without checks, you leave the same ' +
  'review comments on every screen.';

export interface LoopStep {
  title: string;
  text: string;
  /** The tool doing the work, or none for the person. */
  tool?: string;
}

export const loopSteps: LoopStep[] = [
  {
    title: 'You ask for a screen',
    text: '“Build a notifications settings card.”',
  },
  {
    title: 'The agent looks up the parts',
    tool: site.name,
    text: 'It reads when to use Card, Switch and Select, then copies their code into your project.',
  },
  {
    title: 'It checks its own code',
    tool: site.name,
    text:
      `\`${site.cli} check\` runs ${ruleList.length} rules and finds an icon button with no name at ` +
      '`notifications.tsx:21`. The agent names it and checks again.',
  },
  {
    title: 'It looks at the screen',
    tool: 'dtheo plugin',
    text:
      'It opens the screen at phone and desktop sizes. A second agent, new to the code, tries ' +
      'it and reports what breaks.',
  },
  {
    title: 'The pull request is checked',
    tool: 'Quality gate',
    text:
      'Format, lint, types, tests, the design check and the build run on every pull request. ' +
      'One failure fails the check.',
  },
  {
    title: 'You review',
    text: 'The screen already passed all of that, so your review is about the product.',
  },
];

export interface LoopTool {
  name: string;
  href: string;
  what: string;
  when: string;
  /** A real finding, with a link to the fix. */
  found: string;
  start: string;
}

export const loopTools: LoopTool[] = [
  {
    name: site.name,
    href: '/docs',
    what: 'React components and design tokens, plus a design check your agent can run.',
    when: 'While the agent writes the code.',
    found: '`run-card.tsx:5`: `bg-blue-600` does nothing in the theme. Use `bg-primary`.',
    start: `\`npx ${site.cli} init\`, then [connect your agent](/docs/agents).`,
  },
  {
    name: 'dtheo plugin',
    href: skills,
    what: '5 skills for Claude Code and Codex that plan a screen and review it once it renders.',
    when: 'Before the code, and after the screen renders.',
    found:
      'On this site at phone width, a table header’s focus ring was cut off. ' +
      `[The fix](${repo}/dtheo-ui/pull/26).`,
    start: `\`/plugin install dtheo@dtheo\` ([setup](${skills}#install)).`,
  },
  {
    name: 'Quality gate',
    href: gate,
    what: 'A GitHub Actions workflow that runs your project’s own checks and reports each one.',
    when: 'On every pull request.',
    found:
      'Its first run on this repo: 30 files the formatter had never checked. ' +
      `[The fix](${repo}/dtheo-ui/pull/20).`,
    start: `[Adopt it](${gate}#adopt-it) with one script.`,
  },
];

export const loopToolRows: Array<[keyof Omit<LoopTool, 'name' | 'href'>, string]> = [
  ['what', 'What it is'],
  ['when', 'When it runs'],
  ['found', 'A real catch'],
  ['start', 'Start'],
];

/** Which tool to pick: the need, then the tool's name as in loopTools. */
export const loopChoices: Array<[string, string]> = [
  ['Ready components, and an agent that checks its own code', site.name],
  ['A second look at the rendered screen, with any UI kit', 'dtheo plugin'],
  ['Every pull request checked, in any JavaScript or TypeScript repo', 'Quality gate'],
];

export const loopChoiceNote = 'Each one works alone. Together, a mistake gets three chances to be caught.';

const absolute = (href: string) => (href.startsWith('/') ? site.url + href : href);

/** The Markdown mirror of the page. */
export function loopMarkdown() {
  return [
    `# ${loopTitle}`,
    '',
    `> ${loopDescription}`,
    '',
    '## The problem',
    '',
    loopProblem,
    '',
    '## One screen, from request to review',
    '',
    ...loopSteps.map((s, i) => `${i + 1}. **${s.title}**${s.tool ? ` (${s.tool})` : ''}. ${s.text}`),
    '',
    '## The three tools',
    '',
    ...loopTools.flatMap((t) => [
      `### [${t.name}](${absolute(t.href)})`,
      '',
      ...loopToolRows.map(([key, label]) => `- **${label}:** ${t[key]}`),
      '',
    ]),
    '## Which one do you need?',
    '',
    ...loopChoices.map(([need, tool]) => `- ${need}: **${tool}**`),
    '',
    loopChoiceNote,
    '',
  ]
    .join('\n')
    .replaceAll('](/', `](${site.url}/`);
}
