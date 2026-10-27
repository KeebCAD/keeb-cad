#!/usr/bin/env bash
# Regenerates the Corney Island v0.3 golden fixture. See README.md for provenance.
# Rerunning must leave no git diff under fixtures/corney-island/.
set -euo pipefail

ERGOGEN_TAG=v4.2.1
ERGOGEN_SHA=8286e18f18ac064aa6d2ebca9c449bf2f6ba4d37
# ceoloide/ergogen-footprints, as pinned by the ergogen/footprints/ceoloide submodule of
# ceoloide/corney-island at ad97447838933f41ec9c61358e367bbe2a710d2e.
FOOTPRINTS_SHA=9217fe6fda18e09b70784f53fece9e0cdea5573d

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../.." && pwd)"
cd "$here"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
# Everything is fetched, verified and generated in $tmp first; the committed fixture is
# replaced only once all of it succeeded, so a network failure leaves it untouched.
stage="$tmp/stage"
mkdir -p "$stage/source/footprints/ceoloide" "$tmp/footprints"

cp "$root/_bmad-output/layout-model/sources/corney-island.yaml" "$stage/source/config.yaml"

curl -fsSL "https://codeload.github.com/ceoloide/ergogen-footprints/tar.gz/$FOOTPRINTS_SHA" \
  | tar -xz -C "$tmp/footprints" --strip-components=1
cp "$tmp/footprints"/*.js "$tmp/footprints/LICENSE" "$stage/source/footprints/ceoloide/"

# Ergogen runs from its tagged source, installed from its own lockfile, which pins the
# GitHub-hosted hull and kle-serial by commit (the npm package does not). Nothing enters
# the workspace lockfile. The lockfile uses git+ssh URLs, so GitHub SSH access is needed.
git -c advice.detachedHead=false clone --quiet --depth 1 --branch "$ERGOGEN_TAG" https://github.com/ergogen/ergogen.git "$tmp/ergogen"
actual="$(git -C "$tmp/ergogen" rev-parse HEAD)"
if [[ "$actual" != "$ERGOGEN_SHA" ]]; then
  echo "Ergogen $ERGOGEN_TAG is $actual, expected $ERGOGEN_SHA" >&2
  exit 1
fi
(cd "$tmp/ergogen" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund --silent)

# The kicad8 template stamps `(date ...)` from `new Date()`, so pin the clock to the Corney
# HEAD commit date (2026-10-23) or every rerun on a later day would change the PCBs.
cat >"$tmp/fixed-clock.mjs" <<'JS'
const FIXED = Date.parse('2026-10-23T00:00:00Z')
const RealDate = Date
class FixedDate extends RealDate {
  constructor(...args) {
    super(...(args.length === 0 ? [FIXED] : args))
  }
  static now() {
    return FIXED
  }
}
globalThis.Date = FixedDate
JS
(cd "$stage" && node --import "$tmp/fixed-clock.mjs" "$tmp/ergogen/src/cli.js" source -o ergogen --debug --clean)
# 8.5 MB of debug model data that nothing reads; its .svg and .dxf stay.
rm "$stage/ergogen/outlines/_debug_points.yaml"

rm -rf source ergogen
mv "$stage/source" "$stage/ergogen" .
