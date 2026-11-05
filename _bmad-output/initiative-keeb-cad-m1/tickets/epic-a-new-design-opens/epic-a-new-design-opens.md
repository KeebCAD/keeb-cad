---
type: epic
title: "A new design opens in the editor frame"
parent: initiative-keeb-cad-m1
covers: [R17, R18]
sources: [_bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md]
companions: [_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md, _bmad-output/initiative-keeb-cad-m1/component-ownership.md, _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md, _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md]
after: []
refined: true
risk: high
---

# A new design opens in the editor frame

## Description

On the locally served app, launch opens a new design in the editor frame (global chrome, workspace tabs, docked right-panel region, status strip with error and warning counts, the empty Layout hint), every command runs through the design store, the model worker mirrors the design, and a reload reopens it from browser autosave byte-identical. Split from epic-see-corneys-keys on 2026-11-02; its stories were that slice's foundation lane.

## Outcome

For Sergii: the app opens a design in the editor frame and a reload reopens it unchanged, proving the design store, the design file, the model worker, autosave and the frame end to end before any layout is drawn.

## Requirements

- R1 (parent R18): A new design autosaves in the browser after every applied command and reopens from autosave byte-identical, as one versioned canonical file. (Was epic-see-corneys-keys R5.)
- R2 (parent R17): A command the design store refuses returns a typed rejection and leaves the design unchanged; the status strip shows the error and warning counts. (The status strip half of epic-see-corneys-keys R4; its anchor-cycle rule stays there.)
- R3 (parent R17): The design is seen in the editor frame, in both themes: top bar, workspace tabs, status strip (violation counts; cursor and zoom arrive with epic-see-corneys-keys's viewport), left rail with the Tree slide-out, the docked right-panel region and the canvas region. The open design and workspace are in the URL. (The frame half of epic-see-corneys-keys R6; the Layout canvas stays there.)

## Constraints

- C1 (parent C3): Architecture AD-1 to AD-26 bind every story. This slice builds AD-2's design store with its command and action classes (Immer, Valibot inputs, nothing in progress in the design), AD-8's design file, AD-11's model worker, AD-13's storage, AD-10's `schema`, `messaging`, `protocol`, `design`, `design-file`, `commands`, `workers` and `app`, AD-25's `di` wiring and AD-26's `ui` layer as written there.
- C2 (parent C1): Current desktop Chromium and Firefox; everything runs client-side.
- C3 (parent C4): No Corney-specific shortcuts.

## Done when

- Launch with empty storage opens a new design in the editor frame at /#/design/<id>/layout, in both themes, in Chromium and Firefox.
- Every command and action runs through the design store; the model worker's mirror equals main's design after each one.
- A reload reopens the design from autosave byte-identical.
- The frame's checks (workspace keys, tree slide-out, F6, status strip at 0 errors and 0 warnings) pass in the locally served build.

## Boundaries

- Out, owned by epic-see-corneys-keys: the layout section, parts and blueprints, the Layout canvas and its drawing, both halves.
- Out, owned by epic-change-a-parameter: undo and redo, the Inspector, the Violations panel.
- Out, owned by epic-keep-my-work: Save to file, Open, the start screen, banners and toasts, the top bar's file save state.
- Out, owned by epic-routing-and-fab: Tab badges and the status strip's output-state entries.

## References

- parent — _bmad-output/initiative-keeb-cad-m1/initiative-keeb-cad-m1.md, section Requirements
- architecture — _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md, AD-1 to AD-26 (AD-1, AD-2, AD-8, AD-10, AD-11, AD-13, AD-25, AD-26 for this slice)
- companion — _bmad-output/initiative-keeb-cad-m1/component-ownership.md
- design — _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md, Components
- design — _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md, Global chrome, Edit model, Shortcuts

## Notes

- Decision (2026-11-02, split): split from epic-see-corneys-keys, which had grown to 21 entries. This epic takes its foundation lane (13.19, 13.10, 13.1, 13.20, 13.14, 13.11, 13.12, 13.15 as 1 to 8) with its own Refactor sweep (9); epic-see-corneys-keys keeps the blueprint, layout and canvas lanes. Requirement lines moved unchanged except R2 and R3, which take the status strip and frame halves of 13's R4 and R6. The 2026-10-30 rejection of a frame-only slice doesn't apply: this epic runs through every layer and is demoable. The earlier decisions on these stories stay in epic-see-corneys-keys's Notes as history.
- Decision (2026-11-02, split): the tracer bullet is 7 (was 13.12, the app opens the last design), as decided on 2026-10-30.
- Waits on epic 1 because: the monorepo scaffold, CI and the UX session result
- Decision (2026-11-02, split): 1 and 6 waited on 13.9 (done); that prerequisite is dropped rather than making this epic wait on epic-see-corneys-keys, which now waits on this one.
- Decision (2026-11-02, split check): 7's after drops 2, already implied through 5 → 4 → 3 → 2; its description still names the register it uses.
- Decision (2026-11-02, split check): cursor coordinates and zoom in the status strip move from 23.8 to 13.7, which builds the viewport service they read; 23.8 shows the error and warning counts and the running-stage entry. 23's R3 drops them and 13's R6 gains them. Rejected: a minimal viewport service in 23.8 (builds 13.7's viewport early, without the canvas it serves).
- Decision (2026-11-02, split check): 1 opens before the tracer 7, against the tracer-first rule, because 2's register is built against the per-thread partials 1 lays out; as decided on 2026-10-30 for story 9. Rejected: folding 1 into the tracer (plumbing mixed with UI, past one session) and moving it to another epic.
- Decision: 2026-11-02 — spine package split (b9b4ec5, 411dd17): owners moved, new entry 10 (di replaces ts-inject) after 1; 1 now lays out per-thread di modules and subpaths (the split-check line above says partials); delivery only, no requirement change.
- Decision (2026-11-03, replan): the first build of 2 (draft PR #6) mixed types, constants, helpers and classes, used a symbol-keyed write between two services, a module-level Immer instance and comments with no lasting value. Sergii's review set code layout and test rules in AGENTS.md (13124c4) and changed the spine (9cee349, 9962510, 840671a): the register and the design state are one service, DesignStore; Immer lives in a DesignPatcher service in both threads; checkStructure returns a Result; the worker mirror deep-freezes whole-value loads; Result and Option come from a new kernel result. New entry 11 (result replaces the plain Result) after 10; 2 now waits on 11, takes the new terms and is rebuilt from main, its first build closed unmerged as the baseline it is compared against. 4 and 7 take the new names. R2's wording names the design store; what is required is unchanged.
- Decision (2026-11-03, replan): new entry 12 (the code follows AGENTS.md's rules) after 2, and 3 waits on it, so the lint guards every story after the rebuild of 2 instead of arriving with the Refactor sweep (9). Rejected: folding it into 9, which would leave 3 to 8 checked by prose only.
- Decision (2026-11-05, replan): the spine settled 23.3's unknown and the questions it raised (020596c, memlog Q1-Q24): the bundle lives in one Committed value, newDesign is an action through replaceDesign, commands and actions become di classes, load failures are a LoadError, broken derived files are emptied with one load flow and a reset point, and acceptDerivedFiles emits an accept event. What R1-R3 require is unchanged; delivery changed. New entry 15 (commands and actions become di classes) after 13, and 3 waits on it; 15 ships the whole entry mechanism and 3 adds only NewDesign. 3 also takes the routing and fingerprints schemas, readers and writers, so its round-trip covers the bundle. Its generic checks run over every registered entry that writes the design, NewDesign first. 5 takes the accept event, autosave on it, the load flow and the reset point. 7 opens a new design on any load failure at launch, leaving the stored one untouched. Sources: reviews/review-reconcile-tickets-23-3-2026-11-05.md in the spine's folder.
- Decision (2026-11-05, replan after the spine-gap sweep, spine-gap-sweep-2026-11-05.md): 23.4–23.8 re-rendered to the sweep's settled answers (B1–B4, C2–C4, D1–D6); 23.16 added after 23.3 for A8's input copy and E10's design parse, since neither the merged 23.15 nor 23.3 (PR #16) builds them; 23.5 now defines listDesigns' order (moved from 16.2); 23.4's focus defaults to layout until 23.7 passes the URL's workspace. 23.3 untouched: built. Rejected: folding A8 and E10 into 13.2.
