---
epic: epic-see-corneys-keys
date: 2026-11-16
verdict: accepted-with-open-items
criteria: declared
headless: false
---

# Retrospective: See Corney's keys

## Epic summary

Epic `epic-see-corneys-keys` (slice 13), R1 to R6 and its Done when in `epic-see-corneys-keys.md`. All 26 tickets are `done`; `pending_tickets` is empty, none is at `built`. Going-in concerns: none named by Sergii.

| Build order | Ref | Title | Range (baseline .. next baseline) | Commits |
|---|---|---|---|---|
| 1 | 13.9 | The workspace matches the 2026-10-30 spine | c65d55e..ed342ec | 22 |
| 2 | 13.16 | A part blueprint answers within the live budget | ed342ec..4b9d0d5 | 172 (cut: see below) |
| 3 | 13.17 | The sandbox runs a blueprint lane | 4b9d0d5..9358942 | 3 |
| 4 | 13.21 | Library blueprints build and run in the model worker | 9358942..44019f5 | 3 |
| 5 | 13.18 | A new design holds a default key part | 44019f5..a8d2637 | 3 |
| 6 | 13.2 | One Corney column resolves from a chain | a8d2637..192129d | 4 |
| 7 | 13.22 | The Layout set reaches main | 192129d..5e96667 | 6 |
| 8 | 13.7 | Layout canvas draws resolved keys with selection | 5e96667..d2c6cdf | 2 |
| 9 | 13.23 | Layout canvas viewport zooms, pans and fits | d2c6cdf..6cc7f3f | 3 |
| 10 | 13.24 | Delete and Ctrl+D act on the selection | 6cc7f3f..edb678a | 11 |
| 11 | 13.27 | A modal owns the keyboard | edb678a..1960f0a | 5 |
| 12 | 13.29 | Availability says why | 1960f0a..284e9ef | 2 |
| 13 | 13.30 | Flows hold the open flow | 284e9ef..a185d03 | 4 |
| 14 | 13.25 | G and S add groups and slots through the add flow | a185d03..a0f7657 | 2 |
| 15 | 13.28 | T toggles the slide-out | a0f7657..40da249 | 2 |
| 16 | 13.31 | The load flow is named DesignLoader | 40da249..64c61eb | 9 |
| 17 | 13.3 | Explicit anchors move dependants, cycles rejected | 64c61eb..038168d | 3 |
| 18 | 13.4 | Corney wired's left half from commands | 038168d..3008fd4 | 7 |
| 19 | 13.6 | Right side derived | 3008fd4..edc03c5 | 3 |
| 20 | 13.26 | Model posts group borders | edc03c5..48a0277 | 2 |
| 21 | 13.32 | The canvas draws group borders on hover and selection | 48a0277..40326d1 | 7 |
| 22 | 13.33 | Per-side overrides remove a part | 40326d1..44d388b | 10 |
| 23 | 13.8 | Both halves drawn | 44d388b..b6f626a | 4 |
| 24 | 13.35 | The canvas shows ids and anchor links on hover and selection | b6f626a..a58847a | 5 |
| 25 | 13.34 | Corney's keys survive a reload end to end | a58847a..270c7ea | 3 |
| 26 | 13.13 | Refactor sweep | 270c7ea..545949a | 1 (inferred end: 13.13's squash merge, #66) |

Ranges are ordered by each plan's `baseline_revision` on main's first-parent history; the ticket tree's row order differs (13.31 built before 13.3). The last range ends at 545949a, the commit merging 13.13; later commits on main are bookkeeping (3da59be, f2c89c7).

Cut: 13.16's range (ed342ec..4b9d0d5) spans the whole of epic-a-new-design-opens (23.1 to 23.24, built between the spike and 13.17). Only the spike's own commits are attributed to it (6dafa4c `docs: add spike 16 sandbox verdict and plan`, fc11b32 and the blueprints spine commits that follow from its verdict); the rest belongs to epic 23 and its retrospective.

Evidence inventory:
- Epic file, read in full; Requirements R1 to R6 (R5 moved to epic 23) and Done when present: criteria are declared.
- 26 plans, one per ticket; no story files (every ticket is an entry in `tickets.toml`).
- `git_evidence.py` output per range.
- Run folders: none; `sandbox-verdict.md` (spike 16's verdict) sits in the epic folder and is read as a companion.
- Previous retrospective: `epic-a-new-design-opens/epic-a-new-design-opens-retrospective.md`.
- Session logs: 163 session records exist for this project; used only where a plan points to a session decision.

## Findings

Each finding was re-checked against its source before routing; dispositions are fix now (an action item), defer (an owner and enough context) or accept.

### Edge cases and seams between tickets

- **S1. Delete can pass its availability check and then be refused, silently** (13.24 ↔ 13.3 ↔ 13.29). `packages/model/src/layout-editing/check-delete-node.ts:9-21` checks only the root and missing ids; `delete-node.ts:28-35` drops every anchor that names a deleted node, so it falls back to its default anchor; the store's `checkStructure` (`packages/model/src/check-structure.ts:53-64`, run from `packages/design/src/store/design-store.ts:172`) then refuses a cycle the fallback closes. Reachable by commands alone: root free, holding slot D, free group P (slot X) and slot Y; SetAnchor X→D, Y→X, P→Y; Delete D closes P→Y→X→P. `DeleteSelection.available()` (`packages/editor/src/selection/delete-selection.ts:86-90`) shows Delete enabled, and `ShortcutRegistry.#run` drops the refusal (`shortcut-registry.ts:60-67`). The spine (line 234) says such a node "falls back to its default anchor"; it does not say the delete may be refused. No test. Disposition: fix now, after a spine answer (A1).
- **S2. Two more commands whose check passes and whose run is refused or does nothing** (13.18/13.24 ↔ 13.2). DeletePart of a part a slot uses passes `check-delete-part.ts:6-16` and is refused as `unknown-target` by the structural check; DeletePart of a missing id commits nothing and refuses nothing, while DeleteNode and DuplicateNode refuse the same input. DuplicateNode of a subtree holding a loaded cycle copies the cycle and is refused (reachable only from a loaded file). No UI runs DeletePart yet. Disposition: defer to the story that exposes DeletePart (A2).
- **S3. DuplicateNode does not copy the original's overrides** (13.24 ↔ 13.33). `duplicate-node.ts:12-41` never reads `design.overrides`; duplicating `left/k1` whose right side is removed gives a copy fitted on both sides. The spine (236) says only "remaps references inside the copy"; 13.24 was built before overrides existed. No test. Disposition: defer, a spine question (A3).
- **S4. A deleted key stays drawn and selectable until the next Layout set arrives** (13.7/13.8 ↔ 13.24). A patches commit keeps the previous set (`packages/workers/src/model-worker/model-worker-lifecycle.ts:111-115`); `packages/editor/src/workspace/layout/use-placed-nodes.ts:15-33` draws every row without checking the design, while `use-group-borders.ts:47-48` filters a border posted before its node was deleted. A press on the ghost key calls `Selection.select`, which takes the id unchecked (`selection.ts:13-15`), breaking the spine's Editor state row: "a selection names only existing nodes". The window is one worker round trip, longer while `BlueprintPause` waits; not shown wide in practice. No test. Disposition: fix now (A4).
- **S5. Selection and hover survive a design replace when ids overlap** (13.7 ↔ 13.30/13.31). `Selection.#prune` and `HoveredNode.#prune` keep ids the new design also holds, while `Flows` cancels everything on a whole commit (`packages/editor/src/flows/flows.ts:81-85`). Follows the spine's letter ("ids the design no longer holds"). Disposition: defer, a question for Sergii (A5).
- **S6. SetOverride accepts `left/` and `right/` targets on a unibody design** (13.33 ↔ 13.8). `check-set-override.ts:11-23` never checks the form; nothing shows today because unibody posts no rows. The spine (302-303) is silent on unibody. Disposition: defer to the unibody story (A6).
- **S7. The add flow selects the parent's last child as the new node** (`added-node-id.ts:27-37`), right only while no `index` is passed; no caller passes one. Disposition: accept; recorded so it is not re-flagged.
- Checked and sound: the LayoutOutput codec's column layout; seq gating (`Dispatcher.#admit` drops a result older than the last message sent); DeleteNode's cascade over overrides and anchors; DuplicateNode's id scheme and anchor remap; the right half's select-only rule; the add flow as a modal blocking every hotkey; a loading lane falling through to the stand-in.

### Architecture, size, duplication, pattern divergence

- **A-1. No package-level cycle, no rule violation**: depcruise before (4b9d0d5) and after (545949a): 518 → 1132 modules, 0 violations. Every new package edge was already drawn in `GRAPH`; the only `GRAPH` change is `app → reference-designs`. New fences: `only-blueprint-imports-quickjs-wasi`, `only-geometry-case-routing-import-clipper2-ts`, `only-editor-imports-use-gesture`, the blueprints-src rules, `app/src/testing/`, `ui/testing`.
- **A-2. A new runtime file cycle in editor**: `workspace/layout/switch-grace.ts:6` → `router/design-location.ts:8` (`createEditorRouter` called at runtime, :23) → `create-editor-router.ts` → `shell/EditorShell.vue` / `LayoutCanvas.vue` → `add-flow/start-add-chain-group.ts`, `status-strip/UpdatingIndicator.vue` → `use-switch-grace.ts` → back; introduced by d16e55a (#47, 13.7) and 61f6fe7 (#53, 13.25). 13.13's composable specs had to import `showWorkspace` after `DesignLocation` to avoid "Cannot access before initialization" (13.13 plan, round 1 note). The flow classes holding `static view = AddFlowView` (`add-group-flow.ts:18`, `add-slot-flow.ts:18`) close smaller cycles. Disposition: defer to the next sweep (A9).
- **A-3. Hotspots grown by many tickets**: `packages/model/src/parts/create-derivations.ts` (8 tickets, one function wiring about 15 computed stages, 183 lines; 13.13 split its helpers out), `packages/schema/src/types.ts` (10 tickets, 255 lines, all schema types by convention), `packages/model/src/main.ts` (11 tickets), `editor-module.ts` (8). Specs over 500 lines grown here: `create-derivations.spec.ts` 1013, `model-worker-lifecycle.spec.ts` 809, `group-borders.spec.ts` 694, `place-layout.spec.ts` 600, `launch.spec.ts` 541. Disposition: accept for now; watch `create-derivations.ts` in the next sweep.
- **A-4. Duplication**: two `Point` types (`packages/geometry/src/types.ts:11`, `packages/editor/src/viewport/types.ts:8`; editor has no `geometry` edge) and two `Bounds` shapes; the status strip selector written out in 8 places (`testing/ids-and-links.ts:15`, `landmarks.spec.ts:17`, `EditorShell.spec.ts:55`, `switch-grace.spec.ts:94,202`, `status-strip.spec.ts:14`, `group-borders.spec.ts:176`, `app/src/launch/launch.spec.ts:480`); `canvas()` exported from `testing/canvas-queries.ts:5` and redefined in four specs; `switch-grace.spec.ts:46-60` re-declares `seqOf`, `only` and `PARTS` from `testing/layout-canvas.ts`; `HoveredNode` and `SwitchGrace` run their timers in detached scopes two ways. Disposition: defer to the next sweep (A10).
- **A-5. Pattern divergence**: `@use-gesture/vanilla` 10.3.1 pinned in `packages/editor/package.json`, not through the catalog the other dependencies use; `editor/src/testing/ids-and-links.ts` mixes constants, selectors, an arrange and coordinate maths in one file. Checked and clean: no type outside `types.ts`, no AD-n or ticket reference in a comment, no module-level mutable state, no `vi.mock`, snapshot, `getByTestId`, jsdom or `@vue/test-utils` in the epic's specs. Disposition: defer to the next sweep (A10).

### Spec reconciliation

- R1 to R4 delivered with tests (`packages/model/src/placement/place-layout.spec.ts:383`, `app/src/anchors.spec.ts:69,129`, `app/src/right-half.spec.ts:65,88-131`, `packages/model/src/parts/create-derivations.spec.ts:741-765`); R2's spike check is `app/src/corney-left-half.spec.ts:45` against `reference-designs/src/key-centres/tolerances.ts:3` (0.05 mm position; rotation as keycap-corner displacement ≤ 0.05 mm). R1 narrowed by the 2026-11-13 decision: a chain child takes no explicit anchor.
- **R6, both themes, partly tested.** Keycaps, group borders and anchor links are tested in the dark theme only (`LayoutCanvas.spec.ts:117`, `group-borders.spec.ts:196`); only the empty hint and slot-id labels run in both. Observed correct in light at runtime (Behavior verification). Disposition: defer, a test gap (A7).
- **Done when 3, "generic checks (23.3) run over every registered command"** (epic Notes, 2026-11-02 split check): no test runs every registered command through a round trip; `app/src/autosave-round-trip.spec.ts:27` runs NewDesign only. Delivered instead by `app/src/corney-column.spec.ts:107` (Corney's whole design through a bundle, same placements), `packages/design-file/src/round-trip.spec.ts:72` (parts, layout and overrides byte for byte) and the e2e reload. Disposition: spec reconciliation (A8).
- R6's e2e journey (`app/e2e/corneys-keys.spec.ts:16`) adds through S only, with no screenshot baseline, by the 2026-11-14 and 2026-11-16 decisions; G, Ctrl+D, SetAnchor, SetOverride and the rest have no e2e test (deferred-work card, 13.34). Verify sentences with no matching test: 13.2's "does not recompute when an unrelated section changes" (the nearest edits the name, in the same section); 13.4's world frame through the codec for a pivoted key.
- Added behaviour, each traced to a plan decision: pinch zoom (13.23), a unibody `whole/` side in selection and add (13.8).

### Process lessons

From 26 plans: about 70 review passes, 5 highs, about 72 mediums; 37 `Decision (Sergii` lines raised during builds; the epic grew from 13 entries (2026-11-02) to 26.

- **P1. The same test-quality findings recur in every story.** A name claiming more than its expects (about 14 tickets), narrowing instead of whole values (about 14), tests that can't fail or whose toggled bug stays green (about 16), arrange breaches (about 13), expected values from production (about 8). The previous retro's P1/P2 named the same families; no change to the build workflow or AGENTS.md landed for them (no `_bmad/custom` or AGENTS.md commit after 3d1339a). Source: per-plan Review Triage Logs (13.18, 13.23, 13.29, 13.24, 13.7, 13.13 and others).
- **P2. A review fix creates the next finding.** 13.13 (pass-1 patch #7 → #19 → #32), 13.32 (`ownsHover`), 13.23 (resize patch → passes 4 and 5), 13.7 (pass 2 → #25), 13.21 (pins patch), 13.17. Patches are written to the finding, not to the rule it broke.
- **P3. Moving tests loses coverage.** 13.24 deleted an `id-taken` row; 13.13 moved canvas tests to service level twice before the frozen rule forced them back (13.13 triage #21, #33).
- **P4. `review_loop_iteration` does not count passes.** 13.7 records 0 against 7 passes, 13.32 0 against 5, 13.13 0 against 4.
- **P5. Plans split for size at build time, seven times** (13.7 twice, 13.24, 13.25 twice, 13.6, 13.8), and about ten spine amendments mid-epic. Each split went through Sofia correctly; the cost is the re-slicing churn in the epic's Notes.
- **P6. Firefox click and hover timeouts under machine load** recur (13.3, 13.4, 13.32, 13.33, 13.13; #61 deleted the ESLint rule specs that timed out). Every replayed seed passed; the source is unconfirmed and owned by a person (slide-out flaky card).
- **P7. Intent gaps found at review, not planning**: four highs (13.18 pins, 13.17 handles, 13.34 double save, 13.27 scrim under the slide-out).

## Behavior verification

The dev server (Vite, `pnpm --filter ./app dev`) was driven in Chrome through DevTools on 2026-11-16, with `?seed=corney`. Console: no errors or warnings; the strip read 0 errors and 0 warnings throughout. Screenshots are in the session scratchpad (`01-seeded.png` to `12-light.png`).

| Promised | Observed | Matched |
|---|---|---|
| Both halves drawn in the frame | 42 keys, 21 `left/` and 21 `right/`, mirrored across the dashed axis | yes |
| Ids and anchor links on hover and selection | hovering `left/matrix-inner-home` showed its id, anchor link and group border | yes |
| Selection synced with the Tree; T toggles it | canvas selection showed in the Tree; a Tree row selected the canvas key; T closed it and returned focus | yes |
| Zoom, pan, F | wheel zoomed 19% to 30%; trackpad pan moved the view; F fitted the selection (936%) | yes |
| Strip shows cursor and zoom | `x – y –` off the canvas, `x −45 y 21.37` over a key; whole percent | yes |
| G, S, Ctrl+D, Delete | S's modal added `matrix-inner-extra` on both halves; Ctrl+D copied and selected it; Delete removed it; G's modal opened with Id and Axis | yes |
| Survives a reload | edits and zoom kept on reload of `#/design/<id>/layout` | yes |
| Both themes | light (emulated) renders; no in-app theme control (follows the OS) | yes |

Observations, not failures against R6 (A15): G's title shows the root's generated id ("Add chain group in 3pljljpond50"), as EXPERIENCE.md:126's `<parent id>` spells it; the selection cannot be cleared (Esc and an empty click do nothing, and EXPERIENCE.md names no clearing); F with the Tree open fits under the Tree; at about 932 px the Tree covers the canvas and its scrollbar is unthemed; the first fit does not follow a resize; pan seemed not to survive a reload (synthetic events, unconfirmed); light-theme keys have low contrast; a reload with `?seed=corney` still in the URL builds a new design (dev aid).

## Previous-retro follow-through

From `epic-a-new-design-opens-retrospective.md`, Action items:

| Item | Owner | Landed | Evidence |
|---|---|---|---|
| V1 failed-write test | 23.24 | yes | 19cca38; `story-the-epic-s-unproven-paths-get-their-tests-plan.md` (done) |
| V2 patches commit through `Autosave` | 23.24 | yes | 19cca38, same plan |
| V4 launch `storage-unavailable` row | 23.24 | yes | 19cca38, same plan |
| A1 schema comments | 23.24 | yes | same plan's Approach |
| Done when / R1 rewording | Sofia | yes | 62eb0a1 |
| 23.8 viewport and Tree unknown | Sofia | yes | 62eb0a1, bed0656 |
| V3 mirror halves | Sofia | yes | 4b9d0d5 |
| E2 crash count reset | Sergii, then bmad-architecture | no | `deferred-work.md` card E2 still open |
| E9 `savedAt` on open | Sergii | no | card open; 13.34 met the same double save as a high and worked around it (13.34 plan, Decision (Sergii, 2026-11-16, at review)) |
| E1 nested reactive input | Sergii | no | card open |
| P1/P2 in the process-retro room | Sergii | no evidence found | no `_bmad/custom` or AGENTS.md commit after 3d1339a; the same findings recur (P1 above) |
| P6 verification records its results | Sergii | no evidence found | no customization commit after 2026-11-08; plans do record results in practice |

## Action items

Proposed, not applied; each goes through its owner.

| # | Item | Owner | Kind |
|---|---|---|---|
| A1 | Decide what Delete does when an anchor's fallback closes a cycle (S1): refuse in `checkDeleteNode` so availability says why, or let the fallback break the cycle; then a bug story with the reachable arrangement as its first row | Sergii, then bmad-architecture; Sofia slices | spec reconciliation + remediation |
| A2 | Align DeletePart's check with its run (a used part; a missing id) and DuplicateNode with a loaded cycle (S2), in the story that exposes DeletePart | Sofia (14.7 or the part-picker story) | remediation |
| A3 | Decide whether DuplicateNode copies the original's overrides (S3) | Sergii, then bmad-architecture | spec question |
| A4 | Stop drawing and selecting a Layout row whose node the committed design no longer holds (S4), as `use-group-borders.ts:47-48` already does for borders; bug story | Sofia | remediation |
| A5 | Decide whether selection and hover clear on a design replace (S5) | Sergii | spec question |
| A6 | Check a `left/` or `right/` override target against the design's form (S6) | the unibody story | spec question |
| A7 | Test keycaps, borders and anchor links in the light theme (R6 "both themes") | Sofia (next UI story or sweep) | test gap |
| A8 | Reword the epic Note's "generic checks (23.3) run over every registered command" to what exists, or add the check; fold the 13.2 and 13.4 verify gaps | Sofia | spec reconciliation |
| A9 | Break the editor runtime cycle through `DesignLocation`'s `createEditorRouter` call (A-2) | next refactor sweep | refactor |
| A10 | Fold the duplicated `Point`/`Bounds`, status strip and canvas selectors, `switch-grace.spec.ts`'s copied arrange, the two detached-scope timer styles; move `@use-gesture/vanilla` to the catalog; split `ids-and-links.ts` (A-4, A-5) | next refactor sweep | refactor |
| A11 | Take P1 to P3 to the process-retro room: the recurring test-quality families, fixes that cause the next finding, coverage lost on moves; the previous retro's P1/P2 and P6 with them | Sergii (`--party process-retro`) | process |
| A12 | Make `review_loop_iteration` count every pass, or drop it (P4) | Sergii (`bmad-customize` on bmad-build) | process |
| A13 | Triage the Firefox load timeouts (P6) with the logged seeds | a person (slide-out flaky card) | process |
| A14 | Carry forward E2, E9 and E1 from the previous retro | Sergii | carried |
| A15 | UX questions from the behaviour check: the root's generated id in G's title, clearing the selection, F with the Tree open, the Tree at narrow widths and its scrollbar, the fit after a resize, pan persistence, light-theme key contrast | Sally (`bmad-ux`) | UX |

## Decision records

No ADR file written (Sergii, 2026-11-16): the repository keeps its decisions in the spine, each as "X, not Y, because Z", and has no `adr-*.md` or decisions folder, so a second home was declined. Candidates found in the plans, for bmad-architecture to fold where spine-worthy:

- Chords always `preventDefault` (13.24 plan, frozen block): already in the spine (AD-26).
- One locale-free comparator, `compareCodeUnits` (13.13 plan, Decision (Sergii) pass 2): already in the spine.
- App and ui specs share helpers through `app/src/testing/` and `ui/testing` (13.13 plan): already in the spine.
- A set posted before a whole commit counts as no set (13.7 plan, Design Notes): already in the spine's Editor state row.
- A design replace cancels every open flow, a pending finish included (13.30 plan, frozen block): added to the spine once and reverted (e103c29); a candidate.
- A failed part run is one violation per run, not per slot (13.18 plan): a candidate.
- Test-only entries carry a `Test` prefix (13.30 plan, Design Notes), Stryker's `disableTypeChecks` scope (13.21 plan), the e2e scope per slice (13.34 plan): plan-level; left in their plans.

## Acceptance verdict

**accepted-with-open-items** (criteria declared; Sergii confirmed, 2026-11-16).

Every ticket is `done`. R1 to R4 and R6 and each Done when line are delivered with tests (Spec reconciliation), and the live check matched every promised behaviour with a clean console (Behavior verification). Open and tracked: the seam bugs S1 (A1) and S4 (A4), the spec questions S2, S3, S5 and S6 (A2, A3, A5, A6), R6's light theme only partly tested (A7), the epic Note's unbacked "generic checks over every registered command" (A8), the next sweep's refactors (A9, A10), the process lessons (A11 to A13), the carried items (A14) and the UX questions (A15). None breaks a Requirement as written.

## Open questions

- S1: when deleting a node lets an anchor's fallback close a cycle, should Delete be refused (and say why) or should the fallback break the cycle? The answer decides A1's fix.
- S3: does DuplicateNode copy the original's per-side overrides?
- S5: should selection and hover clear when another design replaces the open one?
- The Firefox click and hover timeouts under load: machine load, or a race in the browser runner? No source confirmed (P6).
- Pan persistence across a reload: the behaviour check saw the board re-centred after a synthetic pan; a real pointer pan would settle it (A15).
