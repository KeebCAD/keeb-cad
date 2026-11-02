# Adversarial re-run: spine gate update 2026-11-02 (revised)

- **Reviewed:** the revised update (`spine-update-v2.diff` against b61a744) to `architecture-keeb-cad-layout-model.md`, against the last 22 `.memlog.md` lines (gate fixes H1–H10, rubric 5, V4, ids reopened), the three first-round reviews, stories 13.1, 13.14, 13.20, 13.18, 13.2, 13.7, 13.8 in `tickets.toml`, and the blueprints spine (`architecture-blueprints.md`, BP-5, BP-8).
- **Method:** (1) re-check each first-round finding against the new text; (2) once more, build two units one level down that each obey every AD and still don't fit, using only the changed text and what it now contradicts elsewhere (AD-2, AD-11 design mirror and Derived files, AD-13, Glossary, Verification layer 3, Recorded-not-typed, BP-5/BP-8).
- **Verdict:** **ready to gate 13.14, 13.18, 13.2, 13.7 and 13.8 after a wording pass and two small decisions.** Every High from round one is closed. No closed finding reopened. The new text adds three wording contradictions and two genuine holes: the empty derived files `newDesign` sets never reach the worker, and a slot whose part resolves but yields no rectangle has no defined row.

---

## Task 1: first-round findings

### Adversary

| # | Status | Note |
| --- | --- | --- |
| H1 | closed | AD-11: an output that points at another travels in the same message, hidden phase included; main swaps them together; "arrived" = every output at main's latest seq. |
| H2 | closed | `frame.mirrored`, and AD-22 fixes the composition `translate · rotate · scale(±1, 1)`. That decomposition of a reflection is unique, so `rot` on right rows has only one correct value. |
| H3 | closed | `fit` gains `stand-in`; `PartsOutput` holds rectangles only; there is one slot→run computed, and run ids are defined. Residual edge: N5. |
| H4 | closed | There is a derived-files service in `model/main`, `emptyDerivedFiles`, and autosave never waits for the echo. Residual contradictions: N1, N2. New hole: N4. |
| H5 | closed | `migrateBundle` is the one entry point; tags stay unchanged; missing files are filled after migration. Residual: N3 (version switch isn't named as a caller). |
| H6 | closed | Groups carry `part = -1` and `fit = fitted`; unplaced rows carry NaN; `anchorAt` is the anchor-frame origin before the offset. |
| H7 | closed | UTF-16 code-unit order through one `compareId`. |
| H8 | closed (deferred by decision) | Moved to an Open Question owned by epic-drag-keys. Residual: N9 (13.7's verify names handles). |
| H9 | closed in Data Schema | The rectangle is centred by definition; `{ w, h }`. Residual: N8 (AD-5 and the blueprints spine don't carry it). |
| H10 | closed | Ids are side-qualified strings, so `whole/` fits. |

### Rubric

| # | Status | Note |
| --- | --- | --- |
| 1 | closed | AD-1: "only `pipeline` computes new ones; load, version switch, undo and redo restore saved ones". The new sentence after it introduces N1. |
| 2 | closed | AD-2's `replaceDesign` takes the already-current design. Residual: N3. |
| 3 | closed | Same as H2. |
| 4 | closed | Same as H6, plus the run id `<part id>@<hash>` and `stand-in`. |
| 5 | closed | Same as H7. |
| 6 | still open (wording) | The Layout set note closes 13.7's blocker. But Data Schema still says the other outputs "are typed by the first story that posts them", and AD-11's table says the outline story "types `ShapesOutput`". AGENTS.md requires the spine to type them first. Fix: "typed in Data Schema before the story that posts them". |
| 7 | closed | Same as H1. |
| 8 | closed | Same as H6. |
| 9 | still open (low) | Two things are still unsaid: whether `focus` reprioritises the remaining hidden stages, and whether grayed marks still meet AD-22's 3:1 contrast or are exempt. 13.7's automated contrast check will hit the second. |
| 10 | still open | Spine side: AD-11 Fingerprints ("one per design part that applies a blueprint") still doesn't record the epic's exception until 7.2, under which the fingerprints file stays empty. Tickets side, for Sofia: 13.20 "none yet", 13.14 "waits on the open question", 13.7 "(parts, layout, shapes)" and 13.18's missing group `defaultPart` step are stale, and no ticket names the owner of the two codecs and the workspace-set post. |
| 11 | still open (one item) | Recorded, not typed now says "envelope and `rectangle` with 13.18". The rectangle is now settled by `PartsOutput`. The envelope, which 13.18's choc-key outputs, is untyped, and AGENTS.md says a story must stop and ask (see Task 2, R11). The round-trip-for-incomplete-bundles point is now answered implicitly by `migrateBundle` filling missing files. KDL node names: fine. |

### Verification

| # | Status | Note |
| --- | --- | --- |
| V1 | closed | The memlog restates the rejection reason; the Firefox clone cost is added to the spike's AC re-run row. |
| V2 | closed | `compareId`. |
| V3 | closed | Same message, hidden phase included. |
| V4 | closed | AD-22: model mm inside the y-flipped group, `rotate(rot)` as posted, non-scaling stroke, a +15° test. |
| V5 | still open (low, test plan) | No pivoted-key fixture is required for the layout codec or placement test. This is not a spine hole; add it to 13.4's verify. |
| V6 | closed | AD-8 now states the bundle has one version, the design file's. |
| V7 | closed | Same as rubric 1. |
| V8 | closed | `migrateBundle` hands the design to `replaceDesign` and the derived files to the service. Residual: N3. |

**Count:** 24 closed, 5 still open (rubric 6, 9, 10, 11; V5), 0 newly broken.

---

## Task 2: new pairs within the changed text

### N1 [wording]: AD-1 has undo restore both derived files; AD-2 says undo never restores fingerprints

AD-1 now says the service holds both files, "restored by undo, redo and version switch". AD-2: "Undo never restores the fingerprints file: it always holds the latest acceptance."

**Pair.** One undo story keeps both files beside each record and restores both, following AD-1. The fingerprints story, 7.2, follows AD-2 and expects an accepted change to survive undo. An accepted output change then silently un-accepts on undo.

**Fix.** In AD-1: "undo and redo restore the routing file (AD-2); version switch restores both."

### N2 [wording]: AD-11 Derived files says "for the same revision"; AD-13 autosave writes whatever the service holds

AD-11 Derived files still reads "Main's `storage` saves the design and its derived files for the same revision in one atomic write". The new AD-13 sentence has autosave write the design plus what the service holds, never waiting for the echo, so tags are older by design.

**Pair.** A 13.14 that reads AD-11 literally waits for, or refuses, a mismatched tag. Another 13.14 follows AD-13. The first is exactly the blocking autosave the H4 decision rejected.

**Fix.** "…saves the design and the derived files it holds, each with its own tag (AD-13), in one atomic write."

### N3 [wording]: `migrateBundle`'s callers miss version switch, and AD-2 still lists "migration result"

AD-8 says "storage's load and file open call [`migrateBundle`] first". A version switch takes a bundle from `listVersions`, not from `load`. AD-13 keeps a `migration` named point, which is the pre-migration bundle in the old format, and a switch to it must be migrated. AD-2's caller list "(load, file open, version switch, migration result)" still names "migration result" as if migration were a separate path into `replaceDesign`.

**Pair.** A version-switch unit hands an old-format bundle straight to `replaceDesign`, which no longer migrates, and gets a parse failure. Or it migrates through a second path.

**Fix.** AD-8: "…which load, file open and version switch call first". AD-2: drop "migration result".

### N4 [decision]: the empty files `newDesign`'s caller sets never reach the worker, and the echo overwrites them

`newDesign` is a registered command (13.1; epic decision 2026-10-30), so it reaches the worker as patches. The AD-11 design mirror sends the derived files only at worker start, restart and load, and on undo and redo. AD-1 now has "`newDesign`'s caller" set the service through `emptyDerivedFiles(revision)`. `pipeline` echoes the files it holds at every seq (AD-13; memlog correction). The service accepts a post at main's latest seq (AD-1).

**Pair.** A 13.1/13.12 caller sets the empties on main. 13.20's mirror sends nothing new, because a command means patches. At the next seq the worker echoes the previous design's routing and fingerprints files (or none at first launch, if the worker started before `newDesign`). The service, correctly, replaces the empties with them, and the new design's first autosave carries another design's derived files.

Slice 13 hides this: everything is empty until 7.1 and 7.2, though the tags differ. Any later "New design" while a design is open exposes it.

**Options:**
- (a) `newDesign`'s caller also sends the derived files, as undo and redo do. This adds `newDesign` to AD-11's mirror sentence.
- (b) Creating a design goes through `replaceDesign`, which sends the whole value with the files.

**Recommendation:** (a). It is one clause, it keeps 13.1's decision that `newDesign` is a command, and it reuses the path undo already has.

### N5 [decision]: a slot whose part resolves but yields no rectangle has no row

The slot→run computed and `fit` cover a reference that doesn't resolve. They don't cover a reference that resolves to a run with no output. That happens when:
- the blueprint is `blueprint-api-too-new` ("not run");
- a first run fails `lane-failed` with no last good output to show stale (BP-5, AD-11 Failed lanes), for example on reopening a file whose pinned blueprint throws;
- the lane is `unavailable` (BP-5).

**Pair.** 13.18's parts concept emits no `PartsOutput` row, so the slot's `part` = -1 and `fit` = `fitted`. 13.2's placement then has no rectangle to step by: it either throws or uses 0, and every later key in the chain collapses. 13.7 draws a keycap from row -1. A second compliant 13.18 points the slot at the `stand-in` run but leaves `fit` = `fitted`, so no placeholder is drawn.

**Fix (recommended):** "a slot whose run has no output yet (not run, failed with no last good output, unavailable) steps by and draws as a stand-in: `fit` = `stand-in`, `part` → the stand-in run, with the run's own violation". This matches AD-5's intent: later keys stay where they were.

### N6 [decision, low]: "else" in the slot→run chain: unset, or unresolved?

The computed is "own part, else the nearest group's `defaultPart`, else `meta.defaultPart`, else the stand-in". AD-5's stand-in rectangle is "the default part's, or an app-defined one".

**Pair.** A group's `defaultPart` is set but doesn't resolve, and `meta.defaultPart` does.
- Reading A falls through to `meta.defaultPart`: `fit = fitted`, drawn as a normal key.
- Reading B marks the slot `stand-in` and uses the app-defined rectangle, because "the default part" itself is the one that failed.

The two produce different rectangles, so different steps and different key positions. Both 13.18's computed and 14.3 (group `defaultPart`) implement this.

**Fix (recommended):** "else" means unset. A set reference that doesn't resolve makes the slot `stand-in`, with the rectangle of the next resolvable level up (group → `meta.defaultPart`), else the app-defined one.

### N7 [wording]: precedence between `empty` and `stand-in`

A right-side `'empty'` override can apply to a slot whose authored part doesn't resolve. Is `fit` `empty` or `stand-in`? 13.6 writes one and 13.18 the other, and 13.8 draws "unfitted" or a placeholder accordingly.

**Fix:** "`empty` wins; `part` still points at the run it steps by."

### N8 [wording]: "centred by definition" lives only in a Data Schema comment

AD-5 still says the rectangle's placement is up to the author ("for anything else the author picks it"). The blueprints spine's BP-8 lets a lane return a handle that "the stage converts into `model`'s output type". The parts operation list is unowned in slice 13: BP Deferred gives it to the first tray-case story.

**Pair.** 13.17 or 13.18 offers a general positioned-rectangle operation, shared with later cutouts, and a blueprint returns an off-centre one. The converter to `{ w, h }` silently drops the offset. That reopens H9 (step and drawing disagree).

**Fix:**
- AD-5: "the rectangle is centred on the slot's frame; the author picks its size and places components relative to its centre".
- BP-8, or the parts-lane row: "a part blueprint's `rectangle` output is plain `{ w, h }` in mm".

This needs no new decision: the memlog H9 decision already says both.

### N9 [wording, ticket]: 13.7's verify names handles, and H8 is deferred on the premise that slice 13 needs none

13.7 must check "handles at the canvas hit radius at three zoom levels". AD-22 draws handles in screen space, so a handle at any point of a part's rectangle (a corner, an edge, an attach point) needs a world point. That is exactly the question H8 deferred to epic-drag-keys.

**Fix (ticket):** state that 13.7's handles sit only at posted points (`frame` and `anchorAt`).

### N10 [decision, low]: unsupported forms never "arrive"

AD-6: a split design with a mirrored board, or a unibody design, reports `unsupported-form` "instead of producing outputs" (the memlog H10 event: unibody posts none). Under the new definition, a set has arrived when every output is at main's latest seq. Such a design therefore shows "computing" forever at startup, and "updating", grayed, forever after any switch. 13.6 loads these files, and 13.7 or 13.8 would show a perpetual spinner.

**Fix (recommended):** for an unsupported form, the worker posts the set as zero-row outputs at each seq.

### Below the bar (checked, holding)

- **Two `shallowRef`s swapped "together".** Both are set in one synchronous handler, and Vue's scheduler flushes after it, so no frame sees a mismatched pair.
- **The run id uses BP-5's argument hash.** A part-ref input's hash includes the referenced blueprint version, so a combo part's run id changes on upgrade. That is acceptable. Main never builds a `PartsOutput` id; it reaches rows through `LayoutOutput.part`.
- **`anchorAt` for chain child 0.** The stepped point with no step is the chain frame's origin; there is one reading. For explicit vertex and group anchors, the general clause ("origin of the anchor frame") covers them.
- **The centre group's right row and 13.8's dashed axis.** The axis is drawn from a posted frame, so this is drawing (AD-22).
- **Verification layer 3.** `replaceDesign` parsing into a fresh value keeps "the caller's input is not frozen" true.
- **Glossary "computed only by `pipeline`"** (routing and fingerprints files). It is consistent once read with AD-1's "not a computation". An optional cross-reference would help.
- **Unknown anchor id (13.3) and `placed`.** The `placed` comment ties `false` to cycles only, so an unresolved anchor must be placed somewhere (AD-3 doesn't say where). That is a pre-existing AD-3 gap, and 13.7 draws whatever is posted. Leave it to 13.3.

## Summary

| Item | Tag | Blocks |
| --- | --- | --- |
| N1 undo restores fingerprints | wording | 7.2 (later) |
| N2 AD-11 "same revision" | wording | 13.14 |
| N3 `migrateBundle` on version switch; "migration result" | wording | 13.14 / version switch |
| N4 `newDesign`'s empties never reach the worker | decision | 13.1/13.20, any later New design |
| N5 resolved part with no run output | decision | 13.18, 13.2 |
| N6 "else" = unset vs unresolved | decision (low) | 13.18, 14.3 |
| N7 `empty` vs `stand-in` precedence | wording | 13.6, 13.8 |
| N8 centred rectangle missing from AD-5 and BP-8 | wording | 13.17, 13.18 |
| N9 13.7 handles vs deferred H8 | wording (ticket) | 13.7 |
| N10 unsupported forms never arrive | decision (low) | 13.6, 13.7 |
| R6 "typed by the first story" vs AGENTS.md | wording | later outline story |
| R9 focus reprioritisation; grayed contrast | decision (low) | 13.7 |
| R10 fingerprints exception until 7.2 in AD-11 | wording | 13.18 review |
| R11 envelope untyped but assigned to 13.18 | decision | 13.18 |
| V5 pivoted-key fixture | wording (test plan) | 13.4 |
