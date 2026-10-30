---
review: adversary
target: _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
scope: 2026-10-30 update run for epic-see-corneys-keys (AD-2 Immer writes, input parsing, Frozen/Writable, undo by reference comparison; AD-3 cycle rejection; AD-10 immer and valibot fences; AD-24 Valibot as the one schema format, file-load validation; AD-25 one partial per package, disjoint tokens; AD-26 physical-key hotkey rule; Verification layer 3)
evidence: git diff of the spine, the last 14 entries of .memlog.md, epic-see-corneys-keys (epic file and tickets.toml), EXPERIENCE.md (binding field)
date: 2026-10-30
method: for each hole, two units one level down (stories in different slices, or two packages) that each obey every AD to the letter and still build incompatible software
---

# Adversarial review: the slice-13 amendments

## Verdict

**Not ready for 13.1 as written: one tightening pass, no redesign.** The new decisions are each sound on their own (Immer with freeze, parse-before-apply, Valibot, disjoint partials, the symbol-key ban). The holes sit where they meet the rules they were added next to:

1. **The Immer recipe contract and the "typed rejection" rule contradict each other** (A1). An apply step "returns nothing", yet a command "returns a typed rejection"; and Immer treats a returned value as the new state.
2. **Only the command path freezes.** `replaceDesign`, library data and the routing section enter by other doors, unfrozen, and the spine does not say whether the design ref is `ref` or `shallowRef` (A2, A3).
3. **Register entries are values appended with `appendValue`, so they can't reach services**, and `Writable<T>` is not exported, so no package outside `model` can type an apply step, while AD-10 now says such packages exist (B1).
4. **The gesture is a mark pair, not a lock.** Nothing stops a command, an agent call or an autosave landing between `begin` and `commit` (B2).
5. **"Compare references" only finds AD-23's records if the in-memory shape is normalized**; the spine never fixes the in-memory shape (B3).

Severity: **critical**: can't integrate without an architecture change. **High**: integrates, but loses work or gives wrong outputs. **Medium**: behaves differently in ways tests catch late. **Low**: cosmetic or wording.

---

## A. Values entering the design: frozen or not, parsed or not

### A1. An apply step "returns nothing", but a command "returns a typed rejection". **High**
- **Units:** 13.1 (the register's run step, `newDesign`) and 13.3 (explicit anchors, cycle rejection).
- **Build 13.1:** follows AD-2: `run(name, input)` parses, then `produce(design, d => entry.apply(d, parsed))`. Apply "returns nothing". A thrown error is a bug (Violations: "Design problems never throw").
- **Build 13.3:** follows AD-3 and Violations: "`model` rejects a command that would create a cycle, with a typed rejection naming the cycle's ids" and "Commands that can't apply return a typed rejection". The only place it can detect the cycle with the new anchor in place is inside apply, on the draft. So it does `return { rejected: 'anchor-cycle', ids }` from apply.
- **Why it breaks:** in Immer, a recipe that returns a non-`undefined` value **replaces the state** with that value when the draft is unmodified, and throws ("returned a new value *and* modified its draft") when it is modified. So 13.3's rejection either becomes the new design (silently, if the check runs before any write) or throws through 13.1's run step, which treats throws as bugs. A third team (agents) gets whatever comes out. Each story is to the letter; together they corrupt the design or crash.
- **Also:** the availability check runs "over the read-only design" before apply, so it can't see the post-write graph. There is no stated place for checks that need the after-state.
- **Rule (AD-2, Writing):**
  > "An apply step returns `void`, or a `Rejection` built with `model`'s `reject(kind, ids, message)`. The register calls it inside `produce`, keeps any rejection outside the recipe, returns `undefined` to Immer, and on a rejection discards the produced value: the design ref is not written and no undo entry is made. After every produced value, the register runs `model`'s structural checks (the dependency graph is acyclic, AD-3) on it and rejects the same way. No apply step checks acyclicity itself. `run` returns `{ ok: true } | Rejection`; it throws only on a bug."

### A2. `replaceDesign` values are validated but never frozen, and the design ref's kind is not fixed. **High**
- **Units:** 13 story 1 (storage autosave and reload) and 13.1 (register, design service).
- **Build story 1:** follows AD-24: "File load validates every section with the same schemas before `replaceDesign`". Valibot `parse` returns a fresh, **unfrozen** copy. It calls `replaceDesign(parsed)`.
- **Build 13.1:** follows AD-25 and the Editor-state convention ("ts-inject services holding Vue refs"). The design service holds `ref<Frozen<Design>>(…)`. AD-2 promises "Every design value is therefore frozen, so Vue never proxies it", which is only true for values that came out of `produce`.
- **Why it breaks:** after a reload, `ref()` deep-proxies the unfrozen loaded value (Vue's `reactive()` returns only frozen objects raw; memlog 2026-10-30). The first command then drafts a **Vue proxy** as Immer's base; untouched subtrees in the result are still proxies, so the "design holds no proxy" layer-3 test passes on fresh designs (13.1) and fails only on loaded ones, and the crossing throws `DataCloneError` the first time a worker gets a slice of a reopened design (epic-routing-and-fab, two slices later). The type `Frozen<Design>` lies about the loaded value, and a stray write after load succeeds silently. Whether Immer's finalize deep-freezes untouched subtrees of an unfrozen base is an Immer implementation detail; a rule must not lean on it.
- **Also:** the layer-3 test "design holds no proxy" runs over commands only; nothing runs it after a load.
- **Rule (AD-2, first bullet, and AD-24):**
  > "The design service holds the design in a `shallowRef`; nothing holds a design value in `ref` or `reactive`. `replaceDesign` lives in `model`'s register concept, takes `unknown`, parses it with the design schema (after migration), deep-freezes the result with Immer's `freeze(value, true)`, and only then writes the ref. It is the only other caller of Immer. Layer 3 adds: after `replaceDesign`, every design value is frozen and holds no proxy."

### A3. The routing section has two writers if `Design` means "the file". **High**
- **Units:** 13 story 1 (schema skeleton for "all 14 AD-8 sections", `routing` included) and epic-routing-and-fab (pipeline writes the routing section).
- **Build story 1:** follows AD-8 and AD-24: the design schema covers every AD-8 section; file load "validates every section with the same schemas before `replaceDesign`". So `Design` has a `routing` field, `replaceDesign` writes it, and every command gets `Writable<Design>` with `routing` in it.
- **Build routing:** follows AD-10/AD-12: "`pipeline` also holds the routing section … in shallow refs"; "Only `pipeline` writes the routing section".
- **Why it breaks:** two homes for the routing section (the design service and `pipeline`'s shallow ref), two writers (load via `replaceDesign`; `pipeline`), and every apply step can write routes at compile time, against AD-2's "The routing section is outside commands and undo". Undo by reference comparison would also record route changes as touched records if they live in `Design`. The revision (hash of the authored sections) and the routing hash need two inputs, but the save path sees one value.
- **Rule (AD-1 or AD-2, plus AD-12):**
  > "`Design` is the authored sections only; it is the type commands draft and the value `replaceDesign` takes. `DesignFile = { design: Design; routing: RoutingSection }` is the shape storage saves and loads. Load parses both with `model`'s schemas, then calls `replaceDesign(file.design)` and `pipeline.loadRouting(file.routing, revision)` in that order, through one `openDesign` function in `pipeline` (the only package that sees both owners). Save asks `pipeline` for the routing section valid at the current committed revision. No `Writable<…>` type contains the routing section."

### A4. Library data and stage outputs are neither frozen nor typed by one rule. **Medium**
- **Units:** an editor story that hands the catalogue to `model` (13.x, catalogue lookup; AD-10 "`model` receives catalogue and recipe data from its caller") and epic-tray-case (`CaseOutput` through the crossing).
- **Build editor:** stores the catalogue in a service as `ref(catalogue)` ("services holding Vue refs"). Deep-proxied. `model`'s computeds copy cutout objects into the resolved design; proxies reach the crossing.
- **Build tray-case:** follows AD-2's "every design value is `Frozen<…>`: … stages" and types `CaseOutput` as `Frozen<CaseOutput>`, deep-freezing it on entry for symmetry. `Object.freeze` on a non-empty typed array throws `TypeError`; `Immutable<Float32Array>` also produces a nonsense mapped type.
- **Why it breaks:** "plain data only at the crossing" is tested, but the cause (unfrozen data in a deep ref) is not ruled out at the source, and the two directions of the crossing get two policies by accident.
- **Rule (AD-10 / AD-11):**
  > "Catalogue and recipe data are deep-frozen once, where `library` exports them, and typed `Frozen<…>`. Every value that enters the graph from outside the register (catalogue, recipes, background results, the routing section) is held in a `shallowRef`. Background results are **not** frozen and are typed with `Readonly<…>` on their top level only (their typed arrays cannot be frozen); `Frozen<T>` is for design, catalogue and recipe values."

### A5. One schema format, but not one schema discipline: transforms. **Medium**
- **Units:** 13.2 (layout schema: lengths, `Length`, `Expression`) and a later command in another package (e.g. `setGap` input written by a different author).
- **Build 13.2:** `Length` as `v.pipe(v.string(), v.check(isLength))`: stored as the quoted string the file holds (AD-8, "Units in files").
- **Build other:** `Length` input as `v.pipe(v.string(), v.transform(parseLength))` (Valibot idiom), so apply gets `{ value, unit }` and writes that into the draft.
- **Why it breaks:** the design holds two shapes for one property; the canonical writer and the expression evaluator see both. `@valibot/to-json-schema` cannot express transforms, so agents get a schema that does not match what the register accepts. AD-24 says `Length` is "defined once", but nothing stops a local variant or a transform in a command's own schema.
- **Rule (AD-24):**
  > "Design and command-input schemas are **non-transforming**: each schema's output type equals its input type (a type test per exported schema). Expressions and lengths are stored as the strings the file holds and evaluated only in `model`'s computeds (AD-17). Command-input schemas are built only from `model`'s exported building blocks and Valibot's structural schemas (`object`, `array`, `picklist`, `literal`, `optional`); a test converts every registered input schema to JSON Schema and fails on any conversion error."

---

## B. Who writes, and how: register entries, gestures, records

### B1. Register entries can't reach services, and only `model` can type an apply step. **High**
- **Units:** `pipeline`'s Reroute action (epic-routing-and-fab), `editor`'s Theme / zoom actions (the frame story, after 13.1), and a command defined outside `model` (AD-10 now names "packages that define commands").
- **Build Reroute:** AD-2: entries are "plain definitions" appended with `appendValue('commands', …)`. Reroute must call `pipeline`'s service. A value can't receive injected dependencies, and module singletons are banned (AD-25). So the author either reaches for a module-level instance (banned) or gives actions a different run signature `(services) => …`; the Theme action author picks a third (closure over `localStorage`).
- **Build a non-`model` command:** AD-2: apply "receives a draft typed `Writable<Design>`"; "Writable types never leave `model`'s public surface". So a `library` upgrade command can't name its parameter type; it uses `any` or a cast. Meanwhile AD-10 says `valibot` is imported "by packages that define commands", which presumes they exist. The Open Question "Which packages define commands … and how writable design types stay out of `model`'s public surface" is still listed, while two ADs now answer it in opposite directions.
- **Why it breaks:** three run signatures for one register; menus and agents can't call them uniformly; commands that capture services through closures can put non-input objects (a service's reactive state) into the draft, bypassing A-parse and freezing a service's state.
- **Rule (AD-2, Command register; closes the Open Question):**
  > "Only `model` defines **commands and gestures**; their apply step is a pure function of `(draft: Writable<Design>, input, context: { catalogue, recipes })` and reads nothing else. Other packages define only **actions**. An action's run step is `(input, services)`, where `services` is the root container; it never receives a draft. Each package exports its entries through one `appendFactory`-style provider (or a function from the container to its list) that `main.ts` appends, so an action reaches services without singletons. `valibot` is imported by `model` and by packages that define actions. `defineCommand`, `defineGesture` and `defineAction` in `model` are the only constructors; the register refuses anything else."
  - If ts-inject 1.2.1 has no factory form of `appendValue`, say instead: "the register is built from `commands` plus a lookup of services by token at run time"; either way, the spine must name it.

### B2. A gesture is two marks, not a lock: anything can land in between. **High**
- **Units:** the drag story (epic-drag-keys) and the agents adapter / autosave (13 story 1, AD-13).
- **Build drag:** `begin` takes the base, each `update` produces a revision (AD-2), `cancel` restores the `begin` value by reference, `commit` writes one undo entry from the begin base to now.
- **Build agents / shortcuts:** "Menus, shortcuts and agents see all three"; "Only registered commands run". An agent (or a hotkey such as `R`) calls `setGap` during an open drag. Nothing forbids it.
- **Build autosave:** watches the design ref and saves "the last 20 autosaved revisions". Every gesture update is a revision.
- **Why it breaks:** `setGap` lands between the drag's marks; `cancel` silently reverts it (restores the begin value), `commit` folds it into the drag's single undo entry with the drag's label. Autosave writes uncommitted mid-drag revisions into the rolling 20, pushing real versions out; AD-11 limits background stages to committed revisions but says nothing for storage. Also unspecified: whether `update` applies a delta to the previous update's value or an absolute input to the begin base; the two choices drift apart under float accumulation and give different results for the same pointer path, so screenshot baselines differ by author.
- **Rule (AD-2, gesture bullet):**
  > "At most one gesture is open. While it is open, the register refuses every other command and gesture with a typed rejection (`gesture-open`); actions that write nothing still run. Each `update`'s apply step runs on the **begin** value with the gesture's cumulative input, never on the previous update's value. `cancel` writes the begin value back. The design service exposes `committed`, a ref that changes only at committed revisions; autosave, background stages and the routing writer read `committed`, never the live design ref."

### B3. "Compare references" finds AD-23's records only in a normalized in-memory shape. **Medium-High**
- **Units:** 13 story 1 / 13.2 (schema mirrors the KDL file: list sections as arrays of items, layout as nested nodes with `children: Node[]`) and 14.1 (history: "touched records … found by comparing references").
- **Build 13.2:** in-memory design mirrors the file: nested tree, arrays of items. AD-8 and AD-23 say nothing against it.
- **Build 14.1:** follows AD-2/AD-23 literally. A record is "one item with an id … or one container's ordered id list". With nested arrays, editing one item gives the containing array a new reference, so the order record shows as touched on every item edit; editing a deep slot changes every ancestor group's reference, so every ancestor is a touched record. AD-23's own sentence "A reorder touches only the order record; a move between groups touches two order records and the node" is false in this shape. AD-9's id-keyed merge (milestone 2) inherits the noise.
- **Why it breaks:** 14.1 has to either normalize on the fly per section (per-section code, which AD-23/AD-24 forbid) or compare the order record by its id sequence and items by reference: two policies, picked by whoever writes history.
- **Rule (AD-23, Records):**
  > "In memory, every list section is `{ order: Id[]; items: Record<Id, Item> }` and the layout is `{ root: Id; nodes: Record<Id, Node> }` with each group's `children: Id[]`. The canonical writer and the loader convert between this and the file's nesting; nothing else sees the nesting. A record is one `items`/`nodes` entry or one `order`/`children` array, and touched means reference-unequal."

---

## C. Wiring and fences

### C1. "One partial per package" vs packages with no services, and workers. **Medium**
- **Units:** story 9 (scaffolds `reactive` and `geometry`) and the disjoint-tokens test (whoever writes `main.ts`).
- **Build 9:** `geometry` is pure functions (AD-16), so it exports no partial; or it exports an empty `geometryServices` to obey "Each package exports one `PartialContainer`". Two authors, two answers. `ui`, `viewer3d` and the stage packages (plain functions, never computeds) have the same choice.
- **Build test:** "every partial's `getTokens()`": the test has to enumerate the partials. If it imports a hand list, a package added to `main.ts` but not to the test escapes the check (the exact silent override the rule exists to prevent).
- **Workers:** the case and routing workers run in another realm; "no hand-wired factories" leaves them no composition root at all.
- **Rule (AD-25):**
  > "A package that provides services exports exactly one partial, `<package>Services`; a package with none exports none. `main.ts` merges the array `packagePartials` exported from `app/src/wiring.ts`; the disjoint-tokens test imports that same array. A worker entry file is the only other composition root; it builds its own container from its package's partial and never imports `reactive` (AD-10)."

### C2. AD-10's "`model` imports only `reactive` and `geometry`" read as a fence. **Low**
- **Units:** story 9 (dependency-cruiser fences, "violation fixtures") and 13.1 (register imports `immer`, schema imports `valibot`, writer imports `@bgotink/kdl`).
- **Build 9** writes the rule as worded: `model` → only `@keeb-cad/reactive`, `@keeb-cad/geometry`. 13.1 fails CI on its first import.
- **Rule (AD-10):**
  > "`model` imports only `reactive` and `geometry` among workspace packages; its third-party imports are `immer` (register concept only), `valibot` and `@bgotink/kdl`, and nothing else without an AD."

### C3. `Frozen`/`Writable` live in the register file, which the whole of `model` then depends on. **Low**
- Every `model` concept (schema, computeds, writer) types its values `Frozen<…>` and so imports the register concept, while the register imports the schema's `Design`. A concept cycle inside `model`; and the immer fence must allow type-only imports there and nowhere else.
- **Rule (AD-2, Read-only types):**
  > "`Frozen<T>` and `Writable<T>` are defined in `model`'s `frozen.ts`, beside the register, the only file besides the register's run step that imports from `immer` (type-only). Every other concept imports them from there."

---

## D. Hotkeys vs the binding field

### D1. The binding field captures the keys the register binds, and zag owns the listener. **Medium** (first keymap story, epic-firmware-and-keymap)
- **Units:** the frame story (`ui` hotkey layer, `R` / `Shift+R` rotate, Esc) and the keymap story (EXPERIENCE.md "Binding field": "plain keys, Shift and Alt combinations are captured as bindings; Ctrl combinations always reach the app"; "Esc always leaves the field").
- **Build frame:** zag's store owns its own `keydown` listener (memlog: "no event-feed API"). Whether it skips focused editable targets depends on its defaults; the binding field is not necessarily an `<input>`.
- **Build keymap:** the binding field listens on itself and captures `R`. Both fire: the key is bound **and** the selected key rotates. Esc both leaves the field and fires the global Esc (deselect / cancel gesture).
- **Second clash:** AD-26 makes hotkeys match logical key **or** physical code. A binding field written "the same way" records the logical key: on a Ukrainian layout, pressing the key labelled `к` records `к`, but ZMK keycodes are positional (`&kp R`). EXPERIENCE.md requires non-US layouts to work; nothing says which property a capture reads.
- **Rule (AD-26, Shortcuts):**
  > "An element that captures keys marks itself with `ui`'s `useKeyCapture()`. The hotkey layer ignores every event whose target is inside a capturing element, except Ctrl and Meta chords. Esc inside a capturing element is handled by the element only. Captured bindings read `KeyboardEvent.code` only and map it to the neutral `key` vocabulary (AD-19) through one table in `model`."

---

## E. Smaller gaps

- **Migration vs validation order. Low.** AD-24: "validates every section with the same schemas before `replaceDesign`"; AD-8: migrates older versions on load. If validation runs before migration, every old file fails. **Rule:** "Load order: KDL parse → migrate to the current format-version → parse with the current schemas → `replaceDesign`. Old format versions have no schemas."
- **Gesture input schemas. Low.** "gestures … are defined the same way" leaves one schema or three (begin, update, commit). **Rule:** "A gesture declares one input schema for `begin` and one for `update`; `commit` and `cancel` take none."
- **JSON Schema consumers. Low.** "exported to agents and the UI as JSON Schema": the inspector author may build forms from JSON Schema while another uses Valibot directly. **Rule:** "Agents read JSON Schema; `editor` reads the Valibot schemas."
- **Typed-rejection kinds have no owner list. Low.** Violations lists kinds per owner; rejections (`anchor-cycle` rejection, vertex-in-use, keymap layer referenced, `gesture-open`) do not. **Rule:** "Rejection kinds are listed in Violations beside violation kinds, each with one owner."

---

## 📐 Angles not covered by this run

- 📐 The spine now relies on two undocumented internals at once: Valibot schema fields (the reference walk, guarded by a test) and Immer's freeze/finalize behaviour (A2). Only the first has a guard. A single layer-3 test, "every value reachable from the design ref is frozen and not a proxy", run after commands, gestures, undo, redo **and** load, covers both directions.
- 📐 The decisions were taken story-first (what 13.x needs). B2 (gesture lock) and A3 (routing split) are invisible from slice 13 because it has no drag and no routes, but they shape types that 13.1 and story 1 write now. Cheaper to fix the type (`Design` vs `DesignFile`, `committed`) in 13.1 than to retrofit in slice 14 and epic-routing-and-fab.
