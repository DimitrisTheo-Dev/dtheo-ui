// Runs the built Figma plugin against a recording fake of the Plugin API. The fake keeps the rules Figma enforces
// that the type checker cannot see (unique variable names, FILL sizing only inside auto-layout, fonts loaded before
// text changes), so a run that passes here does what the library promises: every color bound to a variable, every
// component with its variants, and the same library again on a second run instead of a copy.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildFigmaPlugin } from '../../../scripts/gen-figma.mjs';
import tokens from '../../tokens/dist/tokens.json' with { type: 'json' };

const bind = (paint, field, variable) => ({
  ...paint,
  boundVariables: { ...paint.boundVariables, [field]: { type: 'VARIABLE_ALIAS', id: variable.id } },
});

let nextId = 1;
const id = (prefix) => `${prefix}:${nextId++}`;

function fakeFigma({ fonts = [], maxModes = Infinity, maxPages = Infinity } = {}) {
  const loaded = new Set();
  const collections = [];
  const variables = [];
  const textStyles = [];
  const effectStyles = [];
  const pages = [];
  const result = {};

  function node(type, extra = {}) {
    const n = {
      id: id(type),
      type,
      name: type,
      children: [],
      parent: null,
      fills: [],
      strokes: [],
      effects: [],
      width: 100,
      height: 100,
      x: 0,
      y: 0,
      layoutMode: 'NONE',
      boundVariables: {},
      explicitModes: {},
      pluginData: {},
      appendChild(child) {
        if (child.parent) child.parent.children = child.parent.children.filter((c) => c !== child);
        child.parent = this;
        this.children.push(child);
      },
      remove() {
        if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this);
        this.parent = null;
      },
      resize(w, h) {
        if (!(w >= 0.01) || !(h >= 0.01)) throw new Error(`resize(${w}, ${h})`);
        this.width = w;
        this.height = h;
        // As in Figma: resizing an auto-layout frame pins both axes to fixed, whatever they were.
        if (this.layoutMode !== 'NONE') this.primaryAxisSizingMode = this.counterAxisSizingMode = 'FIXED';
      },
      rescale(scale) {
        this.width *= scale;
        this.height *= scale;
      },
      setBoundVariable(field, variable) {
        if (!variable) throw new Error(`setBoundVariable(${field}) without a variable`);
        this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: variable.id };
      },
      setPluginData(key, value) {
        this.pluginData[key] = value;
      },
      getPluginData(key) {
        return this.pluginData[key] ?? '';
      },
      findAll(pred) {
        const out = [];
        const walk = (x) => {
          for (const c of x.children) {
            if (pred(c)) out.push(c);
            walk(c);
          }
        };
        walk(this);
        return out;
      },
      async setEffectStyleIdAsync(styleId) {
        if (!effectStyles.some((s) => s.id === styleId)) throw new Error(`unknown effect style ${styleId}`);
        this.effectStyleId = styleId;
      },
      setExplicitVariableModeForCollection(collection, modeId) {
        const c = typeof collection === 'string' ? collections.find((x) => x.id === collection) : collection;
        if (!c?.modes.some((m) => m.modeId === modeId)) throw new Error('unknown mode');
        this.explicitModes[c.id] = modeId;
      },
      ...extra,
    };
    // Figma only lets a child FILL its parent, or sit absolutely, inside an auto-layout frame.
    for (const key of ['layoutSizingHorizontal', 'layoutPositioning']) {
      let value;
      Object.defineProperty(n, key, {
        get: () => value,
        set(v) {
          if (!n.parent || n.parent.layoutMode === 'NONE')
            throw new Error(`${key} needs an auto-layout parent`);
          value = v;
        },
      });
    }
    return n;
  }

  function textNode() {
    const t = node('TEXT');
    let characters = '';
    let fontName = null;
    Object.defineProperty(t, 'fontName', {
      get: () => fontName,
      set(f) {
        if (!loaded.has(`${f.family}/${f.style}`)) throw new Error(`font ${f.family} ${f.style} not loaded`);
        fontName = f;
      },
    });
    Object.defineProperty(t, 'characters', {
      get: () => characters,
      set(c) {
        if (!fontName) throw new Error('characters set before a font');
        characters = c;
      },
    });
    t.setTextStyleIdAsync = async (styleId) => {
      if (!textStyles.some((s) => s.id === styleId)) throw new Error(`unknown text style ${styleId}`);
      t.textStyleId = styleId;
    };
    return t;
  }

  const first = node('PAGE', { async loadAsync() {} });
  first.name = 'Page 1';
  pages.push(first);
  const figma = {
    root: { children: pages },
    currentPage: first,
    variables: {
      async getLocalVariableCollectionsAsync() {
        return [...collections];
      },
      createVariableCollection(name) {
        const c = {
          id: id('VariableCollection'),
          name,
          modes: [{ modeId: id('mode'), name: 'Mode 1' }],
          renameMode(modeId, newName) {
            this.modes.find((m) => m.modeId === modeId).name = newName;
          },
          removeMode(modeId) {
            if (this.modes.length === 1) throw new Error('A collection needs a mode');
            this.modes = this.modes.filter((m) => m.modeId !== modeId);
          },
          addMode(modeName) {
            if (this.modes.length >= maxModes) throw new Error('Limited to 1 modes only');
            const modeId = id('mode');
            this.modes.push({ modeId, name: modeName });
            return modeId;
          },
        };
        collections.push(c);
        return c;
      },
      async getLocalVariablesAsync(type) {
        return variables.filter((v) => !type || v.resolvedType === type);
      },
      createVariable(name, collection, type) {
        if (variables.some((v) => v.name === name && v.variableCollectionId === collection.id))
          throw new Error(`duplicate variable ${name}`);
        const v = {
          id: id('Variable'),
          name,
          resolvedType: type,
          variableCollectionId: collection.id,
          valuesByMode: {},
          codeSyntax: {},
          scopes: ['ALL_SCOPES'],
          setValueForMode(modeId, value) {
            if (!collection.modes.some((m) => m.modeId === modeId))
              throw new Error(`unknown mode for ${name}`);
            this.valuesByMode[modeId] = value;
          },
          setVariableCodeSyntax(platform, value) {
            this.codeSyntax[platform] = value;
          },
        };
        variables.push(v);
        return v;
      },
      setBoundVariableForPaint: (paint, field, variable) => {
        if (!variable) throw new Error('paint bound to a missing variable');
        return bind(paint, field, variable);
      },
      setBoundVariableForEffect: (effect, field, variable) => bind(effect, field, variable),
    },
    async listAvailableFontsAsync() {
      return fonts.map(([family, style]) => ({ fontName: { family, style } }));
    },
    async loadFontAsync(f) {
      loaded.add(`${f.family}/${f.style}`);
    },
    async getLocalTextStylesAsync() {
      return [...textStyles];
    },
    createTextStyle() {
      const s = { id: id('TextStyle'), name: '' };
      textStyles.push(s);
      return s;
    },
    async getLocalEffectStylesAsync() {
      return [...effectStyles];
    },
    createEffectStyle() {
      const s = { id: id('EffectStyle'), name: '', effects: [] };
      effectStyles.push(s);
      return s;
    },
    createText: textNode,
    createFrame: () => node('FRAME'),
    createRectangle: () => node('RECTANGLE'),
    createComponent: () => node('COMPONENT'),
    createNodeFromSvg(svg) {
      const f = node('FRAME');
      const paths = svg.match(/<(path|circle)/g) ?? [];
      for (const _ of paths) f.appendChild(node('VECTOR'));
      return f;
    },
    createPage() {
      if (pages.length >= maxPages) throw new Error('The Starter plan only comes with 3 pages.');
      const p = node('PAGE', { async loadAsync() {} });
      pages.push(p);
      return p;
    },
    async setCurrentPageAsync(p) {
      result.currentPage = p;
    },
    combineAsVariants(parts, parent) {
      for (const p of parts)
        if (p.type !== 'COMPONENT' || p.parent !== parent) throw new Error('not a component on the page');
      const set = node('COMPONENT_SET');
      parent.appendChild(set);
      for (const p of parts) set.appendChild(p);
      return set;
    },
    viewport: { scrollAndZoomIntoView() {} },
    closePlugin(message) {
      result.message = message;
      result.done?.();
    },
  };
  return { figma, collections, variables, textStyles, effectStyles, pages, result };
}

const built = buildFigmaPlugin();

async function run(fake) {
  const done = new Promise((resolve) => (fake.result.done = resolve));
  new Function('figma', built)(fake.figma);
  await done;
  return fake.result.message;
}

const roles = Object.keys(tokens.graphite.light);

/** A frame's [horizontal, vertical] sizing, whichever way its auto-layout runs. */
const sizes = (c) =>
  c.layoutMode === 'HORIZONTAL'
    ? [c.primaryAxisSizingMode, c.counterAxisSizingMode]
    : [c.counterAxisSizingMode, c.primaryAxisSizingMode];

/** Every solid paint under a node, with where it was found. */
function paints(root) {
  const out = [];
  const walk = (n, path) => {
    for (const key of ['fills', 'strokes'])
      for (const p of n[key] ?? []) out.push({ p, path: `${path}.${key}` });
    for (const c of n.children ?? []) walk(c, `${path}/${c.name}`);
  };
  walk(root, root.name);
  return out;
}

describe('the Figma plugin', () => {
  it('is built from the current tokens and source (run `pnpm figma` after a change)', () => {
    const committed = readFileSync(new URL('../dist/code.js', import.meta.url), 'utf8');
    expect(committed === built).toBe(true);
  });

  it('is compiled to syntax Figma’s sandbox has always parsed', () => {
    // No optional chaining, nullish coalescing, object spread or globalThis in what ships. Strings are blanked
    // first: the token JSON and the icon paths have dots and question marks of their own.
    const code = built
      .slice(built.indexOf('\n', built.indexOf('var DTHEO_TOKENS')))
      .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""');
    expect(code).not.toMatch(/\?\.[a-zA-Z_([]/);
    expect(code).not.toMatch(/\?\?/);
    expect(code).not.toMatch(/\{\s*\.\.\./);
    expect(code).not.toMatch(/globalThis/);
  });

  it('builds the variables, styles and components it reports', async () => {
    const fake = fakeFigma();
    const message = await run(fake);
    expect(message).not.toMatch(/failed/);

    const color = fake.collections.find((c) => c.name === 'Color');
    expect(color.modes.map((m) => m.name)).toEqual([
      'Graphite light',
      'Graphite dark',
      'Carbon light',
      'Carbon dark',
    ]);
    const colors = fake.variables.filter((v) => v.variableCollectionId === color.id);
    expect(colors.map((v) => v.name).sort()).toEqual([...roles].sort());
    // Every color has a value in every theme, and Dev Mode shows the CSS variable.
    for (const v of colors) {
      expect(Object.keys(v.valuesByMode), v.name).toHaveLength(4);
      expect(v.codeSyntax.WEB).toBe(`var(--${v.name})`);
    }
    const graphiteDark = color.modes.find((m) => m.name === 'Graphite dark').modeId;
    const selection = colors.find((v) => v.name === 'selection').valuesByMode[graphiteDark];
    expect(selection.a).toBeCloseTo(tokens.graphite.dark.selection.$value.alpha, 5);

    const geometry = fake.collections.find((c) => c.name === 'Geometry');
    expect(geometry.modes.map((m) => m.name)).toEqual(['Graphite', 'Carbon']);
    expect(fake.textStyles.map((s) => s.name)).toContain('dtheo/body');
    expect(fake.textStyles).toHaveLength(Object.keys(tokens.foundation.text).length + 2);
    expect(fake.effectStyles.map((s) => s.name)).toContain('dtheo/shadow-popover/dark');

    const page = fake.pages.find((p) => p.name === 'dtheo/ui · Components');
    const sets = page.children.filter((c) => c.type === 'COMPONENT_SET');
    expect(sets.map((s) => s.name)).toEqual(['Button', 'Badge', 'Input', 'Checkbox', 'Metric', 'Table row']);
    expect(sets.find((s) => s.name === 'Button').children.map((c) => c.name)).toContain(
      'Variant=primary, Size=md',
    );
    expect(sets.find((s) => s.name === 'Button').children).toHaveLength(15);
    expect(message).toContain('6 components made');
    // The toast that reports it holds about 100 characters.
    expect(message.length).toBeLessThanOrEqual(100);
  });

  it('binds every color in every component to a variable, except the destructive label’s fixed white', async () => {
    const fake = fakeFigma();
    await run(fake);
    const page = fake.pages.find((p) => p.name === 'dtheo/ui · Components');
    const raw = paints(page).filter(({ p }) => p.type === 'SOLID' && !p.boundVariables?.color);
    expect(raw.map((r) => r.path).every((path) => path.includes('Variant=destructive'))).toBe(true);
    expect(raw.length).toBe(3);
    // Hug where the content decides and fixed where the system does, although every frame was resized on the way.
    const set = (name) => page.children.find((c) => c.name === name);
    expect(sizes(set('Button').children[0])).toEqual(['AUTO', 'FIXED']);
    expect(sizes(set('Metric').children[0])).toEqual(['FIXED', 'AUTO']);
    expect(sizes(set('Input').children[0])).toEqual(['FIXED', 'FIXED']);
    expect(sizes(set('Button'))).toEqual(['FIXED', 'AUTO']);
    // Radii come from the preset, so a Carbon frame gets Carbon corners.
    const button = page.children.find((c) => c.name === 'Button').children[0];
    expect(Object.keys(button.boundVariables)).toEqual(
      expect.arrayContaining(['height', 'topLeftRadius', 'bottomRightRadius']),
    );
  });

  it('uses SF Pro where it is installed', async () => {
    const fake = fakeFigma({
      fonts: ['Regular', 'Medium', 'Semibold', 'Bold'].map((style) => ['SF Pro', style]),
    });
    await run(fake);
    expect(fake.textStyles.find((s) => s.name === 'dtheo/title-1').fontName).toEqual({
      family: 'SF Pro',
      style: 'Bold',
    });
  });

  it('updates tokens in place on a second run and keeps the components, so instances survive', async () => {
    const fake = fakeFigma();
    await run(fake);
    const counts = () => [
      fake.collections.length,
      fake.variables.length,
      fake.textStyles.length,
      fake.effectStyles.length,
      fake.pages.length,
    ];
    const first = counts();
    const page = fake.pages.find((p) => p.name === 'dtheo/ui · Components');
    const sets = () => page.children.filter((c) => c.getPluginData('dtheo-ui'));
    const before = sets().map((c) => c.id);
    const message = await run(fake);
    expect(counts()).toEqual(first);
    // The same nodes, not new ones with the same names: an instance keeps its main component.
    expect(sets().map((c) => c.id)).toEqual(before);
    expect(message).toContain('components kept');
    // Deleting one set brings back only that one.
    sets()[0].remove();
    expect(await run(fake)).toContain('1 components made');
    expect(sets()).toHaveLength(before.length);
  });

  it('replaces the modes of an earlier version instead of adding to them', async () => {
    const fake = fakeFigma();
    // A file built before Carbon: four modes, two of which the library no longer has.
    const old = fake.figma.variables.createVariableCollection('Color');
    old.renameMode(old.modes[0].modeId, 'Graphite light');
    for (const m of ['Graphite dark', 'Flight deck', 'Deep space']) old.addMode(m);
    const message = await run(fake);
    expect(message).not.toMatch(/failed|plan allows/);
    const color = fake.collections.find((c) => c.name === 'Color');
    expect(fake.collections.filter((c) => c.name === 'Color')).toHaveLength(1);
    expect(color.modes.map((m) => m.name).sort()).toEqual(
      ['Carbon dark', 'Carbon light', 'Graphite dark', 'Graphite light'].sort(),
    );
  });

  it('still builds on a Starter file: one mode, no page to spare', async () => {
    const fake = fakeFigma({ maxModes: 1, maxPages: 1 });
    const message = await run(fake);
    expect(message).not.toMatch(/failed/);
    expect(message).toContain('this plan allows one mode');
    expect(message.length).toBeLessThanOrEqual(100);
    const color = fake.collections.find((c) => c.name === 'Color');
    expect(color.modes.map((m) => m.name)).toEqual(['Graphite light']);
    // Every color still has its value in the mode there is, and the library lands on the page there is.
    for (const v of fake.variables.filter((x) => x.variableCollectionId === color.id))
      expect(Object.keys(v.valuesByMode)).toHaveLength(1);
    expect(fake.pages).toHaveLength(1);
    expect(fake.pages[0].children.filter((c) => c.type === 'COMPONENT_SET')).toHaveLength(6);
  });
});
