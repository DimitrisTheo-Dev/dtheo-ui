import 'server-only';
import { createHighlighter, type Highlighter } from 'shiki';

let highlighter: Promise<Highlighter> | null = null;

/** Server-side highlighting; ships HTML with light and dark colors, no client JS. */
export async function highlight(code: string, lang: 'tsx' | 'ts' | 'bash' | 'css' | 'json' | 'md' = 'tsx') {
  highlighter ??= createHighlighter({
    themes: ['github-light-default', 'github-dark-default'],
    langs: ['tsx', 'ts', 'bash', 'css', 'json', 'md'],
  });
  const h = await highlighter;
  return h.codeToHtml(code.trimEnd(), {
    lang,
    themes: { light: 'github-light-default', dark: 'github-dark-default' },
    defaultColor: 'light',
  });
}
