---
review: adversary
target: _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
scope: 2026-10-30 fold of the directions record and code decisions (AD-2 command register / replace-not-mutate / undo by records between marks / fixes as command refs, AD-3 spots, AD-10 one reactive graph / re-export / no single resolve, AD-11 crossing / shallow refs, AD-16 pieces / fit / accents, AD-18 build style + ordered recipe list / closed operation set / per-piece cache, AD-23, AD-24, AD-25)
evidence: directions-2026-10-30.md, code-decisions-list-2026-10-30.md, the spine's Open Questions and Deferred tables
date: 2026-10-30
method: for each hole, two units one level down (epics or stories in different epics) that each obey every AD to the letter and still build incompatible software
---

# Adversarial review: the 2026-10-30 fold

## Verdict

**Not ready for the first vertical slices. It needs one tightening pass, not a redesign.** The fold is faithful to what was decided: one graph, one crossing, a command register, undo by records, pieces, live recipes. The holes are in the places where two decisions meet, and neither decision says who wins:

1. **Pieces have two homes and two evaluators (A).** AD-16 says `model` is the only piece evaluator and pieces live in the `pieces` section. AD-18 says recipes are made of named pieces, run by the `case` interpreter in a worker, and cached per piece. Spots, recipe piece ids, body ids and offsets all fall into that gap.
2. **The graph's edges are underspecified (B).** "No single resolve" leaves no defined plain input for a worker, cache key or freshness tag. Freshness tagged by revision contradicts must-not-recompute. Who wraps a live stage in a computed is not said.
3. **There is more than one writer, and more than one kind of action (C).** Load, version switch, the Pinia design store, gesture updates and Reroute-as-a-fix each write or act outside "registered commands". "Record" and "mark" are not defined well enough for two teams to build the same undo.
4. **Recipes have no scope rules (D).** Recipe expressions vs design-wide parameters, the style as a setting vs the first list item, and where a recipe's version is pinned.

The first slice in the room's sketch (see keys → change a parameter → drag) needs a command, a gesture, undo, a live stage and the stale marker on day one. So B and C must close before slice 1, and A and D before the slices "body follows" and "tray in 3D" are written as stories.

Severity: **critical**: the units can't be integrated without an architecture change. **High**: they integrate but give wrong outputs or lose work. **Medium**: they behave differently in ways tests catch late. **Low**: cosmetic.

---

## A. Pieces, recipes and spots

### A1. One "piece" with two evaluators: `model` (2D, live) and `case` (recipe interpreter, worker). **Critical**
- **Units:** epic-shapes-and-plates (piece evaluator in `model`) and epic-tray-case (recipe interpreter in `case`).
- **Build 1 (shapes):** follows AD-16 to the letter: "`model` is the **single piece evaluator** … No stage re-evaluates a piece." So it evaluates every piece in the design, the design's own recipe's pieces included, as computeds, with makerjs. A 2D `offset` is makerjs `model.outline`.
- **Build 2 (tray case):** follows AD-18 to the letter: "The `case` stage runs the list … The case worker caches per named piece." A recipe is "named pieces built from a closed set of operations". The tray's walls are "case offsets, not 2D piece offsets", using clipper2 in the worker. So the interpreter evaluates recipe pieces, 2D ones included.
- **Why it breaks:**
  - The same named piece (say the design recipe's `pocket-outline`) is evaluated twice, by two engines, in two threads. Or each team assumes the other evaluates it, and nobody does.
  - There are two `offset` operations with the same name and different engines (makerjs piece offset; clipper case offset). AD-16's own Prevents line, "plate, PCB edge, case and gerbers disagreeing on one offset or fillet", is reopened by AD-18: a plate made with a piece offset and a case lip made with a case offset of the same distance disagree by up to the arc tolerances.
  - A plate or outline that wants to read a recipe piece (a cover plate cut to the tray's inner wall) can't. That piece only exists in the worker, past the crossing, and `model` computeds can't read background output as an input to the resolved design.
- **Fix:** AD-16 + AD-18, one new rule:
  - "A **piece** is 2D and live. Every piece, the 2D pieces inside recipes included, is evaluated by `model` as part of the resolved design. Recipe operations are of two kinds: **piece operations** (2D, evaluated in `model`) and **solid operations** (extrude, tilt, edge rounding, solid booleans; evaluated by `case`). The `case` interpreter receives resolved regions and never evaluates a piece. The per-piece cache in the worker is a cache per **solid**."
  - Give the 3D result its own glossary term (the glossary already has **body**; "solid" for an intermediate is fine). The "one term for body geometry" stays true for 2D.
  - Name the case offset differently from the piece offset (e.g. `wall`, or `case-offset`), or state that AD-18's offset is a solid operation on a resolved region, never a piece.

### A2. Recipe pieces have no ids, and one recipe applied twice collides. **Critical**
- **Units:** epic-tray-case (`applyRecipe`, recipe data in `library`) and epic-design-document (ids, AD-24 references, who-points-at).
- **Build 1:** AD-10 says "`applyRecipe` receives the recipe from `editor` … `model` mints the ids." AD-18 says applied recipes are "never expanded". So the case section stores only `{ recipe: magnet-pockets@3, settings }`, and the recipe's pieces and spots carry the ids written in the library data (`pocket`, `floor`).
- **Build 2:** AD-8: "Every id is minted by `model` (kebab-case, unique per design)". AD-11: "A body's id is the id of the named piece whose result it is." So it expects every piece to have a design-unique, minted id.
- **Why it breaks:**
  - Apply `magnet-pockets` twice (left and right halves, or two sizes) and the design has two pieces called `pocket`, two bodies called `pocket`, and two spots called `pocket-centre`. The viewer's picking returns an ambiguous body id.
  - If `model` mints ids on apply, the recipe is effectively expanded (the ids have to be stored somewhere per piece), which AD-18 forbids. If it doesn't, AD-8 is broken.
  - The design's own unnamed recipe has no stated home for its pieces: `pieces` (AD-16: "Pieces … are authored sections, in list shape") or inside the `case` section's last application (AD-18). Two teams will choose differently; "Save as recipe" then moves items between sections or doesn't.
  - "A recipe may use the named pieces and spots of those before it" says nothing about how a library recipe names a piece of another recipe whose ids it can't know.
- **Fix:** AD-18, new bullets:
  - "Items inside an applied recipe have the resolved id `<application-id>/<recipe-item-id>`, the same scheme as block instances (AD-9). Only the application id is minted and stored. Body ids follow."
  - "The design's own recipe's pieces and operations live in the `case` section, in its last application. The `pieces` section holds only pieces outside recipes (outline, plates, user cutouts)."
  - "A recipe reaches earlier recipes only through **spots** and the design's **outline**, never by another recipe's item id." (Otherwise a library recipe is coupled to another library recipe's internals.)

### A3. A spot is not defined as a frame, and anyone can anchor to one, which makes cycles through the case. **High**
- **Units:** epic-layout (anchors, dependency graph, cycle check) and epic-tray-case (spots).
- **Build 1 (layout):** AD-3: "Every node, vertex, construction point and placed recipe operation has exactly one anchor … Any of them may explicitly anchor to any slot …, vertex, construction point or **spot**." So a slot (an MCU module, a power switch) is allowed to anchor to `usb-side`, and the editor's anchor picker offers spots for slots.
- **Build 2 (tray case):** spots are produced by the style recipe, which is built from the outline, which is derived from the keys (AD-16: derived pieces follow the layout). It computes `wall-outer` from the wall operation.
- **Why it breaks:**
  - Slot → `usb-side` → tray recipe → outline → fit of the group containing that slot: an anchor cycle. `model`'s cycle check can only see it if spot frames are in `model`'s dependency graph. If spots are computed in the worker (Build 2's natural choice, A1), the check misses it, and a style switch moves a key.
  - `wall-outer` and `floor` are a curve and a plane, not a frame. AD-3 needs a frame (anchor frame → translate → rotate). One team implements a spot as a frame; the other as a named edge or face set for edge rounding (whose open question is "3D edges reachable only through declared spots"). They don't compose.
- **Fix:** AD-3, tighten:
  - "A **spot** is a frame (AD-7), declared by a recipe and computed by `model` from the recipe's settings and resolved pieces, never from case output."
  - "Only recipe operations, in that recipe or a later one in the list, may anchor to a spot. Nodes, vertices and construction points outside recipes may not."
  - Leave edge/face selection as the open question it already is, but say it is **not** a spot.

### A4. Accents and the case corner style are two rounding mechanisms; a reference doesn't say which result it reads. **Medium**
- **Units:** epic-shapes-and-plates (accents on pieces) and epic-tray-case (AD-18 corner styles, "sharp with a fillet radius r").
- **Build 1:** stores accents as a list on the piece item; every reference to the piece reads the accented result.
- **Build 2:** treats an accent as a piece operation that yields a new named piece; a reference to the base piece reads the unrounded result. The tray rounds its walls with the case corner style instead.
- **Why it breaks:** the plate's rounded corner (makerjs arc) and the tray's inner wall (clipper `JoinType.Round` on the flattened outline) round the same corner by two mechanisms. A cover plate inside the tray clashes with the wall by the difference. Corney's ±0.05 mm acceptance then depends on which team's reading won.
- **Fix:** AD-16: "Accents are part of the piece item. A reference to a piece always reads its accented result. There is no unaccented reference." AD-18: "The corner style applies only to solid wall operations. A recipe that needs a rounded 2D boundary uses a piece with an accent."

### A5. Fit membership is not defined. **Medium**
- **Units:** epic-shapes-and-plates (`fit-violated`) and epic-parts-and-pcb (part envelopes).
- **Build 1:** checks each key and part against the outline.
- **Build 2:** checks each key against the piece whose fit group contains it, so a drawn plate smaller than the outline reports every key outside it.
- **Why it breaks:** `fit-violated` fires on different sets, and a drawn thumb bridge passes one check and fails the other. (Its severity is already open; its membership isn't listed.)
- **Fix:** AD-16: "The fit of the design is checked against the outline only: every fitted slot's key cell and every fitted part's envelope (per side) must lie inside it. Plates and recipe pieces are not checked against fit."

---

## B. The reactive graph and its edges

### B1. Freshness tagged by revision contradicts must-not-recompute. **Critical**
- **Units:** epic-layout-editor (live stages, must-not-recompute checks, verification layer 7) and the pipeline/editor story that shows stale outputs (AD-11, AD-22).
- **Build 1:** obeys AD-1 ("An edit changes only the outputs whose inputs it changed") and the must-not-recompute checks. A keymap edit doesn't recompute plates, so `PlatesOutput` keeps the revision tag of the edit before.
- **Build 2:** obeys AD-11: "Every output is tagged with the revision it was computed from … An output whose tag differs from the current one is shown marked stale, never as current, including on cache hits." The revision is the hash of **all** authored sections.
- **Why it breaks:** after a keymap edit, the plates (and the case, the PCB placement) show as stale even though they are exact. To clear the marker, Build 2's team re-tags or recomputes every output on every revision, which breaks Build 1's must-not-recompute checks and the case's per-piece cache benefit. The 3D viewer grays the case (AD-22) after every keystroke in the keymap.
- **Fix:** AD-11, replace the tag rule: "An output is tagged with the **hash of the input slice** it was computed from (B2) (+ routing hash where it reads routes). An output is stale when its stage's current slice hash differs from its tag. The revision is used for history, storage and the routing section, not for freshness."

### B2. "No single resolve" leaves no plain input for workers, cache keys or exports. **Critical**
- **Units:** epic-tray-case (case worker) and epic-shapes-and-plates / epic-layout (`model` computeds).
- **Build 1 (`model`):** AD-10 says there is no single `resolve`; shared derivations are small computeds, and only there. It exposes them **as computeds** only (reading `resolved.pieces.value`).
- **Build 2 (case worker):** past the crossing, plain values only (AD-11). It needs the resolved regions, the evaluated settings and the spot frames. It imports `model` to get them, which instantiates `model`'s computeds, and the re-export, inside the worker: a **second reactive graph**. Or it reimplements the parts it needs, which AD-10 forbids.
- **Why it breaks:**
  - AD-11's cache key is "hash of the resolved slice the stage reads", but no slice is defined. Two teams pick different slices; one includes the keymap and never hits the cache, the other forgets the catalogue versions.
  - With no defined slice, the crossing carries whatever each caller assembles, and the "only plain data at the crossing" check can't know what to test.
- **Fix:** AD-10 + AD-11:
  - "Every shared derivation is a **plain function** in `model`; its computed is a thin wrapper. Workers import the plain functions and types only, never the re-export."
  - "Each background stage, and each export, has a named **input slice type** defined in `model` (`CaseInput`, `RoutingInput`, …), built by one computed in `model`. The crossing carries that slice. Its hash is the cache key's slice hash and the freshness tag (B1)."

### B3. Nobody owns the stage computeds or the background shallow refs. **Medium**
- **Units:** the plates stage package and `pipeline`.
- **Build 1 (`plates`):** "a live stage's function is wrapped in a computed through `model`'s re-export." It exports `platesOutput` as a computed from its own package.
- **Build 2 (`pipeline`):** "orchestration, caching, revision tagging" (Structural Seed). It wraps `plates()` in its own computed, to tag and cache it.
- **Why it breaks:** two computeds evaluate the same stage, the violations panel lists the same plate violations twice, and must-not-recompute counts the wrong node.
- **Fix:** AD-10: "Stage packages export plain functions only and never import the re-export. `pipeline` is the one service that wraps live stages in computeds and holds the background shallow refs. `editor` reads stage outputs only from `pipeline`."
- Add: "`vue` and `@vue/reactivity` are pinned to the same exact version and deduplicated; a test asserts `editor` and `model` share one reactivity instance." Without it, editor templates silently don't track `model`'s refs.

---

## C. Writers, actions and undo

### C1. The Pinia design store is a second holder of the design. **High**
- **Units:** epic-editor-shell (Pinia stores) and epic-design-document (design refs, history).
- **Build 1 (editor):** the Conventions say "The design store exposes `dispatch(command)`, the gesture API and read-only access only." It is a Pinia store, so the team puts the design in its `state`, typed read-only.
- **Build 2 (`model`):** "The authored sections are … plain values in refs that only commands replace" (Design Paradigm), and history is a ts-inject service (AD-25). It holds the design in its own refs.
- **Why it breaks:** Pinia `state` is wrapped in `reactive()`: deep proxies (DataCloneError at `postMessage`, the reason for the crossing), and a writable path through `$patch`, `$reset` and devtools that bypasses commands and undo without a compile error. Two copies of the design drift, or every command writes both.
- **Fix:** Conventions, Editor state: "The design lives only in `model`'s design service. The Pinia design store holds no design state: it exposes getters over that service, `dispatch` and the gesture API. No Pinia `state`, `$patch` or plugin touches authored data."

### C2. Load, version switch, migration and gesture updates write outside the register. **High**
- **Units:** epic-design-document (storage load, AD-13 version switch) and epic-layout-editor (gestures).
- **Build 1:** the crossing is the way in ("storage and editor all call it"), so load and version switch write the authored refs from the crossing. History is left as it was, or cleared, each team's choice. AD-13 makes both sides of a version switch named versions; one team makes the switch undoable (a command), the other not (a load).
- **Build 2:** AD-2: "Every change to an authored section is a named command … nothing else writes to them." So a gesture is implemented as a second register (begin/update/commit entries) beside the command register, because a gesture isn't a named command with one input.
- **Why it breaks:** two write paths (commands and crossing-enter) and two registers (commands and gestures). Verification layer 3's "generic checks over every registered command" misses gestures and loads. Undo after a load either restores the previous design's records into the new one or doesn't.
- **Fix:** AD-2:
  - "The authored refs have exactly two writers: a registered command (gestures included) and `replaceDesign`, which the crossing calls on load, version switch and migration. `replaceDesign` clears history and is not undoable."
  - "A gesture is registered as a command with a `begin`/`update`/`commit` shape. Each update applies to the state at `begin` with the gesture's total input, never to the previous update." (This also stops drift and expression flattening over 120 updates.)

### C3. Fixes must be command names, but the natural fixes aren't commands. **High**
- **Units:** epic-routing-and-fab (`unrouted`) and the violations panel story.
- **Build 1 (routing):** the fix for `unrouted` is Reroute (AD-12). AD-2 says a fix is "a registered command name". So the team registers `reroute` as a command, which makes it undoable and puts the routing section on the undo stack (contrary to AD-2 and AD-12).
- **Build 2 (editor):** Reroute "is an explicit user action owned by `pipeline`, outside commands and undo", so it's a button outside the register, invisible to shortcuts, menus and agents, and `unrouted` offers no fix.
- **Why it breaks:** the same action is offered two ways, or Reroute leaks into undo. The same goes for Copy design, Save to file, version switch, and an upgrade of a recipe version: actions agents should see but that don't change authored sections as undoable commands.
- Also: a background violation tagged with an older revision offers a fix whose inputs name ids that may be gone.
- **Fix:** AD-2:
  - "The register lists **actions**. A **command** is the kind that changes authored sections and is undoable. Other kinds (`pipeline` actions such as Reroute, storage actions) are registered too, with their availability checked over the design plus their service's state, and are not undoable. Menus, shortcuts and agents read every kind. A fix names any registered action."
  - "Applying a fix re-runs its action's availability check against the current design; a fix from a stale violation that fails it is not applied."

### C4. "Record" and "mark" don't pin down undo; list order is not a record. **High**
- **Units:** the history service (epic-design-document) and the keymap story (epic-firmware-and-keymap), the case story (AD-18 order matters), the chain story (AD-4 index matters).
- **Build 1:** record = one item with an id (AD-23) or one layout node. Before/after per item.
- **Build 2:** record = one section (one ref per section), which is what the commands replace.
- **Why it breaks:**
  - Under Build 1, reordering keymap layers, recipe applications or chain children touches no item: the order is in the container. Undo restores nothing, and verification's "do → undo → identical" fails only on reorders. Under Build 2, undo works but each entry holds a whole section, which is the 50–130 KB the spike rejected, and must-not-recompute fails for everything that reads the section.
  - "Gesture begin and commit are marks" doesn't say whether a plain command is bounded by marks. One team marks every dispatch (one command = one undo); another follows tldraw (marks only where set), so one undo removes a command and the fix applied after it.
- **Fix:** AD-2 + AD-23:
  - "A **record** is one item with an id (a list item, or a layout node without its children) or one container's ordered id list. Inserting, removing or reordering touches the container's list record."
  - "Every dispatched command is preceded by a mark; a gesture's begin and commit are its only marks. A user action that must undo as one (an edit plus an auto-applied fix) dispatches one compound command."
  - Say how refs are divided, since it is where must-not-recompute is won or lost: one shallow ref per record, or one per section plus structural sharing. This must be decided with the update library, and it is not on the Open list.

### C5. Which packages define commands is ambiguous. **Medium**
- **Units:** `library` (upgrading a recipe or part version) and `model`.
- **Build 1:** AD-2 binds "every package that defines commands", so `library` defines `upgradeRecipe` (it knows the versions) and needs the writable design types from `model`.
- **Build 2:** the Structural Seed puts commands in `model`; `model` defines `upgradeRecipe` too.
- **Why it breaks:** duplicate names are refused at startup, and the writable types become a public export of `model`, which any package can import (the compile-time fence of AD-2 has a hole).
- **Fix:** AD-2: "Commands are defined only in `model`, by concept folder. The writable design types are not in `model`'s public `exports`. Other packages pass data in (as `editor` passes the recipe) and dispatch."

---

## D. Recipes: scope, style and pinning

### D1. Recipe expressions vs design-wide parameters. **High**
- **Units:** `library` (tray recipe data) and `model` (expression evaluator, `renameParameter`).
- **Build 1 (library):** writes the tray's operations as `offset: "wall + gap"`, naming the recipe's own settings.
- **Build 2 (model):** AD-17: "Parameters and expressions are design-wide"; it Prevents "per-section parameter scopes". The evaluator knows only the `parameters` section, so `wall` is unresolved. Or the recipe names a design parameter (`tent`) directly, and `renameParameter` (AD-2) can't rewrite immutable library data, so the rename silently breaks the recipe.
- **Why it breaks:** either every recipe fails to evaluate, or `model` grows a recipe scope the spine forbids, or renames break pinned recipes.
- **Fix:** AD-17 + AD-18: "Inside recipe data, expressions name only the recipe's own declared settings: one scope per recipe, the one exception to design-wide names. An application's setting values are authored and may name design parameters; `renameParameter` rewrites them. Recipe data never names a design parameter."

### D2. The build style is a setting and also the first list item. **Medium**
- **Units:** the editor's style switcher and the `model` case section.
- **Build 1:** "Build style … is a setting of the `case` section": stores `style: tray` and derives the first application from it.
- **Build 2:** "the style's recipe first (exactly one)": stores the style as the first application and has no `style` property.
- **Why it breaks:** two owners of one fact; the canonical writer writes one or both; `setBuildStyle` either mints a new application id (every spot attachment dangles, AD-2's flagged break on every switch) or keeps it. The old style's settings are dropped or kept: switching back after other edits gives defaults under one build, the user's values under the other. That defeats D5's "no fear of committing".
- **Fix:** AD-18: "The style is the first application; there is no separate style property. `setBuildStyle` keeps the application id and replaces its recipe ref. Settings whose names the new style declares carry over; the rest are kept on the application, unused, so switching back restores them." (The common spot names stay the open question they are.)

### D3. A recipe's version is pinned in two places. **Medium**
- **Units:** `catalogue-refs` (AD-5) and the case section (AD-18).
- **Build 1:** pins the version in `catalogue-refs` (one id + version per recipe, AD-5).
- **Build 2:** the application holds "a recipe (by id + version …)".
- **Why it breaks:** an upgrade command updates one and not the other; and applying the same recipe at two versions (one upgraded, one not) is legal under Build 2 and impossible under Build 1. Also, live recipes need the recipe data at every evaluation, not only at `applyRecipe`; how it enters the graph (a ref the editor sets through the crossing, or a copy stored on apply) isn't said, and a stored copy is an expansion.
- **Fix:** AD-5 + AD-18: "The application holds the recipe id only; `catalogue-refs` holds the one pinned version per id. Catalogue and recipe data enter the graph as one read-only ref, set by `editor` through the crossing; the design never stores a copy."

---

## Open questions that are unsafe to leave open for slice 1

These are on the Open list, but the first slice can't be built without them, so their "revisit when" is now:

- **Update library and patches** (AD-2), **runtime schema for command inputs**, **deep read-only typing.** They are all marked "first command story". That is slice 1. C4's record definition depends on the first of these.
- **Invalid states** (refusals vs flagged breaks). Slice 1's drag with a cross-tree anchor can produce an anchor cycle; the cycle rejection's form (typed rejection vs flagged break) shapes the command's return type that every later command copies.
- **Which build styles milestone 1 ships** (re-slice of the epics). D2 needs at least two styles to mean anything; if milestone 1 ships one, say so and D2 can wait.

---

## Lower-order notes

- 📐 This lens tests only whether the ADs are consistent with each other. It doesn't test whether the decisions are right. Two of them rest on single spikes on one board (per-piece cache gains; the reactive-core timing on a Corney-sized design). The spine records them as evidence, which is correct, but the cache-per-piece rule (AD-18) is now load-bearing for the case UX and was measured on one tray half.
- ☝️ The spine's front matter says `status: final` while 18 Open Questions and the holes above stand. A reader of the frontmatter alone would think it's build-ready.
- AD-11 says background stages start "after a gesture has been idle for a debounce interval", but B1/B2 make that run on an uncommitted state's slice. That is fine for the case; say that its output is never cached under a key that a committed revision could miss.
- AD-24's who-points-at searches the authored sections only. After A2, references from inside library recipe data (spots, outline) aren't in the design, so a dangling spot from a style switch is found by evaluation, not by the search. State that the search covers authored references only.
