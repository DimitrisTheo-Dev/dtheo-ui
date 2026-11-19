/**
 * dtheo/ui design check: catches the mistakes agents (and people) make with UI code, before review.
 * Pure function over source text, shared by the CLI (`dtheo check`) and the MCP tool `check_ui_code`.
 * Each rule says what is wrong, why it matters and what to write instead.
 */

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';

/**
 * The end of a JSX opening tag that starts at `from`: the first ">" outside braces and quotes, so arrow functions in
 * props (onClick={() => a > b}) do not end it early.
 */
function tagEnd(source, from) {
  let depth = 0;
  let quote = null;
  for (let i = from; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (ch === '>' && depth === 0) return i;
  }
  return -1;
}

/** Raw <button> elements whose only content is an icon, with no aria-label, aria-labelledby or title. */
function rawIconButtons(source) {
  const found = [];
  for (const m of source.matchAll(/<button\b/g)) {
    const end = tagEnd(source, m.index + 7);
    if (end === -1) continue;
    const tag = source.slice(m.index, end + 1);
    if (tag.endsWith('/>') || /\b(aria-label|aria-labelledby|title)=/.test(tag)) continue;
    const close = source.indexOf('</button>', end);
    if (close === -1) continue;
    const inner = source
      .slice(end + 1, close)
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/<svg\b[\s\S]*?<\/svg>/g, '<icon/>')
      .replace(/<[A-Z]\w*Icon\b[\s\S]*?\/>/g, '<icon/>')
      .trim();
    if (/^(<icon\/>\s*)+$/.test(inner)) found.push({ index: m.index, text: tag });
  }
  return found;
}

/** @typedef {{ rule: string, severity: 'error' | 'warning', line: number, column: number, message: string, fix: string, excerpt: string }} Finding */

const rules = [
  {
    id: 'raw-color',
    severity: 'error',
    test: /(?<![\w-])(#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(|oklab\()/g,
    skip: (line) => /^\s*(\/\/|\*|\/\*)/.test(line) || /\.(svg|png)|url\(|href=|stop-color/.test(line),
    message: 'Raw color literal in UI code.',
    fix: 'Use a token class (bg-card, text-muted-foreground, border-border, text-destructive-foreground) so themes, presets and dark mode keep working.',
  },
  {
    id: 'palette-color',
    severity: 'error',
    test: new RegExp(
      `\\b(?:bg|text|border|ring|fill|stroke|outline|from|to|via|divide|placeholder|decoration|shadow)-(?:${PALETTE})-\\d{2,3}\\b`,
      'g',
    ),
    message:
      'Tailwind palette color: dtheo/ui themes only define semantic colors, so this class has no effect.',
    fix: 'Pick the role, not the hue: bg-primary, bg-secondary, text-success-foreground, bg-warning/15, border-border-strong.',
  },
  {
    id: 'raw-white-black',
    severity: 'error',
    test: /(?<![\w-])(?:(?:bg|border|ring|fill|stroke|from|to|via|divide|outline|decoration|shadow)-(?:white|black)|text-black)(?![\w-])/g,
    message: 'White and black do not change with the theme: a bg-white card is a white hole in dark mode.',
    fix: 'Use a role: bg-card, bg-background, bg-foreground/15 for a translucent fill. text-white is fine on saturated fills such as bg-destructive.',
  },
  {
    id: 'radius-token',
    severity: 'error',
    test: /(?<![\w-])rounded(?:-(?:t|r|b|l|s|e|tl|tr|br|bl|ss|se|es|ee))?-(?:xs|sm|md|lg|xl|2xl|3xl|4xl)(?![\w-])/g,
    message: "Tailwind's default radius: not a dtheo/ui token, so nested corners stop lining up.",
    fix: 'Use rounded-control (6), rounded-popover (8), rounded-card (10) or rounded-dialog (12); rounded-item and rounded-inset for corners nested inside them; rounded-full for pills.',
  },
  {
    id: 'arbitrary-radius',
    severity: 'warning',
    test: /(?<![\w-])rounded(?:-(?:t|r|b|l|s|e|tl|tr|br|bl|ss|se|es|ee))?-\[\d+(?:\.\d+)?(?:px|rem)\]/g,
    message: 'Off-scale corner radius.',
    fix: 'Use a radius token, or derive from one: rounded-[calc(var(--radius-control)-2px)].',
  },
  {
    id: 'arbitrary-text-size',
    severity: 'warning',
    test: /\btext-\[\d+(?:\.\d+)?(?:px|rem|em)\]/g,
    message: 'Arbitrary font size.',
    fix: 'Use a type role: text-caption (11), text-label (12), text-body (13), text-callout (14), text-headline (15), text-title-3/2/1.',
  },
  {
    id: 'arbitrary-spacing',
    severity: 'warning',
    test: /\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-\[\d+(?:\.\d+)?px\]/g,
    message: 'Off-scale spacing value.',
    fix: 'Use the 4px scale (p-3 = 12px, gap-1.5 = 6px). If the design truly needs a new step, add it to the tokens.',
  },
  {
    id: 'transition-all',
    severity: 'error',
    test: /(?<![\w-])transition-all(?=[\s'"`}]|$)|transition:\s*all\b/g,
    message: '`transition: all` animates properties nobody meant to animate, including layout.',
    fix: 'Name the properties: transition-[transform,opacity] duration-200 ease-out, or transition-colors.',
  },
  {
    id: 'scale-zero',
    severity: 'error',
    test: /(?<![\w-])scale-0(?=[\s'"`}]|$)|scale\(0\)/g,
    message: 'Entering from scale(0) looks like it appears from nowhere.',
    fix: 'Start from scale-95 (or 96) with opacity-0.',
  },
  {
    id: 'ease-in',
    severity: 'warning',
    test: /\bease-in\b(?!-out)|cubic-bezier\(0\.4,\s*0,\s*1,\s*1\)/g,
    message: '`ease-in` delays the moment the user is watching; UI feels sluggish.',
    fix: 'Use ease-out for entering and exiting, ease-in-out for moving on screen.',
  },
  {
    id: 'icon-button-label',
    severity: 'error',
    test: /<Button\b(?=[^>]*\bsize=["']icon[^"']*["'])(?![^>]*\baria-label=)[^>]*>/g,
    find: rawIconButtons,
    message: 'Icon-only button without an accessible name.',
    fix: 'Add aria-label naming the action ("Delete run"), not the icon.',
  },
  {
    id: 'img-alt',
    severity: 'error',
    test: /<img\b(?![^>]*\balt=)[^>]*>/g,
    message: 'Image without alt text.',
    fix: 'Describe the image, or use alt="" if it is decorative.',
  },
  {
    id: 'clickable-div',
    severity: 'error',
    test: /<(div|span)\b[^>]*\bonClick=/g,
    message:
      'Click handler on a non-interactive element: unreachable by keyboard and invisible to screen readers.',
    fix: 'Use <Button> (or a link for navigation).',
  },
  {
    id: 'outline-none',
    severity: 'warning',
    test: /\boutline-none\b/g,
    // Fine when the file provides another focus treatment: a ring, a highlight state or a focus-within style.
    fileSkip: (src) => /focus-visible:|focus-within:|data-highlighted|has-\[[^\]]*focus/.test(src),
    message: 'Focus outline removed without a visible replacement.',
    fix: 'Keep the default focus ring, or add focus-visible:ring-3 focus-visible:ring-ring/25.',
  },
  {
    id: 'raw-html',
    severity: 'warning',
    test: /dangerouslySetInnerHTML/g,
    message: 'Raw HTML injection. If the content comes from users, data or an LLM, this is an XSS risk.',
    fix: 'Render text as children. If you must render HTML, sanitize it first.',
  },
  {
    id: 'z-index',
    severity: 'warning',
    test: /\bz-\[\d{3,}\]/g,
    message: 'Arbitrary z-index escalation.',
    fix: 'Overlays already stack via portals at z-50. Fix the stacking context instead of raising the number.',
  },
  {
    id: 'placeholder-as-label',
    severity: 'warning',
    test: /<(Input|input)\b(?=[^>]*\bplaceholder=)(?![^>]*\b(aria-label|aria-labelledby|id)=)[^>]*\/?>/g,
    message: 'Input with a placeholder but no label: the placeholder disappears as soon as someone types.',
    fix: 'Wrap it in <Field> with a <FieldLabel>, or add aria-label.',
    // Inside a <Field> that already has a <FieldLabel> (or <label>), Base UI names the input.
    contextSkip: (before) => {
      const open = [...before.matchAll(/<Field[\s>]/g)].at(-1)?.index ?? -1;
      if (open === -1 || before.lastIndexOf('</Field>') > open) return false;
      return /<(FieldLabel|label)\b/.test(before.slice(open));
    },
  },
];

/**
 * @param {string} source
 * @param {{ file?: string }} [options]
 * @returns {Finding[]}
 */
export function checkSource(source, options = {}) {
  const findings = [];
  const isTokenFile = /tokens?\.(css|ts|json)$|theme\.css$|dtheo\.css$/.test(options.file ?? '');
  const lines = source.split('\n');
  // `dtheo-check-disable-file raw-color, ease-in -- reason` (or with no ids, every rule) near the top of a file.
  const directive = /dtheo-check-disable-file\b([^\n]*)/.exec(source.split('\n').slice(0, 12).join('\n'));
  const disabledIds = directive
    ? directive[1]
        .split('--')[0]
        .split(/[\s,]+/)
        .filter(Boolean)
    : null;
  const disabled = (id) => directive !== null && (disabledIds.length === 0 || disabledIds.includes(id));
  const ignored = (i) =>
    /dtheo-check-ignore(?!-next-line)/.test(lines[i] ?? '') ||
    /dtheo-check-ignore-next-line/.test(lines[i - 1] ?? '');
  for (const rule of rules) {
    if (disabled(rule.id)) continue;
    if (isTokenFile && (rule.id === 'raw-color' || rule.id === 'palette-color')) continue;
    if (rule.fileSkip?.(source)) continue;
    rule.test.lastIndex = 0;
    // Multi-line JSX tags: test against the whole source, then map the index to a line.
    const multiline =
      rule.id === 'icon-button-label' ||
      rule.id === 'img-alt' ||
      rule.id === 'clickable-div' ||
      rule.id === 'placeholder-as-label';
    if (multiline) {
      const matches = [
        ...[...source.matchAll(new RegExp(rule.test.source, rule.test.flags))].map((m) => ({
          index: m.index,
          text: m[0],
        })),
        ...(rule.find?.(source) ?? []),
      ];
      for (const m of matches) {
        const before = source.slice(0, m.index);
        const line = before.split('\n').length;
        if (ignored(line - 1) || rule.contextSkip?.(before)) continue;
        const column = m.index - before.lastIndexOf('\n');
        findings.push({
          rule: rule.id,
          severity: rule.severity,
          line,
          column,
          message: rule.message,
          fix: rule.fix,
          excerpt: m.text.slice(0, 120),
        });
      }
      continue;
    }
    lines.forEach((text, i) => {
      if (rule.skip?.(text)) return;
      if (ignored(i)) return;
      for (const m of text.matchAll(new RegExp(rule.test.source, rule.test.flags))) {
        findings.push({
          rule: rule.id,
          severity: rule.severity,
          line: i + 1,
          column: (m.index ?? 0) + 1,
          message: rule.message,
          fix: rule.fix,
          excerpt: text.trim().slice(0, 120),
        });
      }
    });
  }
  return findings.sort((a, b) => a.line - b.line || a.column - b.column);
}

export const ruleList = rules.map(({ id, severity, message, fix }) => ({ id, severity, message, fix }));
