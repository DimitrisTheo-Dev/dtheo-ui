import 'server-only';
import { components } from '@dtheo/ui/meta';
import { checkRulesMarkdown, foundationMarkdown } from './markdown';
import { foundations, getStarted, patterns, type NavItem } from './nav';
import { pagesMarkdown } from './pages-md';
import { site } from './site';
import { docsPath } from './paths';

/**
 * Ranked search for the MCP server's search_docs: plain-English questions in, the pages that answer them out.
 * Words are compared whole (so "text" does not match "textarea"), common words are dropped, plurals and verb
 * endings are folded, and a word counts for more in a title than in the body and when few pages use it.
 */

const stopwords = new Set(
  `a an and any are as at be by can could do does for from get give has have how i if in into is it its just
  me my need of on or our please show so some than that the their them then there these this those to up us
  use using want we what when where which who why will with without would you your
  find look looking build make add against built react component components`.split(/\s+/),
);

/** Fold plurals and common endings, so "limits", "checked" and "checking" meet "limit" and "check". */
export function stem(word: string) {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith('ed')) return word.slice(0, -2);
  if (word.length > 4 && /(?:ss|x|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/** Lowercase words of letters and digits; `text-muted-foreground` is three words, `check_ui_code` three more. */
const words = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

export const tokenize = (text: string) => words(text).map(stem);

export interface SearchDoc {
  title: string;
  url: string;
  /** One line: what the page is for. */
  description: string;
  /** Names and keywords: the slug, aliases, exports, the words people search for. */
  keys: string;
  /** What it is and when to use it. */
  lead: string;
  body: string;
}

const weights = { title: 8, keys: 5, lead: 3, body: 1 } as const;
type Field = keyof typeof weights;

const navFor = (href: string, items: NavItem[]) => items.find((i) => i.href === href);

function corpus(): SearchDoc[] {
  const docs: SearchDoc[] = components.map((c) => {
    const page = docsPath(c);
    return {
      title: c.title,
      url: `${site.url}${page}.md`,
      description: c.description,
      keys: [c.slug, ...(c.aliases ?? []), ...c.exports, c.primitive ?? ''].join(' '),
      lead: [c.description, ...c.use, c.category, c.primitive ? `Built on Base UI ${c.primitive}` : ''].join(
        ' ',
      ),
      // What to use instead mentions other components by name, so it only counts as body text.
      body: [
        ...(c.avoid ?? []),
        ...(c.props ?? []).map((p) => `${p.name} ${p.type} ${p.description}`),
        ...(c.keyboard ?? []).map(([k, a]) => `${k} ${a}`),
        ...(c.a11y ?? []),
      ].join(' '),
    };
  });
  for (const [key, markdown] of Object.entries(pagesMarkdown)) {
    const href = key === 'index' ? '/docs' : `/docs/${key}`;
    const nav = navFor(href, [...getStarted, ...patterns]);
    const title = markdown.split('\n')[0]!.replace(/^# /, '');
    docs.push({
      title,
      url: `${site.url}/docs/${key}.md`,
      description: nav?.description ?? markdown.match(/^> (.+)$/m)?.[1] ?? title,
      keys: (nav?.keywords ?? []).join(' '),
      lead: nav?.description ?? '',
      body: markdown,
    });
  }
  for (const nav of foundations) {
    const slug = nav.href.split('/').pop()!;
    docs.push({
      title: nav.title,
      url: `${site.url}${nav.href}.md`,
      description: nav.description ?? nav.title,
      keys: (nav.keywords ?? []).join(' '),
      lead: nav.description ?? '',
      body: foundationMarkdown(slug) ?? '',
    });
  }
  docs.push({
    title: 'Design check rules',
    url: `${site.url}/docs/check-rules.md`,
    description: `Every rule \`npx ${site.cli} check\` and check_ui_code apply to React and Tailwind code, with its fix.`,
    keys: 'design check rules lint linter check_ui_code',
    lead: 'What the design check finds in React, Tailwind, JSX and TSX code, and how to fix each finding.',
    body: checkRulesMarkdown(),
  });
  return docs;
}

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  score: number;
}

/** The best pages for a query, most relevant first. */
export function searchDocs(query: string, limit = 8): SearchResult[] {
  const asked = words(query);
  const kept = asked.filter((w) => !stopwords.has(w));
  // A query made only of common words ("components") still means something; search for those words then.
  const terms = [...new Set((kept.length ? kept : asked).map(stem))];
  if (!terms.length) return [];

  const docs = corpus().map((doc) => {
    const fields = {} as Record<Field, Map<string, number>>;
    for (const field of Object.keys(weights) as Field[]) {
      const counts = new Map<string, number>();
      for (const word of tokenize(doc[field])) counts.set(word, (counts.get(word) ?? 0) + 1);
      fields[field] = counts;
    }
    return { doc, fields };
  });
  // Words few pages use say more about a page than words every page uses.
  const idf = new Map(
    terms.map((t) => {
      const df = docs.filter(({ fields }) => Object.values(fields).some((f) => f.has(t))).length;
      return [t, Math.log(1 + docs.length / Math.max(1, df))];
    }),
  );

  return docs
    .map(({ doc, fields }) => {
      let score = 0;
      let matched = 0;
      for (const t of terms) {
        const best = Math.max(
          ...(Object.keys(weights) as Field[]).map((f) => (fields[f].has(t) ? weights[f] : 0)),
        );
        if (!best) continue;
        matched++;
        // Repeats in the body add a little, never as much as one mention in the title.
        const repeats = Math.min(2, Math.log2(fields.body.get(t) ?? 1));
        score += idf.get(t)! * (best + repeats * 0.5);
      }
      // A page that answers every word of the question beats one that repeats a single word.
      return { ...doc, score: score * (matched / terms.length) ** 2 };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ title, url, description, score }) => ({ title, url, description, score }));
}
