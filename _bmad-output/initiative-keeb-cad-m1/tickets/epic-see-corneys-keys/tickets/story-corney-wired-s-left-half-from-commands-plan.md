---
title: "Corney wired's left half from commands"
type: 'feature'
ticket: 4
created: '2026-11-13'
status: 'ready-for-dev'
baseline_revision: ''
route: 'full'
route_source: 'auto'
risk: 'high'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Corney's script builds one column. Nothing proves rotation carries along a chain or that a counter-turn cancels it. choc-key has no `size` input, so the far thumb key can't be 1.5u, and nothing checks a blueprint input against its declaration, on main or on load.

**Approach:** choc-key v1 gains a per-slot option input `size` (edited in place). One `model` function, `resolveInputs`, checks one owner's inputs against the pinned declaration and lays the part's and slot's inputs over the declared defaults. The design store calls `model/main`'s `checkInputs` beside `checkStructure` and refuses an edit that breaks an input with `blueprint-input-invalid`; the worker reports the same kind and stands the slot in. Corney's script authors the whole left half (six staggered columns, the 3-key thumb fan anchored to `matrix-middle-bottom`) under one `left-half` group, and an app spec compares its key centres with Ergogen through the key-centres harness.

## Boundaries & Constraints

**Always:**
- World frame = anchor frame → translate by offset → rotate by offset rotation about pivot (AD-3). Child *n*'s default anchor is child *n−1*'s world frame stepped along its axis (AD-4); carry is tested, not rebuilt (`group-frames.ts:26-61` already composes it).
- The script's ids are Ergogen's point names with `_` written `-` (`matrix_outer_bottom` → `matrix-outer-bottom`), because `idSchema` (`id.ts:3-8`) allows only `[a-z0-9-]`; the spike maps back by `replaceAll('-', '_')`.
- An absolute position is an `offset.position` on a node whose dependency is the root itself (the root's child with no anchor); the script has exactly one, `left-half`'s. Every other position is a chain step, the thumb fan's anchor on `matrix-middle-bottom`, or an offset relative to those.
- The spike compares each script key's world centre minus `left-half`'s offset with Ergogen's centre minus its matrix anchor shift (100, −100) (`source/config.yaml:109`), within `DEFAULT_TOLERANCES` (0.05 mm position; rotation as the harness's corner displacement, angles wrapped to (−180, 180]).
- A 1.5u slot's rectangle is 27 × 18 mm, 1u 18 × 18 (AD-5).
- A slot's inputs are checked against the declaration of its first part level that resolves (own part, nearest group's `defaultPart`, `meta.defaultPart`, as `slot-part-runs.ts` orders them); a slot with no level that resolves is not checked. A design part's own inputs are checked against its pinned declaration, with no per-slot rule.
- `checkInputs(previous, next, declarations)` refuses only a fault `next` holds that `previous` didn't (same owner, input and reason), as `checkStructure` does; of several new faults, the one whose owner, then input, is lowest by compareId.

**Decisions (Sergii, 2026-11-13, plan questions):**
- choc-key's `size` options are `1u` and `1.5u`, not also `1.25u` and `2u`, because they are the two sizes AD-5 gives a rectangle for and 2u needs a stabilizer no story models.
- `left-half`'s offset is (−140 mm, 0), not (−130 mm, 0), leaving about 15 mm between the half's inner edge and the centre line, not 10.
- `blueprint-input-invalid` is an error, not a warning, as an unresolvable library or blueprint reference is: the slot stands in with no footprint.
- Messages, one function for rejection and violation, one per owner naming its first faulty input by compareId; `ids` name the owner (`[slot]` or `[part]`), not the input, which is no ItemId. Unknown: `The slot "s" sets "colour", an input its part's blueprint doesn't declare.`; not per-slot: `The slot "s" sets "legend", which its part's blueprint doesn't let a slot change.`; option: `The slot "s" sets "size" to "2u", which isn't one of 1u, 1.5u.` (and `to true`); boolean: `… to "yes", which isn't true or false.`; text: `… to true, which isn't text.`; a part's read `The part "p" sets …`, unknown as `… an input its blueprint doesn't declare.`. Not one generic text, because each says why.
- The store calls `checkInputs` after `checkStructure`, with the declarations it imports from `library`'s main subpath, not `AddSlot` its own check, because AD-10: "`design`'s store calls them, as it calls `model`'s structural checks, with the pinned declarations it reads from `library`'s main subpath", and every later input-setting command is covered; `AddSlot.available` does not foresee the refusal, only `run` returns it.
- The spike runs in `app`'s browser-mode specs and reads Ergogen's poses through a new `reference-designs/key-centres` subpath with no Node imports (`compareKeyPoses`, `keyPosesFrom(pointsYaml, unitsYaml)`, which `loadKeyPoses` calls), the YAML imported with Vite's `?raw`; a docs commit on main adds the subpath to AD-10's app bullet beside `scripts`. Not a Node Vitest project in `app`, because the real QuickJS engine doesn't run under Node (blueprint's `vm-pool.browser.spec.ts` and `lane-runner.browser.spec.ts` under `environment: 'node'`: 15 of 15 fail, every lane `{ kind: 'unavailable' }`, run 2026-11-13), and not making it run there, whose cost is unknown.
- `checkInputs(previous, next, declarations)`, not AD-10's `checkInputs(design, declarations, input)`, because the store holds the previous and next design after apply and a command's input is opaque to it, and a bad input a loaded file already held then blocks no unrelated edit, as `checkStructure(previous, next)`; a docs commit on main updates AD-10's signature.
- A quantity value given to an option, boolean or text input prints as its expression text (`… sets "size" to 5mm, which isn't one of 1u, 1.5u.`), not left unspecified.
- The pivot is round-tripped through both codecs, not one: design-file's KDL (rows 12, 17) and protocol's LayoutOutput (row 18), because the ticket's "layout codec" fits either.
- The two `deferred-work.md` entries owned by 13.4 (a part's last good output for a later failing run; quantity inputs as numbers) stay out, re-owned by new entries to the first story whose part runs can fail after a change and the first story that declares a quantity input, not built here, because choc-key's lane never fails and `size` is an option.

**Never:**
- No quantity-input check (deferred to the first story that declares one), no new input-setting command, no mirrored or unibody work, no right half (13.6).
- No `vi.mock`, snapshots or jsdom; no edit to Ergogen's committed output.

## Boundary table

Units mm and degrees; rects 18 × 18, gap 1 unless stated. `D` is a declaration with `size` (option `1u`/`1.5u`, default `1u`, perSlot), `legend` (text, default `''`, not perSlot) and `flip` (boolean, default false, perSlot).

| # | Group | Level | Input / State | Expected |
|---|---|---|---|---|
| 1 | production bugs | integration app | Corney's script, then the spike | every Ergogen key matched within tolerance; none missing, extra or duplicate |
| 2 | production bugs | integration app | Corney's script | the nodes with `offset.position` whose dependency is the root are exactly [`left-half`] |
| 3 | rules | unit model | chain y [a, b rot 15, c] | c frame (−4.9176, 37.3526, 15) |
| 4 | rules | unit model | chain y [a, b rot 15, c rot −15, d] | c frame (−4.9176, 37.3526, 0); d (−4.9176, 56.3526, 0) |
| 5 | rules | unit model | chain x [a, b rot −15, c rect 27 × 18 offset (−1.037, 2.122) rot 75] | c frame (41.2469, −3.7642, 60), a at the origin |
| 6 | rules | unit library | choc-key parts lane with size `1u` / `1.5u` | rectangle 18 × 18 / 27 × 18 |
| 7 | rules | unit model | `resolveInputs(D, {}, {})` / part `{size:'1.5u'}` / slot `{size:'1.5u'}` over part `{size:'1u'}` | ok `{size:'1u', legend:'', flip:false}` / ok, size `1.5u` / ok, size `1.5u` |
| 8 | rules | unit model | `resolveInputs(D, {}, slot)`: `{colour:'red'}` / `{size:'2u'}` / `{size:true}` / `{legend:'x'}` / `{flip:'yes'}` / `{size:{type:'quantity', value:'5mm'}}` | refused: unknown / bad value / bad value / not per-slot / bad value / bad value; each names the slot and the input |
| 9 | rules | unit model | `resolveInputs(D, part, {})`: `{colour:'red'}` / `{size:'2u'}` / `{legend:'x'}` | refused unknown, naming the part / refused bad value / ok |
| 10 | rules | unit model | `checkInputs(previous, next)`: next adds a slot `{size:'1.5u'}` whose only level is a library part ref / under part `key` with `{size:'2u'}` / previous already held that slot and next renames the design / previous held it at `{size:'2u'}`, next sets `{colour:'red'}` / next adds slots `q` `{size:'2u'}` and `p` `{colour:'red'}` | ok (not checked) / blueprint-input-invalid [slot] / ok / refused (new reason) / refused [p] (lowest by compareId) |
| 11 | rules | unit model | `blueprintInputInvalidMessage` for each fault in rows 8 and 9 | the agreed text, asserted whole |
| 12 | rules | unit design-file | canonical design with a slot offset `{position, rotation, pivot}` | byte-for-byte round trip |
| 13 | glue | unit model | createDerivations on choc-key's declaration: slot `{size:'2u'}` under `meta.defaultPart` only / `{size:'1.5u'}` / no inputs | one violation [slot], fit stand-in on the app stand-in run / run rect 27 × 18 fitted / run id `key@` the hash of `{size:'1u'}` |
| 14 | glue | unit design | store runs a test command whose edit adds a slot `{size:'2u'}` under part `key` (choc-key's real declaration) / the same edit also leaving a dangling reference | the inputs rejection, design unchanged, no commit / the structural rejection |
| 15 | module boundaries | integration app | `runById('layout.addSlot', …)` with `{colour:'red'}` / `{size:'2u'}` | blueprint-input-invalid; design unchanged (each) |
| 16 | module boundaries | integration app | a design with a slot `{size:'2u'}` through `replaceDesign`, then AddSlot elsewhere | the AddSlot commits; derivations hold the violation; the slot's row fit stand-in, placed |
| 17 | module boundaries | integration app | slot offset rotation 90 about pivot (9, 0), then bundle write → read → replaceDesign | frame (9, −9, 90) before and after |
| 18 | module boundaries | unit protocol | a LayoutOutput row with frame (9, −9, 90) packed and read | the same row |

</frozen-after-approval>

## Code Map

- `packages/library/blueprints-src/choc-key/1.ts:3-17` -- `inputs: {}`, lane returns a fixed 18 × 18; gains `size`. Compiled `library/compiled/choc-key/1.{json,js}` regenerate with `pnpm build:library`. `library/compile/choc-key.spec.ts:28-46` runs the lane with no arguments.
- `packages/schema/src/declared-input.ts:7-56` -- option variant checks its default; `perSlot` exists. `types.ts:185-192` `ModelRejectionKind`, `:202-203` `ViolationKind`: add `blueprint-input-invalid` to both. `Slot.inputs` exists (`layout.ts:10-15`).
- `packages/model/src/check-structure.ts:16-21` -- `checkStructure(previous, next)`, refuses only what the edit broke; the precedent for `checkInputs`.
- `packages/design/src/store/design-store.ts:171` -- `checkStructure(design, next)` after apply. `design/package.json` has no `@keeb-cad/library` dependency; `ENTRY_ONLY` gives `design: { library: '.' }` (`.dependency-cruiser.mts:108-114`); library's root exports `declarations` (`library/src/library-data/declarations.ts`).
- `packages/model/src/parts/create-derivations.ts:61-83` -- `runOf` merges `{...part.inputs, ...slot.inputs}`; `:87-114` level loop (a found part with no output falls to the next level; `reported` once per slot); `:159-179` violation builders; `part-violation-message.ts:7-20` match over `PartViolationDetail` (`parts/types.ts:52-55`).
- `packages/model/src/parts/{slot-part-runs,resolve-part-ref}.ts` -- level order and resolution (library part refs and non-blueprint parts are `unresolved`); their types sit in `parts/types.ts`, which imports `LaneFailure`, `LaneOutput` from `@keeb-cad/blueprint`, so `model/main` can't reach them (`model-root-and-main-reach-no-blueprint`, `tsPreCompilationDeps: true` at `.dependency-cruiser.mts:461`).
- `packages/blueprint/src/lane/check-nested-inputs.ts:10-17` -- builds a valibot picklist from an option declaration; the precedent for the value check.
- `packages/model/src/violations/` -- `dependencyCycleMessage`, `unresolvableReferenceMessage`, exported from both `main.ts` and `worker.ts`.
- `packages/model/src/placement/{group-frames,place-slot}.ts` -- carry and pivot composed; `place-layout.spec.ts` has no carry row.
- `packages/protocol/src/layout-output/layout-output-codec{,.spec}.ts` -- `packLayoutOutput`, `readLayoutRow`.
- `reference-designs/src/scripts/corney-island-layout.ts` -- one column today. `src/key-centres.ts` holds types, `DEFAULT_TOLERANCES`, `DESIGN_PCB`, `tagsOf`, `unit`, `loadKeyPoses`, `compareKeyPoses`, `formatKeyComparison` and a header essay; `node:fs` only through `fixture-files.ts`. `package.json` exports `.` and `./scripts`. AD-10's app bullet: "`reference-designs` through its `scripts` subpath (data only, no Node imports, so app's browser-mode tests can load it; 13.2)"; `.dependency-cruiser.mts:97-99` comment the same.
- Specs the change breaks: `app/src/corney-column.spec.ts` (old ids; its test name carries numbers and it narrows with `expect.objectContaining`), `app/src/layout-set.spec.ts:15-16` and `app/src/default-key-part.spec.ts:68` (`key@${argumentHash({})}`; its test name carries "18 by 18"), `packages/library/compile/choc-key.spec.ts` (test name carries "18 by 18"), `app/src/dev-seed/corney-seed.spec.ts` (old ids), `packages/model/src/parts/create-derivations.spec.ts:128-135` (a slot `{size:'1.5u'}` against `aBlueprintDeclaration` with no inputs).
- `packages/design-file/src/round-trip.spec.ts:29-38` -- canonical layout has no offset.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/library/blueprints-src/choc-key/1.ts`, `compiled/` -- `size` option, default `1u`, perSlot; lane returns `{ w: 18 × the size's factor, h: 18 }`; rebuild; `choc-key.spec.ts` row 6.
- [ ] `packages/schema/src/types.ts` -- `blueprint-input-invalid` in both kinds.
- [ ] `packages/model/src/part-levels/{slot-part-runs,resolve-part-ref,types}.ts` -- move both functions (function each) and the types they use (`SlotPartRun`, `PartLookups`, `PartResolution`, with no blueprint import) out of `parts/`; `parts/` imports them.
- [ ] `packages/model/src/inputs/{resolve-inputs,check-inputs,input-value-schema,types}.ts` -- `resolveInputs(declaration, owner, inputs, scope: 'part' | 'slot')` (function): `Result<BlueprintInputs, BlueprintInputInvalid>`; `inputValueSchema(declared)` (function): the valibot schema of one declared input's value; `checkInputs(previous, next, declarations)` (function): `Result<void, Rejection>`.
- [ ] `packages/model/src/violations/blueprint-input-invalid-message.ts` -- `blueprintInputInvalidMessage(invalid)` (function).
- [ ] `packages/model/src/{main,worker}.ts` -- main exports `checkInputs`; both export `blueprintInputInvalidMessage`.
- [ ] `packages/model/src/parts/{create-derivations,types,part-violation-message}.ts` -- runs take the declared defaults under the part's inputs under the slot's; a part's fault reports once [part] and its slots fall through; a slot's fault reports once [slot] and falls through, as a found part with no output does.
- [ ] `packages/design/src/store/design-store.ts`, `package.json` -- the store calls `checkInputs(design, next, declarations)` after `checkStructure`, `declarations` imported from `@keeb-cad/library`.
- [ ] `reference-designs/src/scripts/corney-island-layout.ts` -- the left half per Design Notes.
- [ ] `reference-designs/src/key-centres/` -- `key-poses-from.ts` (`keyPosesFrom(pointsYaml, unitsYaml)` with `tagsOf`, `unit`; function), `compare-key-poses.ts` (`compareKeyPoses`; function), `format-key-comparison.ts` (function), `tolerances.ts` (`DEFAULT_TOLERANCES`), `types.ts` (`Design` renamed `Variant`), `index.ts` (re-exports; the `./key-centres` entry, no Node import). `src/key-centres.ts` becomes `src/load-key-poses.ts` (`loadKeyPoses`, `DESIGN_PCB`; existing function, unchanged role); the header essay goes; `src/index.ts` re-exports both; `key-centres.test.ts` follows the moves and stays green; `package.json` adds the export; the depcruise comment names both subpaths.
- [ ] `app/src/corney-left-half.spec.ts` -- rows 1, 2, poses from `keyPosesFrom` over `points.yaml?raw` and `units.yaml?raw`; `app/src/blueprint-inputs.spec.ts` -- rows 15–17.
- [ ] The broken specs in the Code Map -- new ids and run hash; their tests named for their role with numbers in `expected*` constants or `it.each` parameters, rows asserted whole.
- [ ] `_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md` (docs commit on main, before the code branch) -- AD-10's app bullet adds `reference-designs/key-centres` beside `scripts`; the `model` bullet's signature becomes `checkInputs(previous, next, declarations)`.
- [ ] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` -- two entries re-owning the 13.4 items; one for the harness's rename to glossary terms.
- [ ] Specs beside each file for rows 3–14, 18.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then each row has a passing test at its level.
- Given rows 1, 15 and 16, when the implementer breaks the wiring each covers (a wrong stagger, the store skipping `checkInputs`, the worker ignoring faults), then that test goes red; each is named in the PR.

## Design Notes

Script shape (`left-half` free under the free root; `matrix` chain x; columns chain y, bottom → top):

```ts
const LEFT_HALF = { x: '-140mm', y: '0mm' }
{ command: 'layout.addGroup', input: { id: 'left-half', arrangement: 'free', offset: { position: LEFT_HALF } } },
{ command: 'layout.addGroup', input: { parent: 'left-half', id: 'matrix', arrangement: 'chain', axis: 'x' } },
{ command: 'layout.addGroup', input: { parent: 'matrix', id: 'matrix-ring', arrangement: 'chain', axis: 'y', offset: { position: { x: '0mm', y: '4.75mm' } } } },
// middle +2.375, index −2.375, inner −2.375 (stagger × 19, carried)
{ command: 'layout.addGroup', input: { parent: 'left-half', id: 'thumbfan', arrangement: 'chain', axis: 'x', offset: { position: { x: '9.5mm', y: '-22mm' } } } },
{ command: 'layout.setAnchor', input: { id: 'thumbfan', anchor: { type: 'slot', ref: 'matrix-middle-bottom' } } },
{ command: 'layout.addSlot', input: { parent: 'thumbfan', id: 'thumbfan-mid-home', offset: { position: { x: '2mm', y: '-2.75mm' }, rotation: '-15deg' } } },
{ command: 'layout.addSlot', input: { parent: 'thumbfan', id: 'thumbfan-far-home', inputs: { size: '1.5u' }, offset: { position: { x: '-1.037mm', y: '2.122mm' }, rotation: '75deg' } } },
```

Mid: Ergogen spread 21 − step 19 = 2. Far: spread 22.463 − step (9 + 1 + 13.5) = −1.037; rotation −15 splay + 90 key rotate. Ergogen turns both about the key centre, so no pivot.

- Decision (plan): a run's inputs are the declared defaults under the part's, under the slot's, not the raw inputs, because blueprints BP: "an omitted input takes its declared default"; the run id hashes the merged inputs, so an explicit `1u` and an omitted size share a run.
- Decision (plan): the level order and part resolution move to a root folder `part-levels/`, not stay in `parts/`, because `parts/types.ts` imports `@keeb-cad/blueprint` and `model-root-and-main-reach-no-blueprint` counts type imports (`tsPreCompilationDeps: true`).
- Decision (plan): an input's value is checked by a valibot schema built from its declaration (picklist, boolean, string), not by hand, because valibot is the Stack's one schema format and `check-nested-inputs.ts:10-17` already builds the option picklist this way; unknown and not-per-slot are key checks no value schema covers.
- Decision (plan): of several new faults the one whose owner, then input, is lowest by compareId is refused, and each owner reports one violation naming its lowest faulty input, not an implementer's pick, because Sergii chose this for 13.3's `checkStructure` ("the same edit then always gives the same rejection").
- Decision (plan): a faulty slot reports once and falls to its next level, as a found part with no output does (`create-derivations.ts:87-114`, `reported` once per slot), not a violation per level, because AD-5's stand-in takes "the next level's rectangle, else the app-defined one".
- Decision (plan): `reference-designs`' harness keeps "pose" (`KeyPose`, `keyPosesFrom`), not renamed to frame, because a pose carries the keycap size too and the harness is reused, not redesigned; the exported `Design` becomes `Variant`, because glossary "design" is the keyboard document. A rename to glossary terms goes to `deferred-work.md`.
- Decision (plan): a slot's inputs are checked against its first level that resolves, not only its own part, because Corney's slots name no part and `slot-part-runs.ts` resolves them the same way; an unresolved level is not checked, because the worker already reports `unresolvable-reference` and there is no declaration to check against.
- Decision (plan): the input check lives in model's `inputs/` folder, not `parts/`, because main and the worker both call it and `parts/` is the worker's derivation; its message lives in `violations/`, with the other kinds' messages.
- Decision (plan): row 2 takes "anchored only to the root" as "depends on the root itself", not "reaches the root through default anchors", because every node reaches the root through its parents (13.3's Always line) and the ticket names `left-half`'s as the one absolute position.
- Decision (plan): `BlueprintInputInvalid` names the fault type, after its kind, not `InputFault` or `InvalidInput`, because the glossary has no "fault" and `input-invalid` is already the kind of a command input failing its schema.

Visible: `pnpm dev`, open `/?seed=corney`: the canvas shows the left half's 21 keys, the far thumb key wider and turned 60°.

## Conformance Log

Pass 1 (two readers, union; 0 quotes dropped, 1 quote partly unfound and re-read in the spine):
- `Give every decision its rejected alternative` (left-half offset) -- fixed
- spine AD-10 `design's store calls them … with the pinned declarations it reads from library's main subpath` (AddSlot-level check) -- asked (store, then signature)
- `Glossary terms only.` (`InputFault`) -- fixed (`BlueprintInputInvalid`)
- `Take expected values from the requirement` (messages for wrong types, ids) -- asked
- row 10 vs the unresolved-part decision -- fixed
- which level a slot's inputs are checked against -- fixed (first resolving level)
- worker fall-through once per slot -- fixed
- message and exports per the `violations/` precedent, both entries -- fixed
- vitest two-project precedent misdescribed -- moot (Node rejected after a run: QuickJS answers `unavailable` on Node) -- asked
- AD-10 `reference-designs through its scripts subpath` -- asked (new subpath, spine docs edit)
- `Name the boundary's role` (`corney-column.spec.ts`) -- fixed
- row 7 vs row 13 hash inputs -- fixed (row 13 on choc-key's declaration)
- ticket "layout codec" -- asked (both codecs)
- row 2 predicate -- fixed (Always line and Decision (plan))
- gap: `launch.spec.ts`, `corney-seed.spec.ts`, IndexedDB specs need a browser -- moot (app stays browser-only)
- gap: `default-key-part.spec.ts:68`, `corney-seed.spec.ts`, `create-derivations.spec.ts:128-135` broken by the change -- fixed
- gap: app reaches the message only through `model/worker` -- fixed
- gap: AddSlot refused for a part's old fault -- fixed (previous/next)
- gap: part bad-value row -- fixed (row 9)

Final pass (one reader, 8 findings; fixes below no reviewer has read):
- AD-25 `A new token or a second provider is a spine edit` (declarations token) -- fixed (store imports library's main subpath, as AD-10 says)
- AD-10 `checkInputs(design, declarations, input)` signature -- asked
- `model-root-and-main-reach-no-blueprint` (`parts/types.ts` imports blueprint) -- fixed (`part-levels/`)
- AD-25 `Pure logic is plain functions` (`loadKeyPoses` reads files) -- fixed (existing function, unchanged role, stated)
- `Give each file one kind of thing` (key-centres split) -- fixed (each export's file named; `src/key-centres.ts` → `load-key-poses.ts`)
- `X, not Y, because Z` (orderings, fall-through; valibot as Y) -- fixed
- `threshold three rows` (checkInputs previous/next) -- fixed (row 10 cases)
- `Name the boundary's role` (`choc-key.spec.ts`, `default-key-part.spec.ts`) -- fixed
- `Glossary terms only.` (pose, `Design`, `InvalidInput`) -- fixed (`Variant`, `BlueprintInputInvalid`); "pose" kept, rename deferred

## Verification

**Commands:**
- `pnpm build:library` -- expected: `compiled/choc-key/1.json` declares `size`.
- `pnpm test` -- expected: all green.
- `pnpm typecheck`, `pnpm lint`, `pnpm depcruise` -- expected: clean.
