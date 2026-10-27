---
title: 'Corney fixtures compared on key centres'
type: 'feature'
ticket: '1'
created: '2026-10-27'
status: done
baseline_revision: '6959a58ca9058a486ec4ea5451b1a79a86d08715'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/layout-model/sources/README.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Acceptance (initiative C4) is measured against Ergogen's output for Corney Island v0.3, but no reference output and no comparison exist yet. epic-layout cannot start until there is a golden fixture and a pass/fail harness.

**Approach:** Run pinned Ergogen once on the committed Corney config and its pinned footprints, and commit the verbatim output under `fixtures/corney-island/` with a script that reproduces it. Add a harness to `@keeb-cad/fixtures` that loads key poses (centre + rotation) for the `wired` and `wireless` designs and compares a candidate set against them, reporting every key's deviation and failing, by key name, when one exceeds tolerance.

## Boundaries & Constraints

**Always:** Ergogen pinned to an exact version (4.2.1, latest on npm; it satisfies the config's `engine: 4.1.0`) Decision (2026-10-27, replaces `pnpm dlx`, which pnpm 12 blocks): Ergogen runs from its git tag `v4.2.1` (commit `8286e18f18ac064aa6d2ebca9c449bf2f6ba4d37`), cloned into a temp dir and installed with `npm ci` from its own lockfile, which fixes the GitHub-hosted `hull` and `kle-serial` by commit; nothing enters the workspace lockfile. The config is byte-identical to `_bmad-output/layout-model/sources/corney-island.yaml`; footprints come from the `ceoloide/ergogen-footprints` commit that Corney's HEAD `ad97447838933f41ec9c61358e367bbe2a710d2e` pins, recorded by full SHA. Ergogen output is committed unmodified (all of points, outlines, pcbs, cases, so entry 2 needs no rerun). Wired and wireless come from the one run: same `points`, different `.kicad_pcb`. Keys are the points tagged `key`; helper, underglow and screw points are excluded. Position tolerance is 0.05 mm on Euclidean centre distance, inclusive. Decision (2026-10-27): rotation is checked in mm too, as the corner displacement `|Δr| (rad) × half-diagonal` against the same 0.05 mm, using each key's own keycap size as the config's `_keycap_outlines` define it: `key` → `keycw × keych` (18 × 18 mm), `key_1_5u` → `1.5 keycw × keych` (27 × 18 mm). Ergogen's point `width`/`height` is not used (it is 18 × 18 for every key, the 1.5u one included). Sizes travel with each `KeyPose`.

**Never:** No outline, cutout or footprint comparison (entry 2). No case or tray dimensions. No Ergogen in any `package.json`. No hand-edits to generated files. No production importing fixtures (AD-10 `fixtures-only-in-tests` stays).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Identity | Candidate = fixture keys, wired and wireless | Every key within tolerance; harness passes | No error expected |
| Shifted key | One key centre moved 0.06 mm | Fails; message names that key and its deviation | Report lists only that key as failing |
| At tolerance | One key moved exactly 0.05 mm | Passes | — |
| Rotated key | One key's r changed beyond rotation tolerance | Fails, naming the key | — |
| Missing / extra key | Candidate lacks a fixture key, or has one the fixture lacks | Fails, naming each | Never silently ignored (C6 spirit) |

</frozen-after-approval>

## Code Map

- `fixtures/package.json`, `fixtures/src/index.ts` (`export {}`), `fixtures/tsconfig.json` -- scaffold from entry 1.1; tests go in `src/**/*.test.ts`. No deps yet.
- `vitest.config.ts` -- root lists `fixtures` as a project; nothing to add.
- `.dependency-cruiser.mts` -- `FIXTURES` rule; `options.exclude` regex must also skip `fixtures/corney-island/` (footprint `.js` files).
- `.prettierignore`, `eslint.config.ts` `IGNORED` -- kept in step; both must ignore `fixtures/corney-island/source/` and `fixtures/corney-island/ergogen/` (prettier would reformat YAML, eslint would lint footprints).
- `_bmad-output/layout-model/sources/corney-island.yaml` -- source config. Keys: zone `matrix` (6 cols × 3 rows, tags `key`, `matrix_key`) and `thumbfan` (near, mid, far; far is r=60, tag `key_1_5u`). Expect 21 keys; confirm the thumb tags include `key` when generating.
- Ergogen `--debug` writes `points/points.yaml` (name → `{x, y, r, meta}`), Ergogen frame (y up, degrees). The harness compares in that frame; callers convert.

## Tasks & Acceptance

**Execution:**
- [ ] `fixtures/corney-island/generate.sh` -- fetch footprints at the pinned SHA into `source/footprints/ceoloide/`, copy the config to `source/config.yaml`, clone Ergogen `v4.2.1` into a temp dir, verify its commit, `npm ci`, then run its `src/cli.js source -o ergogen --debug --clean`. Rerunning yields no git diff.
- [ ] `fixtures/corney-island/source/`, `fixtures/corney-island/ergogen/` -- generated once, committed verbatim.
- [ ] `fixtures/corney-island/README.md` -- provenance: Ergogen version, Corney and footprint SHAs, licences (MIT), the command, design → file map.
- [ ] `fixtures/src/key-centres.ts` -- `type KeyPose = {name, x, y, r, width, height}`; `loadKeyPoses(design: 'wired' | 'wireless')` reads points.yaml, filters by tag `key` and sets keycap size from the `key_1_5u` tag (sizes taken from the config's units, not hard-coded guesses); `compareKeyPoses(reference, candidate, tolerances?)` returns per-key deviations and a pass flag; a formatter that names every failing, missing and extra key. Add `yaml` (exact pin) to `fixtures/package.json`.
- [ ] `fixtures/src/key-centres.test.ts` -- one test per I/O matrix row, for both designs; asserts the 0.06 mm failure message names the key.
- [ ] `fixtures/src/index.ts`, `.dependency-cruiser.mts`, `.prettierignore`, `eslint.config.ts` -- export the harness; ignores above.

**Acceptance Criteria:**
- Given the committed fixtures, when running `pnpm vitest run --project @keeb-cad/fixtures`, then it passes for wired and wireless.
- Given a test that shifts one key centre 0.06 mm, when it runs, then the comparison fails and the message names that key.
- Given a fresh run of `generate.sh`, when it finishes, then `git status` shows no change under `fixtures/corney-island/`.
- Given the repo, when running `pnpm check`, then it passes.

## Implementation Notes

- BLOCKED (2026-10-27): `pnpm dlx ergogen@4.2.1` fails under pnpm 12 with `ERR_PNPM_EXOTIC_SUBDEP` — `blockExoticSubdeps` rejects the GitHub-hosted `hull`/`kle-serial`. Passing `--config.block-exotic-subdeps=false` to that one dlx call was denied as a security weakening; needs a human decision (allow the flag in `generate.sh`, or another route). `ergogen/` is therefore not generated and the fixture tests fail until it is.
- The vitest project for `fixtures/` is named `@keeb-cad/fixtures` (from package.json), so `--project fixtures` matches nothing; use `pnpm vitest run --project @keeb-cad/fixtures`.
- Keycap sizes are read from Ergogen's `points/units.yaml` (`keycw`, `keych`), assumed to be written by `--debug`; unverified until the run succeeds.
- Footprints copied: every `*.js` plus `LICENSE` from the pinned tarball (README and `.gitignore` left out).
- UNBLOCKED (2026-10-27): the user chose running Ergogen from tag `v4.2.1` (commit `8286e18`, the same one the layout-model semantics notes were read at) with `npm ci`, recorded in the frozen block. GitHub SSH works here. Generated output is 12 MB (8.5 MB of it `outlines/_debug_points.yaml`). `points/units.yaml` exists with `keycw: 18`, `keych: 18`; 21 `key` points, only `thumbfan_far_home` tagged `key_1_5u` (r = 60). 16 fixture tests and `pnpm check` pass.
- User decision (2026-10-27, after build): `ergogen/outlines/_debug_points.yaml` (8.5 MB, read by nothing) is dropped by `generate.sh` and not committed, an exception to "all output committed". Output is now 3.1 MB.

## Plan Change Log

## Review Triage Log

**Pass 1 (quick):** high 0, medium 2, low 1, false 1, rejected (plan edit) 1.

| Finding | Verdict | Route | Evidence / action |
|---|---|---|---|
| `.kicad_pcb` title block carries the run date, so a rerun on a later day diffs all six PCBs | medium | patch | Ergogen `src/templates/kicad8.js:39` uses `new Date()` unconditionally; config has no date. Patch: run the CLI under a fixed clock (Corney HEAD date 2026-10-23). |
| `rm -rf source ergogen` runs before network steps, so a failed fetch leaves fixtures deleted | medium | patch | Confirmed at `generate.sh` line 15, ahead of curl/clone/`npm ci`. Patch: fetch into `$tmp` first, replace dirs last. |
| `WIDE_FACTOR = 1.5` hard-coded rather than read from config | low | reject | The 1.5 lives in the `_keycap_outlines` expression, not in `units`; reading it means parsing outline config. Correct for the committed fixture, and the 27 × 18 size test catches drift on regeneration. |
| `design` does not change the returned poses | false | reject | By design: the frozen block says wired and wireless share `points` and differ only in the `.kicad_pcb`. |
| Implementation Notes stale (still says BLOCKED) | — | reject | Fix is a plan edit. The unblock is now noted above. |

## Design Notes

The harness compares data to data, so later stories plug in a candidate from the layout engine without touching it: `compareKeyPoses(loadKeyPoses('wired'), engineKeys)`. Rotation is compared modulo 360.

## Verification

**Commands:**
- `pnpm vitest run --project @keeb-cad/fixtures` -- expected: all pass.
- `bash fixtures/corney-island/generate.sh && git status --porcelain fixtures/` -- expected: empty.
- `pnpm check` -- expected: exit 0.
