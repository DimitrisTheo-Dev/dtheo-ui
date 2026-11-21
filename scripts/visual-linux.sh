#!/usr/bin/env bash
# Records the Linux visual baselines (e2e/visual.spec.ts-snapshots/*-linux.png) that CI compares against, in the
# same Playwright image and architecture the CI job uses. Needs Docker. Run it after an intended visual change, next
# to `pnpm test:visual --update-snapshots` for the macOS baselines, and review both diffs.
#
# The repo is copied into the container without node_modules, so the host's install is never touched.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
version="$(node -p "require('$root/node_modules/@playwright/test/package.json').version")"
image="mcr.microsoft.com/playwright:v$version-noble"
if ! grep -q "$image" "$root/.github/workflows/ci.yml"; then
  echo "ci.yml must run the visual job in $image, the installed Playwright version." >&2
  exit 1
fi
docker run --rm --platform linux/arm64 \
  -v "$root":/src:ro -v "$root/e2e/visual.spec.ts-snapshots":/out "$image" bash -c '
  set -e
  mkdir -p /tmp/repo && cd /src
  tar --exclude="./node_modules" --exclude="./*/node_modules" --exclude="./*/*/node_modules" \
    --exclude="./apps/docs/.next" --exclude="./test-results" --exclude="./playwright-report" -cf - . |
    tar -C /tmp/repo -xf -
  cd /tmp/repo
  npm install -g "$(node -p "require(\"./package.json\").packageManager")" >/dev/null
  pnpm install --frozen-lockfile >/dev/null
  NEXT_BUILD_CPUS=2 pnpm build >/dev/null
  rm -f e2e/visual.spec.ts-snapshots/*-linux.png
  export E2E_SERVER=production
  CI=1 pnpm test:visual --update-snapshots=all || true
  CI=1 pnpm test:visual
  rm -f /out/*-linux.png
  cp e2e/visual.spec.ts-snapshots/*-linux.png /out/
'
echo "Recorded $(ls "$root"/e2e/visual.spec.ts-snapshots/*-linux.png | wc -l | tr -d " ") Linux baselines."
