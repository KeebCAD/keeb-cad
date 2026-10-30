# Review: rubric, 2026-10-30 fold (reactive graph, command register, pieces, live recipes, AD-23/24/25)

Scope: the uncommitted working copy of `architecture-keeb-cad-layout-model.md` (653 lines), which folds `directions-2026-10-30.md` (D2–D11) and `code-decisions-list-2026-10-30.md` (A, 1–14) into the spine. The review covers the changed parts (Glossary, Paradigm, AD-2, AD-3, AD-5, AD-10, AD-11, AD-16, AD-18, AD-23–25, Conventions, Stack, Seed, Map, Open Questions, Deferred) and checks the whole spine for consistency with them. Line numbers are those of the working copy.

**Verdict:** the fold is faithful to the two records and removes the old vocabulary cleanly (no `shape`, `template`, `insertTemplate`, `model.resolve` or "never reactive" is left). It should not be signed off yet: "piece" now names two things evaluated in two packages, recipe spots can be anchors with no rule for where they are computed, and the case section stores the build style and recipe versions in two places each. All three are divergence points the next level will hit in its first body or case story.

---

## Checklist summary

| Check | Result |
| --- | --- |
| Fixes the real divergence points, misses none | **Partly.** Three new divergence points are left open (F-1, F-2, F-3); four smaller ones (F-4 to F-7) |
| Every Rule is enforceable and prevents its stated divergence | **Partly.** AD-16's "single piece evaluator" is contradicted by AD-18 (F-1). AD-2's compile-time guarantee rests on an open question (deep read-only typing): acceptable, because the Open row names it. Some new Prevents items are product goals, not divergences (L-6) |
| Nothing Deferred/Open lets units diverge in a way that must be fixed now | **One failure.** The "2D piece offset latency" Deferred row rests on a premise the new AD-16 removes (F-7). One Open row asks about something AD-3 already rules (L-4) |
| Named tech verified-current | **Pass.** Checked on npm 2026-10-30: `vue` and `@vue/reactivity` latest 3.5.44 (2026-10-13), rc 3.6.0-rc.14 (2026-10-30); `@snap/ts-inject` latest 1.2.1; the 1.2.1 tarball exports `appendValue`, `providesValue` and `PartialContainer`, as AD-2 and the Open rows assume |
| Terms consistent with the Glossary | **Mostly.** "piece" is overloaded (F-1); "layers" in AD-18 is a third meaning of a word the Glossary already splits (L-2); "record" is used as a term with no entry (F-5); the "Shapes" canvas survives in AD-22 (L-1) |
| Every dimension the altitude owns is decided, deferred or open | **One gap.** The case stage owns no violation kinds, so recipe and OCCT failures have no owner (L-5) |
| Mermaid diagrams valid | **Pass.** All three diagrams (Paradigm, AD-10, Seed) render with `@mermaid-js/mermaid-cli` 11.4.2 without errors. The Paradigm diagram is valid but disagrees with AD-10/AD-12 on where `pipeline` and the routing section sit (F-4) |

---

## Findings that should be fixed before sign-off

### F-1. "Piece" names two things, and AD-16 and AD-18 give it two evaluators (high)
- **Where:** Glossary `piece` (l. 82), `region` (l. 91); AD-16 l. 372, 376, 370 (Prevents); AD-18 l. 413, 416, 418; AD-11 l. 305 ("A body's id is the id of the named piece whose result it is").
- **Problem:** AD-16 says piece is "the one term for body geometry: the outline, plates and the inside of a recipe", and that `model` is "the **single piece evaluator** … No stage re-evaluates a piece". Its resolved type is a list of 2D regions. AD-18 then says a recipe is "named pieces … built from a closed set of operations", run by the `case` stage on replicad, cached per named piece in the case worker, with offsets in `case` on clipper2. Bodies are 3D solids whose ids are piece ids. So recipe pieces are 3D, are evaluated in `case`, and have no region type. AD-16's Prevents ("outline, plates and case built by different mechanisms") is not actually prevented: makerjs in `model` and replicad in `case` are two mechanisms. A `model` developer and a `case` developer will each read "piece" as theirs.
- **Also unstated:** whether a recipe may contain 2D pieces (a magnet-pocket circle, a port cutout), and if so who evaluates them; how the right side's case is produced, given that AD-6 says no stage mirrors (does `case` run the list per side on reflected 2D input, or mirror solids?).
- **Fix:** keep one concept but say where each kind is evaluated. For example: "A piece is 2D or 3D. 2D pieces (everything in the `pieces` section, and any 2D piece inside a recipe) are evaluated only by `model` into regions. 3D pieces exist only inside recipes and are evaluated only by `case`, from `model`'s regions and evaluated settings. `case` never evaluates a 2D piece and `model` never builds a solid." Then narrow AD-16 l. 376 to 2D pieces, and add one line on the right side's case. If Sergii prefers two words instead, add a Glossary term for the 3D one (e.g. `solid`) and keep `piece` 2D. ☝️ The code-decisions item 10 says "the same model as the outline", meaning the same *composition shape*; it doesn't say the same evaluator. The spine read it as the latter.

### F-2. Spots are anchors, but nothing says where they are computed (high)
- **Where:** Glossary `anchor`, `spot` (l. 57–58); AD-3 l. 185–186; AD-18 l. 412, 415; Open rows l. 611–612.
- **Problem:** AD-3 lets *any* node, vertex, construction point or recipe operation anchor to a spot (`floor`, `wall-outer`, `usb-side`). A spot is "a named place a recipe declares", and recipes run in the case worker, past the crossing. AD-3's anchors are resolved by `model`'s computeds over one acyclic dependency graph. So either:
  - `model` computes spot frames itself (from 2D pieces and evaluated settings), and `case` reads them; or
  - spots come back from the case worker, which puts a background output inside the live dependency graph, and lets a layout key or outline vertex anchor to a wall that is built from the outline (a cycle across the crossing that `anchor-cycle` can't see).
  
  The two teams will pick differently. AD-18's "a recipe may use the named pieces and spots of those before it" also has no owner for the check, and no violation when a recipe refers forward.
- **Fix:** add to AD-3 or AD-18: "Spot frames are computed by `model` from the recipe's declared spot definitions over 2D pieces and evaluated settings; `case` reads them and never defines a spot from built geometry. Only recipe operations may anchor to a spot; nodes, vertices and construction points may not." (Drop the second sentence if Sergii wants keys anchored to the case, but then say how the cycle is caught.) Make the forward-reference check part of `model`'s dependency graph, with a named kind.

### F-3. The case section stores the style and the recipe versions twice, and recipe pieces have no id scope (high)
- **Where:** Glossary `build style`, `recipe application`, `id` (l. 50, 93–95); AD-5 l. 211; AD-18 l. 411–412; AD-8 section list l. 240; AD-16 l. 372.
- **Problems:**
  1. **Style twice.** The build style is "a setting of the `case` section" (l. 411) *and* "the style's recipe first (exactly one)" in the list (l. 412). Nothing says which is the truth, or what `setBuildStyle` writes.
  2. **Version twice.** A recipe application holds "a recipe (by id + version …)" (l. 95), and AD-5 also pins each recipe "in `catalogue-refs` as id + version" (l. 211). Two copies of one fact can disagree; the upgrade command must update both.
  3. **Ids of live recipe pieces.** Library recipes are never expanded, so their named pieces are not minted in the design. Applying the same recipe twice (two magnet pockets, two feet) gives two pieces with one name, and AD-11 uses piece ids as body ids. Blocks already have a rule for this (`<instance-id>/<block-node-id>`, AD-9); recipes have none.
  4. **Where the design's own recipe lives.** AD-16 puts pieces in the `pieces` section; AD-18 puts the design's own unnamed recipe, made of named pieces, last in the `case` list. Which section holds a piece the user adds to the case?
  5. **How a library recipe names design things.** A library recipe can't hold a design's piece ids; it needs declared inputs (e.g. "the outline", "parts with role screw"). AD-24 references are by id only.
- **Fix:** one line each in AD-18: "The build style *is* the first recipe application; `setBuildStyle` replaces it." "A recipe application's id + version is the pin; `catalogue-refs` holds parts only" (or the reverse, but one). "Pieces and spots of a live recipe have resolved ids `<application-id>/<piece-name>`." "The design's own recipe pieces live in its `case` entry; the `pieces` section holds 2D body pieces only" (or the reverse). "A library recipe reaches design items only through declared inputs, which the application binds by reference (AD-24)." Item 5 can be an Open row if Sergii wants, but items 1–4 decide storage and should be settled now.

### F-4. The Paradigm diagram puts `pipeline` and the routing section outside the graph, but live stages and live DRC need them inside (medium)
- **Where:** Paradigm diagram l. 131–153; AD-10 l. 266–267 and package diagram l. 280; AD-11 l. 299–300; AD-12 l. 316; Glossary `routing section` (l. 40).
- **Problem:** the diagram shows plates, pcb placement, firmware and "drc of saved routes" inside the reactive graph, with `pipeline` beyond the crossing. But AD-10 says the named flows "pcb placement → routing and drc" go **via `pipeline`**, and its package diagram has `pipeline` importing every stage, so `pipeline` is what creates the live computeds. Live DRC of saved routes reads the routing section, which the diagram draws outside the graph (feeding only the routing worker). AD-10 l. 266 says "a live stage's function is wrapped in a computed through `model`'s re-export" without saying who wraps it, so a stage author may export a computed and a pipeline author may wrap a plain function.
- **Fix:** state in AD-11: "`pipeline` wraps each live stage function in a computed (stages export plain functions). The routing section is held in a shallow ref inside the graph, replaced whole by `pipeline` through the crossing at committed revisions." Redraw the diagram with `pipeline`'s live wiring inside the graph and RS inside it too, and only the workers (and storage/files) past the crossing. ☝️ The paradigm sentence "the authored sections … held as plain values in refs that only commands replace" is right, but the routing section also needs a ref that a non-command (`pipeline`) replaces; say so, since AD-2 makes everything outside commands read-only by type.

### F-5. Undo is defined in terms of "records", which the spine never defines (medium)
- **Where:** AD-2 l. 173; AD-23 l. 467–468.
- **Problem:** "History keeps the before and after of each touched record between marks." Is a record a list item, a layout node, a whole section, or a recipe application including its nested pieces? The answer decides undo granularity, the generic do → undo → identical check (Verification layer 3), and how patches line up with AD-9's id-keyed merge. Two command authors will pick different grains.
- **Fix:** add a Glossary entry and one line in AD-23: "A **record** is one item with an id: a layout node (without its children) or one item of a list section. Undo, references and merge all work per record." If recipe applications hold nested pieces, say whether each nested piece is its own record.

### F-6. AD-11's cache key doesn't include recipe versions (medium)
- **Where:** AD-11 l. 302; Glossary `catalogue` (l. 70: "part definitions"); AD-18 l. 416 ("caches per named piece").
- **Problem:** the cache key is "stage id + stage version + catalogue versions used + …". The Glossary limits the catalogue to parts, so a recipe upgrade that keeps the resolved slice the same gives a cache hit with the old case. AD-18 adds a second, per-piece cache in the case worker with no key rule at all.
- **Fix:** "catalogue and recipe versions used" in AD-11, and one line in AD-18: "the per-piece cache key is the piece's resolved id + recipe version + hash of the piece's evaluated inputs; it follows AD-11's never-stale tagging."

### F-7. A Deferred row rests on a premise the new AD-16 removes (medium)
- **Where:** Deferred l. 631 ("2D piece `offset` latency … No M1 piece uses a 2D offset"); also l. 630 (#477 union cost) and l. 636 (live latency).
- **Problem:** derived pieces are now the default path: "the fit of a group of keys … plus a margin", "one fitted piece per group, joined automatically" (l. 373–374). A margin is an offset unless the padded-key-cells primitive (still Open, l. 607) avoids it, and automatic joining makes the 50-key union the normal live path. The reason the offset row could wait is no longer true. Separately, l. 636's remedy "move the evaluator off the main thread" contradicts the one-reactive-graph decision (the evaluator *is* the graph's computeds now).
- **Fix:** move the offset-latency row to Open Questions, tied to the outline-from-keys row ("must the margin avoid a makerjs offset, or does the derived piece run live at ~70 ms?"), with "First outline story" as its trigger. Reword l. 636's remedy to something the paradigm allows (coarser computeds, or a background piece stage past the crossing, which would need its own decision).

---

## Smaller findings

- **F-8 (medium). One copy of `@vue/reactivity`.** AD-10 l. 263 lets `model` import `@vue/reactivity` and `editor` import `vue`. Vue components only track `model`'s refs if both resolve to the *same installed copy*; two copies fail silently. Add to AD-10 or Monorepo: "`vue` and `@vue/reactivity` are pinned to the same exact version and dedupe to one copy; a test asserts `isRef` from `vue` accepts a ref made through `model`'s re-export." 📐 Pinning only by version string (both say 3.5.44 today) doesn't guarantee one copy under pnpm's strict layout.
- **F-9 (medium). "The 11 packages" doesn't match the spine.** AD-25 l. 486 says "The 11 packages of AD-10 stay". AD-10's diagram has 13 (`editor` plus 12), the Structural Seed has 12 under `packages/` plus `@keeb-cad/editor` in `app/`. ☝️ The number came from code-decisions item 11, so the session itself may have counted differently. Fix: "The packages of AD-10 stay", or give the right count and list them.
- **L-1. "Shapes" canvas.** AD-22 l. 457 still lists a "Shapes" 2D canvas, the one place the retired term is left. Rename to the UX spine's new name for the body workspace (or "Body"), and change EXPERIENCE.md/DESIGN.md to match, or note that it's a UX workspace name pending a UX update.
- **L-2. "Layers" is a third meaning.** AD-18 l. 411: "the layers are re-derived. Manufacturing is a mapping from layers to files at export". The Glossary already separates keymap layers from copper layers (l. 104). Use "bodies" (Glossary l. 124) or add a Glossary entry for a case layer. Also, AD-15 lists case exports as STEP and STL only and doesn't mention the layers-to-files mapping; say which package owns it (`exports`, presumably).
- **L-3. "Accent" vs "operation".** Glossary l. 85 calls an accent "a finishing operation on a piece", but "operation" is defined (l. 96) as "one step of a recipe". 2D accents on the outline are not recipe steps. Say "a finishing step on a piece".
- **L-4. AD-3 already rules what an Open row asks.** AD-3 l. 186: a spot "is the only way a recipe operation attaches to something a recipe built", which is the ban on attaching to raw derived faces. The Open row l. 611 lists that ban as undecided. Either drop the ban from the Open row (keep "3D edges reachable only through declared spots" if that's the open part) or soften AD-3. ☝️ Directions D10 says the ban is "implied, not stated", so Sergii may not have meant AD-3 to state it.
- **L-5. The case stage owns no violation kinds.** Violations (l. 495) lists kinds for `model`, `routing` and `drc` only. Recipe interpretation failures (an OCCT boolean or fillet failing, a pinned recipe version missing from `library`, a forward reference between recipes) have no owner and no kind. Add a `case` kind such as `case-failed` (ids name the piece and recipe application), and say whether a missing recipe version is `unresolvable-reference`.
- **L-6. Some Prevents items aren't divergences.** AD-16 "the user writing construction instead of intent" and AD-18 "fear of committing to a build style" are product goals; no two units can diverge on them, and no Rule line enforces them. Move them to the AD's rationale or drop them; keep Prevents for things two builders could do differently.
- **L-7. A revision per drag update.** AD-2 l. 172 says "each `update` produces a revision that the live stages consume". A revision is a content hash of the canonical serialisation (l. 41); live stages consume refs, not hashes, and hashing the whole file every pointer move is wasted work. Say live stages read the refs during a gesture and a revision is computed at marks (and for tagging background starts after the debounce).
- **L-8. `resolved design` and `dependency graph` miss the case inputs.** Glossary l. 117 lists what the resolved design holds but not evaluated recipe applications and their settings, which `case` needs and AD-17 says only `model` evaluates. Glossary l. 114 lists what the dependency graph contains but not spots or recipe-to-recipe references. Add both.

---

## What landed cleanly

- Every **Decided** line of D2–D11 and of A and 1–14 is in a Rule, and every **Not decided** line is an Open row with a trigger. No Not-decided item was promoted to a rule except the AD-3 face-attachment ban (L-4).
- The retired vocabulary is gone: `shape`, `shape-failed`, `case operation`, `template`, `insertTemplate`, `model.resolve`, `resolve(authored, catalogue)`, the old "never makes them reactive" in AD-11, and the AD banners pointing at the directions record. AD-6, AD-14, AD-17 and AD-20 were reworded to match.
- AD-10 amends the Vue rule openly, as item 1 asked, and fences the new dependency with one re-export file that dependency-cruiser can enforce.
- AD-11's new "one plain value, replaced whole in a shallow ref" closes the old gap on how background outputs re-enter.
- AD-23 and AD-24 are short, enforceable and match D2 and D3. AD-25 matches item A and item 9.
- Verification and Fixtures now match items 12–13 (no Corney design file; golden at acceptance only), and the AD-14 test was correctly renamed from golden to invariant.
- Stack entries for Vue, `@vue/reactivity` and `@snap/ts-inject` are current, and Vue 3.6 moved from Deferred to Open with a stable-release trigger.
