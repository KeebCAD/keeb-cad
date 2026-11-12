---
title: 'The load flow is named DesignLoader'
type: 'refactor'
ticket: '31'
created: '2026-11-12'
status: 'done'
baseline_revision: '40da249becbeba5127d1e92ba90a93c30ba0a4ce'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: [quick, test-reviewer]
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `commands`' load service is called `LoadFlow`, but the glossary's **flow** now means an editor interaction that needs the person's input (AD-26 Flows), which the loader isn't; the spine names it `DesignLoader` (AD-13 One design loader).

**Approach:** Rename `LoadFlow` to `DesignLoader` (service: a `di` class doing storage I/O, unchanged), `load-flow.ts` and its spec to `design-loader.ts` / `design-loader.spec.ts`, and `LoadFlowError` to `DesignLoaderError`, through the module registration, the package entry and every importer. Local names that hold the loader (`#flow`, `flow`) become `#loader` / `loader`. Behaviour is unchanged.

**Decisions (plan):**
- `DesignLoaderError`, not `DesignLoadError`, because the ticket asks for "a matching name", and the old pair matched one to one (`LoadFlow` / `LoadFlowError`, `load-flow.ts:10-11`); `DesignLoadError` would also sit one word from `schema`'s `LoadError`, which is a member of a different union (`packages/schema/src/index.ts:89`).
- `#flow` / `flow` locals renamed to `#loader` / `loader`, not left, because AGENTS.md says "Name a thing for what it does, checked against the spine's glossary", and the glossary's flow no longer fits the loader.
- Dated history (`deferred-work.md:294`, earlier plans) keeps `LoadFlow`, not rewritten, because they record what the code was called then.

## Boundary table

No threshold is introduced or relied on; the existing `load-flow.spec.ts` rows move unchanged with the rename.

| Group | Row | Input / state | Expected | Level |
|---|---|---|---|---|
| glue | names | `git grep -niE "load-?flow" -- packages app` | no match | repo check |
| glue | reload | dev server, make a design, reload | the same design reopens | manual |

</frozen-after-approval>

## Implementation Notes

Oneshot: one class rename across eight files, about 40 lines, no logic change.

- Renamed with `git mv` (`load-flow.ts` → `design-loader.ts`, spec likewise; git sees both as renames) and one identifier pass over `design-loader.ts`, its spec, `load-module.ts`, `open-stored-design.ts`, `types.ts`, `index.ts`, `app/src/autosave/autosave.spec.ts`, `app/src/reset-survives-autosave.spec.ts`; Prettier re-wrapped one `arrange({...})` call.
- `git grep -niE "load-?flow"` outside `_bmad-output/` and `_bmad/`: no match (configs, Stryker, dependency-cruiser and ESLint never named it).
- No structural changes (tsconfig, package.json, configs); no fakes of a third-party host added, so no `Real-host run:` needed. No toggled bug: no behaviour changed, and the moved spec rows ran green under their new names.
- Verification: `pnpm typecheck`, `pnpm lint` clean; `pnpm test` 578 files / 4712 tests green, no type errors. The manual reload check is left to Sergii's look.

## Review Triage Log

Pass 1 (quick, test-reviewer): 0 high, 0 medium, 0 low, 0 false, 0 maybe-false. Ends the loop.
- quick: no findings; names gone from `packages/` and `app/`, behaviour unchanged, matches AD-13.
- test-reviewer: checked 7 tests in `design-loader.spec.ts` and the two app specs, no findings.

## Verification

**Commands:**
- `git grep -niE "load-?flow" -- packages app` -- expected: no output
- `pnpm test` -- expected: whole suite green
- `pnpm lint` -- expected: clean
- `pnpm typecheck` -- expected: clean

**Manual checks:**
- `pnpm dev`, change the design, reload: the last design reopens as before.
