---
title: 'A new design writes and reads back byte-identical'
type: 'feature'
ticket: '3'
created: '2026-11-05'
status: done
baseline_revision: 'e8674dbe1b6351e9cf5746ea96ee4e7cce84cf8c'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing can create a design, write it to a file or read it back: `schema` has only `meta`, `design-file` and `commands` are stubs, and the design store holds the design without its routing and fingerprints files.

**Approach:** Give `schema` the layout skeleton, the derived-file schemas and the load types; give `design-file` a KDL reader, a canonical writer per bundle file and `migrateBundle`; make `replaceDesign` take the migrated bundle and hold all three files in one `Committed`; add id minting and the `NewDesign` action; and add `app`'s round-trip test over the real container.

## Boundaries & Constraints

**Always:**
- `Design` is the authored sections only; `DesignFile = { formatVersion } & Design`. `migrateBundle` reads `format-version` first and strips it; the writer always writes the current one (1). A format change alone never changes the revision.
- The design schema lists its sections in AD-8 order; this story codes `meta` (unchanged) and `layout` (a tree, AD-23). No other section, not even as an empty placeholder.
- `migrateBundle(raw): Result<MigratedBundle, LoadError>`. Only the design file can refuse a bundle; a derived file that is not valid KDL is listed in `unreadable` and passed on as absent.
- `replaceDesign(bundle: MigratedBundle): Result<{ emptied: Emptied[] }, DesignInvalid>` parses the design and each derived file with its own schema, deep-freezes them and writes all three in one `Committed`; a missing, unreadable or invalid derived file becomes `emptyDerivedFiles(revision)` with its reason. Its commit event carries the new `Committed`.
- `NewDesign` is an action registered through `registerAction` by `commands`' concept-folder module, available with no design loaded; its apply hands `replaceDesign` a fresh design (minted design id, name, form split with a reversible board, an empty root layout group) and no derived files.
- Decision (Sergii, 2026-11-05): the KDL mapping is schema-driven, as AD-8 now says (dbf3573): one codec in `design-file` walks the file's schema; `node` metadata names list items and union variants (`group`, `slot`, `fingerprint`), `flatten` marks the layout's `children`.
- Decision (Sergii, 2026-11-05): `app`'s round trip goes through `storage`'s first pure functions, `writeBundle` (the bundle's three files to KDL texts) and `readBundle` (texts to `Result<MigratedBundle, LoadError>` through `migrateBundle`); story 5's storage service calls them. No graph exception.
- Decision (Sergii, 2026-11-05): `app`'s only test in this story is the bundle round trip (NewDesign → `writeBundle` → `readBundle` → `replaceDesign` → `writeBundle`, byte-identical), proven by a toggled bug that breaks `readBundle`. No per-entry generic checks and no coverage table here: NewDesign's input never enters the design, so they could not fail; deferred to 13.2 with their home (`commands` or `app`) open. The design's deep freeze stays in `design`'s unit tests. Sofia updates the ticket's verify line.
- Decision (Sergii, 2026-11-05): `mintId()` uses `nanoid` `^6.0.2` (catalog, `model` only): `customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)`, parsed with `idSchema`; no set of taken ids, uniqueness rests on randomness (about 62 bits). Spine Stack row committed.
- Decision (Sergii, 2026-11-05): every object schema is a `v.strictObject` (`meta` and `form` change too); an unknown node reaches the schema under its camelCase key and is refused (`design-invalid` for the design, an emptied derived file); a second node for a single-valued field is `file-unreadable` (spine AD-8 and Data Schema updated).
- Decision (Sergii, 2026-11-05): variants sharing a node name (`ChainGroup`, `FreeGroup`) and a union without `node` metadata (`form`) are told apart by their discriminator property (`arrangement`, `type`); spine AD-8 updated.
- Schemas use no transforms; Valibot is the source of truth; recursive layout types are hand-written and the schemas annotated with `v.GenericSchema<…>`.

**Never:**
- No storage backend, autosave or load flow (story 5); no layout fields beyond the skeleton (13.2 and later); no `gap` in meta (13.2); no migration step (16.1): `migration-failed` is a type only.
- No `import` of `design-file` outside `storage`; no storage service or backend (story 5).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Round trip | `run(NewDesign, {})`, write the bundle, `migrateBundle` → `replaceDesign`, write again | all three texts byte-identical; read design deeply frozen | none |
| Section order | design text with `layout` before `meta` | written back with `meta` first | none |
| Invalid meta | design text whose meta id is `Corne` | `design-invalid`, issue path `['meta','id']` | nothing written |
| Format version | `format-version` 0 / 1 / 2 | `file-unreadable` / opens / `format-too-new { found: 2 }` | nothing written |
| Unreadable design | no `format-version` node; invalid KDL; no design file | `file-unreadable { file: 'design' }`, KDL message with line and column where the reader gives them | nothing written |
| Derived file | routing not KDL / fails its schema / absent | opens with empty routing; `emptied` `[{ file: 'routing', reason: 'unreadable' / 'invalid' / 'missing' }]` | none |
| App round trip | NewDesign's bundle through `writeBundle`, `readBundle`, `replaceDesign`, `writeBundle` | three texts byte-identical | toggled bug breaking `readBundle` turns it red |

</frozen-after-approval>

## Code Map

- `packages/schema/src/` -- `design.ts` (`designSchema = v.object({ meta })`), `meta.ts`, `form.ts`, `id.ts`, `revision.ts` (`v.string()` + brand), `types.ts` (`Design`, `Rejection`, `DesignInvalid`, `SchemaIssue`, `Frozen`/`Mutable`), `index.ts`. One concept per file; types inferred in `types.ts`.
- `packages/design/src/store/design-store.ts` -- `replaceDesign(value: unknown): Result<void, DesignInvalid>` (parse → `deepFreeze` → `#write` → emit `{ kind: 'whole', design, seq, revision }`); `#write(design)` mints seq and revision and sets the `shallowRef`; a command's `#write` must keep the current routing and fingerprints. `store/types.ts`: `Committed { design, seq, revision }`, `CommitEvent`.
- `packages/design/src/parsing/parse.ts` -- `parse(schema, value): Result<InferOutput, SchemaIssue[]>`; reuse for each derived file.
- `packages/design/src/patching/deep-freeze.ts` -- reuse for all three files.
- `packages/design/src/testing/meta-only-design.ts` -- used across `design`'s specs; the design schema now needs `layout`, so it becomes a meta-and-layout helper.
- `packages/design/src/store/design-store.spec.ts` L510 `describe('replaceDesign')` -- three tests; the `LoadDesign` test action (L85) calls `replaceDesign(input.design)`.
- `packages/design/src/entries/` -- `Action<Input, E>`, `ActionHandle`, `registerAction(container, Handle)`. `NewDesign` takes AGENTS.md's three-file shape: the class (static `kind`, `id`, `label`, `input = newDesignInputSchema`, then `available` and `apply`, then the private `#store = inject(DesignStore)` last, per "public API first"); the spec's `LoadDesign` is reordered the same way when it moves to the new signature, `new-design-input-schema.ts`, and `NewDesignInput = v.InferOutput<typeof newDesignInputSchema>` in `types.ts`. Do not copy story 15's plan sketch (inline schema).
- `packages/design-file/` -- stub: `export {}`, no deps, old composite tsconfig. Take `packages/design`'s split (`tsconfig.lib.json` + `tsconfig.vitest.json`); the root `vitest.config.ts` runs a configless package on Node and adds a `types` project per `tsconfig.vitest.json`.
- `packages/commands/` -- stub; deps only `valibot`. Gains its first concept folder and di module.
- `packages/model/src/index.ts` -- the shared root, `export {}`; no id minting exists. `main.ts` re-exports `checkStructure`. `commands` may import `model` only through `@keeb-cad/model/main` (`ENTRY_ONLY` in `.dependency-cruiser.mts`).
- `app/src/start-main.ts` -- builds `new Container().addModule(designModule)`, awaits `autoLoad()`, mounts. `app` has no Vitest project; the root config doesn't list it.
- `packages/storage/` -- stub (`export {}`, no deps).
- `.dependency-cruiser.mts` GRAPH -- `design-file: ['schema']`, `storage: ['schema','design-file','hashing']`, `commands` may import `model/main`, `design`, `schema`; `app` may not import `design-file`.
- `pnpm-workspace.yaml` -- catalog is strict; add `@bgotink/kdl: 0.4.1` and `nanoid: ^6.0.2` (spine Stack rows). Its `InvalidKdlError` appends `at L:C` only when located, else `at end of input`.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/schema/src/` -- `layout.ts` (group/slot schemas, `GenericSchema`-annotated), `format-version.ts`, `hash.ts`, `fingerprint.ts`, `routing-file.ts`, `fingerprints-file.ts`; `design.ts` adds `layout` after `meta`; `design`, `meta` and `form` become `v.strictObject`; `types.ts` adds `Group`, `ChainGroup`, `FreeGroup`, `Node` (hand-written over inferred fields), `Slot` (inferred), `FormatVersion`, `Hash`, `Fingerprint`, `RoutingFile`, `FingerprintsFile`, `DesignFile`, `DerivedFile`, `BundleFile`, `Emptied`, `LoadError`, `MigratedBundle`; specs for the format-version and layout rows.
- [ ] `packages/design-file/src/` -- `codec/` (`read-kdl.ts`, `write-kdl.ts`, `schema-fields.ts` (what the codec reads from a schema: field kind, `node`, `flatten`), `types.ts`; one codec per AD-8's rules); `design-file/` (`read-design-file.ts`, `write-design-file.ts`), `routing-file/`, `fingerprints-file/` likewise; `migrate-bundle.ts`, `types.ts` (`RawBundle`); specs for every design-file row; package and tsconfig setup.
- [ ] `packages/design/src/store/` -- `Committed` gains `routing` and `fingerprints`; `replaceDesign(bundle: MigratedBundle)` (hash the parsed design first, then build `emptyDerivedFiles(revision)`, then one write); `empty-derived-files.ts` (`emptyDerivedFiles(revision: Revision)`, takes an already-branded revision); commit event `{ kind: 'whole', committed }`; export `emptyDerivedFiles`.
- [ ] `packages/design/src/testing/` and specs -- `metaOnlyDesign` is replaced by `emptyLayoutDesign()` (meta plus a free root group with no children); replaceDesign rows; existing specs move to the new signature (a test that reads no design arranges none; each moved test is named for every claim its expects make, or split); `emptyDerivedFiles` gets its own spec.
- [ ] `packages/model/` -- `tsconfig.lib.json` + `tsconfig.vitest.json` split as in `design`, so its spec is type-checked; dep `nanoid: catalog:`.
- [ ] `packages/model/src/ids/mint-id.ts` (+ spec) -- `mintId(): Id`, its result parsed with `idSchema`, never cast; exported from the root and re-exported by `model/main`, which `commands` imports.
- [ ] `packages/commands/` -- deps `@keeb-cad/design`, `di`, `model`, `result`, `schema`, `valibot`; `tsconfig.lib.json` + `tsconfig.vitest.json` split as in `design`.
- [ ] `packages/commands/src/design/` -- `new-design.ts`, `new-design-input-schema.ts`, `types.ts` (`NewDesignInput`), `design-actions-module.ts` (`designActionsModule`: registers the `design` concept folder's actions, `NewDesign` first); `index.ts` re-exports `designActionsModule` and `NewDesign`; spec resolves `NewDesign` from a container whose `DesignStore` is overridden by a recording fake, calls `apply({})` and asserts the bundle handed to `replaceDesign` (the call is the behaviour).
- [ ] `packages/storage/src/bundle/` -- `write-bundle.ts`, `read-bundle.ts`, `types.ts` (`DesignBundle = { design, routing, fingerprints }`, frozen); package deps (`schema`, `design-file`, `result`) and tsconfig split; specs for `storage`'s own part only (which text goes to which file; design-file owns the rules).
- [ ] `app/package.json`, root `vitest.config.ts` -- deps `commands`, `storage`, `schema`, `result`; an `app` Node project in the root config's `projects` (as `di`'s inline one).
- [ ] `app/src/main-modules.ts` -- the main container's module list (design's and commands'), used by `start-main.ts`.
- [ ] `app/src/bundle-round-trip.spec.ts` + Vitest project for `app` on Node -- container from `mainModules`, `run(NewDesign, {})`, round trip through `storage`'s `writeBundle`/`readBundle` and `replaceDesign`.
- [ ] Stryker on `design-file`'s pure files, and `storage`'s; a verdict per survivor.

**Acceptance Criteria:**
- Given the workspace, when `pnpm check` and `pnpm test` run, then both pass.
- Given `readBundle` broken (e.g. dropping the routing text), when `app`'s round-trip check runs, then it fails; restored, it passes (said in the PR).
- Given design-file's first specs, then Sergii approves each test name against its expects before merge.

## Implementation Notes

- Toggled bug: `readBundle` dropping the routing text turned `app/src/bundle-round-trip.spec.ts` red at `emptied: []` (byte identity alone can't see it: the refilled empty file writes the same text); restored, green.
- Stryker (design-file, storage): 99.14, three equivalent survivors, exclusions proposed for a person: `read-kdl.ts` `getLocation(…)?.` twice (`parseKdl` always stores locations), and the `flattened === undefined` conditional (`Map.get(undefined)` is `undefined`).
- `schema/src/frozen.spec.ts`: `toEqualTypeOf` → `.branded.toEqualTypeOf`, needed for the recursive layout intersections; checked to still fail on a wrong nested type.
- Implementer's decisions: recursive schemas annotated `v.GenericSchema<unknown, Node|Group>`; property names kebab-case like nodes; the reader passes what no schema field takes on for the schema to refuse (arguments under their index, a bare one-argument node as its value, a misnamed item as `{ [name]: … }`); a repeated child node, a second format-version node, or a property and a child node with one key is unreadable (messages name the lines); format-version must be one bare argument; numbers written in JS shortest form; an unsupported schema kind throws `InvariantError`; a derived file both listed unreadable and present empties as `unreadable`.
- Not in the plan: `storage` devDependency `valibot`; root `vitest.config.ts` gains the `app` Node project.

## Plan Change Log

## Review Triage Log

Pass 1 (quick, test-reviewer): high 0, medium 1, low 8, false 4, maybe-false 0; no quote dropped.

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | A property and a child node with one key overwrite each other in `readFields` | medium | patch | Real: `shellOf` sets properties, the child loop assigns `fields[key]` and `seen` tracks children only; `meta id="a" { id "b" }` loads as `b`, a silent loss AD-8's repeated-node rule forbids. |
| 2 | design-store specs narrowed to `toMatchObject` | low | patch | Real: wrong or extra `routing`/`fingerprints` pass; AGENTS.md "assert whole values". |
| 3 | `accepts a chain and a free group holding groups and slots` holds no nested free group | low | patch | Real: name claims more than the data. |
| 4 | Reader picks group or slot by content, not node name | low | reject | Real: a malformed `group` without `arrangement` is read as `{ group: … }` with odd issue paths, but it is still refused; well-formed files read correctly; a by-name pick needs the codec to enumerate a lazy union (more than a direct correction). Told to Sergii. |
| 5 | App byte check can't see a lost derived file | low | reject | Real: refilled empties write the same text; `emptied: []` is what catches it (the toggled bug went red there). Stated in the PR. |
| 6 | Stryker verdicts and toggled bug not recorded in the plan | low | reject | Fix edits this build's plan; recorded in Implementation Notes and the PR. |
| 7 | `frozen.spec.ts` changed to `.branded.toEqualTypeOf` | low | reject | `.branded` compares deeply through the recursive intersections; the implementer checked it still fails on a wrong nested type. Stated in the PR. |
| 8 | Expected KDL messages are the library's wording | false | reject | The input places the bad token at 3:30 and 1:6/1:9; the requirement is the reader's located message, which is the library's text. |
| 9 | Undocumented codec, number, message and derived-file decisions | low | reject | Fix edits this build's plan; listed in Implementation Notes and for Sergii. |
| 10 | `writeBundle` expected via the writers | false | reject | The boundary row names the writers ("each its file writer's text") and each has its own unit test. |
| 11 | mintId's "two differ" is random | false | reject | Accepted with the nanoid decision (~2^-62). |
| 12 | `readDerivedFile` empties a file both listed unreadable and present as `unreadable` | false | reject | `migrateBundle` never produces both; `unreadable` wins by the plan's frozen rule "a derived file that is not valid KDL is listed in unreadable and passed on as absent". |

## Design Notes

**Decision (plan): layout skeleton.** `Group` = `ChainGroup` (`id`, `arrangement: 'chain'`, `axis: 'x'|'y'`, `children`) | `FreeGroup` (`id`, `arrangement: 'free'`, `children`); `Slot` = `{ id }`. `anchor`, `offset`, `defaultPart`, `part` and `inputs` come with their stories. `Group` is `v.variant('arrangement', [chainGroupSchema, freeGroupSchema])`; `Node` is `v.lazy(input => …)` returning the group schema when the input has an `arrangement` key and the slot schema otherwise, so issue paths reach inside the chosen node. `layout.ts` holds the field schemas and the recursive schemas; `Slot` and the group fields are `v.InferOutput`; only `Group`, `Node` and the `children` fields are hand-written. `chainGroupSchema` and `freeGroupSchema` each carry `node: 'group'`, the slot schema `node: 'slot'`, and `children` carries `flatten` (AD-8); the reader picks group or slot by node name, then `ChainGroup` or `FreeGroup` by the group node's `arrangement` property. `form` is a child node with `type` and `board` as properties; the reader tells variants apart by `type` and groups by `arrangement` (AD-8). The root `layout` field is a node read with the group schema.

**Decision (plan): fresh design.** `NewDesign` implements `Action<NewDesignInput, never>`: `available` is always true (with or without a design); it hands `replaceDesign` `{ design, unreadable: [] }`; a `DesignInvalid` for its own fresh design is a bug, thrown as `InvariantError`. The action builds the design, as AD-2 says. Its input is `v.strictObject({})`; command id `design.newDesign`, label `New design`; name `Untitled design`; layout root `{ id: mintId(), arrangement: 'free', children: [] }`.

**Decision (plan): ids in NewDesign.** The design id and the root group id are each one `mintId()` call. The `mintId` row's "two differ" rests on nanoid's randomness (~2^-62), accepted with the nanoid decision.

**Decision (plan): the root group is the center.** The glossary's center is the top-level group of a split form, so `NewDesign`'s free root group is it; 13.2 gives it content.

**Decision (plan): text layout.** The KDL library's formatter writes the text with its defaults (AD-8, amended in 541b04a after PR #16's review): child nodes indent one tab, a string is quoted only where KDL v2 needs it, every file ends with one newline, a node with no child nodes has no braces. An empty list is a bare node (`fingerprints`); an empty `flatten` list writes nothing, and the reader reads an absent `flatten` list as `[]`. AD-8 doesn't fix these. A repeated node's message names the node and the lines of both occurrences (plan decision; AD-8 fixes only `file-unreadable`).

**Decision (plan): `RawBundle` and `DesignBundle`** are package-local plain parameter types (`design-file`'s and `storage`'s), not shared kinds and never in a file; `app` passes the store's `Committed`, which fits `DesignBundle`. **`RawBundle`** is `{ design?: string; routing?: string; fingerprints?: string }` (KDL texts), `design-file`'s own type. No design text → `file-unreadable`.

**Decision (story 2, kept): seq starts at 1** after no design; a throwing commit listener escapes `run` after the commit (Sergii's 23.2 pick).

**Decision (plan): `emptied` order** is routing then fingerprints; a valid derived file tagged with another revision is kept as read (AD-12 re-validates later).

**Decision (plan): `app`'s container** is built from `mainModules` (`app/src/main-modules.ts`), the list `start-main.ts` adds, so the round trip runs the real `NewDesign` registration.

## Conformance Log

Four reviewer passes (Sonnet, context-free); no finding dropped, every quote verified.

- `Every id is minted by model` / `model/main ... is imported by design, commands and editor` -- fixed (mintId re-exported by model/main).
- `Test calculations as units in the package that owns them` -- fixed (byte identity, format-version, layout, strict-object and codec rows moved to their owning package; commands asserts only the bundle handed to a fake store).
- `No if or loop around expect ... it.each is the only repetition` -- fixed, then moot (per-entry checks deferred to 13.2 by Sergii).
- `Name a thing for what it does` / glossary `entry` -- fixed (`emptyLayoutDesign`, `designActionsModule`, `schema-shape.ts`).
- `The class's static input points at the schema` (precedent: story 15's plan sketch) -- deferred (deferred-work.md).
- `Order a class top-down` (precedent: `LoadDesign` in design-store.spec.ts) -- fixed in this story.
- `Give every threshold three rows` -- fixed (formatVersionSchema 0/1/2, mintId shape).
- `When nothing says what a boundary returns, ask` (id shape, stray and repeated nodes, variant reading) -- asked (nanoid; strict objects; repeated node file-unreadable; discriminator rule; spine commits 5840335, f61723c and this one).
- `Add or change a design-file field, schema or shared kind only after the spine's Data Schema section defines it` (`RawBundle`, `DesignBundle`) -- fixed (stated as package-local parameter types).
- `Every schema'd field, Slot included, is inferred` -- fixed.
- `End every task with the decisions you made on your own` -- fixed (NewDesign's error type and availability, text layout, emptied order, randomness in tests).
- `Stryker ... priority packages` -- fixed (storage added).
- ☝️ center group -- fixed (the root group is the center).
- Pass 6: `Make a test's name and its expects claim the same thing` (precedent: design-store.spec.ts `loads a valid design deeply frozen, with the next seq and its revision`, `refuses an invalid design with its issue paths`) -- fixed when moved, and deferred (deferred-work.md); `readBundle` unit row -- fixed; repeated-node message and text layout -- recorded as plan decisions.
- Pass 5: `Every object schema is a v.strictObject` -- fixed (input, design, meta, form); glossary `shape` -- fixed (`schema-fields.ts`); empty list text and absent `flatten` list -- fixed (plan decision, rows added); `node` on each group variant -- fixed; storage's own part and `emptyDerivedFiles` rows -- fixed; `Arrange only what the test uses` (precedent: design-store.spec.ts L256) -- fixed when the specs move; seq start and listener escape -- recorded as story 2's decisions; model tsconfig split -- fixed.

## Verification

**Commands:**
- `pnpm check` -- expected: passes (types, lint, depcruise).
- `pnpm test` -- expected: whole suite green, including `design-file`, `schema`, `design`, `model`, `commands` and `app` specs.
- `pnpm stryker run --mutate <changed design-file and storage files>` -- expected: every survivor has a verdict in the PR.

## Boundary Table

| Group | Boundary | Input | Expected | Level |
|-------|----------|-------|----------|-------|
| production bugs | format-version refused | `format-version 0` | `file-unreadable { file: 'design' }` | unit (design-file) |
| production bugs | format-version on current | `format-version 1` | ok, design without `formatVersion` | unit (design-file) |
| production bugs | format-version above current | `format-version 2` | `format-too-new { found: 2 }` | unit (design-file) |
| production bugs | format-version node missing | design text with `meta` only | `file-unreadable { file: 'design' }` | unit (design-file) |
| production bugs | empty design text | `''` | `file-unreadable { file: 'design' }` | unit (design-file) |
| production bugs | invalid KDL, located | a text with a bad token on line 3 | `file-unreadable`, message names line 3 and its column | unit (design-file) |
| production bugs | no design file | `{ routing, fingerprints }` | `file-unreadable { file: 'design' }` | unit (design-file) |
| production bugs | derived file not KDL | routing text `revision "a` | ok, `unreadable: ['routing']`, no routing | unit (design-file) |
| production bugs | derived file absent | no fingerprints text | ok, `unreadable: []`, no fingerprints | unit (design-file) |
| production bugs | section order | `layout` written before `meta` | rewritten `meta` first | unit (design-file) |
| production bugs | byte identity | a canonical text of each bundle file | read through `migrateBundle`, then written: the same text | unit (design-file) |
| production bugs | byte identity | each file of a NewDesign bundle | write → `migrateBundle` → `replaceDesign` → write gives equal text | integration (app) |
| production bugs | repeated node | two `meta` nodes | `file-unreadable { file: 'design' }`, message names `meta` and both lines | unit (design-file) |
| rules | format-version below 1 | `0` | `formatVersionSchema` refuses | unit (schema) |
| rules | format-version on 1 | `1` | `formatVersionSchema` accepts | unit (schema) |
| rules | format-version above 1 | `2` | `formatVersionSchema` accepts (no upper bound; `design-file` owns too-new) | unit (schema) |
| rules | format-version not whole | `1.5` | `formatVersionSchema` refuses | unit (schema) |
| rules | format-version not a number | `"1"` | `formatVersionSchema` refuses | unit (schema) |
| rules | design schema | meta id `Corne` | `design-invalid`, path `['meta','id']` | unit (design) |
| rules | derived file valid | routing and fingerprints valid | `emptied: []`, both kept | unit (design) |
| rules | derived file invalid | routing `{ revision: 3 }` | `emptied: [{ file: 'routing', reason: 'invalid' }]`, empty routing at the new revision | unit (design) |
| rules | derived file unreadable | `unreadable: ['routing']` | `emptied: [{ file: 'routing', reason: 'unreadable' }]` | unit (design) |
| rules | derived file missing | no routing, no fingerprints | `emptied` both with `missing`, in that order | unit (design) |
| rules | derived files frozen | valid routing and fingerprints objects | both deeply frozen in `current`; the caller's objects not frozen | unit (design) |
| rules | codec: canonical text | NewDesign-shaped design with meta `corne`/`Corne`, a free root `root` | exactly `format-version 1\nmeta id=corne name=Corne {\n\tform type=split board=reversible\n}\nlayout id=root arrangement=free\n` (AD-8's rules plus this plan's layout decisions) | unit (design-file) |
| rules | empty derived files | `emptyDerivedFiles(R)` | `{ routing: { revision: R }, fingerprints: { revision: R, fingerprints: [] } }` | unit (design) |
| rules | codec: empty derived texts | routing `{ revision: 'r1' }`; fingerprints `{ revision: 'r1', fingerprints: [] }` | `revision "r1"\n`; `revision "r1"\nfingerprints\n` | unit (design-file) |
| rules | codec: absent flatten list | `layout id="root" arrangement="free"` | `layout.children` read as `[]` | unit (design-file) |
| rules | storage: texts per file | `writeBundle` of a bundle | `{ design, routing, fingerprints }`, each its file writer's text | unit (storage) |
| rules | storage: texts read per file | `readBundle({ design: t })` with no routing or fingerprints text | `migrateBundle` sees the design text only; the result has no `routing` or `fingerprints` | unit (storage) |
| rules | commit event | a `replaceDesign` | one event `{ kind: 'whole', committed }` equal to `current` | unit (design) |
| rules | a command keeps derived files | a command after `replaceDesign` | `routing` and `fingerprints` are the same references | unit (design) |
| rules | layout: chain without axis | layout `{ id, arrangement: 'chain', children: [] }` | `designSchema` issue at `['layout','axis']` | unit (schema) |
| rules | layout: group missing children | child `{ id: 'thumbs', arrangement: 'free' }` | `designSchema` issue at `['layout','children',0,'children']` | unit (schema) |
| rules | codec: unknown node | a `meta` child node `key id="k1"` | read as `meta.key = { id: 'k1' }` | unit (design-file) |
| rules | strict objects | meta with an extra `key` | `designSchema` issue at `['meta','key']` | unit (schema) |
| rules | derived file fails its schema | fingerprints value `{ revision, fingerprints: [], colour: 'red' }` | `emptied: [{ file: 'fingerprints', reason: 'invalid' }]` (the emptying; strictness is schema's row) | unit (design) |
| rules | codec: schema kinds | every schema kind the codec supports (`object`, `strictObject`, `variant`, `lazy` choosing by input, `array`, `flatten` array, `optional`, `picklist`, `literal`, `string`, `number`, and `pipe` with `regex`, `integer`, `minValue`, `brand`, `metadata`) | each writes and reads back equal | unit (design-file) |
| rules | minted id | `mintId()` twice | each matches `^[a-z0-9]{12}$`; the two differ | unit (model) |
| module boundaries | NewDesign's bundle | `apply({})` with a recording fake store | one `replaceDesign` call with `{ design: { meta: { id, name: 'Untitled design', form: { type: 'split', board: 'reversible' } }, layout: { id, arrangement: 'free', children: [] } }, unreadable: [] }`, both ids parsing with `idSchema` | unit (commands) |
| glue | round trip proven | toggled bug: `readBundle` drops the routing text | round trip red | integration (app) |
