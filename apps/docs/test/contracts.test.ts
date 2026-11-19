import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { categories, components } from '@dtheo/ui/meta';
import { registryItem, registryNames } from '@/lib/registry';
import { llmsTxt } from '@/lib/markdown';
import { exampleSource } from '@/lib/source';
import { pageUsage, usedIn } from '@/lib/usage';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const examples = fileURLToPath(new URL('../examples/', import.meta.url));

describe('component contracts', () => {
  it('have unique slugs and known categories', () => {
    const slugs = components.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const c of components) expect(categories).toContain(c.category);
  });

  for (const c of components) {
    describe(c.slug, () => {
      it('points at files that exist and export what the contract says', () => {
        const source = c.files
          .map((f) => readFileSync(`${repo}packages/${c.package}/src/${f}`, 'utf8'))
          .join('\n');
        for (const name of c.exports) {
          expect(source, `${c.slug} exports ${name}`).toMatch(
            new RegExp(
              `export (?:function|const|class|interface|type) ${name}\\b|export \\{[^}]*\\b${name}\\b`,
            ),
          );
        }
      });

      it('has every example it lists', () => {
        for (const id of c.examples) expect(existsSync(`${examples}${id}.tsx`), `${id}.tsx`).toBe(true);
      });

      it('says when to use it and when not to', () => {
        expect(c.description.length).toBeGreaterThan(20);
        expect(c.use.length).toBeGreaterThan(0);
        expect(c.avoid?.length ?? 0, `${c.slug} needs an "avoid" list`).toBeGreaterThan(0);
      });
    });
  }
});

describe('registry', () => {
  it('serves an item for every component, with copyable imports', () => {
    for (const c of components) {
      const item = registryItem(c.slug);
      expect(item, c.slug).not.toBeNull();
      const shipped = new Set(
        item!.files.map((f) =>
          f.path
            .split('/')
            .pop()!
            .replace(/\.tsx?$/, ''),
        ),
      );
      for (const file of item!.files) {
        const where = `${c.slug}/${file.path}`;
        expect(file.content, where).not.toMatch(/from '\.\.\//);
        expect(file.content, where).not.toMatch(/@dtheo\//);
        // A sibling import is fine only when the sibling ships in the same item.
        for (const m of file.content!.matchAll(/from '\.\/([\w-]+)'/g))
          expect(shipped, where).toContain(m[1]);
      }
    }
  });

  it('shows examples whose imports resolve after `dtheo add`', () => {
    const installed = new Set(
      registryNames().flatMap((n) => registryItem(n)!.files.map((f) => f.target.replace(/\.tsx?$/, ''))),
    );
    for (const file of readdirSync(examples).filter((f) => f.endsWith('.tsx'))) {
      const source = exampleSource(file.replace(/\.tsx$/, ''));
      expect(source, file).not.toMatch(/@dtheo\//);
      for (const [, path] of source.matchAll(/from '@\/([\w/-]+)'/g)) expect(installed, file).toContain(path);
    }
  });

  it('only depends on items it can serve', () => {
    const names = new Set(registryNames());
    for (const c of components)
      for (const dep of c.registryDependencies) expect(names, `${c.slug} → ${dep}`).toContain(dep);
  });
});

describe('agent surfaces', () => {
  it('lists every component in llms.txt', () => {
    const txt = llmsTxt();
    for (const c of components) expect(txt).toContain(c.title);
  });

  it('only records usage of real components', () => {
    const slugs = new Set(components.map((c) => c.slug));
    for (const page of Object.values(pageUsage))
      for (const slug of page.uses) expect(slugs, `${page.title} uses ${slug}`).toContain(slug);
  });

  it('keeps the generated usage graph current', () => {
    const run = spawnSync(process.execPath, [`${repo}scripts/gen-usage.mjs`, '--check'], {
      encoding: 'utf8',
    });
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
  });

  it('uses every component in at least one real screen', () => {
    const unused = components.filter((c) => {
      const { pages, composedBy } = usedIn(c.slug);
      return pages.length === 0 && composedBy.length === 0;
    });
    expect(unused.map((c) => c.slug)).toEqual([]);
  });
});
