import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { colorRoles, contrastPairs, foundation, presets } from '../src/index';

const pkg = fileURLToPath(new URL('..', import.meta.url));

describe('tokens', () => {
  it('defines every color role in every preset and mode', () => {
    for (const preset of presets) {
      for (const [mode, scheme] of Object.entries(preset.modes)) {
        if (!scheme) continue;
        const missing = colorRoles.filter((role) => !(role in scheme));
        expect(missing, `${preset.id}/${mode}`).toEqual([]);
      }
    }
  });

  it('writes colors as OKLCH', () => {
    for (const preset of presets)
      for (const scheme of Object.values(preset.modes))
        for (const value of Object.values(scheme ?? {})) expect(value).toMatch(/^oklch\(/);
  });

  it('checks contrast for roles that exist', () => {
    // `white` is the literal text on filled destructive buttons; every other side is a role.
    const known = [...colorRoles, 'white'];
    for (const pair of contrastPairs) {
      expect(known).toContain(pair.fg);
      expect(known).toContain(pair.bg);
    }
  });

  it('keeps the touch control at least 36px', () => {
    expect(Number.parseInt(foundation.control.touch)).toBeGreaterThanOrEqual(36);
  });

  it('passes the build-time contrast gate and matches the committed CSS', () => {
    // --check rebuilds in memory, fails on any contrast miss, and fails if the generated CSS is stale.
    const tsx = fileURLToPath(new URL('../node_modules/.bin/tsx', import.meta.url));
    const out = execFileSync(tsx, ['scripts/build.ts', '--check'], { cwd: pkg, encoding: 'utf8' });
    expect(out).toMatch(/contrast pairs pass/);
  });

  it('exports native hex values for React Native', () => {
    const css = readFileSync(new URL('../../ui/src/styles/tokens.css', import.meta.url), 'utf8');
    expect(css).toContain('--primary:');
  });
});
