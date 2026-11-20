import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { categories, components } from '@dtheo/ui/meta';
import { registryItem, registryNames } from '@/lib/registry';
import { ardManifest } from '@/lib/ard';
import { brand, starIn, starPath, tilePath } from '@/lib/brand';
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

  it('lists the TypeScript types each untyped dependency needs', () => {
    // The charts package builds with these, so the names are real and the versions are known to work.
    const { devDependencies: built } = JSON.parse(readFileSync(`${repo}packages/charts/package.json`, 'utf8'));
    for (const c of components) {
      const item = registryItem(c.slug)!;
      for (const dep of item.dependencies.filter((d) => d.startsWith('d3-'))) {
        expect(item.devDependencies, c.slug).toContain(`@types/${dep}`);
        expect(built, `@types/${dep}`).toHaveProperty([`@types/${dep}`]);
      }
    }
  });

  it('only depends on items it can serve', () => {
    const names = new Set(registryNames());
    for (const c of components)
      for (const dep of c.registryDependencies) expect(names, `${c.slug} → ${dep}`).toContain(dep);
  });
});

describe('brand', () => {
  it('draws the same star in the favicon as in the logo', () => {
    // app/icon.svg is a static file, so it cannot import the path; this keeps the copy honest.
    const icon = readFileSync(`${repo}apps/docs/app/icon.svg`, 'utf8');
    expect(icon).toContain(`d="${starPath}"`);
    expect(icon).toContain(`d="${tilePath}"`);
    expect(icon).toContain(`transform="${starIn(16)}"`);
    for (const color of [brand.top, brand.middle, brand.ink, brand.star]) expect(icon).toContain(`"${color}"`);
  });
});

describe('agent surfaces', () => {
  it('publishes an ARD manifest registries can index', () => {
    const { entries } = ardManifest();
    const ids = entries.map((e) => e.identifier);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of entries) {
      // ARD v0.91: a host-anchored URN, a name, an application media type, url xor data, and 2-5 sample queries.
      expect(e.identifier).toMatch(/^urn:air:ui\.dtheo\.dev(:[a-zA-Z0-9._-]+)+$/);
      expect(e.displayName).toBeTruthy();
      expect(e.type).toMatch(/^application\/[\w.+-]+$/);
      expect(('url' in e) !== ('data' in e), `${e.identifier} has exactly one of url and data`).toBe(true);
      expect(e.representativeQueries.length).toBeGreaterThanOrEqual(2);
      expect(e.representativeQueries.length).toBeLessThanOrEqual(5);
    }
  });

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
