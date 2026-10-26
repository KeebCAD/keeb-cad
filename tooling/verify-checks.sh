#!/bin/sh
# Proves `pnpm check` and the pre-commit hook catch what they should, and ignore what they should.
#
# Works in a throwaway git worktree on a scratch branch, so the real checkout is never touched.
# The worktree starts from HEAD plus the current uncommitted changes (tracked edits and untracked,
# non-ignored files), so it verifies the tree as it stands. Each matrix row applies one break,
# runs `pnpm check` (and, for the fast checks, `git commit` through the real hook), then reverts.
#
# Run from anywhere inside the repo, with Node 26 on PATH: `mise exec -- sh tooling/verify-checks.sh`.
# Needs the hook installed in this clone (`pnpm install` does that) and Playwright's Chromium.

set -u

repo=$(git rev-parse --show-toplevel) || exit 1
hooks_dir=$(git -C "$repo" rev-parse --path-format=absolute --git-path hooks)
if [ ! -x "$hooks_dir/pre-commit" ]; then
  echo "verify-checks: no pre-commit hook in $hooks_dir; run 'pnpm install' first" >&2
  exit 1
fi

branch="verify-checks/$$"
wt=$(mktemp -d "${TMPDIR:-/tmp}/keeb-cad-verify.XXXXXX")
log="$wt.log"
results="$wt.results"
: >"$results"

cleanup() {
  git -C "$repo" worktree remove --force "$wt" >/dev/null 2>&1
  rm -rf "$wt"
  git -C "$repo" worktree prune
  git -C "$repo" branch -D "$branch" >/dev/null 2>&1
  rm -f "$log" "$results"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

# Commits inside the worktree carry a throwaway identity and are never signed.
g() {
  git -C "$wt" -c user.name=verify-checks -c user.email=verify-checks@localhost \
    -c commit.gpgsign=false "$@"
}

echo "== setting up worktree $wt on $branch"
git -C "$repo" worktree add -q -b "$branch" "$wt" HEAD || exit 1
git -C "$repo" diff HEAD --binary | g apply --allow-empty || exit 1
git -C "$repo" ls-files --others --exclude-standard -z |
  (cd "$repo" && xargs -0 -r cp --parents -t "$wt") || exit 1
# The real checkout's hook is shared by every worktree; skip `prepare` so it is not rewritten.
# The temp dir may sit on another filesystem than the store, so copy rather than hard-link.
store=$(cd "$repo" && pnpm store path) || exit 1
(cd "$wt" && pnpm install --frozen-lockfile --offline --ignore-scripts \
  --store-dir "$store" --package-import-method copy) >"$log" 2>&1 || {
  cat "$log"
  exit 1
}
g add -A && LEFTHOOK=0 g commit -q --no-verify -m 'verify-checks baseline' || exit 1
baseline=$(g rev-parse HEAD)

revert() {
  g reset -q --hard "$baseline"
  g clean -fdq
}

# The last pnpm step header before the failure, e.g. `$ eslint .`.
last_step() {
  grep '^\$ ' "$log" | tail -n 1
}

# record ROW EXPECTED ACTUAL DETAIL
record() {
  if [ "$2" = "$3" ]; then status=PASS; else status=FAIL; fi
  printf '%s\t%s\t%s\t%s\t%s\n' "$status" "$1" "$2" "$3" "$4" >>"$results"
  echo "   $status: $1 -- expected $2, got $3 ($4)"
}

# expect_check ROW fail|pass
expect_check() {
  if (cd "$wt" && pnpm check) >"$log" 2>&1; then got=pass; else got=fail; fi
  record "$1: pnpm check" "$2" "$got" "$(last_step)"
}

# expect_commit ROW refused|allowed [TEXT...]: commits through the hook; each TEXT must be in its output.
expect_commit() {
  row=$1 want=$2
  shift 2
  g add -A
  if g commit -q -m "verify-checks: $row" >"$log" 2>&1; then got=allowed; else got=refused; fi
  detail="hook"
  for text in "$@"; do
    if ! grep -qF -- "$text" "$log"; then
      got="$got, output lacks '$text'"
    fi
    detail="$detail names '$text'"
  done
  record "$row: git commit" "$want" "$got" "$detail"
}

# w FILE LINE appends a line; put FILE LINE replaces the file (the stubs hold only `export {}`).
w() { printf '%s\n' "$2" >>"$wt/$1"; }
put() { printf '%s\n' "$2" >"$wt/$1"; }

echo "== all green"
expect_check 'all green' pass

echo "== lint error"
w packages/model/src/index.ts 'const unused = 1'
expect_check 'lint error' fail
expect_commit 'lint error' refused 'packages/model/src/index.ts' 'no-unused-vars'
revert

echo "== format drift"
put fixtures/src/index.ts '    export const misIndented = 1'
expect_check 'format drift' fail
expect_commit 'format drift' refused 'fixtures/src/index.ts'
revert

echo "== AD-10 break"
put packages/plates/src/index.ts "import '@keeb-cad/pcb'"
expect_check 'AD-10 break' fail
expect_commit 'AD-10 break' refused 'stage-imports-only-model'
revert

echo "== type error"
put packages/model/src/index.ts "export const broken: number = 'not a number'"
expect_check 'type error' fail
expect_commit 'type error' allowed
revert

echo "== failing unit test"
cat >"$wt/tooling/verify-broken.spec.ts" <<'EOF'
import { expect, it } from 'vitest'

it('fails on purpose', () => {
  expect(1).toBe(2)
})
EOF
expect_check 'failing unit test' fail
expect_commit 'failing unit test' allowed
revert

echo "== broken build"
sed -i 's#/src/main.ts#/src/missing.ts#' "$wt/app/index.html"
expect_check 'broken build' fail
expect_commit 'broken build' allowed
revert

echo "== smoke fails"
sed -i 's#No design open.#Something else.#' "$wt/app/src/views/HomeView.vue"
expect_check 'smoke fails' fail
# `pnpm check` stops at the unit test, which sees the same text; run the smoke step on its own.
if (cd "$wt" && pnpm build && pnpm smoke) >"$log" 2>&1; then
  got=pass
elif grep -qF 'shows the empty editor shell' "$log"; then
  got=fail
else
  got="fail, output lacks the test name"
fi
record 'smoke fails: pnpm smoke' fail "$got" "Playwright names 'shows the empty editor shell'"
revert

echo "== ignored paths"
mkdir -p "$wt/spikes" "$wt/_bmad-output"
for f in spikes/verify-bad.ts _bmad-output/verify-bad.ts; do
  w "$f" 'const   unused=1;debugger'
  w "$f" '      let x  =  "drift"'
done
expect_check 'ignored paths' pass
expect_commit 'ignored paths' allowed
revert

echo
echo "== results"
printf '%s\t%s\t%s\t%s\t%s\n' STATUS ROW EXPECTED ACTUAL DETAIL | cat - "$results" | column -t -s "$(printf '\t')"

if grep -q '^FAIL' "$results"; then
  exit 1
fi
exit 0
