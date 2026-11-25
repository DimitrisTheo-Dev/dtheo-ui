// Every prop a chart accepts must be in its contract, and every prop the contract documents must exist. The docs
// page, the registry and the MCP answers print the contract, so an agent never learns a prop it leaves out.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { components } from '../src/meta';

const charts = fileURLToPath(new URL('../../charts/src/', import.meta.url));

/** Props every component takes, documented only where they do something unusual. */
const generic = new Set(['className']);

/** Members of the exported `*Props` interfaces in a chart's main file. */
function declaredProps(file: string): Set<string> {
  const path = charts + file;
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const names = new Set<string>();
  source.forEachChild((node) => {
    if (!ts.isInterfaceDeclaration(node) || !node.name.text.endsWith('Props')) return;
    if (!node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return;
    for (const member of node.members)
      if (member.name && ts.isIdentifier(member.name)) names.add(member.name.text);
  });
  return names;
}

const contracts = components.filter((c) => c.package === 'charts');

describe('chart contract props', () => {
  it('cover every chart', () => {
    expect(contracts.map((c) => c.slug)).toEqual(
      expect.arrayContaining(['line-chart', 'bar-chart', 'histogram', 'scatter-chart', 'sparkline']),
    );
  });

  for (const c of contracts) {
    it(`${c.slug} documents every prop it accepts, and only those`, () => {
      const declared = declaredProps(c.files[0]!);
      expect(declared.size).toBeGreaterThan(0);
      const documented = (c.props ?? [])
        // "ChartLegend: …" documents another export of the same file.
        .filter((p) => !/^[A-Z]\w*:/.test(p.description))
        .map((p) => p.name);
      expect([...declared].filter((n) => !generic.has(n) && !documented.includes(n))).toEqual([]);
      expect(documented.filter((n) => !declared.has(n))).toEqual([]);
    });
  }
});
