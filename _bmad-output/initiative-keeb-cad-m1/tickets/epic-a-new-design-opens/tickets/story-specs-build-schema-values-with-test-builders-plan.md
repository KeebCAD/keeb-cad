---
title: 'Specs build schema values with test builders'
type: 'refactor'
ticket: '17'
created: '2026-11-06'
status: done
baseline_revision: 'edd63fd460f4bfd3e0baf4be452be0cab503bde6'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Specs copy whole meta, layout and derived-file literals they never read (storage's read-bundle and write-bundle, design-file's migrate-bundle, design's `emptyLayoutDesign`, schema's own specs), so every new required field means editing each of them. The spine's Test builders row settles the fix: hand-written builders in `schema/testing`, imported only by tests.

**Approach:** Add `schema/testing` with `aMeta`, `aForm`, `aLayout`, `aDesign`, `aRoutingFile` and `aFingerprintsFile`, each returning a valid value whose fields a test overrides one by one; fence every package's `testing` folder to tests with one dependency-cruiser rule and violation fixtures; move the specs onto the builders. No behaviour change.

**Decisions (Sergii, 2026-11-06):** these supersede ticket 23.17's description and verify lines where they differ.
- commands' `new-design.spec.ts` stays as written, not moved onto builders, because its expected bundle is NewDesign's output with every field asserted: data the test is about.
- design's `emptyLayoutDesign()` is replaced by the builders at every call site and deleted in this PR, not deferred, because two default designs would both change with every new field.
- schema's own `meta.spec.ts` and `layout.spec.ts` move onto `aLayout()` and `aMeta()`, not left as written; each keeps the section it is about written out.
- One rule fences every package's `testing` folder (imported only by spec files and by other `testing` folders), not a second copy of result's rule, because a package's own test helpers (`design/src/testing`, a later `aBundle()`) must be able to build on schema's builders, and `design/src/testing` is unfenced today. result's rule is replaced by it.
- `aRoutingFile` and `aFingerprintsFile` are added, not left as copied literals, because write-bundle and read-bundle copy both files without reading them.
- A builder's file in `testing/` takes its schema file's name (`testing/meta.ts` holds `aMeta`, beside `src/meta.ts`), not the builder's name (`a-meta.ts`, as `result`'s `expect-ok.ts`), because the builders then line up with the schemas they build, and a concept's later builders (`aChainGroup` beside `aLayout`) share its file.
- (after build) A variant schema gets a builder per branch and one common builder taking only the discriminator, which returns that branch's builder output: `aSplitForm`, `aUnibodyForm`, `aForm(type)`; `aFreeGroup`, `aChainGroup`, `aGroup(arrangement)`; `aLayout` stays the design's root, built on `aFreeGroup` with id `root`. Not one builder fixed to one branch, because a test then reads a branch's fields (`aForm('split').board`) without narrowing. The rule is in the spine's Test builders row (6df7480).
- (after build) The common builder picks the branch through a record keyed by the discriminator, not ts-pattern's `match`, because indexing a mapped type with `T` keeps the branch's return type with no cast (checked: `match` over a generic `T` returns the union, TS2322), and overloads with `match` leave the body loosely checked against its signatures.
- (after build) Every branded concept gets a builder: `anId`, `aRevision`, `aHash`, `aFormatVersion` take their raw value as an optional argument and parse it; `aFingerprint` takes fields. Not only `Id` and `Revision`, because the spine's Test builders row has each schema concept ship one. Builders and specs then hold no `v.parse` of a branded schema; `mintId` and `revisionOf` keep theirs (production).
- (review of the post-build commits) The scalar builders' one test checks that each returns its argument (`expect(aRevision('r2')).toBe('r2')`), not that its output parses, because a builder that is only `v.parse` throws before a parse test could fail; the spine's Test builders row says so (e299b2e).
- (review of #21) A builder's tests show its default output parses and each field it takes comes back when passed, one `it.each` row per field asserting the passed value; a scalar builder shows it returns its default, returns its argument and refuses a value its schema refuses. Not one parse test, because that never checks an override, which is what a builder is for (spine 72857e6).
- (review of the post-build commits) `aSlot` is added, not left until a story needs a slot, because the spine has each schema concept ship a builder.
- read-bundle's input KDL texts stay written out, not built with design-file's writers, because a writer bug and a mirrored reader bug would cancel out; its routing and fingerprints revisions stay distinct (`r1`, `r2`).

## Boundaries & Constraints

**Always:** Every builder call returns new objects; no default lives in a shared module-level constant (design's specs freeze builder output). Builders are hand-written defaults, never generated from the Valibot schemas (spine Test builders row). Each builder has one test: its output parses through its schema (superseded by the builder-tests decision below and the spine's Test builders row, 72857e6). Data a test is about stays written out: design-file's KDL texts in read-kdl, round-trip, write-design-file and migrate-bundle, and storage's read-bundle texts.

**Never:** No production code change. No new design-file field, schema or shared kind. No snapshot. No cast or `@ts-expect-error` to build an invalid value.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Defaults | `aDesign()` | a `Design` that `designSchema` accepts | none |
| Fence | a production file imports a package's `testing` subpath or folder | dependency-cruiser reports `only-tests-import-testing` | lint fails |
| Fence | a spec, or another `testing` folder, imports one | no violation | none |

</frozen-after-approval>

## Code Map

- `packages/schema/src/` -- `meta.ts`, `form.ts` (`v.variant('type', …)`), `layout.ts` (`freeGroupSchema`), `design.ts`, `routing-file.ts`, `fingerprints-file.ts`, `id.ts`, `revision.ts` (branded); types `Meta`, `Form`, `FreeGroup`, `Design`, `RoutingFile`, `FingerprintsFile` in `types.ts`. `package.json` exports only `.`. `tsconfig.lib.json` excludes only `*.spec.ts`, so `src/testing/` is type-checked as library code.
- `packages/result/` -- the subpath precedent: `"./testing": "./src/testing/index.ts"`, one helper per file, `index.ts` re-exports only.
- `.dependency-cruiser.mts` L368 `only-specs-import-result-testing` -- replaced by the general rule (`TEST_FILE` at L155).
- Spine (`architecture-keeb-cad-layout-model.md`) L333 (schema package line: `only spec files import it`), L1012 (Test builders row: `imported only by spec files`), L1085 (seed: `(aMeta, aLayout, aDesign); spec files only`) -- now out of date with Sergii's fence and builder decisions.
- `tooling/ad10/violations/packages/storage/src/index.ts` (imports `@keeb-cad/result/testing`) and `x.spec.ts` -- add `@keeb-cad/schema/testing` to both. `tooling/ad10/rules.spec.ts` L217 (violation row) and L267 (`allows a storage test to import result/testing`) -- rename to the new rule, add schema rows.
- `packages/storage/src/bundle/read-bundle.spec.ts`, `write-bundle.spec.ts` -- storage's test is which text goes to which file; design-file owns the texts.
- `packages/design-file/src/migrate-bundle.spec.ts` L15 `const design`, and `{ revision: 'r1' }` / `{ revision: 'r1', fingerprints: [] }` expected values -- read from the hand-written texts.
- `packages/design/src/testing/empty-layout-design.ts` + re-export -- delete. Call sites: `store/design-store.spec.ts` (L110–L695; L565's spread override; L695–696 mutates `meta.id = 'Corne'` for an invalid design), `patching/design-patcher.spec.ts` L14, L44, `patching/deep-freeze.spec.ts` L8. `replaceDesign` takes `MigratedBundle`, whose `design` is `unknown`.
- `packages/schema/src/meta.spec.ts` (copies `layout`), `layout.spec.ts` L6 module-level `const meta`.
- `packages/commands/src/design/new-design.spec.ts` -- do not change.
- tsconfig: `strict`, no `exactOptionalPropertyTypes`, so `Partial<T>` admits `undefined` values.

## Tasks & Acceptance

**Execution:**
- [x] `packages/schema/src/testing/` (since grown to every concept: see the Boundary Table) -- `meta.ts` (`aMeta`), `form.ts` (`aForm`), `layout.ts` (`aLayout`), `design.ts` (`aDesign`), `routing-file.ts` (`aRoutingFile`), `fingerprints-file.ts` (`aFingerprintsFile`), each named for its schema file in `src/`; `index.ts` re-exports only.
- [x] `packages/schema/src/testing/<schema file>.spec.ts` (`meta.spec.ts`, …) -- one test per builder (superseded: see the frozen block's builder-tests decision, Implementation Notes for the common builders, and the Boundary Table): `expect(v.safeParse(<its schema>, aX()).issues).toBeUndefined()`; `aLayout` against `freeGroupSchema`.
- [x] `packages/schema/package.json` -- `"./testing": "./src/testing/index.ts"`.
- [x] `.dependency-cruiser.mts` -- replace `only-specs-import-result-testing` by `only-tests-import-testing`: `from.pathNot: [TEST_FILE, '^packages/[^/]+/src/testing/']`, `to.path: ['^packages/[^/]+/src/testing/', '^@keeb-cad/[^/]+/testing$']`.
- [x] `tooling/ad10/violations/packages/storage/src/index.ts`, `x.spec.ts`, `tooling/ad10/rules.spec.ts` -- the renamed result row, a schema/testing violation row, and the allowed-spec test covering both subpaths. New fixture `tooling/ad10/violations/packages/design/src/testing/bundle.ts` importing `@keeb-cad/schema/testing`, with a test that it reports nothing and the edge was cruised; `tooling/ad10/violations/packages/design/src/index.ts` imports `./testing/bundle` (a resolved folder import) as a violation row.
- [x] `packages/storage/src/bundle/read-bundle.spec.ts` -- KDL texts stay written out (`revision "r1"`, `revision "r2"`); expected `aDesign()`, `aRoutingFile()`, `aFingerprintsFile({ revision: v.parse(revisionSchema, 'r2') })`, built inside each test.
- [x] `packages/storage/src/bundle/write-bundle.spec.ts` -- `{ design: aDesign(), routing: aRoutingFile(), fingerprints: aFingerprintsFile() }`.
- [x] `packages/design-file/src/migrate-bundle.spec.ts` -- module-level `const design` removed; each test's expected value calls `aDesign()`, `aRoutingFile()`, `aFingerprintsFile()`; the `it.each` rows carry only the derived part and the test body adds `design: aDesign()`, so no builder runs at collection time; KDL texts unchanged.
- [x] `packages/design/src/` -- every `emptyLayoutDesign()` → `aDesign()` (overrides through `aMeta`); the invalid-id test builds `{ ...aDesign(), meta: { ...aMeta(), id: 'Corne' } }`; delete `testing/empty-layout-design.ts` and its re-export.
- [x] `packages/schema/src/meta.spec.ts`, `layout.spec.ts` -- `{ meta: { ...aMeta(), key: { id: 'k1' } }, layout: aLayout() }`; `meta: aMeta()` inside each test in place of the module-level `const meta`; builders from `./testing`.
- [x] Spine, docs-only commit straight to main before the PR (done in edd63fd460f4bfd3e0baf4be452be0cab503bde6) -- L333 and L1012: imported only by spec files and other packages' `testing` folders; L1085: `(aMeta, aForm, aLayout, aDesign, aRoutingFile, aFingerprintsFile); tests and testing folders only`.
- [x] Stryker on `migrate-bundle.ts`, `read-bundle.ts`, `write-bundle.ts`; a verdict per new survivor.

**Acceptance Criteria:**
- Given every builder in `schema/testing`, when its spec runs, then it proves what the spine's Test builders row asks of it (default parses and each field override, or a scalar's default, argument and refusal; a common builder's branches).
- Given the storage production fixture importing `@keeb-cad/result/testing` and `@keeb-cad/schema/testing`, when `rules.spec.ts` runs, then each import reports `only-tests-import-testing` and `x.spec.ts` reports none.
- Given read-bundle, write-bundle, migrate-bundle, design's specs and schema's meta and layout specs, when read, then none holds a meta, layout, routing or fingerprints object literal it does not assert on, none holds one at module level, and `emptyLayoutDesign` no longer exists.
- Given the workspace, when `pnpm check` and `pnpm test` run, then both pass.

## Implementation Notes

- After build (Sergii's variant rule): `aSplitForm`, `aUnibodyForm`, `aForm(type)`, `aFreeGroup`, `aChainGroup`, `aGroup(arrangement)` added; `aMeta`'s default form is `aSplitForm()`; `aLayout` is `aFreeGroup` with id `root`, its id taken with a destructuring default so `aLayout({ id: undefined })` keeps `root`. Each branch builder's test parses through its schema; `aForm` and `aGroup` have one `it.each` row per branch, expecting the branch builder's output. Decision: branch builders' default ids are `free-group` and `chain-group`, not `root`, because `root` is `aLayout`'s. The implementer's `aForm` returning `Form` is superseded.
- After build (branded builders): defaults `id`, `r1`, `h1`, `1`, not unique per call, because each caller passes the text that matters; (superseded in #21: `anId` and `aFormatVersion` now test a refusal) a malformed value throwing is not tested. Call sites moved: `aMeta`, the group builders, both derived-file builders, read-bundle and write-bundle (`aRevision('r2')`), design's `empty-derived-files.spec.ts`.
- Review of the post-build commits, decisions: `aChainGroup`'s axis defaults to `x`, not `y`, because nothing reads it yet and `x` is the schema's first; `aFingerprint` defaults to `id`, `slice` and `outputs` hashes named for their fields, not one shared hash, so a mix-up between the two hashes shows; `aForm` and `aGroup` are tested by `toEqual(branchBuilder())`, not by parsing, because each branch builder's own test proves its output parses and the row proves the common builder picks that branch. Toggled bug: `aRevision` ignoring its argument turned its test red; restored, green.
- #21 decisions: `aSlot`'s id defaults to `slot`, not `id`, so a slot and a fingerprint's default ids differ; branch builders no longer take their discriminator (`Omit<…, 'arrangement' | 'type'>`), not a field whose only value is the default, because an override row on it could not fail; `aRevision` and `aHash` have no refusal row, because their schemas accept every string; override rows build their fields in a thunk, not at collection time. Toggled bug: `aMeta` dropping its `name` turned `keeps the name it is given` red; restored, green.
- #21 pass 4 decisions: a one-field builder keeps a one-row `it.each`, not a plain `it`, because the spine asks for one row per field and a later field is then one more row; override rows assert `toMatchObject(fields)`, not the whole value, because the whole value could only be computed the way the builder builds it, accepting that a builder overwriting another field's default is not seen.
- Stryker (migrate-bundle, read-bundle, write-bundle): 29 of 29 killed, score 100; 23.3's three equivalents did not show this run. Re-run by the orchestrator after implementation: same result.
- Toggled bug: dropping the testing folder from the fence's importer exemption turned the testing-folder test red; narrowing the target to result/testing turned the violation row red; restored, green.
- Implementer's decisions: migrate-bundle's `it.each` rows carry a thunk, not an object, so no builder runs at collection time; the fence's folder regex is the constant `TESTING_FOLDER`, not inlined twice, because both sides use it; (superseded by the variant builders; its reason was also wrong: the variant needed no alias) `aForm` returns `Form`; design-patcher's spec uses `aDesign()`, not `v.parse(designSchema, aDesign())`, because the builder already returns a `Design`; design-store's overrides use `aDesign({ meta: aMeta({ … }) })`, not spreads.

## Plan Change Log

## Review Triage Log

Pass 1 (quick, test-reviewer): high 0, medium 0, low 6, false 1, maybe-false 0; no quote dropped.

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | write-bundle's routing and fingerprints share revision `r1` (both lenses) | low | patch | Real: the old arrange had r1/r2; a writer swapping revisions now passes. Fingerprints overridden to `r2`. |
| 2 | design-store's "deep-freezes the derived files it keeps" copies routing/fingerprints literals it doesn't assert on | low | patch | Real: the test checks only frozenness; AC3. Built with `aRoutingFile()`/`aFingerprintsFile()`. |
| 3 | rules.spec.ts restates the allowed-edge assertion in two separate tests | low | patch | Real: the `it.each` "Each allowed edge reports nothing and was really cruised" already holds it; AGENTS.md "Write a shared assertion once". Moved to rows. |
| 4 | Fence misses nested `src/<x>/testing/` and `app/src/testing/`; `$` anchor misses deeper specifiers | low | reject | No such folder exists or is sanctioned (spine: the `testing` subpath of the owning package); a deeper `@keeb-cad/x/testing/foo` cannot resolve, since `exports` lists only `./testing`. Widening adds regex for no reachable case. |
| 5 | No fixture proves a bare `@keeb-cad/*/testing` resolved to `packages/*/src/testing/index.ts` is caught | low | defer | Pre-existing for result/testing; the relative fixture proves `TESTING_FOLDER` on the resolved path shape, the resolution itself is dependency-cruiser's. |
| 6 | Stryker ticked with no recorded run or verdict | false | reject | The run happened (29/29 killed, re-run by the orchestrator); the fix edits this build's plan. Recorded in Implementation Notes. |

Pass 2 (quick, test-reviewer, on the commits after pass 1: 24f8b89..d860a8e, per AGENTS.md's after-review rule): high 0, medium 0, low 9, false 0, maybe-false 0; no quote dropped.

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | Scalar builders' parse tests cannot fail | low | patch (Sergii) | Real: `v.parse` throws before the `expect`; an ignored argument passes. Tests now check the argument comes back; spine row amended. |
| 2 | No `aSlot` | low | patch (Sergii) | Real: `slotSchema` and `Slot` exist; spine rule. Added. |
| 3 | Defaults `axis`, `slice`, `outputs`, fingerprint id unrecorded | low | patch | Recorded in Implementation Notes. |
| 4 | `aForm`/`aGroup` tests don't parse, no decision | low | patch | Recorded as a decision. |
| 5 | Spine seed line lists six builders | low | patch | Updated (e299b2e). |
| 6 | Boundary Table, Tasks, Design Notes stale | low | patch | Updated. |
| 7 | Superseded implementer decision still listed | low | patch | Marked superseded, with its wrong reason. |
| 8 | `aLayout().id` being `root` untested | low | reject | The spine's Test builders row (72857e6) asks for the default output to parse and each override to come back, not for default values; the destructuring default holds it by construction. |
| 9 | Post-build code never reviewed | low | patch | This pass. |

Pass 3 (quick, test-reviewer, on #21's 01908e2): high 0, medium 1, low 9, false 0, maybe-false 0; no quote dropped.

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | Scalar tests take one argument: a hard-coded value or a cast instead of a parse passes (both lenses) | low | patch (Sergii) | Real. Scalar tests now cover default, argument and refusal. |
| 2 | Scalar defaults no longer exercised by their own spec | medium | patch (Sergii) | Real: a bad default would throw only at distant call sites. Default row added. |
| 3 | No builder test checks an override (Sergii) | medium | patch (Sergii) | Real: `aMeta` ignoring `name` passed every builder spec. One override row per field; spine 72857e6. |
| 4 | Acceptance criterion still "six builders … parses" | low | patch | Reworded. |
| 5 | Tasks list six builders | low | patch | Marked grown. |
| 6 | Tasks note points at the wrong section | low | patch | Fixed. |
| 7 | Frozen "Always" line contradicts the scalar decision | low | patch | Marked superseded, by Sergii's builder-tests decision. |
| 8 | `aSlot`'s default id unrecorded (both lenses) | low | patch | Recorded. |
| 9 | Scalar test names claim a checked value | low | patch | Names now say what each row returns; refusal is its own test. |
| 10 | Conformance Log line stale | low | patch | Updated. |

Pass 4 (quick, test-reviewer, on #21's 76ac1cb): high 0, medium 0, low 7, false 0, maybe-false 0; no quote dropped.

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | Refusal tests show only that the builder parses; schema boundaries belong to the schema specs | low | reject | That is the test's purpose; `id.spec.ts` and `format-version.spec.ts` hold the schemas' boundary rows. |
| 2 | Single-row `it.each` for one-field builders unrecorded | low | patch | Recorded as a decision. |
| 3 | `toMatchObject` misses a builder that overwrites another field or adds keys | low | patch | Real; asserting the whole value would build the expected value from the builder, which the spine forbids. Recorded as the trade-off. |
| 4 | Branded-builder note still says a refusal is untested | low | patch | Marked superseded. |
| 5 | Pass 2 row 8's reason cites a removed rule | low | patch | Evidence updated; verdict stands. |
| 6 | No triage entry for 76ac1cb | low | patch | This pass. |
| 7 | The override body is repeated in ten specs (`Write a shared assertion once`) | low | reject | The repeated line is the act on a different builder each time; a shared helper would hide which builder each spec calls, for two lines. |

## Design Notes

**Decision (plan): builders return the schema's output type**, not its input type, because specs hand them to typed functions (`writeBundle`, `writeDesignFile`) and a `v.parse` at each call site is what builders remove. Ids and revisions are branded through `anId` and `aRevision` (superseding `v.parse` inside each builder), never a cast.

**Decision (plan): signatures** (form and group superseded by Sergii's variant rule in the frozen block) are `aMeta(fields: Partial<Meta> = {}): Meta`, `aLayout(fields: Partial<FreeGroup> = {}): FreeGroup`, `aDesign(fields: Partial<Design> = {}): Design`, `aRoutingFile(fields: Partial<RoutingFile> = {})`, `aFingerprintsFile(fields: Partial<FingerprintsFile> = {})`. Branch builders take only their own branch's fields, not a union-typed override, because `Partial` over a variant lets a test mix two variants' fields.

**Decision (plan): fields are taken with destructuring defaults**, not a spread over the defaults, because a spread lets `aDesign({ meta: undefined })` drop the default (no `exactOptionalPropertyTypes`). Overrides are per field, not a deep merge, because each nested value has its own builder.

```ts
export function aDesign({ meta = aMeta(), layout = aLayout() }: Partial<Design> = {}): Design {
  return { meta, layout }
}
```

**Decision (plan): defaults are today's copied literals** (`corne`, `Corne`, split reversible, a free root `root` with no children; revision `r1` in both derived files, fingerprints `[]`), not new values, because migrate-bundle's hand-written KDL must keep reading as the builders' output.

**Decision (plan): migrate-bundle's expected values are the builders' output**, not written-out objects, because the tests are about the format-version node and the derived files, not the sections (the ticket's call). Trade-off: changing a default means changing migrate-bundle's KDL texts with it; a new required field changes them anyway, since that KDL is written out.

**Decision (plan): the fence is a hand-written rule beside `GRAPH`**, not a `GRAPH` row as the ticket says, because `GRAPH` generates one imports-only rule per package from its drawn edges, and this fence is about file kind across all packages.

**Decision (plan): `aDesign({ meta: undefined })` falling back to the default is not tested**, not given a second builder test, because the spine gives each builder one test; destructuring defaults make it hold by construction.

**Decision (plan): the invalid-id test spreads the builders into a plain object** with `id: 'Corne'`, not a mutation of a typed value, because `replaceDesign`'s design is `unknown`: the types accept it without a cast.

**Decision (plan): builder tests assert `issues` is `undefined`**, not `toEqual([])`, because that is what `v.safeParse` returns on success.

## Conformance Log

Three reviewer passes (Sonnet, context-free); 0 findings dropped, every quote verified. Final-pass fixes no reviewer has read: all lines marked pass 3.

- `Give every decision its rejected alternative` (builder signatures, override typing, issues assertion) -- fixed.
- `Each builder has one test of its own: its output parses through its schema` (`aLayout` vs `groupSchema`) -- fixed (`freeGroupSchema`).
- `Keep no mutable state at module level in a spec` (precedent: migrate-bundle.spec.ts `const design = {`, layout.spec.ts `const meta`) -- fixed.
- `Use @ts-expect-error only in a type-only test` (precedent: design-store.spec.ts `design.meta.id = 'Corne'`) -- fixed (plain spread object).
- `Build schema values the test doesn't read with the concept's test builder` (write-bundle's routing and fingerprints) -- asked (aRoutingFile, aFingerprintsFile).
- `Data a test is about stays written out` (migrate-bundle expected design) -- fixed (trade-off recorded as a decision).
- Ticket and plan disagree (new-design, GRAPH, extra specs) -- fixed (frozen block supersedes the ticket).
- Pass 3: `no expected value computed the way production computes it` (read-bundle via writers) -- asked (texts stay written out).
- Pass 3: `Assert what a function returns` (read-bundle's distinct revisions) -- fixed (`r2` override).
- Pass 3: spine `only spec files import it` -- fixed (spine docs task).
- Pass 3: hand-written fixtures prove the subpath rules (resolved folder import) -- fixed (row added); undefined override untested -- fixed (decision).
- Pass 3: `X, not Y, because Z` (GRAPH) -- fixed.
- After checkpoint (Sergii): builder file names follow the schema files -- recorded in the frozen block; no reviewer has read it.
- After build: the variant and branded-value builders -- reviewed in the Review Triage Log's pass 2; #21's 01908e2 in pass 3, its 76ac1cb in pass 4.
- Pass 3: fresh objects per call -- fixed (Always line); `it.each` rows built at collection -- fixed.

## Verification

**Commands:**
- `pnpm check` -- expected: passes (types, lint, depcruise).
- `pnpm test` -- expected: whole suite green.
- `pnpm test:mutation --mutate packages/design-file/src/migrate-bundle.ts,packages/storage/src/bundle/read-bundle.ts,packages/storage/src/bundle/write-bundle.ts` -- expected: no survivor beyond 23.3's three equivalents.

## Boundary Table

| Group | Boundary | Input | Expected | Level |
|-------|----------|-------|----------|-------|
| rules | meta builder | `aMeta()` | `metaSchema` accepts | unit (schema) |
| rules | split form builder | `aSplitForm()` | `formSchema` accepts | unit (schema) |
| rules | unibody form builder | `aUnibodyForm()` | `formSchema` accepts | unit (schema) |
| rules | common form builder | `aForm('split')`, `aForm('unibody')` | equals that branch builder's output | unit (schema) |
| rules | free group builder | `aFreeGroup()` | `freeGroupSchema` accepts | unit (schema) |
| rules | chain group builder | `aChainGroup()` | `chainGroupSchema` accepts | unit (schema) |
| rules | common group builder | `aGroup('free')`, `aGroup('chain')` | equals that branch builder's output | unit (schema) |
| rules | slot builder | `aSlot()` | `slotSchema` accepts | unit (schema) |
| rules | fingerprint builder | `aFingerprint()` | `fingerprintSchema` accepts | unit (schema) |
| rules | id builder | `anId('a-b')` | `'a-b'` | unit (schema) |
| rules | revision builder | `aRevision('r2')` | `'r2'` | unit (schema) |
| rules | hash builder | `aHash('h2')` | `'h2'` | unit (schema) |
| rules | format-version builder | `aFormatVersion(2)` | `2` | unit (schema) |
| rules | scalar defaults | `anId()`, `aRevision()`, `aHash()`, `aFormatVersion()` | `'id'`, `'r1'`, `'h1'`, `1` | unit (schema) |
| rules | scalar refusal | `anId('Corne')`, `aFormatVersion(0)` | throws `ValiError` | unit (schema) |
| rules | field override | each field of `aMeta`, `aSplitForm`, `aSlot`, `aFreeGroup`, `aChainGroup`, `aLayout`, `aDesign`, `aRoutingFile`, `aFingerprintsFile`, `aFingerprint`, passed alone | the passed value comes back | unit (schema) |
| rules | layout builder | `aLayout()` | `freeGroupSchema` accepts | unit (schema) |
| rules | design builder | `aDesign()` | `designSchema` accepts | unit (schema) |
| rules | routing file builder | `aRoutingFile()` | `routingFileSchema` accepts | unit (schema) |
| rules | fingerprints file builder | `aFingerprintsFile()` | `fingerprintsFileSchema` accepts | unit (schema) |
| module boundaries | fence, production importer | storage `src/index.ts` imports `@keeb-cad/schema/testing` | `only-tests-import-testing` | unit (tooling) |
| module boundaries | fence, production importer | storage `src/index.ts` imports `@keeb-cad/result/testing` | `only-tests-import-testing` | unit (tooling) |
| module boundaries | fence, spec importer | storage `src/x.spec.ts` imports both | no violation | unit (tooling) |
| module boundaries | fence, resolved folder import | `tooling/ad10/violations/packages/design/src/index.ts` imports `./testing/bundle` | `only-tests-import-testing` | unit (tooling) |
| module boundaries | fence, testing-folder importer | `tooling/ad10/violations/packages/design/src/testing/bundle.ts` imports `@keeb-cad/schema/testing` | no violation | unit (tooling) |
