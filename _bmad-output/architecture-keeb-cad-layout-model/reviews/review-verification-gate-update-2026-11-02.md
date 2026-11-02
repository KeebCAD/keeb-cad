---
title: 'Verification review: spine update 2026-11-02 (gate for 13.14, 13.18, 13.2, 13.7)'
reviewer: verification lens (subagent)
date: '2026-11-02'
spine: _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
diff: working tree against b61a744 (spine + .memlog.md)
verdict: PASS WITH FIXES. The technology claims hold. One decision departs from the measured spike winner, and its rejection reason misstates what the spike did. The rotation convention for the SVG transform is not pinned down.
---

# Verification review: gate update 2026-11-02

Scope: every decision in the diff that names how a technology behaves. For each, this review asks whether it was checked or only asserted. The spine was not edited.

## Method

- Read the diff, the spine sections it touches (AD-1, AD-3, AD-7, AD-8, AD-11, AD-12, AD-13, AD-22, Data Schema, Consistency Conventions) and the new memlog entries.
- Read the stage-transport spike on `archive/spike-stage-transport` (`spikes/VERDICT.md`, `spikes/src/own-read.ts`, `spikes/src/own-encode.ts`).
- Ran a Node 25.8.0 (V8) micro-benchmark of `structuredClone` and of a `MessageChannel` post of `{ ids: string[], cols: ArrayBuffer }` with the buffer transferred. The script is `/tmp/claude-1000/-home-ruyu-projects-keeb-cad/119f01cc-0d20-4666-8903-ea7c4a20e3f6/scratchpad/sc/b.mjs`.
- Web sources:
  - KDL spec: https://kdl.dev/spec/
  - MDN, structured clone algorithm: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
  - MDN, SVG `transform`: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/transform

## 1. A plain `string[]` of ids posted beside transferred buffers (AD-11)

**Works: verified.** MDN lists `Array` and primitive strings as structured-cloneable, and `ArrayBuffer` as transferable. One message can carry cloned and transferred parts together (`postMessage(msg, [buf])`). The Node run confirmed it: the ids arrived intact, and the buffer arrived with its full byte length while the sender's copy was detached.

**Cheap: plausible, measured only in V8.**

| ids (~20 chars, ASCII) | `structuredClone({ids})`, V8, ms per op |
| --- | --- |
| 100 | 0.013 |
| 1000 | 0.053 |
| 5000 | 0.25 |

Chromium uses the same V8 serializer, so these figures carry over to it in order of magnitude. Firefox was not measured. The spike found that Firefox deserialises a structured clone on the main thread before the handler runs, so this cost lands on main in Firefox. At about 1000 ids it is still about 0.05 to 0.1 ms, far inside the 100 ms visible-set budget.

**Finding V1 (medium): the adopted form is not the form the spike measured, and the rejection reason misstates the spike.**

- The spike's winner, 1i, did not ship a `string[]`. It shipped ids as a UTF-8 string table inside the buffers, plus a worker-sorted `Uint32Array` order. Lookup (`searchSorted` in `own-read.ts`) binary-searches by comparing bytes, encoding only the query. **It decodes nothing on main.**
- The memlog rejects "UTF-8 ids in a buffer with offsets (decoding on main for no gain)". That reason does not describe what 1i does.
- The adopted `string[]` is a sound choice, and arguably a better one: the SVG canvas needs id strings anyway for `v-for` keys, DOM ids and `aria-*`, so a byte table would be decoded per drawn row. But that is not the reason the memlog gives, and the `string[]` path was never measured in Firefox.
- Suggested fixes:
  - Restate the rejection: "UTF-8 ids in the buffers (spike 1i): lookup needs no decode, but every drawn row needs its id as a string for keys and `aria-*`, so main would decode them anyway."
  - Add the `string[]` variant to the transport spike's AC re-run (already an Open Question): Firefox pre-handler time at Corney ×10 id counts.

**Finding V2 (low): the sort comparator is not named.** "Sorted by the worker" plus "binary search on main" works only if both sides use the same order. The spike sorted by UTF-8 bytes. JS `Array.prototype.sort()` and `<` compare UTF-16 code units, and `localeCompare` is locale-dependent, which the Stable outputs convention bans. All three agree on ASCII, and the Ids convention makes ids kebab-case, so the risk is latent. Suggested fix: add "sorted by UTF-16 code unit (`<`), never `localeCompare`" to the AD-11 sentence, or to the codec's round-trip test.

**Finding V3 (low): it is unspecified which message carries a hidden layout and parts.** The rule "`LayoutOutput.part` holds a row number in the output posted in the same message" holds for every visible set: Layout, Outline and Firmware each post parts and layout together. When the focus is PCB, though, layout and parts are hidden stages, and the spine does not say they are posted together. Suggested fix: add one clause, "parts and layout are always posted in one message, visible or hidden."

## 2. SVG `transform` for a part rectangle, the y-up model and the single y-flip (AD-7, AD-22)

**Order: correct.** SVG composes a transform list right to left on the element's points. So `translate(x y) rotate(rot)` rotates the rectangle in the slot frame first, then moves it to the frame origin. That matches AD-3's single order of operations, as long as the posted `frame.x, frame.y` is the frame origin after any pivot rotation (see V5).

**Rotation sign.** SVG `rotate(θ)` is the matrix `[cos −sin; sin cos]`. That is counter-clockwise in a y-up system and clockwise on a y-down screen. AD-7 makes model rotation counter-clockwise positive with y up, and the y-flip happens once, in the viewport transform. The sign of `rot` therefore depends on which space the rectangle is drawn in:

- **Inside the viewport group** (model mm, under `scale(z, −z)`): use `rotate(rot)`. It is CCW in the model and still reads CCW on screen after the flip. This is consistent.
- **In screen space** (positioned through the viewport transform, as AD-22 does for text and handles): the rectangle needs `rotate(−rot)`.

**Finding V4 (medium): `rot` is unambiguous as data, but its use in SVG is ambiguous.**

- `LayoutOutput.frame.rot` is CCW-positive degrees per AD-7, so the data is fine.
- The new AD-22 sentence says to place the shape "with an SVG `transform`" without saying in which space. AD-22 also says text and handles are drawn in screen space.
- A canvas author who draws rectangles the way handles are drawn gets every rotated key mirrored in angle. Corney's thumb cluster and splay are exactly where this would show.
- A model-space group also brings a side effect: strokes scale with zoom unless they use `vector-effect="non-scaling-stroke"`. This matters for the 3:1 mark contrast and the stroke widths.
- Suggested fix: add to AD-22, "Posted shapes are drawn in model mm inside the viewport's flipped group, as `translate(x y) rotate(rot)` with `rot` as posted (CCW-positive, AD-7); strokes use `vector-effect: non-scaling-stroke`. Only text and handles are drawn in screen space."
- Add an end-to-end or unit check: a key at +15° tilts CCW on screen.

**Finding V5 (low): pivot.** AD-3 rotates a node about a pivot. A frame posted as `{ x, y, rot }` is correct for `translate · rotate` only if `(x, y)` is the frame's origin after that pivot rotation, not the pre-rotation offset position. The Data Schema comment says "world frame", which implies this, but nothing tests it. Suggested fix: make the LayoutOutput codec's round-trip fixture, or a `model` unit test, include a key with a non-zero pivot.

**Note:** `PartsOutput.rect` as `cx, cy, w, h` maps onto `<rect x=cx−w/2 y=cy−h/2>`. The rectangle is symmetric, so the flip does not change it.

## 3. KDL v2 without a format-version, and whether anything else requires one

- **KDL: verified.** The KDL v2 spec says a version marker `/- kdl-version 2` "MAY be added". The grammar is `document := bom? version? nodes`, so the marker is optional.
- `format-version` is keeb-cad's own application node, not part of KDL. A KDL file without it is valid.
- **Spine: consistent.** `format-version` appears only in:
  - AD-8: "Designs are KDL v2 files carrying a `format-version`", which concerns the design file only;
  - AD-6: "valid in the schema from format-version 1";
  - the `FormatVersion` type;
  - the new AD-8 sentence.
- The `RoutingFile` and `FingerprintsFile` types have no version field, and nothing else requires one in a derived file.
- **Tickets: stale but not contradictory.** `epic-see-corneys-keys.md` (line 95) and the 13.14 description in `tickets.toml` (line 66) still say the derived files' format-version "waits on the epic's open architecture question". This is a replan follow-up, not a spine defect.
- **Finding V6 (low): the derived files have no self-description.** A routing or fingerprints file read on its own, outside its bundle (debugging, or a future import), carries no version. Its schema is knowable only from the bundle's design file. That is acceptable, because the bundle is the unit (AD-1), but it should be deliberate. Suggested fix: none needed. Optionally add a clause: "a derived file is read only with its bundle's design file, whose format-version governs it."

## 4. Other claims in the diff that name a behaviour

**Finding V7 (low): "From then on only `pipeline` replaces them" (AD-1) reads against undo, redo and load.**

- AD-2 and AD-12 have main restore the routing file kept beside an undo record, and `storage` loads derived files.
- The intent is clear: only `pipeline` *computes* new content. But "replaces" is literally false for undo and redo.
- Suggested fix: change it to "from then on only `pipeline` computes them; undo, redo and load restore saved ones (AD-2, AD-12, AD-13)."

**Switch grace of about 200 ms.** This is a presentation value, correctly labelled tunable. It is consistent with the 100 ms visible-set budget: the grace is longer than the budget, so a set that arrives on time never grays. It was not checked against perception research, but the spine does not claim it was. No issue.

**Hit-testing an older snapshot is safe through the AD-2 seq check.** Verified against AD-11 ("A command computed from a snapshot follows AD-2's seq check"). No issue.

**`newDesign` empty files `{ revision }` and `{ revision, fingerprints: [] }`.** These match the Data Schema types. The canonical writer must give byte-identical round trips for them. AD-8's round-trip rule already covers this. No issue.

**One migration chain for the whole bundle.** Consistent with `replaceDesign` (AD-2), which takes `unknown` and migrates. `replaceDesign` takes the design only, though, while a bundle migration step "may touch any of its files". So it is unstated where a migration step's derived-file output goes.

**Finding V8 (low).** Suggested fix: state that `storage`'s load runs the bundle migration, then hands the design to `replaceDesign` and the derived files to the mirror. Alternatively, keep `replaceDesign`'s own migration only for unbundled inputs.

**Closing "Which story starts parts".** This is a planning fact, not a technology claim. It matches the replan `b61a744`.

## Summary of findings

| # | Severity | Area | Fix |
| --- | --- | --- | --- |
| V1 | medium | AD-11 ids | Restate the rejection reason (1i decodes nothing); measure `string[]` in Firefox in the AC re-run |
| V4 | medium | AD-22 / AD-7 | Say posted shapes draw inside the flipped viewport group with `rotate(rot)`; non-scaling strokes; test a +15° key |
| V7 | low | AD-1 | "only `pipeline` computes them; undo, redo, load restore" |
| V3 | low | AD-11 | Parts and layout always share one message, hidden too |
| V2 | low | AD-11 | Name the sort comparator (code units, never `localeCompare`) |
| V5 | low | AD-3 / codec | Pivoted-key fixture in the layout round-trip test |
| V8 | low | AD-2 / AD-8 | Say who runs the bundle migration and where derived outputs go |
| V6 | low | AD-8 | Optional: derived files are read only with their bundle |
