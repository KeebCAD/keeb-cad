---
title: 'fixtures is renamed reference-designs'
type: 'refactor'
ticket: '14'
created: '2026-11-08'
status: done
baseline_revision: '10c75bc5e801a60d6f2a4b148be554f3a2fcc168'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The spine names this package `reference-designs` (AD-10, Structural Seed), while the repository still calls it `fixtures`, so the code and the spine disagree.

**Approach:** Rename the folder and `@keeb-cad/fixtures` to `reference-designs` and `@keeb-cad/reference-designs`, with the depcruise pattern, its `fixtures-only-in-tests` rule (now `reference-designs-only-in-tests`), the depcruise, Vitest, tsconfig, workspace, lint and format lists, the stop hook's path, the ad10 violation fixtures and `AGENTS.md`'s paths. No behaviour change.

## Boundary table

The work introduces no threshold; these rows are what the rename must keep.

| Group | Input | Expected | Level |
|---|---|---|---|
| rules | a non-test file in `model` imports `@keeb-cad/reference-designs` | one `reference-designs-only-in-tests` violation | unit, `tooling/ad10/rules.spec.ts` |
| rules | a `model` spec imports `@keeb-cad/reference-designs` | no violation, and the edge is present | unit, `tooling/ad10/rules.spec.ts` |
| rules | an undrawn import from `reference-designs/src` | its `reference-designs-imports-only-drawn-edges` rule fires, and only it | unit, `tooling/ad10/rules.spec.ts` |
| glue | a change to `/repo/reference-designs/src/a.ts` | the stop hook counts it as a logic file | unit, `tooling/hooks/stop-decision.spec.ts` |

</frozen-after-approval>

## Implementation Notes

Oneshot because the change is about 45 mechanical lines plus a folder move, under the workflow's 100-line limit.

Decision (build): the rule is `reference-designs-only-in-tests`, not the old `fixtures-only-in-tests`, because the ticket says "its fixtures-only-in-tests rule (renamed for what it fences)" and it fences the package now named `reference-designs`.

Decision (build): `readFixture`, `FIXTURE_DIR` and `fixture-files.ts` keep their names, not renamed to match the package, because the ticket's check is "no fixtures package name or path remains" and these name the golden Ergogen files, not the package; `git grep -i fixtures` outside planning docs and installed skills (`_bmad`, `.agents/skills`, `.claude/skills`) and the generated Ergogen output now returns only two ordinary uses of the word (`AGENTS.md:19`, `button-states.ts:1`); the skills' hits are the ordinary word too.

Decision (Sergii): `epic-see-corneys-keys.md:81` changes to `reference-designs/` as a docs commit on main, not left as a dated note with that part of the check waived, because story 13.4 is still to be built and would look for a folder that no longer exists.

Verified: `pnpm check` exit 0; `pnpm test` 288 files, 2562 tests passed; the grep gate has no matches; all 127 moved files are R100 at the move.

## Plan Change Log

## Review Triage Log

Pass 1 (quick, test-reviewer): 0 high, 1 medium, 2 low, 0 false, 0 maybe-false.

- medium, fixed on main at Sergii's decision: `epic-see-corneys-keys.md:81` kept `fixtures/`, so the ticket's verify sentence was not met literally.
- low, patched: the `stop-decision.spec.ts` row label said `a fixture module` for a `reference-designs` path (both lenses); now `a reference-designs module`.
- low, patched: the Implementation Notes grep claim left out the installed skills' hits, which are all the ordinary word; the claim now names what it excludes.

Pass 2 (quick, test-reviewer, on pass 1's patches): 0 high, 0 new medium, 0 low, 0 false, 0 maybe-false. The quick lens repeated pass 1's open `epic-see-corneys-keys.md:81` item, unchanged by the patches and then asked. The review loop ends here.

## Verification

**Commands:**
- `pnpm check` -- expected: passes
- `pnpm test` -- expected: passes
- `git grep -n -E '@keeb-cad/fixtures|fixtures-only-in-tests|FIXTURES' -- . ':(exclude)_bmad-output'` -- expected: no matches
