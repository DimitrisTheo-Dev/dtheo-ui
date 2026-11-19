#!/usr/bin/env node
/**
 * Publishes every public package whose package.json version is not on npm yet, and skips the rest, so it is safe
 * to run again. pnpm packs each package (applying publishConfig, such as the compiled exports of @dtheo/tokens) and
 * npm publishes the tarball. In GitHub Actions npm signs in through trusted publishing (OIDC), so no token exists,
 * and every version gets a provenance attestation that links it to this repository and commit.
 *
 *   node scripts/release.mjs --dry-run      what would be published, with the tarball contents
 *   node scripts/release.mjs --otp=123456   from a laptop (the first publish, before npm trusts the workflow)
 *   node scripts/release.mjs                in the Release workflow
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const packages = ['packages/tokens', 'packages/cli'];
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const otp = args.find((a) => a.startsWith('--otp='));
const ci = process.env.GITHUB_ACTIONS === 'true';

function run(cmd, cmdArgs, opts = {}) {
  const result = spawnSync(cmd, cmdArgs, { encoding: 'utf8', stdio: 'inherit', ...opts });
  if (result.status !== 0) {
    console.error(`\n${cmd} ${cmdArgs.join(' ')} failed: ${result.error?.message ?? `exit code ${result.status}`}.`);
    process.exit(result.status ?? 1);
  }
  return result;
}

// pnpm is on PATH in CI (corepack enable) but often not in a fresh shell; corepack runs the pinned version then.
const pnpm = spawnSync('pnpm', ['--version'], { stdio: 'ignore' }).error
  ? (pnpmArgs, opts) => run('corepack', ['pnpm', ...pnpmArgs], opts)
  : (pnpmArgs, opts) => run('pnpm', pnpmArgs, opts);

function isPublished(name, version) {
  const result = spawnSync('npm', ['view', `${name}@${version}`, 'version'], { encoding: 'utf8' });
  return result.status === 0 && result.stdout.trim() === version;
}

if (ci && !dryRun) {
  // Trusted publishing needs npm 11.5.1 or later.
  const [major, minor, patch] = spawnSync('npm', ['--version'], { encoding: 'utf8' })
    .stdout.trim()
    .split('.')
    .map(Number);
  if (major < 11 || (major === 11 && (minor < 5 || (minor === 5 && patch < 1)))) {
    console.error('npm 11.5.1 or later is needed for trusted publishing.');
    process.exit(1);
  }
}

const out = mkdtempSync(join(tmpdir(), 'dtheo-release-'));
let published = 0;
try {
  for (const dir of packages) {
    const { name, version, private: isPrivate } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    if (isPrivate) continue;
    if (isPublished(name, version)) {
      console.log(`${name}@${version} is already on npm, skipping.`);
      continue;
    }
    console.log(`\n${dryRun ? 'Would publish' : 'Publishing'} ${name}@${version}`);
    const dest = join(out, name.replace('/', '-'));
    pnpm(['pack', '--pack-destination', dest], { cwd: dir, stdio: ['ignore', 'ignore', 'inherit'] });
    const tarball = readdirSync(dest).find((f) => f.endsWith('.tgz'));
    if (!tarball) throw new Error(`pnpm pack wrote no tarball for ${name}`);
    run('npm', [
      'publish',
      join(dest, tarball),
      '--access',
      'public',
      // A prerelease such as 0.2.0-beta.1 must not become what `npm install` picks by default.
      ...(version.includes('-') ? ['--tag', 'next'] : []),
      ...(ci ? ['--provenance'] : []),
      ...(otp ? [otp] : []),
      ...(dryRun ? ['--dry-run'] : []),
    ]);
    published += 1;
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
console.log(
  `\n${published ? `${dryRun ? 'Would publish' : 'Published'} ${published} package(s).` : 'Nothing new to publish.'}`,
);
