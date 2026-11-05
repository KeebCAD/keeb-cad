# Spine-gap sweep, 2026-11-05

Every open ticket checked for behaviour it must implement that neither the ticket nor the spine decides. Four context-free readers (epic 23 rest; epic 13; epics 14 and 15; epics 16, 19, 7 and 22). 79 gaps; each line names the tickets it blocks and the reader's recommended option. Settle one at a time, grouped by AD; each answer becomes a spine or ticket edit. ✅ marks an answered gap.

Already open in the spine's Open Questions or a ticket's `unknown` (cited, not new): A3 (undo records), G4, G5 partly, F7 (move input), G1 partly, D9, B8 partly, I5, E9, K1.

## A. Ticket text out of step with the spine (Sofia fixes; no spine question unless marked)
- A1 15.1 still describes a gesture API (begin, update, commit) that AD-2 removed; 15.2 and 15.4 cite it; 16.3 "cancel its gesture"; 7.1 "during a gesture … waiting for edit to finish". Rewrite 15.1 as the drag-preview and burst service plus the stale-seq check; define "waiting" as display-only while a focus session, burst or drag is open (only routing defers, AD-12).
- A2 16.1 "proven with a test format 0" contradicts format-version ≥ 1. **Question:** prove migration with an injectable test-only chain (current 2, fixture 1) — rec; or amend AD-8; or defer the migrated rows to the first public preview.
- A3 16.2 restates AD-13 wrongly (routing file "valid for that revision"; named points omit `reset`).
- A4 7.2 verify "a cache hit from an older input slice is reported stale" is unreachable; reword to the last good output shown while recomputing.
- A5 13.2, 13.4 say `fixtures/`; the spine says `reference-designs/` (23.14 renames).
- A6 15.5 says `[`/`]` rotate; EXPERIENCE (2026-10-30) says R / Shift+R.
- A7 Ownership: Parameters tab, Parts tab, expression field and autocomplete have no story; 14.5 and 19.2 both claim the Part field; 14.3's verify repeats 13.18's; 14.5, 14.3, 15.4–15.6 cite retired `epic-layout`/`epic-layout-editor` stories.
- A8 13.2 says 23.3's generic checks cover its commands; deferred-work says 13.2 decides their home (rec: `commands`).

## B. AD-11 worker, protocol, background stages
- ✅ B1 Worker start with no design loaded (23.4, 23.7). **Sergii: A** — spawn or send nothing until the store holds its first `Committed`; the first message is `replaceDesign`'s whole bundle; order is load, then spawn.
- ✅ B2 Crash restart cap (23.4). **Sergii: A** — after 3 consecutive crashes with no successful post between, stop restarting; the stage shows failed; only the Restart action clears it.
- ✅ B3 Payloads of `focus`, `stage-started`, `issues`, and who sends `focus` (23.4, 23.8). **Sergii: A** — `issues { seq, violations: Violation[] }`, `stage-started { seq, stage }`, `focus { workspace }`; `workers` sends `focus` at worker start (the URL's workspace) and on every switch (23.8 calls it).
- ✅ B4 Status strip (23.8). **Sergii: A** — the running stage shows when more than 1000 ms passed since `stage-started` arrived on main, cleared by the next post; elapsed in whole seconds (`2 s`); label is the stage id; counts show the last known numbers dimmed with `◌` while their seq is behind main's, `0` before the first `issues`.
- ✅ B5 Commit vs running background stage (7.1, 7.2). **Sergii: A** — a newer commit cancels a running background stage only when its input-slice hash changed; otherwise it runs on and its result is tagged with the latest seq.
- ✅ B6 Background stage result shapes (7.1). **Sergii: A** — progress `{ done, total }` (editor shows % or N/M per stage), partial `{ seq, output }`, failed `{ seq, message }`; the test stage's input slice typed in `schema`.
- ✅ B7 Output hashes and Accept scope (7.2). **Sergii: A** — numbers in an output are rounded to 6 decimals before hashing; Accept output change covers all pending changes at once, showing the count and ids.
- ✅ B8 `LayoutOutput.part` (13.2, 13.22; closes the Open Q). **Sergii: A** — the model emits run ids; 13.22's codec assigns row numbers when packing; 13.2's text says "the slot's run id".
- ✅ B9 Frame computation and `frame.rot` (13.2, 13.6, 13.22). **Sergii: A (reframed)** — `model` composes frames with 2D affine matrices through one `compose` function in `geometry`; `LayoutOutput` keeps `{ x, y, rot, mirrored }`, `rot` read from the matrix and normalised to (−180, 180]; angle comparisons (tests, 13.4's Ergogen check) are mod 360.
- ✅ B10 Tab badge precedence (7.2). **Sergii: A** — failed > stale > rebuilding or routing > waiting for edit to finish > current, over the stages AD-11's workspace table assigns to the tab.

## C. AD-13 storage, versions, tabs, files
- ✅ C1 A bundle on disk (16.2, 16.1). **Sergii: A** — one zip: `design.kdl`, `routing.kdl`, `fingerprints.kdl`, `assets/<hash>`; extension `.keeb`; filename `<slugified name>.keeb`, Firefox downloads add `.rev<short hash>`. (Needs a zip library: a Stack row when 16.2 is planned.)
- ✅ C2 Version identity and order (23.5). **Sergii: A** — a version is keyed by (design id, revision, reason class), so same-revision replacement applies only among `autosave` versions and a `reset` point survives; order by a monotonic save counter in `storage`, never a clock.
- ✅ C3 Autosave failure (23.5, 23.7). **Sergii: A** — autosave is a `di` service with a failure state (a `shallowRef`: empty, or storage's error); it retries on the next commit or accept event and clears on success; 16.x's banner reads it; launch with storage unavailable opens a new, unsaved design and the failure state says why.
- ✅ C4 Launch and the URL (23.7, 23.8). **Sergii: A** — the URL wins if its design id is stored and loads; else the newest stored design, else NewDesign, with `router.replace`; slugs `layout`, `outline`, `pcb`, `case`, `firmware`; unknown or missing → `layout`; the router owns it, the store follows.
- ✅ C5 Which tab edits (16.3). **Sergii: A** — a Web Lock named by the design id; its holder edits; when the browser frees it (close or crash) the read-only tab says so and promotes only on the user's Take over.
- ✅ C6 Take over (16.3). **Sergii: A** — the new editor reloads the stored bundle through the load flow before writing; the demoted tab flushes its last pending commit, stops autosave, and drops an open expression session or nudge burst without committing it.
- ✅ C7 Read-only scope (16.3). **Sergii: A** — a read-only tab never writes this design's bundle: undo, redo, Reroute, Accept output change and version switch are disabled; New design, Open, Copy design, export and Save to file stay.
- ✅ C8 Save state and file handle (16.2). **Sergii: A (corrected)** — `saved` = current revision equals the last revision written to the file; the Chromium handle is kept in IndexedDB per design; after a reload the first Save calls `queryPermission()` and on `"prompt"` `requestPermission()` inside that click (MDN: restored handles report "prompt"; requestPermission needs user activation); a refused permission fails the save with its reason, stays unsaved and offers the picker; a cancelled picker does nothing; Open binds later saves to the opened file; 16.2's verify runs reload-then-save in a real Chromium.
- ✅ C9 The `copy` named point (22.1). **Sergii: A** — in the copy's version list, holding the source's bundle at the copied revision: "as copied" in the copy's Versions and, from M2, its merge base (AD-9); the source is never written.
- ✅ C10 What a copy carries (22.1). **Sergii: A** — the routing and fingerprints files and the assets, unchanged with their revision tags; `pipeline` re-validates them against the copy (AD-12).
- ✅ C11 Copy's name and provenance display (22.1). **Sergii: A** — name non-empty, not unique, default `<source name> copy`; the info shows the source's current name when stored, else its id, then `· rev <short hash>`.

## D. AD-26 and UX: editor frame and UI behaviour
- D1 Where an entry declares hotkeys and what input a hotkey run passes (23.6, 23.7). Rec: optional static `hotkeys` and default input on the handle.
- D2 Are workspace keys, T, Esc, F6 registered actions or editor-local (23.6–23.8)? Rec: actions over UI-state di interfaces.
- D3 Workspaces 2–5 content; Layout hint naming keys that do nothing yet (23.8). Rec: blank regions; hint verbatim.
- D4 F6 on an empty region (23.8). Rec: region roots are focusable landmarks.
- D5 Number formatter rounding and edges (23.6). Rec: half away from zero, no `-0`, `≈` prefix, unit suffix.
- D6 Ctrl vs Cmd on macOS (23.6). Rec: Ctrl only in M1; a Deferred row.
- D7 Layout canvas numbers: zoom range, wheel step, F padding, hit-radius levels, cursor/zoom format; unplaced rows (13.7). Rec: Sergii sets the numbers; unplaced rows not drawn.
- D8 Load-failure treatments: banner or toast (16.1). Rec: banner for refusals, toast for reset and migrated.
- D9 Nudge-step control storage and validation (15.5). Rec: per design in localStorage; refuse a non-positive step.
- D10 Where P places a slot; one or two undo steps (19.2). Rec: in the selected group, appended; two steps.

## E. AD-2 commands, undo, ids
- E1 Scripts can't name nodes they created, since ids are random (13.2, 13.4, 13.6, 13.8). Rec: Add* inputs take an optional caller-chosen id; mint only when omitted.
- E2 Inputs and defaults of AddGroup, AddSlot, DuplicateNode, DeleteNode; no SetOffset anywhere (13.2, 13.4, 13.7). Rec: `{ parent?, index?, id?, …fields }`; duplicate after the original, internal refs remapped.
- E3 Undo record shape (14.1; Open Q). Rec: nested references; amend AD-23.
- E4 Coalescing API, empty-stack undo, depth (14.1, 14.5). Rec: `run(…, { coalesce })`; `unavailable`; unbounded.
- E5 Commands behind the inspector and settings (14.5, 14.3, 14.7). Rec: name `setOffset`, `setChain`, `setGap`, `setDefaultPart`, `setSlotInputs`.
- E6 Deleting a node others anchor to (13.2, 13.3). Rec: clear dangling anchors; delete only keyed list items.
- E7 A command to delete a design part or pin, for 13.18's rejection (13.18). Rec: a minimal `parts.deletePart`.
- E8 Stale seq in practice: a new gesture before the last snapshot arrives (15.4, 15.5). Rec: hold the start until the latest snapshot; stale snaps back with a toast.
- E9 setAnchor keeps the offset or the world position; unsetting (13.3; Open Q). Rec: keep the offset; the node moves.

## F. AD-3, AD-4 placement
- F1 What a group contributes to a chain step (13.2, 13.4). Rec: the bounding extent of its placed slots along the axis.
- F2 Which edges form the acyclic graph; cycle id order (13.3). Rec: include default-anchor edges; order along the cycle; members only.
- F3 A node anchored to an unknown id (13.3). Rec: not placed, like a cycle.
- F4 Attach points: default and coordinates (13.3). Rec: default `center`; ±w/2, ±h/2 in the slot frame.
- F5 Compensation frame and edges (15.2). Rec: the delta in the next sibling's anchor frame; no-op without a default-anchored next sibling.
- F6 Re-anchor flatten precision, rotation range (15.3, 15.6). Rec: round 0.01 mm and 0.001°, rotation in (−180, 180].
- F7 Move input and who converts world delta to anchor frames (15.2–15.5; Open Q). Rec: editor converts with posted frames; command carries per-node deltas and the seq.
- F8 What "no absolute coordinates" means for Corney's script; the Ergogen frame (13.4). Rec: one offset from `center`, translated in the comparison.

## G. AD-17 expressions and parameters
- G1 Parameters section shape and name grammar (14.2, 14.5; partly open). Rec: `{ id: Name, value: Expression }`, identifier names, unit derived.
- G2 Grammar and unit algebra (14.2, 15.2). Rec: standard precedence; ± needs equal units; no unit×unit.
- G3 A bad expression: refused or a violation; what stages use (14.2, 14.5, 14.4). Rec: commands refuse; a loaded file reports and leaves the node unplaced; `negative-length` an error.
- G4 Parameter cycles, rename and delete outcomes (14.2; partly open). Rec: reuse the cycle rejection; widen `ItemId`.
- G5 What the literal-only expr stub accepts, permanently (13.17, 13.2). Rec: `[-]digits[.digits]` + `mm`|`deg`; `Result<{ value, unit }, ParseError>`.
- G6 Who reports `unit-mismatch` and `negative-length` before 14.2 (13.2). Rec: nobody until 14.2; say so in 13.2.
- G7 Write-back: which term, rounding, printing (15.2, 15.4, 15.5). Rec: top-level additive term only; half away from zero; shortest decimal.

## H. AD-5, AD-6 parts and sides
- H1 choc-key's keycap at 1u and 1.5u, and NewDesign's default gap (13.18, 13.2, 13.4). Rec: 18×18, 27×18, gap 1 mm (Corney's 19 mm steps).
- H2 Stand-in cases and what each reports (13.18). Rec: not found → `unresolvable-reference`; found without output → only the blueprint violation.
- H3 The app-defined stand-in rectangle (13.18). Rec: the 1u size.
- H4 Override identity and de-duplication (13.6). Rec: the target is the key; a repeat replaces.
- H5 Disallowed overrides: outcome per case (13.6). Rec: the command accepts only `'empty'`; a loaded swap reports `override-not-allowed`.
- H6 `size` into choc-key v1 in place or v2 (13.4). Rec: v1 in place before the first public preview.
- H7 `size` outside its options (13.4; Open Q). Rec: refused at command time; a loaded file reports.
- H8 setPart: pinning, slot inputs, a library part with no blueprint (14.7). Rec: pin the highest version; clear non-per-slot inputs; fixed rectangle as data.
- H9 Part picker contents and cutouts (19.2; partly). Rec: type envelope, cutouts and `CutoutPurpose` before 19.2.
- H10 Corney's right-side overrides and the headless scenario (13.6). Rec: Sergii names them.

## I. Violations and exports (AD-15, AD-20, Conventions)
- I1 Severity, ids and message text per violation kind in epic 13 (13.2, 13.3, 13.6). Rec: errors for anchor-cycle, unsupported-form, override-not-allowed; messages as implementer decisions.
- I2 Overlap: envelope, tolerance, depth, pairs (14.4). Rec: keycap rectangle, area tolerance, minimum translation depth.
- I3 Overlap severity rule (14.4, 14.6). Rec: a depth threshold.
- I4 Violation geometry and order for the panel and canvas (14.6). Rec: optional `region` on overlap; cycle order; F8 wraps.
- I5 Export registry shape and crossing (19.3; Open Q). Rec: a whole list posted per seq.
- I6 Which violations block which export (19.3). Rec: by the ids each export reads.

## J. Blueprint sandbox numbers (13.17, 13.21)
- J1 VM replacement size, lane-cache cap, the two Deferred items, the app's blueprint API version. Rec: 48 MiB, LRU with an entry cap, record-only, version 1.

## Unsliced epics leaning on undefined spine areas
plates-to-dxf (the `plates` section, `CutoutPurpose`, part-parameter binding); routing-and-fab (routes in the routing file, `design-rules`); wireless-copy (`PinRole`, `keymap`, `case`).
