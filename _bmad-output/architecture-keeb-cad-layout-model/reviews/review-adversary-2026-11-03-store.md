# Adversary review: design store / DesignPatcher / checkStructure amendment (2026-11-03)

Spine: architecture-keeb-cad-layout-model.md (line numbers are the working-tree file). Lens: two units that obey every AD to the letter yet build incompatibly.

Verdict: the merge is mostly consistent, but 2 findings let two compliant units diverge (DesignPatcher's home vs the worker fence; checkInputs vs the new Result rule), and 3 more are real ambiguities (store surface, derived-file owner, leftover "register" wording).

## F1 (high) DesignPatcher's file location is unspecified, and the obvious placement breaks the model worker's fence
Lines 203, 328, 656, 1050-1053.
- Line 203: "`design`'s main module and `design/worker`'s module each register it". Nothing says where the class is defined. Unit A puts `DesignPatcher` in the design root (next to the store; the line-328 and tree lists put it there first). Unit B's `design/worker` imports it from the root. Both obey the text.
- Result: `design/worker` -> design root -> `DesignStore`, `model/main`, `library`. `pipeline` (line 337) may import "`design` (only `design/worker`)" and "`model` (its root only, never `model/main`)". The entry fence for the model worker (line 662) then reaches `model/main` and the store through the mirror. The per-package rule passes (pipeline imports only `design/worker`); the transitive reach is what the amendment created. A depcruiser run on the model worker entry either fails (if Unit B is strict) or the main-thread store ships into the worker.
- Line 656 lists `design/worker` as "the mirror and its writer" and never names the DesignPatcher module, nor says the model worker's entry adds `design/worker`'s module (it says only that `main.ts` adds `commands`' modules). AD-25 does allow `design/worker` to export a di module (line 656: every package with services exports modules from the subpath of the thread it serves; `design` is named with `design/worker`), and AD-10 allows the entry to import it (line 662). The gap is only which file holds the class and who loads the module.
Fix wording, append to line 203 after "so both threads use one configuration.":
> `DesignPatcher` is defined in its own file inside `design` that imports only `immer` and `schema` types; `design/worker` imports that file and never the design root, and the design root's main module and `design/worker`'s module each register the same class. The model worker's entry adds `design/worker`'s module (AD-25); the store, `model/main` and `library` are never in its graph.
And in line 656 change "`design` has its main root and `design/worker` (the mirror and its writer)" to "`design` has its main root (the store, `DesignPatcher`) and `design/worker` (the mirror, its writer and `DesignPatcher`'s worker registration)".

## F2 (high) `checkInputs` still returns `Rejection | void` while the new rule says every expected failure is a `Result`
Lines 203 vs 327.
- Line 203 (new): "Every function that can fail in an expected way returns a `Result<T, E>` ... the apply step alone stays `void | Rejection`". Line 327 (unchanged tail): "`checkInputs(design, declarations, input) → Rejection | void`", called by the store beside `checkStructure`, which now returns `Result<void, Rejection>`.
- Unit A (store) writes `const r = checkInputs(...); if (r) return err(r)`; Unit B (model/main, per the new blanket rule) returns `Result<void, Rejection>`. A truthy `ok` object is then treated as a rejection, so every command is refused. Neither unit breaks a written rule: the carve-out names only the apply step.
Fix wording, line 327: replace "`checkInputs(design, declarations, input) → Rejection | void`" with "`checkInputs(design, declarations, input) → Result<void, Rejection>`", and in line 203 change "the apply step alone stays `void | Rejection`" to "the apply step alone stays `void | Rejection`, and `reject(...)` returns a bare `Rejection`". Also add `checkStructure` beside `checkInputs` in line 327 ("`model/main` (domain operations and queries, `checkInputs` and `checkStructure` among them)") and in the package tree (line ~1046 "queries (checkInputs among them)"); today `checkStructure` appears in no model/main inventory, so the symbol has no declared home or signature, only the Data Schema "structural-check hook".

## F3 (medium) The store's surface and the `replaceDesign` write path are not pinned: two owners of one write path are possible
Lines 199, 202, 328.
- Line 199: the store is the only writer, with two ways to write: commands and `replaceDesign`; but then "`replaceDesign` lives in `design`" and line 202/328 list `replaceDesign` as a separate item beside the store. Unit A: `replaceDesign` is a store method. Unit B: a standalone di service/function that needs the `Committed` shallowRef, so the store must expose a setter or the raw ref, which breaks "no other service writes the design". Nothing says how consumers (`workers`, `editor`, availability checks, `commands`' tests) read it: `ReadonlyRef<Committed>` (the `schema` type exists, line 718) or the shallowRef itself; the second lets any package assign `.value`.
- The commit event emitter, undo and redo are likewise assigned to the store (glossary 126) but line 149 lists "the design store, the seq and undo" as separate items.
Fix wording, replace the sentence "It is also the register (below), so every write goes through one service and no other service writes the design." with:
> It is also the registry of commands and actions (below). `run`, `undo`, `redo` and `replaceDesign` are methods of `DesignStore`; it exposes the current `Committed` only as a `ReadonlyRef<Frozen<Committed>>` and the commit event only as a subscription; no other class holds the `shallowRef` or assigns it.
And in line 149 change "the design store, the seq and undo" to "the design store (seq and undo included)".

## F4 (medium) Who holds the derived files (routing, fingerprints) is not decided by the merge
Lines 199, 202, 1050, 1186.
- `Committed` is design + seq + revision. But the tree (1050) says `design` holds "the latest accepted routing and fingerprints files (acceptDerivedFiles, emptyDerivedFiles)", undo "restores the routing file with the design" (line 204), and line 202 describes the store as holding "the design state and its bundle". Unit A: the store holds the files and `acceptDerivedFiles` is a store method; Unit B: a second `design` service (`DerivedFiles`) with its own ref, which undo must write to, i.e. two writers of the bundle that the "only writer" sentence says cannot exist. Open Questions 1186 shows this seam is already live, and the merge makes "one service" a claim the text cannot back.
Fix wording, after the `Committed` sentence in line 199:
> The latest accepted routing and fingerprints files are held by the same service in a second `shallowRef` (`acceptDerivedFiles`, `emptyDerivedFiles` and the routing file an undo or redo restores are `DesignStore` methods); they are not part of `Committed`, and no other service holds them.
(or, if a separate service is intended, name it and exempt it from "only writer".)

## F5 (low) Leftover "register" wording and a second "store" reading
- Line 198 (Prevents): "two places declaring register entries"; line 199: "the register (below)"; line 202 bullet heading "**Register.**". The glossary dropped "command register", so a reader looks for a glossary term and finds none, and a unit may build a `Register`/`CommandRegister` class as the "mechanism" holder (line 202: "`design` (main) holds the mechanism").
- Line 730 "The store's own kinds carry no message" now reads as the design store but also describes rejections from `model` and `checkStructure` the store merely forwards; line 671/672 use "the store" / "the design store" / "zag's hotkey store" in the same paragraph. `storage` and "No Pinia" (974) cause no clash; the zag hotkey store is qualified, but 671's bare "not the store" is not.
- Line 154 graph node "design's store" and line 1086 "design's store" are fine but unqualified.
Fix wording: line 198 "two places declaring registry entries"; line 202 heading "**Registry.**" with its first sentence "`design` (main) holds the mechanism" becoming "The design store holds the registry and `design` the rest of the mechanism"; line 671 "not the store" -> "not the design store"; line 730 "The store's own kinds" -> "The design store's own kinds (`input-invalid`, `unavailable`, `stale`)".

## F6 (low) `DesignPatcher` has two methods but the worker and `replaceDesign` both need a whole-value deep freeze
Lines 199, 203, 421.
- `replaceDesign` calls Immer's `freeze(value, true)` directly (199); the worker's whole-design message (421: "whole design value ... at worker start") is a structured-clone copy that must also be deep-frozen to satisfy the mirror's "deep-frozen" claim, but 421 says it applies "through `DesignPatcher.apply`", which takes patches. Unit A in `design/worker` imports `freeze` itself; Unit B adds a method; line 203's "the one place that sets Immer up" then holds only for `produce`. (Immer's `freeze` needs no instance, so no fault, but the shapes diverge.)
Fix wording, line 203: "`apply(design, patches)` returns the patched, frozen design; `freeze(value)` deep-freezes a whole value (`replaceDesign` and the mirror's whole-value path use it, nobody calls Immer's `freeze` directly)." and in line 199 replace "deep-freezes the result with Immer's `freeze(value, true)`" with "deep-freezes the result with `DesignPatcher.freeze`".

## Checked, no finding
- AD-25 and AD-10 permit `design/worker` to have a di module and the model worker entry to build it (lines 656, 662, 372); the only gap is F1.
- "store" elsewhere: `storage` (a separate package, "stored" prose), Pinia (explicitly none), zag hotkey store (qualified at 672). Only 671 and 730 are loose (F5).
- `Committed` and `Changed` are `design`-internal types, so the Data Schema policy (shared kinds only after the spine defines them) is not triggered; `Rejection` and `Result` are in `schema` (lines 724, 716-ish). Note `Changed` carries Immer `Patch`; Open Questions line 1182 already tracks that.
- glossary entries 124-126, `seq` (133) and AD-2's stale rule agree with the store.
