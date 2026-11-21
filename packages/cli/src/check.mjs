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

/**
 * Every JSX opening tag that `pattern` finds, read to its real end. `top` is the tag with the inside of every
 * {expression} blanked, so an attribute only counts when it belongs to this element: `aria-label` inside an
 * onClick={() => …} handler does not name the button. `spread` is true when the tag spreads props ({...props}),
 * which may carry any attribute.
 */
function* openingTags(source, pattern) {
  for (const m of source.matchAll(pattern)) {
    const end = tagEnd(source, m.index + m[0].length);
    if (end === -1) continue;
    const tag = source.slice(m.index, end + 1);
    let top = '';
    let depth = 0;
    let quote = null;
    let spread = false;
    for (let i = 0; i < tag.length; i++) {
      const ch = tag[i];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'" || ch === '`') quote = ch;
      else if (ch === '{') {
        if (depth === 0 && /^\{\s*\.\.\./.test(tag.slice(i))) spread = true;
        depth++;
        top += ch;
        continue;
      } else if (ch === '}') depth--;
      top += depth > 0 ? ' ' : ch;
    }
    yield { index: m.index, end, tag, top, spread };
  }
}

const hasAttr = (top, names) => new RegExp(`(?<![\\w-])(?:${names})=`).test(top);
const NAME_ATTRS = 'aria-label|aria-labelledby|title';

/** Icon libraries whose components are named after the picture (Trash2, ChevronDown), with no Icon suffix. */
const ICON_MODULE =
  /^(?:lucide-react|@radix-ui\/react-icons|@heroicons\/react(?:\/.*)?|react-icons(?:\/.*)?|@phosphor-icons\/react|@tabler\/icons-react)$/;

/** The JSX names a file imports from an icon library: `Trash2`, `Icons.` for `import * as Icons`. */
function iconImports(source) {
  const names = [];
  for (const m of source.matchAll(/import\s+(?:type\s+)?([^'";]*?)\s+from\s*['"]([^'"]+)['"]/g)) {
    if (!ICON_MODULE.test(m[2])) continue;
    const named = /\{([^}]*)\}/.exec(m[1]);
    for (const part of named?.[1].split(',') ?? []) {
      const local = part
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)
        .at(-1);
      if (local && /^[A-Z]\w*$/.test(local)) names.push(local);
    }
    const namespace = /\*\s+as\s+(\w+)/.exec(m[1]);
    if (namespace) names.push(`${namespace[1]}\\.\\w+`);
  }
  return names;
}

/**
 * Buttons that render nothing a screen reader can name: a raw <button>, or a <Button size="icon…">, whose only
 * content is icons (or nothing), with no aria-label, aria-labelledby or title and no spread props that could carry one.
 * Text, an sr-only label or an {expression} child counts as a name.
 */
function unnamedIconButtons(source) {
  const iconComponent = new RegExp(
    `<(?:(?:[A-Z]\\w*)?Icon|${['svg', ...iconImports(source)].join('|')})\\b[^<]*?/>`,
    'g',
  );
  const found = [];
  for (const t of openingTags(source, /<(?:button|Button)\b/g)) {
    const component = t.tag.startsWith('<Button');
    const iconSized = /(?<![\w-])size=["']icon/.test(t.top) || /(?<![\w-])size=\{\s*["'`]icon/.test(t.tag);
    if (component && !iconSized) continue;
    // The whole tag, not only its own attributes: a name on the element it renders as
    // (render={<a href="…" aria-label="Repository" />}) names the button too.
    if (t.spread || hasAttr(t.tag, NAME_ATTRS)) continue;
    if (t.tag.endsWith('/>')) {
      if (component) found.push({ index: t.index, text: t.tag });
      continue;
    }
    const close = source.indexOf(component ? '</Button>' : '</button>', t.end);
    if (close === -1) continue;
    const inner = source
      .slice(t.end + 1, close)
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/<svg\b[\s\S]*?<\/svg>/g, '\uE000')
      .replace(iconComponent, '\uE000')
      // Wrappers such as <span> count for what they hold: an sr-only label is text, a span around an icon is not.
      .replace(/<\/?[A-Za-z][^>]*>/g, '')
      .trim();
    const iconsOnly = /^(?:\uE000\s*)+$/.test(inner);
    if (iconsOnly || (component && inner === '')) found.push({ index: t.index, text: t.tag });
  }
  return found;
}

/** <div> and <span> with their own onClick. */
function clickableElements(source) {
  return [...openingTags(source, /<(?:div|span)\b/g)]
    .filter((t) => hasAttr(t.top, 'onClick'))
    .map((t) => ({ index: t.index, text: t.tag }));
}

/** <img> with no alt and no spread props that could carry one. */
function imagesWithoutAlt(source) {
  return [...openingTags(source, /<img\b/g)]
    .filter((t) => !t.spread && !hasAttr(t.top, 'alt'))
    .map((t) => ({ index: t.index, text: t.tag }));
}

/**
 * Inputs whose placeholder is their only label. Named another way when they carry aria-label or aria-labelledby,
 * sit inside a <Field> with a <FieldLabel> or inside a <label>, or have an id that a <label htmlFor> in the file
 * points at (an id built from an expression could be pointed at from anywhere, so it is trusted).
 */
function placeholderOnlyInputs(source) {
  const found = [];
  for (const t of openingTags(source, /<(?:Input|input)\b/g)) {
    if (t.spread || !hasAttr(t.top, 'placeholder') || hasAttr(t.top, 'aria-label|aria-labelledby')) continue;
    if (/(?<![\w-])type=["'](?:hidden|submit|button|reset)["']/.test(t.top)) continue;
    const id = /(?<![\w-])id=(?:"([^"]*)"|'([^']*)'|(\{))/.exec(t.top);
    if (id) {
      if (id[3]) continue;
      const value = (id[1] ?? id[2]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`htmlFor=(?:["']|\\{\\s*["'\`])${value}["'\`]`).test(source)) continue;
    }
    const before = source.slice(0, t.index);
    if (insideOpen(before, 'Field', /<(FieldLabel|label)\b/) || insideOpen(before, 'label')) continue;
    found.push({ index: t.index, text: t.tag });
  }
  return found;
}

/** Whether the text before a point leaves a <name> element open, optionally one that already contains `inner`. */
function insideOpen(before, name, inner) {
  const open = [...before.matchAll(new RegExp(`<${name}[\\s>]`, 'g'))].at(-1)?.index ?? -1;
  if (open === -1 || before.lastIndexOf(`</${name}>`) > open) return false;
  return inner ? inner.test(before.slice(open)) : true;
}

/** text-* utilities that set size, alignment or wrapping rather than color. */
const TEXT_NOT_COLOR =
  /^(?:caption|label|body|callout|prose|headline|title-[123]|large-title|display|xs|sm|base|lg|\d?xl|left|right|center|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip|\[.*\])$/;

/**
 * `text-destructive-foreground` (and success, warning, info) is the status color as text on a card. On a solid
 * `bg-destructive` fill the two are the same hue: about 2:1. Agents reach for the pair because shadcn names its
 * on-fill text that way. Within one class string, each fill is checked against the text color that applies in the
 * same state: `hover:bg-destructive` meets `hover:text-…` if there is one, else the plain text color. A light tint
 * (bg-destructive/15, the badge) is fine.
 */
function statusTextOnFill(source) {
  const found = [];
  for (const s of source.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
    const textIn = new Map();
    const fills = [];
    for (const cls of s[2].split(/\s+/)) {
      const m = /^(.*:)?(bg|text)-([^:]+)$/.exec(cls);
      if (!m) continue;
      const [, state = '', kind, value] = m;
      if (kind === 'text') {
        if (!TEXT_NOT_COLOR.test(value)) textIn.set(state, value);
        continue;
      }
      const fill = /^(destructive|success|warning|info)(?:\/(\d+))?$/.exec(value);
      if (fill && (fill[2] === undefined || Number(fill[2]) >= 40)) fills.push({ state, role: fill[1] });
    }
    const clash = fills.some((f) => (textIn.get(f.state) ?? textIn.get('')) === `${f.role}-foreground`);
    if (clash) found.push({ index: s.index, text: s[0] });
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
    id: 'status-text-on-fill',
    severity: 'error',
    find: statusTextOnFill,
    message:
      'Status text on its own solid fill: text-destructive-foreground on bg-destructive is red on red, about 2:1. In dtheo/ui the -foreground of a status color is that color as text on a card, unlike shadcn.',
    fix: 'For a badge or banner use the tint: bg-destructive/15 text-destructive-foreground. On a solid destructive fill use text-white, as the destructive Button does.',
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
    find: unnamedIconButtons,
    message: 'Icon-only button without an accessible name.',
    fix: 'Add aria-label naming the action ("Delete run"), not the icon.',
  },
  {
    id: 'img-alt',
    severity: 'error',
    find: imagesWithoutAlt,
    message: 'Image without alt text.',
    fix: 'Describe the image, or use alt="" if it is decorative.',
  },
  {
    id: 'clickable-div',
    severity: 'error',
    find: clickableElements,
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
    find: placeholderOnlyInputs,
    message: 'Input with a placeholder but no label: the placeholder disappears as soon as someone types.',
    fix: 'Wrap it in <Field> with a <FieldLabel>, or add aria-label.',
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
    // Rules that read JSX across lines scan the whole source, then map each index to a line.
    if (rule.find) {
      for (const m of rule.find(source)) {
        const before = source.slice(0, m.index);
        const line = before.split('\n').length;
        if (ignored(line - 1)) continue;
        const column = m.index - before.lastIndexOf('\n');
        findings.push({
          rule: rule.id,
          severity: rule.severity,
          line,
          column,
          message: rule.message,
          fix: rule.fix,
          excerpt: m.text.replace(/\s+/g, ' ').slice(0, 120),
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
