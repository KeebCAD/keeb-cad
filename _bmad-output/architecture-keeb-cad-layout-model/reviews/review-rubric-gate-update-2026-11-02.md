# Rubric review: spine gate update for epic-see-corneys-keys (2026-11-02)

- **Reviewed:** the diff `spine-update.diff` against `architecture-keeb-cad-layout-model.md` (as of the working tree, `updated: '2026-11-02'`).
- **Decisions behind it:** the last 7 lines of `.memlog.md` (update run, four ADOPTED decisions, one correction).
- **Stories it must unblock:** 13.14, 13.18, 13.2, 13.7, 13.8, 13.20 (and the refactor sweep 13.13 by dependency), plus the epic's Open question (2026-11-02).
- **Scope:** the update only, and the sections it touches (AD-1, AD-2, AD-8, AD-10, AD-11, AD-13, AD-22, Data Schema, Consistency Conventions, Open Questions). Line numbers are the current spine's.

## Verdict

**Needs revision before 13.14, 13.18, 13.2 and 13.7 are marked ready.** The update answers all five points of the epic's open question, and each memlog decision is faithfully transcribed. But two changed rules contradict other parts of the spine (AD-1's "only `pipeline` replaces them" and AD-8's bundle-wide migration vs AD-2's `replaceDesign`). The new posted-output types also leave several things undefined that two stories will each fill in their own way: the right side's reflection, values for rows where a column does not apply, the ids of `PartsOutput` rows, the id sort order, and the `shapes` member of the Layout set.

## Checklist

| Rubric item | Result |
| --- | --- |
| Fixes the real divergence points the stories would hit, misses none | Partial: findings 3 to 8, 10 |
| Every changed Rule is enforceable and prevents its divergence | Partial: findings 3 to 6 (types under-specified), 9 (switch grace enforceable as written) |
| Nothing left open lets two of those stories diverge | Fails: findings 3, 4, 5, 6, 10 |
| No changed text contradicts another part of the spine | Fails: findings 1, 2; minor 8, 11 |
| Open Questions removed are actually answered | Mostly: three of the four rows are answered; "Types of the posted model outputs" is answered only for layout and parts (finding 6) |
| Covers every point of the epic's open question | Yes: types and codecs (layout, parts), drawing after a switch, the derived files' format-version, the routing file's empty form, and closing "Which story starts parts" |

## Findings

### 1. AD-1's "only `pipeline` replaces them" contradicts undo, load and version switch (high)

**Where:** L186 ("From then on only `pipeline` replaces them").
**Conflicts with:** AD-2 L205 ("Undo and redo restore the design and that routing file together", done on main); AD-11 L391 ("Undo and redo also send the routing and fingerprints files they restore"); AD-13 L433/L435 (load and file open put a stored bundle's derived files in place); a version switch (`listVersions`, `replaceDesign`) does the same.
**Why it matters:** 13.14 (load), 13.20 (whole design plus derived files at restart and load) and the undo story read this sentence as forbidding main from ever swapping the held derived files, which AD-2 requires.
**Fix:** "From then on only `pipeline` computes new ones; load, a version switch, undo and redo restore saved ones (AD-2, AD-13)." Also add a cross-reference from L826 ("computed only by pipeline") and AD-11 L390 ("main never computes a derived file") to AD-1's starting value. Otherwise `newDesign` making them on main reads as a breach. The memlog says "not a computation", but the rule text it contradicts never says so.

### 2. Bundle-wide migration (AD-8) vs `replaceDesign` migrating the design alone (AD-2) (high)

**Where:** L288 ("`model`'s one migration chain migrates the whole bundle (a step may touch any of its files)").
**Conflicts with:** AD-2 L194, where `replaceDesign` "takes `unknown`, migrates, parses with the design schema", and holds the design only ("The routing and fingerprints files are not part of it").
**Why it matters:** a migration step that touches the routing or fingerprints file cannot run inside `replaceDesign`. 13.14 (load path) and 13.1/13.10 (`replaceDesign`) would each place migration differently: one in `storage.load`, the other in the register.
**Fix:** state in AD-2 that `model`'s bundle loader migrates and parses the whole bundle first (`format-too-new` and `migration-failed` raised there), and that `replaceDesign` takes the already-migrated design (or the bundle) and only validates and freezes it. Update the AD-2 bullet's "(load, file open, version switch, migration result)" to match.

### 3. `LayoutOutput.frame` cannot express the right side's reflection (high, 13.8)

**Where:** L849–856 (`frame: { x, y, rot }`), L846 (`rect` in the slot's frame, `cx`, `cy` arbitrary), AD-22 L595 (SVG transform is drawing).
**Conflicts with / misses:** AD-6 L269: the right side is the left side *reflected*, and attach points swap. A reflected frame is not a translate plus rotate. A part rectangle with `cx ≠ 0` (allowed: "for anything else the author picks it") lands on the wrong side of the right slot if 13.8 applies only `translate rotate`. The sign of `rot` for right rows is also undefined.
**Why it matters:** 13.7 and 13.8 (and 13.2, which produces the rows) can each pick a different answer: no mirroring, mirroring by the `right/` id prefix, or a negated `rot` with mirrored `cx`. Corney's keycaps (`cx = 0`) hide the bug until a non-key part arrives.
**Fix:** add `mirrored: boolean` to `LayoutOutput` (true for reflected rows). State that the canvas applies `scale(-1, 1)` in the slot frame for mirrored rows, and say whether `rot` is the reflected frame's angle. Alternatively, state that `frame` is pre-reflected and the canvas never mirrors. Then extend the AD-22 L595 sentence to cover that transform.

### 4. Columns with no value for a row, and row ids, are undefined (high, 13.2 / 13.18 / 13.7)

**Where:** L845–856.
- `part`, `fit` are "slots:" only, but each is a non-optional typed-array column, so group rows need a defined value. `frame` and `anchorAt` have no meaning when `placed: false`. `anchorAt` has no anchor link for the root group or child 0 of a chain.
- `PartsOutput` rows are "one per resolved part run (design part + its inputs)", but every output "carries its ids" (L844, L393). The id of a run is not defined: a design part with two per-slot `size` values gives two runs with the same design-part id. The id of a library part referenced directly, and of a stand-in row (AD-5 L254: the default part's stand-in or the app-defined one), are not defined either.
**Why it matters:** the producer (13.18, 13.2) and the consumer and codec test (13.7) each invent a placeholder value (`-1`, `NaN`, `0`, the row's own frame) and a run-id scheme. That is exactly the "two codecs encoding ids differently" the 13.7 decision says it prevents.
**Fix:** define the value used where a column doesn't apply, per column: e.g. `part = -1` and `fit = 'fitted'` for groups; `frame` and `anchorAt` are NaN when `placed` is false; `anchorAt = frame` origin when there is no link. Define the run id: e.g. `<design-part-id>` for runs with no per-slot inputs, `<design-part-id>@<hash of canonical per-slot inputs>` otherwise; a library part's run id is its `PartId`; stand-in rows use one fixed id such as `stand-in`. Or say outright that `PartsOutput` has no ids and is reached only by row number.

### 5. The id sort order is unspecified (medium, 13.7 vs the codec author)

**Where:** L393 ("sorted by the worker … main finds an id by binary search"), L844.
**Why it matters:** `localeCompare`/`Intl.Collator` ignore punctuation at the primary level, and ids are full of `-`, `/`, `:` and `.`. A worker that sorts with one comparator and a main that searches with another (`<`) misses ids silently.
**Fix:** "sorted by UTF-16 code unit (the default `Array.prototype.sort` order, never `localeCompare`)". Also put one `compareId`/`findRow` helper beside the codecs in `model`, used by both sides, with a test on ids containing `-`, `/`, `:` and `.`.

### 6. The Layout set includes `shapes`, but its type is left to "the first story that posts them" (medium, 13.7)

**Where:** L857 ("the other posted outputs (shapes, extras, netlist, connections) are typed by the first story that posts them"), AD-11 table L382 (Layout set = parts, layout, shapes); 13.7's ticket draws "the posted Layout set (parts, layout, shapes) at one seq through its codec".
**Conflicts with:** AGENTS.md policy (add a schema or shared kind only after the spine's Data Schema defines it; otherwise stop and ask). L857 delegates exactly that to a story.
**Why it matters:** 13.7 hits it at once, though no shape exists in this slice: it must either post an untyped empty `shapes` output or drop it from the set, and a later outline story may pick the other. The removed Open Question row ("Types of the posted model outputs … (layout, parts, shapes, extras, netlist, connections)") is answered only for two of its six members.
**Fix:** either type a minimal `ShapesOutput` now, or state that until the first outline story the Layout set is parts and layout only and no `shapes` output is posted. Reword L857 as "typed in this section before the first story that posts them", and keep an Open Questions row for the remaining four.

### 7. "Same message" implies parts and layout are always posted together; the spine doesn't say so (medium)

**Where:** L393 ("A column that points at another output (`LayoutOutput.part`) holds a row number in the output posted in the same message, at the same seq").
**Gap:** the visible-set message covers the three sets that include layout. When PCB is focused, though, parts and layout are hidden stages (L378), and nothing says hidden stages that point at each other share one message. If they are posted per stage, main can hold a `LayoutOutput` whose `part` rows index a `PartsOutput` from another seq.
**Fix:** "An output that points at another is always posted in the same message as it, visible or hidden (parts with layout)."

### 8. `anchorAt` "the anchor link's far end" is ambiguous for default chain anchors (low–medium, 13.2 vs 13.7)

**Where:** L852.
**Gap:** under AD-4 (L232), child *n*'s default anchor is child *n−1*'s world frame *translated by the step*. The far end could be that stepped point, which coincides with the node when the offset is zero and gives a zero-length link. It could also be child *n−1*'s origin, the visually meaningful link. 13.7 draws "anchor links".
**Fix:** say which, e.g. "the anchor frame's origin (for a chain's default anchor, the stepped point, not the previous sibling's origin)", and say how 13.7 draws a zero-length link.

### 9. Switch grace: enforceable; two small gaps (low)

**Where:** L392, L882.
- The rule is clear and testable (draw last snapshot, gray after the grace if the focused set at main's latest seq hasn't arrived). It does not say whether a `focus` message with no new command reprioritises the worker's remaining hidden stages at the current seq. The 100 ms visible-set target (L378) is defined only "after each applied command".
- The grayed marks must still meet AD-22 L593's 3:1 non-text contrast, or 13.7's automated contrast check needs a stated exemption for the grayed state.
**Fix:** one clause each: "on `focus` the worker computes the newly focused set next at the current seq", and "grayed marks still meet 3:1" (or exempt them explicitly).

### 10. Ticket 20 and the AD-13 echo now disagree with AD-1 (medium, 13.20 / 13.14)

**Where:** L186 vs 13.20's ticket ("with the derived files it holds, none yet") and AD-13 L433 ("`pipeline` posts both derived files at every seq, even unchanged").
**Gap:**
- After the update main always holds both files from `newDesign`, so "none yet" is stale.
- The memlog correction says `pipeline` echoes them at every seq "from the first story that runs pipeline in the model worker (13.20)". Neither ticket 20 nor the spine records which story builds that echo, nor the codecs and the workspace-set message. `component-ownership.md` L33 says 13.20 builds "posts", but ticket 20 lists only issues and stage-started.
- AD-11 L403 (one fingerprint per design part that applies a blueprint) is knowingly violated until 7.2 (epic Decision 2026-11-02), and the spine records no such exception, so a reviewer of 13.18/13.20 will flag a missing fingerprint for `key`.
**Fix:** in the spine, add to AD-11 Fingerprints: "until fingerprints are computed (7.2) `pipeline` echoes the file it received". In the tickets (not the spine), fix 13.20's "none yet", and name the story that owns the `PartsOutput`/`LayoutOutput` codecs and the workspace-set post (13.18, 13.2, 13.7 or 13.20). Without that, 13.2 and 13.7 can both build it, or neither.

### 11. Minor consistency points

- **L186 vs AD-8 L291:** "Loading and then saving an unchanged design bundle reproduces each file byte for byte". A bundle missing a derived file gains one on save. Say that the round-trip holds for complete bundles, and whether a missing file is tolerated or reported. As written, a missing file is silently accepted, which can hide a storage bug in 13.14.
- **L863:** "envelope and `rectangle` with 13.18". 13.18 ships them as blueprint lane outputs (`OutputKind` `envelope`, role `rectangle`), not as typed `LibraryPart` fields, and their value types (what the lane returns) aren't in Data Schema; only the posted `rect` (L846) is. Under AGENTS.md's policy 13.18 must stop and ask. Type the `rectangle` and `envelope` output values now, or reword L863 to say they arrive as lane outputs typed by a named schema session before 13.18.
- **L860:** "Parts start in epic-see-corneys-keys: 13.16, 13.17, 13.21, 13.18, before 13.2." This answers the removed row. Its sub-points (14.5's "none until epic-parts-and-pcb", 14.7's all-at-once part fields) no longer appear in the epic 14 tickets, so dropping them is fine.
- **L829:** "until then the file holds only its revision". This is the routing file's empty form, as asked. Its KDL node name for `revision` is not written down (nor the fingerprints file's). Only `model`'s one canonical writer emits it, so no two stories diverge. Low.

## What the update gets right

- The format-version decision (L288) is exactly the ADOPTED memlog line, closes the Open Question, and keeps one number for the bundle.
- The removed Open Questions rows "Whether the routing and fingerprints files carry their own format-version" and "Drawing a workspace's set after a switch" are fully answered by L288 and L392 + L882.
- `LayoutOutput`/`PartsOutput` are added to AD-10's list of output types (L325), so AD-10 stays the single list.
- AD-22's transform sentence (L595) closes the "is a transform geometry?" argument 13.7 would otherwise have.
- The switch grace is a convention, not an invariant, so tuning it needs no spine change.
