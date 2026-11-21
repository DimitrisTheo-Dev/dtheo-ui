// Every prop a `ui` contract documents must exist on the props of one of the components it exports. The docs page,
// the registry and the MCP answers all print these names, so a renamed or removed prop must fail here first.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { beforeAll, describe, expect, it } from 'vitest';
import { components, type ComponentMeta } from '../src/meta';

const pkg = fileURLToPath(new URL('../', import.meta.url));

/**
 * Props documented on purpose although no exported component declares them. Each entry needs a reason.
 * Key: `<slug>.<prop>`.
 */
const allowed: Record<string, string> = {};

/**
 * Documented props that do not exist. Their tests are `it.fails` until the contract is fixed; then the test passes,
 * `it.fails` turns red, and the entry must go. Key: `<slug>.<prop>`.
 */
const knownDrift: Record<string, string> = {};

let checker: ts.TypeChecker;
let program: ts.Program;

beforeAll(() => {
  const configPath = join(pkg, 'tsconfig.json');
  const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile);
  if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, dirname(configPath));
  program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
  checker = program.getTypeChecker();
});

/** A React component is a PascalCase export whose type can be called with a props object. */
const isComponentName = (name: string) => /^[A-Z]/.test(name);

/** Prop names each of the contract's exported components accepts, keyed by export name. */
function propsByExport(c: ComponentMeta): Map<string, Set<string>> {
  const wanted = new Set(c.exports.filter(isComponentName));
  const result = new Map<string, Set<string>>();
  for (const file of c.files.filter((f) => /\.tsx?$/.test(f))) {
    const source = program.getSourceFile(join(pkg, 'src', file));
    if (!source) throw new Error(`${c.slug}: ${file} is not part of the ui tsconfig`);
    const moduleSymbol = checker.getSymbolAtLocation(source);
    if (!moduleSymbol) continue;
    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      if (!wanted.has(exported.name)) continue;
      const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
      const type = checker.getTypeOfSymbolAtLocation(symbol, source);
      const names = new Set<string>();
      for (const signature of type.getCallSignatures()) {
        const [propsParam] = signature.getParameters();
        if (!propsParam) continue;
        const propsType = checker.getTypeOfSymbolAtLocation(propsParam, source);
        // "Exists on" means any member of a union of prop shapes, not only the members they share.
        const shapes = propsType.isUnion() ? propsType.types : [propsType];
        for (const shape of shapes)
          for (const prop of checker.getPropertiesOfType(checker.getApparentType(shape)))
            names.add(prop.name);
      }
      if (names.size) result.set(exported.name, names);
    }
  }
  return result;
}

/** A description that starts with "FieldLabel: …" documents a prop of that export in particular. */
function documentedOwner(c: ComponentMeta, description: string) {
  const owner = /^([A-Z]\w*):/.exec(description)?.[1];
  return owner && c.exports.includes(owner) ? owner : null;
}

/** Why `prop` is drift for contract `c`, or null when an exported component (the one it names, if any) accepts it. */
function drift(c: ComponentMeta, prop: { name: string; description: string }) {
  const byExport = propsByExport(c);
  if (byExport.size === 0) return `${c.slug}: no exported component with a props type`;
  const owners = [...byExport].filter(([, names]) => names.has(prop.name)).map(([name]) => name);
  if (owners.length === 0)
    return `${c.slug}.${prop.name} is not a prop of ${[...byExport.keys()].join(', ')}`;
  const owner = documentedOwner(c, prop.description);
  if (owner && !owners.includes(owner))
    return `${c.slug}.${prop.name} is documented on ${owner}, but only ${owners.join(', ')} accepts it`;
  return null;
}

const ui = components.filter((c) => c.package === 'ui');
const documented = ui.filter((c) => c.props?.length);
const contract = (slug: string) => ui.find((c) => c.slug === slug)!;

describe('contract props', () => {
  it('cover at least the contracts known to document props', () => {
    // Guards against a filter that quietly selects nothing.
    expect(documented.map((c) => c.slug)).toEqual(
      expect.arrayContaining(['button', 'field', 'slider', 'command', 'progress', 'card', 'app-shell']),
    );
  });

  it('resolve through Base UI: Button accepts `render` and `disabled`, but not a made-up prop', () => {
    const button = propsByExport(contract('button')).get('Button');
    expect(button).toBeDefined();
    expect(button).toContain('render');
    expect(button).toContain('disabled');
    expect(button).toContain('focusableWhenDisabled');
    expect(button).not.toContain('definitelyNotAProp');
  });

  for (const c of documented) {
    describe(c.slug, () => {
      for (const prop of c.props!) {
        const key = `${c.slug}.${prop.name}`;
        if (key in allowed) continue;
        const test = key in knownDrift ? it.fails : it;
        test(`documents \`${prop.name}\`, which an exported component accepts`, () => {
          expect(drift(c, prop)).toBeNull();
        });
      }
    });
  }
});

describe('the drift check itself', () => {
  it('finds a props type for every component a ui contract exports', () => {
    const missing = ui.flatMap((c) => {
      const found = propsByExport(c);
      return c.exports
        .filter((name) => isComponentName(name) && !found.has(name))
        .map((n) => `${c.slug}.${n}`);
    });
    expect(missing).toEqual([]);
  });

  it('reports a prop no export accepts', () => {
    const card = contract('card');
    expect(drift(card, { name: 'heading', description: 'Renamed in a refactor.' })).toBe(
      'card.heading is not a prop of Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter',
    );
  });

  it('reports a prop documented on the wrong export', () => {
    const shell = contract('app-shell');
    expect(drift(shell, { name: 'level', description: 'AppShell: heading level.' })).toBe(
      'app-shell.level is documented on AppShell, but only PageHeader accepts it',
    );
  });
});
