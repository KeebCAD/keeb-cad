---
type: review
lens: reconcile (fold of 2026-10-30 records into the spine)
target: _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md (working tree, uncommitted, updated 2026-10-30)
against:
  - _bmad-output/architecture-keeb-cad-layout-model/directions-2026-10-30.md
  - _bmad-output/architecture-keeb-cad-layout-model/code-decisions-list-2026-10-30.md
  - _bmad-output/architecture-keeb-cad-layout-model/.memlog.md (entries dated 2026-10-30, lines 142-159)
created: '2026-10-30'
---

# Reconcile review: the 2026-10-30 fold

**Verdict: mostly faithful, needs fixes before final.** Nearly every Decided line landed in an AD or a convention, and most Open lines are in Open Questions. There are four real problems:

- one Decided item is missing (12, vertical slices);
- one Open item is stated as a rule (AD-3, the ban on attaching to raw faces);
- one Not decided item is missing from Open Questions (item 10, clipper2 arcs vs `Drawing.offset`);
- the package count in AD-25 doesn't match the spine itself.

There are also a few weakened lines and leftover terms.

## 1. Decided lines: where each one landed

| Record line | Landed in | Status |
| --- | --- | --- |
| D2 two storage shapes, capped | AD-23; AD-8 (sections in one of two shapes); AD-16 (pieces in list shape); AD-18 (case is a list) | OK |
| D3 references are a declared kind | AD-24; glossary *reference* | OK |
| D4 body = composition of pieces | AD-16; glossary *piece / derived / drawn / accent / fit*; Fixtures (same shape ±0.05 mm) | **Weakened**, see 1a |
| D5 build style is a live setting | AD-18 first bullet; AD-2 `setBuildStyle`; AD-18 Prevents (fear of committing) | OK |
| D6 style is the app's recipe; yours is a second recipe | AD-18 ordered list; glossary *build style* | **Weakened**, see 1b |
| D7 recipes stay live, never expanded | AD-18; Seed `library` (partial recipes) | OK |
| D8 recipes are data, one interpreter, pinned like parts | AD-5 Recipes bullet; AD-18 "A recipe is data", "One interpreter" | OK. The "Watch" note is dropped, see 4 |
| D9 unnamed recipe, save as recipe, chaining | AD-18 second bullet ("may use the named pieces and spots of those before it") | OK |
| D10 attach through AD-3 anchors, plus spots | AD-3 (spot, part as anchor); glossary *spot*, *anchor*; AD-18 | OK, but overreaches, see 2a |
| D11 tenting is recipes and parts; no view-only tilt | AD-18 Tenting bullet and Prevents | OK |
| A wiring with ts-inject; singletons and hand factories rejected | AD-25 | OK |
| A folders by concept | AD-25; Monorepo convention | OK |
| 1 one reactive graph; Vue reactivity directly; one re-export file | Paradigm; frontmatter `paradigm`; AD-10 | **Slightly weakened**: "with no interface of our own" isn't stated. A re-export implies it, but nothing stops a later wrapper layer. See 1c |
| 2 one rule, one crossing | AD-11 "The crossing"; glossary *crossing* | OK. "function pair" is new, see 3 |
| 2 refs hold plain values that commands replace; an established library | AD-2 Writing | OK |
| 2 patches "to be considered" | Open Questions (update library row, "whether its patches are used") | OK |
| 3 compile-time read-only types | AD-2 Writing | OK |
| 4 text trace (whyAmIRunning) plus must-not-recompute checks, no counts | Recompute debugging convention; Verification layer 7 | OK |
| 5 undo = before/after per touched record between marks; patches on demand | AD-2 Undo | OK |
| 6 edit goes through, break flagged, fix offered without blocking | AD-2 Breaks; Violations convention (`fixes`); glossary *fix* | OK |
| 6 note: a dangling recipe spot after a style switch is flagged, not refused | AD-2 Breaks, last sentence | OK |
| 7 one on-demand search for who-points-at | AD-24 | OK |
| 8 small computeds, no single `resolve` | AD-10; glossary *resolved design*; every `model.resolve` removed | OK |
| 9 commands are registered entries | AD-2 Command register; glossary *command register* | OK ("UI" became "menus", per memlog) |
| 9 the split (pure functions vs ts-inject services; no hand-passed state) | AD-25 | OK |
| 9 note: no methods on data | AD-25 third bullet | OK |
| 10 recipe inside uses the D4 named-pieces model | AD-16 first bullet; AD-18 "A recipe is data" | OK |
| 10 closed operation set, no foreign code, easy to add an operation | AD-18 "One interpreter" | OK |
| 10 case worker caches per named piece | AD-18; Seed `case/` | OK |
| 11 keep the packages; closed surface through `exports` | AD-25 last bullet | **Inconsistent count**, see 1d |
| 12 vertical slices named by capability (walking skeleton, layered and short skeleton rejected) | **Nowhere** | **Missing**, see 1e |
| 12 note (Corney as layout-command scripts, no importer, no hand-written file) | Fixtures convention; Seed `fixtures/` | OK |
| 13 layered verification (8 layers); golden only at milestone acceptance | Verification convention; Fixtures (layer 8) | OK |
| 13 agents don't edit oracles, invariants, golden files | Agents convention | OK |
| 14 enforce first, then real code; short AGENTS.md; one rules file for both reviewers | Agents convention | OK |
| Memlog: AD-2 registration via `appendValue('commands', …)`, duplicates refused at startup and by a test | AD-2 Command register | OK |
| Memlog: AD-10/AD-11 amendments (only `editor` imports `vue`; crossing in `model`; shallow ref) | AD-10, AD-11 | OK |
| Memlog: "piece" replaces "shape" everywhere | Glossary, AD-8, AD-16, Violations | **Mostly**: leftovers, see 4 |
| Memlog: AD-18 keeps clipper2 case offsets and the corner table | AD-18 | OK as kept. Its open alternative is missing, see 2b |

### 1a. D4: derived pieces as the main path is lost
D4 *replaces* "every primitive and vertex is anchored" as the **main** authoring path, and keeps drawn anchored pieces as the **fallback**. AD-16 now presents derived and drawn as equal options ("A piece is derived … or drawn …"). The only signal of priority is the first-timer default and the Prevents clause ("the user writing construction instead of intent"). Suggested fix: add one clause to AD-16, "derived pieces are the main authoring path; drawn pieces are the fallback".

D4's "plates **and the case** derive from the composition" also lands only for plates and the board edge. In AD-18, recipes "may use named pieces", but nothing says the style recipe derives from the outline composition. The tray example in D6 says it does.

### 1b. D6: "you see only its settings" is dropped
D6 says the user sees only the style recipe's settings, not its operations. AD-18 says applied recipes are "live items with their own settings", but it doesn't say the style's internals are hidden or read-only to the user. That is a binding UX and ownership constraint: the app owns the style recipe. Without it, an editor could expose the style's operations for editing, which would reintroduce "expanded". Suggested fix: "The style recipe is app-owned: the user sees and edits only its settings."

### 1c. Item 1: "no interface of our own"
The Decided wording is "Vue's reactivity API directly, **with no interface of our own**". AD-10 says "imported only through one re-export file". Suggested fix: add "a plain re-export, no wrapper or abstraction of our own".

### 1d. Item 11: "the 11 packages of AD-10" doesn't match AD-10 ☝️
AD-10's graph and the Structural Seed list **12** packages under `packages/` (model, plates, pcb, routing, drc, case, firmware, exports, pipeline, storage, library, viewer3d), plus `editor` in `app/`. The repo today has 11 directories under `packages/`, with no `viewer3d` yet. So the record's "11" counts the current repo, and AD-25's "The 11 packages of AD-10" contradicts AD-10 itself. Read literally, it could also be taken to forbid `viewer3d`, which AD-22 needs. Suggested fix: "The packages of AD-10 stay as listed", or name the count correctly and note that `viewer3d` is not created yet. Confirm with Sergii which one he meant.

### 1e. Item 12 is missing
"Vertical slices named by capability" is a Decided line. The record's frontmatter `next:` says the epics are re-sliced as vertical slices. The spine uses "slice" in Verification (layers 5 and 6), Agents ("from the first slice") and Open Questions (slice list). It never states the rule, and never records that the walking skeleton, layered order and short skeleton were rejected. You could argue this is a planning decision rather than an architecture one, but the fold rule says every Decided line becomes a rule. Suggested home: a Consistency Conventions row "Order", or the Verification row: "Work is cut into vertical slices named by capability. A walking skeleton and a layered order were rejected."

## 2. Open and Not decided lines

All of these are present in Open Questions: item A (all three); 1 (Vue 3.5 vs 3.6); 2 (library, patches); 3 (deep readonly, depcruise fence, freezing); 6 (suggest vs auto-apply, world position vs expression links, refusals; spot names in their own row); 7 (cache as a computed); 9 (registers for list pickers); 10 (verb list, tilt, 3D edges through spots, restart policy); 12 (slice list, Corney per slice); 14 (rules-file editors, pitfalls loop); memlog (runtime schema for command inputs; `fit-violated` severity; which styles M1 ships). From the directions record: joining fitted pieces, the outline-from-keys primitive, reproducing Corney, common spot names, raw-face ban, tent angle, library content as one concept, design-rules preset, interpreter scope (as the verb list). The record's D1, "search vs index", "rest of code style" and "order, truth, teaching" rows were closed by items 1, 7, 5/8/9 and 12/13/14. That is correct.

### 2a. The raw-face ban (Open) is stated as a rule in AD-3
The directions record lists "Ban on attaching to raw derived faces: implied by D10, not stated" as **Open**, and item 10 lists "3D edges reachable only through declared spots" as **Not decided**. Open Questions carries both, but AD-3 states them as rules:

- AD-3 Rule: "A **spot** … This is **the only way** a recipe operation attaches to something a recipe built."
- AD-3 Prevents: "recipe operations attached to generated faces (topological naming)."

Together these are the ban, and they also settle "edges only through spots". The spine contradicts its own Open Questions row (line 611). Suggested fix: keep "spots are possible anchors", drop "This is the only way …", and move the Prevents clause to the Open row. Alternatively, ask Sergii to decide the ban and then remove the Open row. D10's "one placement rule" is decided. Exclusivity over generated geometry is not.

### 2b. Item 10's "clipper2 (as arcs) vs replicad `Drawing.offset`" is missing
This line is Not decided in item 10. The memlog says AD-18's 2026-10-28 clipper2 rule stands because item 10 didn't re-decide it. Keeping the old rule is legitimate, but the open alternative still has to be listed. It is in neither Open Questions nor the memlog's open list. The Deferred row "exact-arc case walls" covers it only in part. Suggested fix: add a row "Case 2D offsets as clipper2 arcs vs replicad `Drawing.offset` (clipper measured better: rebuild 485 ms, within 0.003 mm; `Drawing.offset` leaks ~4 MB/call); AD-18 keeps the 2026-10-28 rule meanwhile". Touches AD-18; revisit at the first tray-case story.

### 2c. Minor
- Directions "Invalid states": the proposed "refuse and show what depends on it" is folded into the Open row only as "whether AD-2's refusals … become flagged breaks". That is acceptable.
- The D8 "Watch" note (scope the interpreter from evidence, R1) isn't attached to the verb-list row. Adding "(scope from evidence, R1)" would keep it.

## 3. Rules not supported by the records or memlog

Nothing major. These go beyond the source text:

- **Glossary *crossing*: "The one function pair in `model`".** The records and memlog say "one crossing … in `model`". "Function pair" fixes a shape (one out, one in) that nobody decided. Harmless, but it's an invented constraint. Use "The one crossing in `model` …".
- **AD-11: "A body's id is the id of the named piece whose result it is."** The old rule said "case operation". The new mapping follows from caching per named piece, but no record says every body corresponds to one named piece, or that intermediate pieces aren't bodies. Mark it as a derived wording, or ask.
- **AD-18: recipe settings "whose values are literals or expressions (AD-17)".** This follows from AD-17's rule for length and angle properties, but settings can be non-length (style enum, booleans). It's a stretch of AD-17, not a new decision. Say "length and angle settings".
- **AD-10: "a live stage's function is wrapped in a computed through `model`'s re-export".** Who wraps it isn't decided. Memlog rejected only "re-export private to `model` with stages as plain functions". This wording risks reading as that rejected option, with stages as plain functions wrapped somewhere. Make clear the computed is part of the graph, and say which package defines it, or list that as open.

Supported, though they look new: `setBuildStyle`, `applyRecipe`, "No import-time self-registration", recipes pinned in `catalogue-refs`, `fit-violated` owned by `model`, "part" as an anchor (D10), the AD-14 "golden" test renamed "invariant" (item 13), "every stage has golden-file tests" removed (item 13).

## 4. Quiet requirements dropped

- **"Internal: key positions within 0.01 mm of Ergogen"** (old Testing convention) is gone. Item 13 limits golden checks to milestone acceptance, which may be why. But no record dropped this tighter internal tolerance, and Fixtures now says only ±0.05 mm. Confirm whether 0.01 mm survives as a layer-4 or layer-5 check, or was deliberately dropped.
- **D6 "you see only its settings"** (1b), **D4 main path / fallback** (1a), and **item 1 "no interface of our own"** (1c) each carry a binding meaning that is now only implied.
- **"piece" as the only term.** Memlog rejected "keeping 'shape' beside 'piece'", and the glossary forbids synonyms. Leftovers:
  - AD-22 names the workspace "**Shapes**" (line 457);
  - the glossary *key cell* is "A key **template**" (memlog removed "template");
  - Fixtures uses "same shape" in its geometric sense (acceptable).

  The workspace name probably comes from the UX spines, so either rename it or note that it is a UX label pending a UX update.
- **Old AD-10: "`model` … suffixes clashing parameter names"** went with `insertTemplate`. That's correct if recipes carry settings rather than adding parameters. But "tent angle as a design-wide parameter" is open, so watch for name clashes if recipes ever add parameters.
- **Item 13, Sergii's framing:** "fixtures validate end results, not as an ongoing marker; unit tests alone are not enough". This is carried by the layer order and "(5) … the ongoing marker". OK.
- **Process note "a direction isn't a decision" and "Sergii's experience isn't evidence":** reflected in the Open Questions preamble ("None is a rule", "Spike marks a question of fact"). OK.

📐 **Angle not covered by the fold rules.** AD-2 now says "an edit that breaks something goes through", yet AD-2, AD-3 and AD-19 keep three hard refusals. AD-2's removal bullet does say "Whether these refusals become flagged breaks is an open question", but the Breaks bullet itself reads as universal. AD-3's cycle rejection gets no such note in AD-3. A pointer in the Breaks bullet ("except the refusals below and AD-3's cycle rejection, pending Open Questions") would make the exception visible where the rule is.
