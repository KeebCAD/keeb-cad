# Data schema draft (2026-10-31)

Status: **approved by Sergii as a whole on 2026-10-31.** Its types and rules are in the spine's Data Schema section; this file is the decision record. Decision 58 was added afterwards, while reviewing the spine transcription. Parked items wait for the recipes party. The types below are notation for what the Valibot schemas infer (decision 31).

Scope: what layout needs. The design file's `meta`, `library-versions`, `parts` and `layout` sections, and the library part fields that layout reads. Everything else is listed under "Recorded, not typed" or "Not yet defined".

## Types

```ts
// ── shared kinds (defined once in model) ────────────────────
// A quantity is a literal with a unit (`mm`, `deg`) or an expression (AD-17). `u` is not a length (decision 48).
type Delta  = Quantity<'mm'>                  // signed displacement, no check
type Length = Quantity<'mm'>                  // extent; `negative-length` when it evaluates < 0
type Angle  = Quantity<'deg'>
type Vec2   = { x: Delta; y: Delta }
type Offset = { position?: Vec2; rotation?: Angle; pivot?: Vec2 }
type Gap    = { x: Length; y: Length }        // edge to edge between keycaps (decision 49)
// A branded value exists only after its schema checked it; each schema is defined once, here (AD-24).
type Revision = Brand<string, 'Revision'>       // content hash (glossary); the hashing code parses its result with this schema
type Licence = Brand<string, 'SpdxExpression'>  // SPDX expression, e.g. 'MIT OR Apache-2.0'
type PartId   = Brand<`lib:part/${string}`, 'PartId'>       // 'lib:part/choc-v2-hotswap'; v.custom over a string (decision 32)
type RecipeId = Brand<`lib:recipe/${string}`, 'RecipeId'>   // 'lib:recipe/choc-key'
type LibraryId = PartId | RecipeId                          // one id brand per kind of library item (decision 41)
type Version = Brand<number, 'Version'>          // whole number ≥ 1, counts up, each version immutable
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }   // every expected-failure boundary; plain union, no library

type Anchor =
  | { type: 'slot'; ref: Ref<'slot'>; attach?: AttachPoint }
  | { type: 'group'; ref: Ref<'group'> }
  | { type: 'vertex'; ref: Ref<'vertex'> }
  | { type: 'construction-point'; ref: Ref<'construction-point'> }
// No `part` anchor: placing relative to a part goes through its slot.

// Ref<kind>: the target kind's id type (Ref<'library-part'> = PartId, Ref<'library-recipe'> = RecipeId, others = Id); `ref(kind)` adds v.metadata({ refKind }) for the walk (decision 34).
// Id, Expression: as in AD-24. Quantity: as in AD-17. Brand: Valibot's `v.brand`. AttachPoint: as in the glossary.

// ── library (owned by `library`, immutable per version) ─────
type LibraryPart = {
  id: PartId
  version: Version
}

// ── design file ─────────────────────────────────────────────
type FormatVersion = Brand<number, 'FormatVersion'>   // whole number ≥ 1; the format-version reader parses with this schema (AD-8)

type DesignFile = {
  formatVersion: FormatVersion                    // top-level node, read before anything is parsed
  meta: Meta
  libraryVersions: LibraryVersion[]
  parts: DesignPart[]                             // typed now: the first layout story needs it (decision 51)
  layout: Group
  overrides: Override[]                           // per-side differences (decision 54)
}

type Form =
  | { type: 'split'; board: 'reversible' | 'mirrored' }   // board limits what the halves may differ in (AD-6)
  | { type: 'unibody' }

type Meta = {
  id: Id
  name: string
  form: Form
  defaultPart: PartRef                            // required; groups may override
  gap: Gap                                        // required; one uniform gap, so rows align; no group or per-child gap
  licence?: Licence                               // the design's own licence
  provenance?: { sourceDesign: Id; sourceRevision: Revision; licence?: Licence }   // only after Copy design; licence copied from the source's meta.licence, unset when it had none
}

type LibraryVersion = { id: LibraryId; version: Version }   // one per library item used; the record's id is the LibraryId (AD-23 holds)

// ── parts: a key is a part, usually made by a part recipe ───
type PartRef = Ref<'library-part'> | Ref<'design-part'>     // holds PartId | Id

// open until the recipes party; typed this way until then (decision 53)
type InputValue   = string | number | boolean | Quantity
type RecipeInputs = Record<string, InputValue>              // checked against the recipe's declared inputs when the part resolves; unknown input or bad value → `recipe-input-invalid`

type DesignPart =
  | { type: 'recipe'; id: Id; recipe: Ref<'library-recipe'>; inputs: RecipeInputs }   // main path
  | { type: 'built';  id: Id /* components: recorded, typed with the PCB story */ }   // escape hatch (decision 2)
// `1u`, `1.5u`, … are values of a recipe's `size` input: labels, never a length

// ── layout ──────────────────────────────────────────────────
type NodeBase  = { id: Id; anchor?: Anchor; offset?: Offset }   // anchor unset = default anchor (AD-3, AD-4)
type GroupBase = NodeBase & { defaultPart?: PartRef }           // overrides meta.defaultPart
type ChainGroup = GroupBase & { arrangement: 'chain'; axis: 'x' | 'y'; children: Node[] }
type FreeGroup  = GroupBase & { arrangement: 'free';  children: Node[] }
type Group = ChainGroup | FreeGroup
type Node  = Slot | Group

type Slot = NodeBase & {
  part?: PartRef                              // unset = nearest ancestor's defaultPart, else meta.defaultPart; no 'empty' (decision 54)
  inputs?: RecipeInputs                       // adjusts the part's recipe inputs for this slot, e.g. { size: '1.5u' }
}
// chain step along the axis = (keycapA + keycapB) / 2 + meta.gap[axis]
//   keycap = the keycap envelope of the slot's resolved part, in the slot's frame before its rotation
// one key's own adjustment is its offset (it carries to later siblings, AD-4)

// ── overrides: per-side differences (M1 part) ───────────────
type SideId = Brand<`${'left' | 'right'}/${string}`, 'SideId'>   // a derived placement, e.g. 'right/thumb-far'
type Override =
  | { type: 'side-part'                       // per-side part change (decision 54)
      target: Ref<'side-placement'>           // holds a SideId; resolves to the authored slot after the side prefix
      part: PartRef | 'empty' }               // remove or swap the part on that side
  // later, nets-and-matrix epic: matrix row/column, MCU pin and LED-order variants (decision 58)
// a removed slot keeps its space: the step uses its authored part's keycap (decision 56)
// later (mirrored boards): inputs and offset per side
```

## Decided during the session

1. Key cells are folded into parts, with design-local parts (committed in `342bf6e`).
2. A design-local part's components reference library parts, one level deep.
3. Every part, library or design-local, carries one `reversible` flag. Part-level DRC checks a design-local part's F and B copies. A non-reversible part on a `split-reversible` design is the new `model` violation `part-not-reversible`.
4. Population is dropped as a section. Per-side differences come later in `overrides`: `split-reversible` allows only part → `empty`; `split-mirrored` allows swap, remove and offset.
5. `anchor` and `offset` are one shared schema each, used by every placed thing.
6. `format-version` is a top-level node before `meta`.
7. A part's own copper is `tracks`, never rerouted. The AD-14 connection tag is `part-tracks` (was `fixed-tracks`).
8. `library-versions` is keyed by library id: one version per library part per design.
9. Shape rules: pairs are `Vec2` / `Size`, never `x`/`y` field pairs. Variants are discriminated unions with a `type` or `arrangement` field. A rule that a type can express is a type, not a comment.
10. AD-3's `part` anchor kind is dropped; the slot anchor covers it.
11. Every `Anchor` variant names its target `ref`; the `type` value is the kind name.
12. (Replaced by 48.) (Renamed by 44 and 45: the field is `u`, its type `USize`.) Pitch is its own type `Pitch = { x: Spacing; y: Spacing }`, used by `meta.pitch` and the group override; `u` on x resolves from `pitch.x`, on y from `pitch.y`.
13. (In part replaced by 48: `Delta` and `Length` stay, mm only.) `Delta` (signed displacement; was `Coord`, see 27) and `Length` (extent) stay separate kinds; `Length ≥ 0` is a runtime check in `model` (an expression's sign is known only after evaluation).
14. (Replaced by 45: the kind is dropped.) `Spacing` is a third kind (distance between things, checked > 0 at runtime), so no `x`/`y` field is ever typed `Length`.
15. `minPitch` and the `pitch-below-min` violation are dropped; `overlap` on part envelopes is the one collision check (it also catches rotated, splayed and offset keys).
16. `Version` is a whole number that counts up, not semver; it promises only "new and immutable".
17. `LibraryId` is a branded type with a `lib:` prefix, so it can never collide with a minted design `Id`. Its schema rejects an id without the prefix.
18. A `LibraryVersion`'s `id` (was `CatalogueRef`, see 39) is its `LibraryId`, so AD-23's generic id walk, undo and cascade delete apply unchanged. AD-8 gains a note: ids starting with `lib:` come from the library, not from `model`.
19. `Revision` is a branded shared kind; the code that hashes the canonical serialisation parses its result with the `Revision` schema. Every revision in the spine uses it: provenance, storage versions and `listDesigns` (AD-9), stage and routing tags (AD-11, AD-12).
20. `Licence` is a branded SPDX expression, checked when parsed; an unknown id is rejected. A custom licence uses SPDX's `LicenseRef-…`. One dependency: the SPDX id list and an expression parser.
21. `meta.licence?` holds a design's own licence. Copy design copies the source's `meta.licence` into `provenance.licence`, which is optional and stays unset when the source had none.
22. Copy design also starts the copy's own `meta.licence` as the source's; the user may change it. A default, not enforcement.
23. `formatVersion` is a branded `FormatVersion` (whole number ≥ 1), parsed with its own schema by the reader that runs before the design schema parse. It is not the library's `Version`.
24. The library's version number is branded too (`Version`, see 42; whole number ≥ 1).
25. A brand comes from its schema, never from a particular caller: a branded value means "checked". Every brand's schema is defined once in `model`'s shared kinds; `LibraryId` and `Version` move there, since the design schema parses `libraryVersions`.
26. (Replaced by 49: no per-child gap.) A chain child's `gap` is signed: a negative gap pulls every later child closer; `overlap` on envelopes catches one that is too negative. Its kind is `Delta`.
27. (In part replaced by 48: the rename stays; `Spacing` and `u` are gone.) `Coord` is renamed `Delta` everywhere: `offset.position`, `pivot` and `gap` are all displacements. `Delta`, `Length` and `Spacing` (dropped by 45) are one TypeScript type under three aliases, so the names are for reading; only `model`'s runtime checks (`Length` < 0, `Spacing` ≤ 0) tell them apart.
28. (Replaced by 49: no per-child gap.) `gap` behaves the same on every entry: the space before it, from the previous entry's edge or, for the first, from the group origin. Deleting any child closes the chain up the same way.
29. A chain has `axis: 'x' | 'y'` (replacing `direction: +x | +y`): it always steps the positive way, and the order of its children sets the direction.
30. (Replaced by 49: no `ChainGroupNode`.) No wrapper around chain children: `ChainGroupNode = Node & { gap?: Delta }`, so `gap` exists only on a chain's children and the file stays flat. `Group` stays a union discriminated by `arrangement`.
31. **Valibot schemas are the source of truth.** Every type is inferred from its schema (`v.InferOutput`), never declared by hand. The TypeScript in this draft is notation for the inferred types.
32. The pass-through ban (2026-10-30 review autofix, F4) narrows to object-valued kinds: `unknown`, `any`, `instance`, `looseObject`, and `custom` over an object stay banned, because they return the caller's reference and break the fresh-copy parse. `v.custom` over a primitive (e.g. `` `lib:${string}` ``) is allowed only as a later step in a `v.pipe` whose first item is a primitive schema; the `toJsonSchema` overrideAction maps it (F5). No schema-kind test: layer 3's checks (caller input not frozen, no proxy in the design, over every registered command and `replaceDesign`) catch a pass-through wherever it sits. The reference walk test stays.
33. (In part replaced by 49: `ChainGroupNode` is gone; the exception stays for the `Node`/`Group` unions and `children`.) The one exception to 31 is the recursive layout tree, because TypeScript can't infer a type through the `children` cycle (checked with Valibot 1.5.0 and TypeScript 5.9: inferring whole group types fails with "circularly references itself"). Hand-written: the unions (`Node`, `Group`, `ChainGroupNode`) and the `children` fields only, as `InferOutput<typeof …Fields> & { children: … }`. Every other field, `Slot` included, is inferred. The recursive schemas are annotated with `v.GenericSchema<…>`; that annotation is the only check, with no type-equality test.
34. A reference's value is the target kind's id type, with no kind and no wrapper in the value: `ref('library-part')` holds a `PartId` (decision 41), `ref('slot')` an `Id`. `ref(kind)` is that id schema piped with `v.metadata({ refKind })`, read only by the generic walk (`v.getMetadata`). Code that uses a field looks the target up in its own section; there is no id index. Checked by running a walk on Valibot 1.5.0: it reports `slot.part`, and `part: 'empty'` (the literal branch, no metadata) is never taken for a ref.
35. (Replaced by 48: no `Size`; keycap size comes from the part.) `Size` resolves `u` like `Vec2`: `w` by `u.x`, `h` by `u.y`, in the slot's own frame before its rotation, with `u` from the nearest group. Rotation never changes what `u` means.
36. `meta.defaultPart` is required and any group may override it, the same pattern as `u`; every slot without a part resolves to one. A required ref can't be cleared by a cascade, so deleting the `libraryVersions` entry it names is refused (AD-2 typed rejection) or asks for a replacement. `'empty'` stays slot-level only (since 54: `'empty'` exists only in `overrides`).
37. `catalogue-refs` is renamed `library-versions` (`libraryVersions`): it is the design's lock on which version of each library part it uses. The ref kind for a library part is `Ref<'library-part'>`.
38. `form` is a discriminated union: `{ type: 'split'; board: 'reversible' | 'mirrored' } | { type: 'unibody' }`. Shape (split or unibody) decides whether a right side is derived; `board` (split only) decides what the halves may differ in and whether `part-not-reversible` applies. It stays in `meta` because layout reads it. Everywhere the draft says `split-reversible` / `split-mirrored`, read split with board `reversible` / `mirrored`.
39. The `libraryVersions` item is `LibraryVersion = { id: LibraryId; version: PartVersion }` (was `CatalogueRef`); the version number's brand is renamed `PartVersion` (was `Version` / `LibraryVersion`).
40. "Catalogue" goes: "catalogue schema" becomes **part schema** (owned by `model`, used by library and design-local parts alike), and every other "catalogue" becomes "library" (glossary, AD-5, the mermaid node, cache key, package comments, PRD, initiative, tickets). Dated decision-log entries stay as written.
41. Each kind of library item has its own id brand under the `lib:` prefix: `PartId` (`lib:part/…`) and `RecipeId` (`lib:recipe/…`); `LibraryId = PartId | RecipeId`. `libraryVersions` locks both. So `Ref<'library-part'>` holds a `PartId` and `Ref<'library-recipe'>` a `RecipeId`, and the compiler rejects a recipe id in `slot.part`. A new kind of library item adds one brand and one union member. The version number is named `Version` again (decision 42).
42. The library version number is `Version = Brand<number, 'Version'>`, neutral for parts and recipes. It replaces `PartVersion` (39); `FormatVersion` has its own brand, so the compiler keeps the two apart.
43. (Replaced by 44.) The field `pitch` is renamed `spacing` (`meta.spacing`, group `spacing`), the word builders use ("Choc spacing", "MX spacing"). The names of its type (now `Pitch`) and of the `Spacing` kind are open; the rename through the draft is applied once they are settled.
44. (Replaced by 48.) The field is `u`, not `spacing` (replaces 43): it is what 1u is in millimetres per axis (`meta.u`, group `u`), not a distance between keys; a 1u key beside a 6u key has centres 3.5u apart. Its type is `USize` (45).
45. (Replaced by 48: no `USize`.) The `Spacing` kind is dropped: its only use was this field. `USize = { x: Quantity<'mm'>; y: Quantity<'mm'> }` carries the check itself (each half > 0, else a `model` violation). No `x`/`y` field is typed `Length`, so 14's reason still holds. `Delta` and `Length` remain the two quantity kinds (27).
46. (In part replaced by 48: the "1u = x × y mm" label goes; "pitch" stays retired, its job taken by `meta.gap`.) "Pitch" is retired from the living docs (spine, PRD, initiative, tickets, UX): `u` in the schema and file, and the UI label "1u = [x] × [y] mm". History docs (reviews, reconcile notes, digests, sources, dated decision entries) stay as written.
47. `note` is dropped from `NodeBase`: nothing in the PRD, UX or stories uses it. Annotations come back as an optional field when a story asks for them (adding one needs no migration).
48. **`u` is not a length.** Positions, gaps and offsets are in mm; `Quantity` has no `u`. `1u`, `1.5u`, … are labels: values of a part recipe's `size` input that pick the keycap (and, from 2u, the stabilizer). `meta.u`, group `u`, `USize`, `Size` and the slot's `size` field are gone.
49. **One uniform gap:** `meta.gap: Gap = { x: Length; y: Length }`, required, edge to edge between keycaps, so rows align. No gap on groups and none per chain child: one key's adjustment is its `offset`, which already carries to later siblings (AD-4). Chain step along the axis = (keycapA + keycapB) / 2 + `meta.gap[axis]`, keycaps taken from each slot's resolved part in the slot's frame before its rotation.
50. **A key part is usually a part recipe applied with inputs** (`{ type: 'recipe'; id; recipe; inputs }`). A hand-built design-local part (library components, one level deep) stays as the escape hatch for what no recipe covers, so decisions 1 and 2 are extended, not replaced. A slot may adjust its part's recipe inputs (`slot.inputs`, e.g. `{ size: '1.5u' }`). Several recipes, no universal one.
51. `PartRef = Ref<'library-part'> | Ref<'design-part'>` on `meta.defaultPart`, `GroupBase.defaultPart` and `slot.part`, so a recipe-built design part can be the default. `DesignPart` is a `recipe` / `built` union, and `parts: DesignPart[]` is typed now, because the first layout story needs it.
52. One interpreter **per recipe kind**: part recipes and outline/case recipes have separate interpreters (AD-18 reworded). The part recipe interpreter starts tiny, with only `size` producing the keycap envelope, in the first layout story that needs a 1.5u key, and grows one input per later story.
53. `RecipeInputs = Record<string, InputValue>`, checked at runtime against the recipe's declared inputs, because recipes are library data the compiler can't see. Open for the recipes party (the alternative: recipes as code with typed inputs, which turns library versions into app releases).
54. `overrides` is typed now, M1 part only: `Override = { target: Ref<'side-placement'>; part: PartRef | 'empty' }`, where a side placement's id is a branded `SideId` (`left/…`, `right/…`). `'empty'` leaves the authored `slot.part`: research found no deliberate mid-column holes; a short column is a chain with fewer slots, a hole is a missing slot or the next key's offset, and an encoder in a key position is `slot.part` naming an encoder part. Per-side removal and swap are overrides. The reference walk resolves a `SideId` to its authored slot, so deleting the slot cascades to its overrides and an override to a missing slot is dangling. Per-side `inputs` and `offset` come with mirrored boards.
55. Whether an override on a reversible board may **swap** a part (decision 4 says removal only) is parked for the recipes party, together with Sergii's thought that a key-or-encoder position is a combo part recipe (both footprints plus pre-routing) whose fitted component may differ per half. Until then the override's `part` stays `PartRef | 'empty'` as approved in 54.
56. A slot removed on one side by an override **keeps its space**: that side's chain still steps by the keycap of the slot's authored part, which the other half fits, so the halves stay geometrically identical and only what's fitted differs.
57. Whether `slot.inputs` may change any input or only those a recipe declares per-slot is parked for the recipes party. Until then a slot may change any input, and a nonsense combination is a violation when the part resolves.
58. `overrides` is one discriminated union: the per-side part change is `{ type: 'side-part'; target; part }`, typed now, and AD-14's netlist overrides (matrix row/column, MCU pin, LED order) arrive as further variants with the nets-and-matrix epic. Added after the whole-draft approval, while reviewing the spine transcription.
59. A plain `Result<T, E> = { ok: true; value: T } | { ok: false; error: E }` joins the shared kinds; `run` and every expected-failure boundary return it, the apply step stays `void | Rejection`, no library. Added during the 2026-10-31 autofix audit (item 5).
60. The JSON Schema export of command inputs is deferred (no M1 agent reader; the UI reads Valibot schemas directly), so decision 32's "`toJsonSchema` overrideAction maps it" no longer applies. Added during the 2026-10-31 autofix audit (item 12).

## Recorded, not typed (each waits for the story that needs it)

- **Library part:** pins, pads, envelope, cutouts, keep-outs, parameters, `reversible`, `tracks`. First PCB story (`epic-parts-and-pcb`); envelope with the first outline story; cutouts with the plates story.
- **Built design-local parts (`type: 'built'`):** components (library ref, `side: 'F' | 'B'`, `Offset`), `reversible`, `tracks`. First PCB story.
- **Part recipes:** declared inputs, output shape, the design's own part recipe. The recipes party; the interpreter starts with `size` → keycap envelope (decision 52).

## Not yet defined

- `PinRole` (the netlist derives rows, columns and LED chains from it, AD-14) and `CutoutRole`.
- How a part parameter binds to geometry (e.g. a screw-hole radius changing its cutout).
- Every other design-file section: `parameters`, `construction`, `pieces`, `plates`, `case`, `design-rules`, `keymap`, `routing`. (`overrides` has its M1 part typed, decision 54.)

## What changes in the spine once approved

- **Glossary:** `pitch-x` / `pitch-y` go, and so does "pitch" as a term; `gap` is added (the uniform edge-to-edge gap between keycaps); `u` is a keycap-size label, not a length; `population` goes; `override` gains per-side slot overrides; `reversible` and `part recipe` are added; `anchor` loses the `part` kind; `part` covers recipe-built and built design parts.
- **AD-2:** population mentions go. Deleting the `libraryVersions` entry or design part that the required `meta.defaultPart` names is refused (typed rejection) or asks for a replacement.
- **AD-3:** the `part` anchor kind goes.
- **AD-4:** chain `direction` becomes `axis`. "Every length property is tagged x, y or none" and the `u` unit rules go: lengths are mm (`Delta` / `Length`). The step becomes (keycapA + keycapB) / 2 + `meta.gap[axis]`, keycaps from each slot's resolved part, in the slot's frame before its rotation; `size` and `gap(n)` leave the formula, and one key's adjustment is its offset. "Empty slots keep their index and still advance the chain" goes (no empty authored slots, decision 54); a slot removed on one side by an override keeps its space (decision 56).
- **AD-5:** "pitch is independent of switch type" goes (positions are mm; the gap is design-wide); `meta.defaultPart` is required, groups override it ("a default part per group" becomes this); a key part is usually a part recipe applied with inputs, slots may adjust inputs, hand-built design-local parts stay; no population; the `reversible` flag; components one level deep; the library / design-local split. "Pitch below a switch's minimum is `pitch-below-min`" goes; the part schema loses minimum pitch.
- **AD-6:** per-side differences are `overrides` entries targeting `left/…` / `right/…` (`'empty'` leaves `slot.part`); a removed slot keeps its space on that side (56); whether a reversible board may swap a part is parked for the recipes party (55); `form` becomes `{ type: 'split'; board } | { type: 'unibody' }` (and every `split-reversible` / `split-mirrored` mention across the spine, PRD and tickets); reversible halves differ only through per-side overrides; `part-not-reversible`.
- **AD-8:** "Annotations use a `note` property" goes (comments are still not preserved); `catalogue-refs` becomes `library-versions`, its ref kind `library-part` (glossary `part` too); `format-version` is a top-level node; `population` leaves the section list; `lib:` ids come from the library, not from `model`.
- **AD-9:** Copy design's provenance licence comes from the source's `meta.licence`, and the copy's `meta.licence` starts as the source's; `meta` gains `licence`.
- **AD-12, AD-14:** `fixed-tracks` becomes `part-tracks`.
- **AD-15, AD-19, AD-21:** population mentions go.
- **AD-18:** "one interpreter" becomes one interpreter per recipe kind; part recipes join outline/case recipes; the part recipe interpreter starts with `size` only.
- **AD-24 (and AD-2 Inputs):** Valibot schemas are the source of truth; types are inferred, never declared by hand, except the recursive layout tree's unions and `children` fields, annotated with `v.GenericSchema`. A ref's value is its target kind's id type; metadata carries the kind; a `side-placement` ref holds a `SideId` and the walk resolves it to the authored slot. The pass-through ban covers object-valued kinds only; `v.custom` is allowed after a primitive in a pipe; the "test over every schema rejects them" goes, layer 3 covers it. `Delta`, `Length`, `Angle`, `Vec2`, `Offset`, `Gap`, `Anchor`, `Revision`, `Licence`, `PartId`, `RecipeId`, `LibraryId`, `Version`, `FormatVersion`, `PartRef`, `SideId` and `Result` join the shared kinds.
- **Everywhere (living docs):** "catalogue schema" becomes "part schema"; every other "catalogue" becomes "library" (decision 40). "Pitch" goes; its job is `meta.gap` (decisions 46, 49).
- **Violations:** `part-not-reversible` is added; `pitch-below-min` goes; an unknown recipe input or bad input value is a violation.
- **New:** a Data Schema section holding these types, and a rule that a story can't add or change a section's fields until the spine defines them. That rule is enforced by checks in `bmad-build` and the PO's refinement, plus an `AGENTS.md` line.
