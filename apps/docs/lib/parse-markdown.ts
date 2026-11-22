/** Parses the docs' own Markdown into blocks the renderer turns into React elements. No HTML passes through. */
export type Block =
  | { type: 'h2' | 'h3' | 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'code'; lang: string; code: string }
  | { type: 'table'; head: string[]; rows: string[][] };

export function parseMarkdown(md: string) {
  const lines = md.replace(/\r/g, '').split('\n');
  let title = '';
  let description = '';
  const blocks: Block[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim()) continue;
    if (line.startsWith('# ')) title = line.slice(2).trim();
    else if (line.startsWith('> ') && !description && !blocks.length) description = line.slice(2).trim();
    else if (line.startsWith('### ')) blocks.push({ type: 'h3', text: line.slice(4) });
    else if (line.startsWith('## ')) blocks.push({ type: 'h2', text: line.slice(3) });
    else if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || 'bash';
      const code: string[] = [];
      while (++i < lines.length && !lines[i]!.startsWith('```')) code.push(lines[i]!);
      blocks.push({ type: 'code', lang, code: code.join('\n') });
    } else if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.startsWith('|')) {
        const cells = lines[i]!.split(/(?<!\\)\|/)
          .slice(1, -1)
          .map((c) => c.trim().replace(/\\\|/g, '|'));
        if (!cells.every((c) => /^-+$/.test(c))) rows.push(cells);
        i++;
      }
      i--;
      blocks.push({ type: 'table', head: rows[0] ?? [], rows: rows.slice(1) });
    } else if (line.startsWith('- ') || /^\d+\. /.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\d+\. /.test(lines[i]!) : lines[i]!.startsWith('- '))) {
        items.push(lines[i]!.replace(/^(- |\d+\. )/, ''));
        i++;
      }
      i--;
      blocks.push({ type: ordered ? 'ol' : 'ul', items });
    } else {
      const para = [line];
      while (i + 1 < lines.length && lines[i + 1]!.trim() && !/^(#|>|```|\||- |\d+\. )/.test(lines[i + 1]!))
        para.push(lines[++i]!);
      blocks.push({ type: 'p', text: para.join(' ') });
    }
  }
  return { title, description, blocks };
}

/** Straight quotes to curly ones, for prose people read. Callers keep code spans out of it. */
export function smartQuotes(text: string) {
  return text
    .replace(/(^|[\s([{–—])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(\w)'(\w)/g, '$1’$2')
    .replace(/(^|[\s([{–—])'/g, '$1‘')
    .replace(/'/g, '’');
}

/**
 * Inline Markdown as plain text, for meta tags, share cards and structured data, where nothing renders it: code
 * spans lose their backticks, bold loses its asterisks and links keep only their label.
 */
export function plainText(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .split(/(`[^`]+`)/g)
    .map((part) => (/^`[^`]+`$/.test(part) ? part.slice(1, -1) : smartQuotes(part)))
    .join('');
}
