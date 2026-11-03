---
title: 'Commands run through the register'
type: 'feature'
ticket: '2'
created: '2026-11-03'
status: 'built'
baseline_revision: '45caf640d342e2108d1c5d88dce8fc252ea7ecc6'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `schema`, `design`, `hashing`, `model` and `reactive` are `export {}` stubs, so nothing can change a design: there is no design state, no command register and no typed refusal. Every later story (23.3 onward) defines commands on this register.

**Approach:** Build AD-2's mechanism in `design` on the meta section (`id`, `name`, `form`) as the first real data: the design service, `defineCommand`/`defineAction`, the register over `di` multi tokens, Immer writes with patches, `replaceDesign`, the seq, the revision and the commit event; the types and schemas it needs in `schema` (spine Data Schema, 2026-11-03); a provisional synchronous `hash` in `hashing`; an empty structural-check list in `model/main`; and app's main container.

## Boundaries & Constraints

**Always:** Spine AD-2, AD-10, AD-24 and the Data Schema as of bc1bf6c. Schemas are Valibot with no transforms; a type with a schema is inferred from it; `Frozen`, `Mutable`, `Result`, `SchemaIssue`, `Rejection`, `DesignInvalid`, `ItemId` are plain TypeScript in `schema`. Only `design` imports `immer`; only `reactive` imports `@vue/reactivity`. `hash(value)` is synchronous and returns `string`; `design` parses it with the `Revision` schema. Every expected failure returns `Result`; `run` throws only on a bug. Non-DOM specs run on Node.

**Never:** No `newDesign`, id minting, layout, gap, `defaultPart`, `ref(kind)`, `Length`, `Expression`, provenance, undo, `Violation`, `Fix`, `reject()` or model rejection kind (stories 3, 13.2, 13.18, 14.1, 13.3). No stale-seq check or `run` seq argument (epic-drag-keys). No `format-version` or `DesignFile` (story 3). No derived files or bundle in `replaceDesign` (story 5). No component access to the container (story 7). No change to AD-10's `GRAPH`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Command applies | test rename command, valid input | `ok`; new design deeply frozen, no proxy; one commit event with patches, seq +1, revision | — |
| Caller input | plain object, or a Vue `reactive()` object | caller's object stays unfrozen; the design holds plain data | — |
| Apply rejects | apply returns a Rejection | `{ ok: false, error }`; design ref unchanged, no event, seq unchanged | no throw |
| Invalid input | input fails the command's schema | `input-invalid` with the command's id and each issue's path | no throw |
| Unavailable | availability check false | `unavailable` with the command's id | no throw |
| Duplicate id | two definitions with one id | resolving the register throws at startup | `DuplicateCommandIdError` |
| Valid load | meta-only design | `replaceDesign` ok; design deeply frozen; seq +1; event with whole value | — |
| Unknown form | `meta.form.type` not split or unibody | `design-invalid`, an issue at `['meta','form','type']` | no throw |

</frozen-after-approval>

## Code Map

- `packages/schema/src/index.ts` -- stub; gains Valibot schemas `idSchema`, `revisionSchema`, `formSchema`, `metaSchema`, `designSchema` (`{ meta }`) with inferred `Id`, `Revision`, `Form`, `Meta`, `Design`; plain types `Frozen`, `Mutable`, `Result`, `SchemaIssue`, `ItemId` (`Id` only), `Rejection`, `DesignInvalid`. `package.json` has no deps: add `valibot` (catalog), `vitest` dev.
- `packages/reactive/src/index.ts` -- stub; becomes `export * from '@vue/reactivity'` (its first reader; spine: "the `@vue/reactivity` re-export"). The recompute trace stays for its own story.
- `packages/hashing/src/index.ts` -- stub; `hash(value): string`: canonical encoding (sorted keys, `undefined` fields skipped, numbers via JSON) then SHA-256 hex with `@noble/hashes` 2.4.0 (`sha2.js` `sha256`, `utils.js` `bytesToHex`), verified current on npm 2026-11-03. Kernel: no workspace import.
- `packages/model/src/main.ts` -- stub; exports `checkStructure(design: Frozen<Design>): Rejection | undefined` over an empty check list (13.3 adds the cycle). Add `@keeb-cad/schema`.
- `packages/design/src/` -- `index.ts` and `worker.ts` stubs; `immer` ^11.2.9 already declared. Add `@keeb-cad/{schema,model,hashing,reactive,di}`, `valibot`, `vitest` dev.
- `packages/di/src/index.ts` -- `Container`, `createToken`, `createMultiToken`, `inject`, `Module`, `Lifetime`; `container.resolve(multi)` returns `T[]`, an empty multi token resolves to `[]`. Reuse; do not change.
- `app/src/main.ts` -- mounts the editor only; `app/package.json` lacks `@keeb-cad/{di,design}`.
- `.dependency-cruiser.mts` -- `design` may import `model` only via `model/main` (`ENTRY_ONLY`); `only-design-imports-immer`, `only-reactive-imports-vue-reactivity` already exist. Read-only.
- Cross-package `.ts` imports typecheck under `vue-tsc --build` with the existing composite tsconfigs (probed 2026-11-03). `packages/*` without a vitest config run as Node projects of the root `vitest.config.ts`.
- `_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md` -- Stack table: add the `@noble/hashes` row.

## Tasks & Acceptance

**Execution:**
- [x] `packages/schema/src/` (`kinds.ts`, `design.ts`, `results.ts`, `types.ts`, `index.ts`) -- the schemas and types above, exactly as the Data Schema writes them; `Id` is kebab-case (AD-8); `Rejection`'s fourth variant has `kind: never` until 13.3 -- 23.2's slice of the Data Schema.
- [x] `packages/reactive/src/index.ts`, `package.json` -- the re-export.
- [x] `packages/hashing/src/index.ts`, `hash.spec.ts`, `package.json` -- `hash`; specs: key order does not change the hash, a changed value does, `undefined` fields are skipped.
- [x] `packages/model/src/main.ts`, `package.json` -- `checkStructure`.
- [x] `packages/design/src/immer.ts` -- the register's Immer file, the only `immer` importer: `new Immer({ autoFreeze: true })`, `enablePatches()`, `Writable<T>` over `Draft<T>`, the produce-with-patches helper, `applyDesignPatches(design, patches)` (apply + deep freeze), `freeze(value, true)`.
- [x] `packages/design/src/state.ts` -- `DesignState` service: `shallowRef<Frozen<Design> | undefined>`, the seq counter, `onCommit(listener) → unsubscribe`, `replaceDesign(value: unknown): Result<void, DesignInvalid>` (parse `designSchema`, map issues to `SchemaIssue`, deep-freeze, write, seq +1, revision, `replace` event).
- [x] `packages/design/src/register.ts` -- `defineCommand`/`defineAction` (`id` inferred as a literal, `label: () => string`, `input` schema, `available(design)`, `apply`), `commandsToken`/`actionsToken` multi tokens, `CommandRegister` (injects both, throws `DuplicateCommandIdError` on a shared id, `run(handle, input): Result<void, Rejection>`, `entries()` for labels and availability). Command run: parse → available → produce → keep a returned Rejection outside the producer → `checkStructure` → write, seq +1, revision, `commit` event. Action run: parse → available → apply. `run` with no design loaded throws (a bug).
- [x] `packages/design/src/module.ts`, `index.ts`, `worker.ts` -- a `designModule` registering state and register; the main entry exports the above (not `applyDesignPatches`); `worker.ts` exports `applyDesignPatches` only.
- [x] `packages/design/src/register.spec.ts`, `state.spec.ts` -- every I/O row; the patches row (patches applied through `applyDesignPatches` to the previous design equal the new one); a type test (`@ts-expect-error` on a nested write to a `Frozen<Design>`; `Writable<Design>` assignable to `Mutable<Design>`); same design value → same revision.
- [x] `app/src/main.ts`, `app/package.json` -- build a `Container`, `addModules([designModule])`, before mounting the editor.
- [x] spine Stack table -- `@noble/hashes` row.

**Acceptance Criteria:**
- Given a container with the test rename command, when it runs with valid input, then the design's name changes and the value is deeply frozen with no Vue proxy anywhere in it.
- Given app's main container, when a second registration of the same token is made, then di throws `DuplicateRegistrationError`.
- Given the workspace, when `pnpm check` and `sh tooling/verify-checks.sh` run, then both pass.

## Implementation Notes

- `design` and `app` compile `di`'s source, which calls `Symbol.dispose`; both tsconfigs add `ESNext.Disposable` to `lib`, as `di`'s own does.
- `reactive/src/index.ts` disables `vue/prefer-import-from-vue` on its one line: the package is Vue-free by design (AD-10).
- `design` exports a plain `DesignPatch` type (Immer's patch shape) for the commit event, so no Immer type leaves the package.
- `run` also throws for a handle the register does not hold ("only registered commands run"); `entries()` returns `{ handle, label, available }`.
- `CommandRegister` is registered eager and `main.ts` awaits `autoLoad()` before mounting (AD-25), so a duplicate id fails at startup.
- The `DuplicateRegistrationError` criterion is proven in `register.spec.ts` (adding `designModule` twice), since `app` has no unit-test project.

- Verification (parent session): `tooling/verify-checks.sh` failed at setup on the untracked `.claude/worktrees/` folders; fixed by ignoring them in `.gitignore` (own commit on this branch). The real script then passed every row. The plan's `--project design` names are `@keeb-cad/design` etc.

## Plan Change Log

## Review Triage Log

Pass 1 (quick): high 1, medium 1, low 6, false 0, maybe-false 0 (plus 2 rejected).

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | `Frozen`/`Mutable` map a branded string (`Id`, `Revision`) as an object | high | patch | Confirmed by a typecheck probe: `Frozen<Design>['meta']['id']` is assignable to neither `Id` nor `string`; 13.3's `reject(kind, ids)` would not compile. Fix: primitive guard before the object branch, plus a type test. |
| 2 | `hash` encodes `NaN`/`Infinity` as `null` and Maps/Dates as `{}` | medium | patch | Real: `JSON.stringify(NaN)` is `null`; `LayoutOutput` posts NaN frames by design, so a pipeline hash would collide with `null`. Fix: bare `NaN`/`Infinity`/`-Infinity` tokens; throw on a non-plain object; `match` from ts-pattern (finding 10). |
| 3 | `#write` sets the ref before `seq`/`revision` | low | patch | Real: a sync effect on the ref reads the old seq and revision. Fix: assign seq and revision first. |
| 4 | Reactive-input test cannot fail | low | patch | Real: `renameDesign` copies a string only. Fix: a test command whose object input is written into the draft. |
| 5 | `deepFreeze` docstring claims a deep freeze that Immer skips on frozen nodes | low | patch | Real: Immer's `freeze` returns early on a frozen object; produced values are already deep-frozen by autoFreeze. Fix: docstring says so. |
| 6 | `match` not used for new branching (memory: use ts-pattern) | low | patch | Real for `hash`'s `switch (typeof)`; folded into finding 2's fix. The register's two-way `if` is not an exhaustiveness switch; left. |
| 7 | A command that changes nothing still commits | low | defer | Real: empty patches still bump the seq and emit. Harmless until undo; whether a no-op is an undo entry is undecided (spine silent). Deferred to 14.1. |
| 8 | `DesignPatch` lives in `design`, but `protocol` must type the patches message from `schema` | medium | defer | Real spine gap: the Data Schema has no patch type, and `protocol` can't import `design`. Not wrong for 23.2 (no protocol yet); the spine must define it before 23.4. |
| 9 | One throwing commit listener stops later listeners | low | reject | Only a subscriber bug reaches it, and it fails loudly (`run` throws); isolation adds branches for an unshown path. |
| 10 | AC 2 is proven on a test container, not app's | low | reject | app's `main.ts` adds the same `designModule`; the duplicate is di's own behaviour; an app unit-test project is more than a direct correction. |

## Design Notes

- `immer.ts` is "the register's file" for Immer: `design/worker` imports it without reaching the register service, `di` or `model/main`.
- `Design` is `{ meta }` now; story 3 adds `layout` to `designSchema` and `DesignFile` with `formatVersion` (first reader).
- The commit event is a plain listener set on `DesignState`, no event library: `{ kind: 'commit', patches, seq, revision } | { kind: 'replace', design, seq, revision }`.
- `label` is a function so menus re-read it after a locale change; no i18n library yet.
- Actions apply synchronously; the first async action (Save) widens the signature.
- Golden shape:
  ```ts
  export const renameDesign = defineCommand({
    id: 'test.renameDesign', label: () => 'Rename', input: v.object({ name: v.string() }),
    available: () => true, apply: (draft, { name }) => { draft.meta.name = name },
  })
  ```

## Verification

**Commands:**
- `pnpm install && pnpm check` -- expected: typecheck, lint, format, depcruise, tests, build and smoke pass.
- `pnpm vitest run --project design --project schema --project hashing` -- expected: the new specs pass.
- `sh tooling/verify-checks.sh` -- expected: every row PASS.
