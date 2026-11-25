/**
 * dtheo/ui design check: catches the mistakes agents (and people) make with UI code, before review.
 * Pure function over source text, shared by the CLI (`dtheo check`) and the MCP tool `check_ui_code`.
 * Each rule says what is wrong, why it matters and what to write instead.
 *
 * Rules look only where their mistake can live. A light tokenizer labels every character of the source as code, a
 * class-bearing string, another string, a comment or JSX text, so a sentence that mentions "transition-all" in a
 * paragraph or a comment is not a finding, while the same word in className, cn(), cva() or a class-list string is.
 */

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';

/** CSS named colors (not currentColor, transparent or inherit, which follow the theme). */
const NAMED_COLORS =
  'aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|grey|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|rebeccapurple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen';

/** Style properties that take a color, in JavaScript (backgroundColor) and CSS (background-color) spelling. */
const COLOR_PROPS =
  'color|background(?:-?[cC]olor)?|border(?:-?(?:[tT]op|[rR]ight|[bB]ottom|[lL]eft))?(?:-?[cC]olor)?|outline(?:-?[cC]olor)?|fill|stroke|caret-?[cC]olor|accent-?[cC]olor|text-?[dD]ecoration(?:-?[cC]olor)?|(?:box|text)-?[sS]hadow';

// ---------- tokenizer ----------

const CODE = 0;
/** A string that may hold classes: className, cn()/cva() arguments, class-list strings, CSS. */
const CLASS = 1;
/** A string that is not a class list: prose, other JSX attributes, text rendered as children. */
const TEXT = 2;
const COMMENT = 3;
const JSX_TEXT = 4;
const REGEX = 5;

const CLASS_HELPERS = new Set([
  'cn',
  'clsx',
  'cx',
  'cva',
  'tv',
  'twMerge',
  'twJoin',
  'classNames',
  'classnames',
]);
/** After these words an expression starts, so "/" opens a regex and "<" a JSX element. */
const EXPRESSION_WORDS = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'throw',
  'case',
  'do',
  'else',
  'yield',
  'await',
  'default',
]);
const ID_START = /[A-Za-z_$]/;
const ID = /[\w$]/;
const SPACE = /\s/;
const MAX_NESTING = 200;

/** Sentence punctuation, Markdown code or an apostrophe: a sentence, not a class list. */
const looksLikeProse = (text) =>
  /[A-Za-z0-9)\]][.,;:!?](?:\s|$)|`|[A-Za-z]\\?['’][A-Za-z]|\s[—–]\s/.test(text);

/**
 * Label every character of `src`. Not a parser: it follows strings, template literals, comments, regex literals and
 * JSX far enough to tell class lists from prose. Returns the labels, the JSX opening tags and the class-helper calls.
 * @param {string} src
 * @param {'jsx' | 'js' | 'css' | 'mdx'} mode
 */
function tokenize(src, mode) {
  const n = src.length;
  const kind = new Uint8Array(n);
  /** @type {Array<{ start: number, end: number, name: string, parent: any, selfClosing: boolean, closeStart: number }>} */
  const tags = [];
  /** @type {Array<[number, number]>} */
  const calls = [];
  const open = [];
  let i = 0;
  const mark = (a, b, k) => {
    if (b > a) kind.fill(k, a, b);
  };

  if (mode === 'css') {
    kind.fill(CLASS);
    for (const m of src.matchAll(/\/\*[\s\S]*?(?:\*\/|$)/g)) mark(m.index, m.index + m[0].length, COMMENT);
    return { kind, tags, calls };
  }
  const jsx = mode !== 'js';
  // Real code nests a few levels deep. Past MAX_NESTING the rest is left as code, so input crafted to nest thousands
  // of `${` or `{<` deep (the MCP check_ui_code tool takes code from anyone) can't overflow the stack.
  let depth = 0;
  const nested = (fn) => {
    if (depth >= MAX_NESTING) {
      i = n;
      return;
    }
    depth++;
    try {
      fn();
    } finally {
      depth--;
    }
  };

  const lineComment = () => {
    const e = src.indexOf('\n', i);
    const end = e === -1 ? n : e;
    mark(i, end, COMMENT);
    i = end;
  };
  const blockComment = () => {
    const e = src.indexOf('*/', i + 2);
    const end = e === -1 ? n : e + 2;
    mark(i, end, COMMENT);
    i = end;
  };

  /** A quoted string. JSX attribute strings may span lines and have no escapes. */
  function string(quote, k, jsxAttribute = false) {
    const start = i++;
    while (i < n) {
      const ch = src[i];
      if (ch === '\\' && !jsxAttribute) {
        i += 2;
        continue;
      }
      if (ch === quote) {
        i++;
        break;
      }
      if (ch === '\n' && !jsxAttribute) break;
      i++;
    }
    mark(start, i, k ?? (looksLikeProse(src.slice(start + 1, i - 1)) ? TEXT : CLASS));
  }

  function template(k) {
    const start = i++;
    const chunks = [];
    let from = i;
    while (i < n) {
      const ch = src[i];
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === '`') break;
      if (ch === '$' && src[i + 1] === '{') {
        chunks.push([from, i]);
        i += 2;
        code('}');
        from = i;
        continue;
      }
      i++;
    }
    chunks.push([from, Math.min(i, n)]);
    if (i < n) i++;
    const label = k ?? (looksLikeProse(chunks.map(([a, b]) => src.slice(a, b)).join(' ')) ? TEXT : CLASS);
    mark(start, start + 1, label);
    for (const [a, b] of chunks) mark(a, b, label);
    if (src[i - 1] === '`' && i - 1 > start) mark(i - 1, i, label);
  }

  /** A regex literal; false (and nothing consumed) when the "/" turns out to be division. */
  function regex() {
    const start = i;
    let j = i + 1;
    let inClass = false;
    while (j < n) {
      const ch = src[j];
      if (ch === '\\') {
        j += 2;
        continue;
      }
      if (ch === '\n') return false;
      if (inClass) {
        if (ch === ']') inClass = false;
      } else if (ch === '[') inClass = true;
      else if (ch === '/') {
        j++;
        while (j < n && /[a-z]/i.test(src[j])) j++;
        mark(start, j, REGEX);
        i = j;
        return true;
      }
      j++;
    }
    return false;
  }

  function isElementStart(at) {
    const ahead = src.slice(at, at + 160);
    const m = /^<(>|[A-Za-z_$][\w$.:-]*)\s*(\S)?/.exec(ahead);
    if (!m) return false;
    if (m[1] === '>') return true;
    // `<T,>(x) => …` and `<T extends U>` are type parameters, not elements.
    return m[2] !== ',' && !/^<[A-Za-z_$][\w$]*\s+extends\s/.test(ahead);
  }

  /**
   * Code until the unmatched `stop` bracket (consumed). In `textual` code (a JSX child expression), strings are text
   * that will be rendered, unless they are arguments to a class helper such as cn().
   */
  function code(stop = null, textual = false) {
    nested(() => codeUntil(stop, textual));
  }
  function codeUntil(stop, textual) {
    let expr = true;
    let word = null;
    let wordEnd = -1;
    const brackets = [];
    while (i < n) {
      const ch = src[i];
      if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') {
        i++;
        continue;
      }
      if (ch === '/' && src[i + 1] === '/') {
        lineComment();
        continue;
      }
      if (ch === '/' && src[i + 1] === '*') {
        blockComment();
        continue;
      }
      const asText = textual && !brackets.some((b) => b >= 0) ? TEXT : undefined;
      if (ch === '"' || ch === "'") {
        string(ch, asText);
        expr = false;
        continue;
      }
      if (ch === '`') {
        template(asText);
        expr = false;
        continue;
      }
      if (ch === '/' && expr && regex()) {
        expr = false;
        continue;
      }
      if (ch === '<' && jsx && expr && isElementStart(i)) {
        element();
        expr = false;
        continue;
      }
      if (ID_START.test(ch)) {
        const s = i;
        while (i < n && ID.test(src[i])) i++;
        word = src.slice(s, i);
        wordEnd = i;
        expr = src[s - 1] !== '.' && EXPRESSION_WORDS.has(word);
        continue;
      }
      if (ch >= '0' && ch <= '9') {
        while (i < n && /[\w.]/.test(src[i])) i++;
        expr = false;
        word = null;
        continue;
      }
      if (ch === '(' || ch === '[' || ch === '{') {
        const helper = ch === '(' && word !== null && wordEnd === i && CLASS_HELPERS.has(word);
        brackets.push(helper ? wordEnd - word.length : -1);
        i++;
        expr = true;
        word = null;
        continue;
      }
      if (ch === ')' || ch === ']' || ch === '}') {
        i++;
        word = null;
        if (!brackets.length) {
          if (ch === stop) return;
          expr = false;
          continue;
        }
        const helper = brackets.pop();
        if (helper >= 0) calls.push([helper, i]);
        expr = ch === '}';
        continue;
      }
      i++;
      expr = true;
      word = null;
    }
  }

  /** A JSX element from its "<": the opening tag, then its children up to the closing tag. */
  function element() {
    nested(elementAt);
  }
  function elementAt() {
    const start = i++;
    let s = i;
    while (i < n && /[\w$.:-]/.test(src[i])) i++;
    const tag = {
      start,
      end: n,
      name: src.slice(s, i),
      parent: open.at(-1) ?? null,
      selfClosing: false,
      closeStart: n,
    };
    tags.push(tag);
    while (i < n) {
      const ch = src[i];
      if (ch === '/' && src[i + 1] === '>') {
        i += 2;
        tag.end = i;
        tag.selfClosing = true;
        return;
      }
      if (ch === '>') {
        i++;
        tag.end = i;
        open.push(tag);
        tag.closeStart = children();
        open.pop();
        return;
      }
      if (ch === '{') {
        i++;
        code('}');
        continue;
      }
      if (ch === '/' && src[i + 1] === '/') {
        lineComment();
        continue;
      }
      if (ch === '/' && src[i + 1] === '*') {
        blockComment();
        continue;
      }
      if (ID_START.test(ch)) {
        s = i;
        while (i < n && /[\w$:.-]/.test(src[i])) i++;
        const attribute = src.slice(s, i);
        while (i < n && SPACE.test(src[i])) i++;
        if (src[i] !== '=') continue;
        i++;
        while (i < n && SPACE.test(src[i])) i++;
        const q = src[i];
        if (q === '"' || q === "'") string(q, /class/i.test(attribute) ? CLASS : TEXT, true);
        else if (q === '{') {
          i++;
          code('}');
        } else if (q === '<') element();
        continue;
      }
      i++;
    }
  }

  /** Children up to the closing tag (consumed); returns where the closing tag starts. */
  function children() {
    let from = i;
    while (i < n) {
      const ch = src[i];
      if (ch === '{') {
        mark(from, i, JSX_TEXT);
        i++;
        code('}', true);
        from = i;
        continue;
      }
      if (ch === '<' && /[A-Za-z_$>/]/.test(src[i + 1] ?? '')) {
        mark(from, i, JSX_TEXT);
        if (src[i + 1] === '/') {
          const close = i;
          const e = src.indexOf('>', i);
          i = e === -1 ? n : e + 1;
          return close;
        }
        element();
        from = i;
        continue;
      }
      // MDX: code blocks and inline code are examples, not UI code.
      if (mode === 'mdx' && ch === '`') {
        mark(from, i, JSX_TEXT);
        const fence = src.startsWith('```', i);
        const e = fence ? src.indexOf('\n```', i + 3) : src.indexOf('`', i + 1);
        const end = e === -1 ? n : fence ? e + 4 : e + 1;
        mark(i, end, COMMENT);
        i = end;
        from = i;
        continue;
      }
      i++;
    }
    mark(from, n, JSX_TEXT);
    return n;
  }

  if (mode === 'mdx') {
    while (i < n) children();
    // Markdown's own comments, where a directive can sit as it does in {/* */}.
    // Not inside a code span, which is already a comment: `<!--` there is an example, not the start of a comment.
    for (let at = src.indexOf('<!--'); at !== -1; at = src.indexOf('<!--', at + 4)) {
      if (kind[at] === COMMENT) continue;
      const close = src.indexOf('-->', at + 4);
      const end = close === -1 ? n : close + 3;
      mark(at, end, COMMENT);
      at = end - 4;
    }
  } else code();
  return { kind, tags, calls };
}

// ---------- helpers for rules ----------

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

/** The innermost JSX opening tag that contains `index`. */
function enclosingTag(ctx, index) {
  let found = null;
  for (const tag of ctx.tags) {
    if (tag.start > index) break;
    if (index < tag.end) found = tag;
  }
  return found;
}

/** The outermost class-helper call (cn, cva, clsx…) that contains `index`. */
function enclosingCall(ctx, index) {
  let found = null;
  for (const call of ctx.calls) {
    if (call[0] <= index && index < call[1] && (!found || call[0] < found[0])) found = call;
  }
  return found;
}

/** The run of characters around `index` that share its label: the string literal it sits in. */
function region(ctx, index) {
  const k = ctx.kind[index];
  let a = index;
  let b = index;
  while (a > 0 && ctx.kind[a - 1] === k) a--;
  while (b < ctx.kind.length && ctx.kind[b] === k) b++;
  return ctx.source.slice(a, b);
}

/** The class token around `index` up to it, with its variants: `[&_svg]:text-primary`. */
function classToken(source, index) {
  let a = index;
  while (a > 0 && !/[\s'"`{}]/.test(source[a - 1])) a--;
  return source.slice(a, index);
}

/** The whole class token around `index`. */
function wholeClassToken(source, index) {
  let b = index;
  while (b < source.length && !/[\s'"`{}]/.test(source[b])) b++;
  return classToken(source, index) + source.slice(index, b);
}

/**
 * An opening tag with the inside of every {expression} blanked, so an attribute only counts when it belongs to this
 * element: `onClick` inside render={<Button onClick={…} />} is not the div's. `spread` is true when the tag spreads
 * props ({...props}), which may carry any attribute.
 */
function topLevel(opening) {
  let top = '';
  let depth = 0;
  let quote = null;
  let spread = false;
  for (let i = 0; i < opening.length; i++) {
    const ch = opening[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '{') {
      if (depth === 0 && /^\{\s*\.\.\./.test(opening.slice(i))) spread = true;
      depth++;
      top += ch;
      continue;
    } else if (ch === '}') depth--;
    top += depth > 0 ? ' ' : ch;
  }
  return { top, spread };
}

const hasAttr = (top, names) => new RegExp(`(?<![\\w-])(?:${names})=`).test(top);

/** Icon libraries whose components are named after the picture (Trash2, ChevronDown), with no Icon suffix. */
const ICON_MODULE =
  /^(?:lucide-react|@radix-ui\/react-icons|@heroicons\/react(?:\/.*)?|react-icons(?:\/.*)?|@phosphor-icons\/react|@tabler\/icons-react)$/;

/**
 * An import with a clause, `import { A, B as C } from 'x'`: group 1 is the clause, group 2 the module. The clause starts
 * at a non-space and is bounded, so blank lines or an unfinished import cost linear time. Three whitespace matchers in
 * a row once made 2,000 blank lines take three seconds, on input the MCP check_ui_code tool takes from anyone.
 */
const IMPORT_STATEMENT = /import\s+(?:type\s+)?([^'";\s][^'";]{0,4000}?)\bfrom\s*['"]([^'"]+)['"]/g;

/** The JSX names a file imports from an icon library: `Trash2`, and `Icons` for `import * as Icons`. */
function iconImports(source) {
  const names = new Set();
  const namespaces = new Set();
  for (const m of source.matchAll(IMPORT_STATEMENT)) {
    if (!ICON_MODULE.test(m[2])) continue;
    const named = /\{([^}]*)\}/.exec(m[1]);
    for (const part of named?.[1].split(',') ?? []) {
      const local = part
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)
        .at(-1);
      if (local && /^[A-Z]\w*$/.test(local)) names.add(local);
    }
    const namespace = /\*\s+as\s+(\w+)/.exec(m[1]);
    if (namespace) namespaces.add(namespace[1]);
  }
  return { names, namespaces };
}

const NAME_ATTRIBUTE = /\b(?:aria-label|aria-labelledby|title)=/;
/**
 * Elements that render a button: <button>, <Button>, <IconButton>, <Dialog.Close>. Not triggers: a select or combobox
 * trigger takes its name from the Field label around it.
 */
const BUTTON_TAG = /^(?:button|(?:[A-Z]\w*\.)*(?:[A-Z]\w*)?(?:Button|Close))$/;
/** Self-closing components that render text, so they name a button: <SelectValue />, <FormattedMessage />. */
const TEXT_COMPONENT =
  /^(?:FormattedMessage|FormattedNumber|FormattedDate|FormattedTime|Trans|Translate|T|[\w.]*(?:Value|Label|Text|Title))$/;

const stripJsxComments = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

/** Props an icon takes. A component with any other prop (<RunName id={id} />) may render text. */
const ICON_PROPS =
  /^(?:className|size|strokeWidth|absoluteStrokeWidth|color|width|height|fill|stroke|aria-hidden|focusable|data-[\w-]+)$/;

/**
 * Whether a self-closing component is an icon: named *Icon, imported from an icon library (Trash2, Icons.Trash2), or,
 * when the file does not say where it comes from, a bare component with only the props an icon takes (<Trash2 />).
 */
function isIcon(name, tag, icons) {
  if (name.endsWith('Icon') || icons.names.has(name) || icons.namespaces.has(name.split('.')[0])) return true;
  if (TEXT_COMPONENT.test(name)) return false;
  const local = name.split('.')[0];
  if (icons.imported.has(local)) return false;
  const props = [...topLevel(tag).top.matchAll(/(?<![\w-])([A-Za-z][\w-]*)(?==)/g)].map((m) => m[1]);
  return props.every((p) => ICON_PROPS.test(p));
}

/** The names a file imports from anywhere, to tell an unknown component from one whose source is known. */
const importedNames = (source) =>
  new Set(
    [...source.matchAll(IMPORT_STATEMENT)].flatMap((m) =>
      [...m[1].matchAll(/(?:\bas\s+)?\b([A-Z]\w*)\b(?!\s+as\b)/g)].map((n) => n[1]),
    ),
  );

/**
 * True when `inner` is nothing but icons: one or more inline <svg> (self-closing or with its shapes) or self-closing
 * icon components. An <svg> with a <title> or its own aria-label names the button, so it is not an icon here.
 */
function iconOnly(inner, known) {
  let rest = stripJsxComments(inner).trim();
  let icons = 0;
  while (rest) {
    if (/^<svg[\s/>]/.test(rest)) {
      const open = tagEnd(rest, 1);
      if (open === -1 || /\baria-label(?:ledby)?=/.test(topLevel(rest.slice(0, open + 1)).top)) return false;
      if (rest[open - 1] === '/') {
        rest = rest.slice(open + 1).trim();
      } else {
        const e = rest.indexOf('</svg>');
        if (e === -1 || /<title[\s>]/.test(rest.slice(open, e))) return false;
        rest = rest.slice(e + 6).trim();
      }
    } else {
      const m = /^<([A-Z][\w.]*)/.exec(rest);
      if (!m) return false;
      const end = tagEnd(rest, 1);
      if (end === -1 || rest[end - 1] !== '/' || !isIcon(m[1], rest.slice(0, end + 1), known)) return false;
      rest = rest.slice(end + 1).trim();
    }
    icons++;
  }
  return icons > 0;
}

/**
 * Visible or screen-reader text in `inner`, outside tags. An {expression} child counts: it may well be the label
 * ({label}, {t('delete')}), and the check cannot tell.
 */
function hasText(inner) {
  const rest = stripJsxComments(inner);
  let text = '';
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '<') {
      const e = tagEnd(rest, i + 1);
      if (e === -1) break;
      i = e;
    } else if (rest[i] === '{') return true;
    else text += rest[i];
  }
  return /[\p{L}\p{N}]/u.test(text);
}

/** Buttons with no accessible name: icon-only content, or an icon-size Button with no text, and no aria-label. */
function unnamedIconButtons(ctx) {
  const found = [];
  const icons = { ...iconImports(ctx.source), imported: importedNames(ctx.source) };
  for (const tag of ctx.tags) {
    if (!BUTTON_TAG.test(tag.name)) continue;
    const opening = ctx.source.slice(tag.start, tag.end);
    // The whole tag, expressions included: a name on the element it renders as
    // (render={<a href="…" aria-label="Repository" />}) names the button too.
    if (NAME_ATTRIBUTE.test(opening)) continue;
    const { top, spread } = topLevel(opening);
    // A spread can carry the name in (a wrapper passing {...props} through).
    if (spread) continue;
    const iconSize = /(?<![\w-])size=["']icon/.test(top) || /(?<![\w-])size=\{\s*["'`]icon/.test(opening);
    const inner = tag.selfClosing ? '' : ctx.source.slice(tag.end, tag.closeStart);
    if (iconSize ? !hasText(inner) : !tag.selfClosing && iconOnly(inner, icons))
      found.push({ index: tag.start, text: opening });
  }
  return found;
}

/**
 * JSX opening tags named `name` that `test` flags, as findings. `test` gets the tag's own attributes (`top`, with
 * expressions blanked), whether it spreads props, the tag's text and the source before it.
 */
const tagsWhere = (name, test) => (ctx) =>
  ctx.tags
    .filter((tag) => {
      if (!name.test(tag.name)) return false;
      const opening = ctx.source.slice(tag.start, tag.end);
      return test({ ...topLevel(opening), opening, before: ctx.source.slice(0, tag.start), ctx });
    })
    .map((tag) => ({ index: tag.start, text: ctx.source.slice(tag.start, tag.end) }));

/** Whether the text before a point leaves a <name> element open, optionally one that already contains `inner`. */
function insideOpen(before, name, inner) {
  const open = [...before.matchAll(new RegExp(`<${name}[\\s>]`, 'g'))].at(-1)?.index ?? -1;
  if (open === -1 || before.lastIndexOf(`</${name}>`) > open) return false;
  return inner ? inner.test(before.slice(open)) : true;
}

/**
 * An input whose placeholder is its only label. It is named another way when it has aria-label or aria-labelledby,
 * sits inside a <Field> with a <FieldLabel> or inside a <label>, or has an id that a <label htmlFor> in the file points
 * at (an id built from an expression could be pointed at from anywhere, so it is trusted).
 */
function placeholderOnly({ top, spread, before, ctx }) {
  if (spread || !hasAttr(top, 'placeholder') || hasAttr(top, 'aria-label|aria-labelledby')) return false;
  if (/(?<![\w-])type=["'](?:hidden|submit|button|reset)["']/.test(top)) return false;
  const id = /(?<![\w-])id=(?:"([^"]*)"|'([^']*)'|(\{))/.exec(top);
  if (id) {
    if (id[3]) return false;
    const value = (id[1] ?? id[2]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`htmlFor=(?:["']|\\{\\s*["'\`])${value}["'\`]`).test(ctx.source)) return false;
  }
  return !(insideOpen(before, 'Field', /<(FieldLabel|label)\b/) || insideOpen(before, 'label'));
}

/** text-* utilities that set size, alignment or wrapping rather than color. */
const TEXT_NOT_COLOR =
  /^(?:caption|label|body|callout|prose|headline|title-[123]|large-title|display|hero|xs|sm|base|lg|\d?xl|left|right|center|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip|\[.*\])$/;

/**
 * `text-destructive-foreground` (and success, warning, info) is the status color as text on a card. On a solid
 * `bg-destructive` fill the two are the same hue: about 2:1. Agents reach for the pair because shadcn names its
 * on-fill text that way. Within one class string, each fill is checked against the text color that applies in the
 * same state: `hover:bg-destructive` meets `hover:text-…` if there is one, else the plain text color. A light tint
 * (bg-destructive/15, the badge) is fine.
 */
function statusTextOnFill(ctx) {
  const found = [];
  for (const s of ctx.source.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
    if (ctx.kind[s.index] !== CLASS) continue;
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

const FOCUS_TREATMENT =
  /focus-visible:|focus-within:|focus:|data-highlighted|data-focused|has-\[[^\]]*focus|has-focus|group-focus|peer-focus|focus-within-ring|\bdata-focus=/;
const PARENT_FOCUS = /focus-within|has-\[[^\]]*focus|has-focus/;

/**
 * True when the element this outline-none belongs to has no focus treatment of its own: not in its tag (classes,
 * data-focus), not in the cn()/cva() call it is part of, and not on a parent that shows focus-within.
 */
function outlineWithoutFocus(m, ctx) {
  const tag = enclosingTag(ctx, m.index);
  if (tag) {
    // Base UI positioners are never focused; popups pass focus to an item, which shows the highlight.
    if (/(?:^|\.)(?:Positioner|Popup)$/.test(tag.name)) return false;
    if (FOCUS_TREATMENT.test(ctx.source.slice(tag.start, tag.end))) return false;
    for (let p = tag.parent; p; p = p.parent)
      if (PARENT_FOCUS.test(ctx.source.slice(p.start, p.end))) return false;
    return true;
  }
  const call = enclosingCall(ctx, m.index);
  return !FOCUS_TREATMENT.test(call ? ctx.source.slice(call[0], call[1]) : region(ctx, m.index));
}

/** text-primary on an icon is fine (icons need 3:1, and the accent is the point); as text it is not. */
function primaryAsText(m, ctx) {
  if (/svg/.test(classToken(ctx.source, m.index))) return false;
  const tag = enclosingTag(ctx, m.index);
  if (!tag) return true;
  return !(
    /(?:^|\.)svg$|Icon$/.test(tag.name) || /\baria-hidden\b/.test(ctx.source.slice(tag.start, tag.end))
  );
}

/** How far a color's context is read around it: enough for any real attribute or declaration, and a bound on work. */
const NEAR = 200;

/** The string or template text around `index` that shares its label: NEAR characters before it, 40 after. */
function runAround(ctx, index) {
  const k = ctx.kind[index];
  let a = index;
  const start = Math.max(0, index - NEAR);
  while (a > start && ctx.kind[a - 1] === k) a--;
  let b = index;
  const end = Math.min(ctx.source.length, index + 40);
  while (b < end && ctx.kind[b] === k) b++;
  return ctx.source.slice(a, b);
}

/** The whitespace- and quote-delimited word before `index`, at most NEAR characters: `url(/hero.png)` or `bg-[`. */
function wordBefore(source, index) {
  let a = index;
  const stop = Math.max(0, index - NEAR);
  while (a > stop && !/[\s'"`{}]/.test(source[a - 1])) a--;
  return source.slice(a, index);
}

/**
 * Whether `index` sits inside the value of an href or src attribute that starts within NEAR characters:
 * href="#faced", href={open ? "#cafe" : "#feed"}, href={`/docs/${slug}#add`}. A class after the value has closed is
 * not inside it: <Link href="/runs" className="bg-[#0070f3]">.
 */
function inLinkValue(source, index) {
  const from = Math.max(0, index - NEAR);
  const before = source.slice(from, index);
  const attr = /\b(?:href|src)=(?=["'{])/g;
  let last = -1;
  for (let m = attr.exec(before); m; m = attr.exec(before)) last = m.index + m[0].length;
  if (last === -1) return false;
  const open = before[last];
  if (open !== '{') return !before.slice(last + 1).includes(open);
  let depth = 0;
  for (const ch of before.slice(last)) {
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return false;
  }
  return true;
}

/** CSS around a color: a declaration, a function, a length (also right after a ${} interpolation) or a keyword. */
const CSS_NEARBY =
  /[:;(]|(?:^|\d|\})(?:px|rem|em|%|deg|vh|vw)|\b(?:solid|dashed|dotted|double|wavy|inset|underline|overline|color|background|border|fill|stroke|shadow|outline|gradient)\b/i;

/**
 * A hex or color function in a string is a color unless the # starts a reference:
 * - a number after a word, in a string with no CSS: "Run #482", "Issue #1024" (a hex with letters, #f00, is a color);
 * - a link or asset: href="#faced", src="/icons.svg#add", url(#clip), url(/hero.png);
 * - a selector: querySelector('#feed');
 * - an SVG gradient stop in markup or CSS, stop-color="#fff" (as before; React's stopColor is still checked).
 * Each test reads at most NEAR characters around the match, so checking stays linear on hostile input.
 */
function colorInString(m, ctx) {
  const at = m.index;
  const word = wordBefore(ctx.source, at);
  if (word.lastIndexOf('url(') > word.lastIndexOf(')') || /\.(?:svg|png)\b/.test(word)) return false;
  if (inLinkValue(ctx.source, at)) return false;
  if (/stop-color\s*[=:]\s*["']?$/.test(ctx.source.slice(Math.max(0, at - 24), at))) return false;
  const opensString = /["'`]/.test(ctx.source[at - 1] ?? '') && ctx.kind[at - 1] === ctx.kind[at];
  const lead = ctx.source.slice(Math.max(0, at - 41), at - 1);
  if (opensString && /(?:querySelector(?:All)?|getElementById|closest|matches)\s*\(\s*$/.test(lead))
    return false;
  if (!/^#\d+$/.test(m[0]) || !/[A-Za-z] $/.test(ctx.source.slice(Math.max(0, at - 2), at))) return true;
  return CSS_NEARBY.test(runAround(ctx, at));
}

/** UI motion is 120–240 ms, and 400 ms for toasts and sheets (DESIGN.md, Motion). Nothing else is on the scale. */
const offScale = (ms) => ms > 240 && ms !== 400;
const toMs = (value, unit) => Number(value) * (unit === 's' ? 1000 : 1);

/** The first duration of each transition in a `transition` or `transition-duration` value. */
function slowTransition(m) {
  return m[1].split(',').some((part) => {
    const t = /(\d*\.?\d+)(ms|s)(?![\w-])/.exec(part);
    return t !== null && offScale(toMs(t[1], t[2]));
  });
}

/** Directives need a reason, before or after them in the same comment. */
function directiveHasReason(line, at, length, fileDirective) {
  const before = line.slice(0, at);
  const opener = Math.max(before.lastIndexOf('//'), before.lastIndexOf('/*'));
  const head = opener === -1 ? '' : before.slice(opener + 2);
  let tail = line.slice(at + length);
  const closer = tail.indexOf('*/');
  if (closer !== -1) tail = tail.slice(0, closer);
  // In `dtheo-check-disable-file raw-color -- why`, the words before "--" are rule ids, not the reason.
  if (fileDirective) tail = tail.includes('--') ? tail.slice(tail.indexOf('--') + 2) : '';
  return /[\p{L}]{2,}/u.test(`${head} ${tail}`);
}

/**
 * The rule ids a `dtheo-check-disable-file` directive names, before its "--": none means every rule. Every word there
 * counts, so a misspelled id ("Raw-Color", "raw-colour") is reported as unknown instead of disabling every rule.
 */
const disabledRuleIds = (rest) =>
  rest
    .split('--')[0]
    .replace(/\*\/\s*\}?|-->/g, ' ')
    .split(/[\s,]+/)
    .filter(Boolean);

/**
 * Directives in comments (one quoted in a string is not a directive) with no reason, and file directives that name a
 * rule that doesn't exist, which would switch nothing off. disable-file counts in the first 12 lines, where it acts.
 */
function bareDirectives(ctx) {
  const found = [];
  ctx.lines.forEach((line, li) => {
    for (const m of line.matchAll(/dtheo-check-(ignore-next-line|ignore|disable-file)(?![\w-])/g)) {
      if (ctx.kind[ctx.lineStarts[li] + m.index] !== COMMENT) continue;
      const file = m[1] === 'disable-file';
      if (file && li >= 12) continue;
      const unknown =
        file && disabledRuleIds(line.slice(m.index + m[0].length)).some((id) => !ruleIds.has(id));
      if (unknown || !directiveHasReason(line, m.index, m[0].length, file))
        found.push({ index: ctx.lineStarts[li] + m.index, text: line.trim().slice(0, 120) });
    }
  });
  return found;
}

/** @typedef {{ rule: string, severity: 'error' | 'warning', line: number, column: number, message: string, fix: string, excerpt: string }} Finding */

/**
 * Each pattern says where it applies:
 * - `class`: class lists (className and other *class* attributes, cn()/cva()/clsx() strings, class-like strings, CSS)
 * - `string`: any string literal or CSS, never comments or JSX text
 * - `code`: code and strings (style objects, CSS declarations), never comments or JSX text
 * Rules about elements (`find`) read the JSX tags the tokenizer found, so a tag quoted in a string is not one.
 */
const rules = [
  {
    id: 'raw-color',
    severity: 'error',
    patterns: [
      {
        in: 'string',
        re: /(?<![A-Za-z0-9-])(?:#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(|oklab\()/g,
        accept: colorInString,
      },
      // Named colors inside arbitrary values: bg-[red], shadow-[0_0_0_1px_red]. Not masks, where black and white
      // are alpha: mask-[linear-gradient(to_bottom,black,transparent)].
      {
        in: 'class',
        re: new RegExp(`\\[(?:[^\\]\\s'"]*[_:,(])?(?:${NAMED_COLORS})(?=[_)\\],])`, 'g'),
        accept: (m, ctx) => !/mask/.test(wholeClassToken(ctx.source, m.index)),
      },
      // Named colors in style objects and CSS: style={{ color: 'red' }}, border: 1px solid red.
      {
        in: 'code',
        re: new RegExp(
          `(?<![\\w-])(?:${COLOR_PROPS})\\s*:\\s*(['"\`]?)(?:[^'"\`;\\n{}]*?[\\s,(])?(?:${NAMED_COLORS})(?![\\w-])`,
          'g',
        ),
        // In JavaScript the value must be a string: `color: red` there is a variable.
        accept: (m, ctx) => m[1] !== '' || ctx.kind[m.index] !== CODE,
      },
    ],
    message: 'Raw color in UI code: a hex, rgb(), oklch() or named color such as red.',
    fix: 'Use a token class (bg-card, text-muted-foreground, border-border, text-destructive-foreground) so themes, presets and dark mode keep working.',
  },
  {
    id: 'palette-color',
    severity: 'error',
    patterns: [
      {
        in: 'class',
        re: new RegExp(
          `\\b(?:bg|text|border|ring|fill|stroke|outline|from|to|via|divide|placeholder|decoration|shadow)-(?:${PALETTE})-\\d{2,3}\\b`,
          'g',
        ),
      },
    ],
    message:
      'Tailwind palette color: dtheo/ui themes only define semantic colors, so this class has no effect.',
    fix: 'Pick the role, not the hue: bg-primary, bg-secondary, text-success-foreground, bg-warning/15, border-border-strong.',
  },
  {
    id: 'raw-white-black',
    severity: 'error',
    patterns: [
      {
        in: 'class',
        re: /(?<![\w-])(?:(?:bg|border|ring|fill|stroke|from|to|via|divide|outline|decoration|shadow)-(?:white|black)|text-black)(?![\w-])/g,
      },
    ],
    message: 'White and black do not change with the theme: a bg-white card is a white hole in dark mode.',
    fix: 'Use a role: bg-card, bg-background, bg-foreground/15 for a translucent fill. text-white is fine on saturated fills such as bg-destructive.',
  },
  {
    id: 'primary-text',
    severity: 'warning',
    patterns: [{ in: 'class', re: /(?<![\w-])text-primary(?![\w-])/g, accept: primaryAsText }],
    message:
      'text-primary is the button fill, not a text color: as text it falls below 4.5:1 in dark mode (3.7:1 in Graphite).',
    fix: 'Use text-link for blue text and links. On a decorative icon text-primary is fine: mark the icon aria-hidden="true".',
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
    id: 'text-size-token',
    severity: 'error',
    patterns: [{ in: 'class', re: /(?<![\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl)(?![\w-])/g }],
    message:
      "Tailwind's default type scale: not a dtheo/ui role, so size, line height and tracking stop matching the system.",
    fix: 'Use a type role: text-body (13) for UI text, text-label (12) or text-caption (11) for small text, text-callout (14), text-headline, text-title-3/2/1 for headings, text-large-title or text-display for heroes.',
  },
  {
    id: 'radius-token',
    severity: 'error',
    patterns: [
      {
        in: 'class',
        re: /(?<![\w-])rounded(?:-(?:t|r|b|l|s|e|tl|tr|br|bl|ss|se|es|ee))?-(?:xs|sm|md|lg|xl|2xl|3xl|4xl)(?![\w-])/g,
      },
    ],
    message: "Tailwind's default radius: not a dtheo/ui token, so nested corners stop lining up.",
    fix: 'Use rounded-control (6), rounded-popover (8), rounded-card (10) or rounded-dialog (12); rounded-item and rounded-inset for corners nested inside them; rounded-full for pills.',
  },
  {
    id: 'arbitrary-radius',
    severity: 'warning',
    patterns: [
      {
        in: 'class',
        re: /(?<![\w-])rounded(?:-(?:t|r|b|l|s|e|tl|tr|br|bl|ss|se|es|ee))?-\[\d+(?:\.\d+)?(?:px|rem)\]/g,
      },
    ],
    message: 'Off-scale corner radius.',
    fix: 'Use a radius token, or derive from one: rounded-[calc(var(--radius-control)-2px)].',
  },
  {
    id: 'arbitrary-text-size',
    severity: 'warning',
    patterns: [{ in: 'class', re: /\btext-\[\d+(?:\.\d+)?(?:px|rem|em)\]/g }],
    message: 'Arbitrary font size.',
    fix: 'Use a type role: text-caption (11), text-label (12), text-body (13), text-callout (14), text-headline (15), text-title-3/2/1.',
  },
  {
    id: 'arbitrary-spacing',
    severity: 'warning',
    patterns: [
      {
        in: 'class',
        re: /\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-\[\d+(?:\.\d+)?px\]/g,
      },
    ],
    message: 'Off-scale spacing value.',
    fix: 'Use the 4px scale (p-3 = 12px, gap-1.5 = 6px). If the design truly needs a new step, add it to the tokens.',
  },
  {
    id: 'transition-all',
    severity: 'error',
    patterns: [
      { in: 'class', re: /(?<![\w-])transition-all(?![\w-])/g },
      // style={{ transition: 'all 300ms' }}, transitionProperty: 'all', CSS transition: all.
      { in: 'code', re: /(?<![\w-])transition(?:-property|Property)?\s*:\s*['"`]?\s*all(?![\w-])/g },
    ],
    message: '`transition: all` animates properties nobody meant to animate, including layout.',
    fix: 'Name the properties: transition-[scale,opacity] duration-200 ease-out, or transition-colors.',
  },
  {
    id: 'motion-duration',
    severity: 'warning',
    patterns: [
      {
        in: 'class',
        re: /(?<![\w-])duration-(\d+(?:\.\d+)?)(?![\w.%-])/g,
        accept: (m) => offScale(Number(m[1])),
      },
      {
        in: 'class',
        re: /(?<![\w-])duration-\[(\d*\.?\d+)(ms|s)\]/g,
        accept: (m) => offScale(toMs(m[1], m[2])),
      },
      {
        in: 'code',
        re: /(?<![\w-])transition(?:-duration|Duration)?\s*:\s*['"`]?([^'"`;{}]*)/g,
        accept: slowTransition,
      },
    ],
    message: 'Slower than the motion scale: long transitions make the interface feel sluggish.',
    fix: 'UI motion runs 120–240 ms: duration-120 for presses, 150 for hover, 180 for popovers, 240 for dialogs. Only toasts and drawers take 400.',
  },
  {
    id: 'scale-zero',
    severity: 'error',
    patterns: [
      { in: 'class', re: /(?<![\w-])scale-0(?![\w.-])/g },
      { in: 'string', re: /scale\(\s*0\s*(?:,\s*0\s*)?\)/g },
      // Motion values: initial={{ scale: 0 }}, scale: [0, 1]; and CSS scale: 0.
      { in: 'code', re: /(?<![\w-])scale\s*:\s*\[?\s*['"]?0(?![\w.%])/g },
    ],
    message: 'Entering from scale(0) looks like it appears from nowhere.',
    fix: 'Start from scale-96 (scale: 0.96) with opacity-0.',
  },
  {
    id: 'ease-in',
    severity: 'warning',
    patterns: [
      { in: 'class', re: /\bease-in\b(?!-out)/g },
      { in: 'string', re: /cubic-bezier\(0?\.4,\s*0,\s*1,\s*1\)/g },
    ],
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
    find: tagsWhere(/^img$/, ({ top, spread }) => !spread && !hasAttr(top, 'alt')),
    message: 'Image without alt text.',
    fix: 'Describe the image, or use alt="" if it is decorative.',
  },
  {
    id: 'clickable-div',
    severity: 'error',
    find: tagsWhere(/^(?:div|span)$/, ({ top }) => hasAttr(top, 'onClick')),
    message:
      'Click handler on a non-interactive element: unreachable by keyboard and invisible to screen readers.',
    fix: 'Use <Button> (or a link for navigation).',
  },
  {
    id: 'outline-none',
    severity: 'warning',
    patterns: [{ in: 'class', re: /\boutline-none\b/g, accept: outlineWithoutFocus }],
    message: 'Focus outline removed without a visible replacement.',
    fix: 'Keep the default focus ring, or add focus-visible:ring-3 focus-visible:ring-ring/25 to the same element.',
  },
  {
    id: 'raw-html',
    severity: 'warning',
    patterns: [{ in: 'code', re: /dangerouslySetInnerHTML/g }],
    message: 'Raw HTML injection. If the content comes from users, data or an LLM, this is an XSS risk.',
    fix: 'Render text as children. If you must render HTML, sanitize it first.',
  },
  {
    id: 'z-index',
    severity: 'warning',
    patterns: [{ in: 'class', re: /\bz-\[\d{3,}\]/g }],
    message: 'Arbitrary z-index escalation.',
    fix: 'Overlays already stack via portals at z-50. Fix the stacking context instead of raising the number.',
  },
  {
    id: 'placeholder-as-label',
    severity: 'warning',
    find: tagsWhere(/^(?:Input|input)$/, placeholderOnly),
    message: 'Input with a placeholder but no label: the placeholder disappears as soon as someone types.',
    fix: 'Wrap it in <Field> with a <FieldLabel>, or add aria-label.',
  },
  {
    id: 'ignore-reason',
    severity: 'error',
    find: bareDirectives,
    message:
      'Check directive without a reason, or naming a rule that does not exist: an exception nobody can review.',
    fix: 'Say why, and name rules that `dtheo rules` lists: // dtheo-check-ignore-next-line (the knob is white in both modes), or // dtheo-check-disable-file raw-color -- why.',
  },
];

const CONTEXTS = {
  class: (k) => k === CLASS,
  string: (k) => k === CLASS || k === TEXT,
  code: (k) => k === CODE || k === CLASS || k === TEXT,
};

/** @param {string} [file] */
function modeFor(file) {
  const ext = /\.(\w+)$/.exec(file ?? '')?.[1];
  if (ext === 'css') return 'css';
  if (ext === 'mdx' || ext === 'md') return 'mdx';
  if (['ts', 'mts', 'cts', 'mjs', 'cjs'].includes(ext)) return 'js';
  return 'jsx';
}

/**
 * @param {string} source
 * @param {{ file?: string }} [options]
 * @returns {Finding[]}
 */
export function checkSource(source, options = {}) {
  const findings = [];
  const isTokenFile = /tokens?\.(css|ts|json)$|theme\.css$|dtheo\.css$/.test(options.file ?? '');
  const lines = source.split('\n');
  const lineStarts = [0];
  for (let i = 0; i < source.length; i++) if (source[i] === '\n') lineStarts.push(i + 1);
  // A line's excerpt is made once, however many findings it has: a 60,000-character line can hold thousands.
  const excerpts = new Map();
  const lineExcerpt = (li) => {
    if (!excerpts.has(li))
      excerpts.set(li, lines[li].trim().slice(0, 480).replace(/\s+/g, ' ').slice(0, 120));
    return excerpts.get(li);
  };
  const lineOf = (index) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  const ctx = { source, lines, lineStarts, ...tokenize(source, modeFor(options.file)) };

  // Directives count only in comments: a string that quotes one excuses nothing.
  const inComment = (index) => ctx.kind[index] === COMMENT;
  // `dtheo-check-disable-file raw-color, ease-in -- reason` (or with no ids, every rule) near the top of a file.
  const directive = [...source.matchAll(/dtheo-check-disable-file\b([^\n]*)/g)].find(
    (m) => inComment(m.index) && lineOf(m.index) < 12,
  );
  const disabledIds = directive ? disabledRuleIds(directive[1]) : null;
  const disabled = (id) => directive !== undefined && (disabledIds.length === 0 || disabledIds.includes(id));
  const ignoreLines = new Set();
  const ignoreNextLines = new Set();
  for (const m of source.matchAll(/dtheo-check-ignore(-next-line)?(?![\w-])/g))
    if (inComment(m.index)) (m[1] ? ignoreNextLines : ignoreLines).add(lineOf(m.index));
  const ignored = (i) => ignoreLines.has(i) || ignoreNextLines.has(i - 1);

  for (const rule of rules) {
    // A directive cannot excuse itself.
    const meta = rule.id === 'ignore-reason';
    if (!meta && disabled(rule.id)) continue;
    if (isTokenFile && (rule.id === 'raw-color' || rule.id === 'palette-color')) continue;
    const hits = new Map();
    for (const p of rule.patterns ?? []) {
      for (const m of source.matchAll(p.re)) {
        if (hits.has(m.index) || !CONTEXTS[p.in](ctx.kind[m.index])) continue;
        if (p.accept && !p.accept(m, ctx)) continue;
        hits.set(m.index, null);
      }
    }
    for (const f of rule.find?.(ctx) ?? []) if (!hits.has(f.index)) hits.set(f.index, f.text);
    for (const [index, text] of hits) {
      const li = lineOf(index);
      if (!meta && (ignored(li) || rule.contextSkip?.(source.slice(0, index)))) continue;
      findings.push({
        rule: rule.id,
        severity: rule.severity,
        line: li + 1,
        column: index - lineStarts[li] + 1,
        message: rule.message,
        fix: rule.fix,
        excerpt: text == null ? lineExcerpt(li) : text.replace(/\s+/g, ' ').slice(0, 120),
      });
    }
  }
  return findings.sort((a, b) => a.line - b.line || a.column - b.column);
}

export const ruleList = rules.map(({ id, severity, message, fix }) => ({ id, severity, message, fix }));
const ruleIds = new Set(rules.map((r) => r.id));
