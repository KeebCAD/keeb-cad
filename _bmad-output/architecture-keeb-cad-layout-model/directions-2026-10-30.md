---
name: 'keeb-cad: approach directions, 2026-10-30'
type: directions-record
status: proposed
created: '2026-10-30'
origin: 'party-mode session, 2026-10-30 (room: Winston, Amelia, Sally, Mary, John, Sofia, Smithy; guest Priya)'
affects: [AD-3, AD-5, AD-10 (open question only), AD-16, AD-18]
next: 'bmad-architecture folds these into the spine as ADs; until then the spine banner points here'
---

# Approach directions, 2026-10-30

These are **directions** that Sergii decided in a party session. They aren't spine rules yet. Each one says *what* was chosen and *why*. The precise rules belong to `bmad-architecture`, when it folds them into `architecture-keeb-cad-layout-model.md`. Anything listed under **Open** was raised but not decided. (D1 was recorded as decided at first and moved to Open the same day: only the rejection of "two worlds" was decided.) Treat it as undecided, even where the room leaned one way.

**Why this record exists:** the session started from "do we need more code-architecture decisions before coding?" The answer was **yes, but mostly not the ones expected**. The biggest gap was in the domain model. The physical body (outline, plates, case) had been taken over from Ergogen and general CAD without a first-principles pass.

## Decided

### D2. Two storage shapes, capped
- **Direction:** the **layout is a tree** (containment). **Every other section is a list of items with ids.** The case graph counts as a list. A third shape needs its own decision.
- **Why:** containment is how people think about a layout. Cross-tree anchors are rare there: 1 to 5 per board in the paper test, though every board had one, at the thumbs. Other sections are naturally references to keys. Capping the number of shapes avoids "several ways to do the same thing", which was Sergii's Ergogen complaint.

### D3. References are declared in the schema
- **Direction:** a reference is its **own declared kind** in the schema, never a string that happens to contain an id.
- **Why:** with this, "who points at X", cascade delete, dangling-reference checks and undo can all work generically, and a new section can't forget its references.
- **Open:** search on demand vs a derived index. This is cheap and reversible.

### D4. The physical body is a composition of pieces
- **Direction:** the body outline is a **composition of pieces**:
  - **derived** pieces (the fit of a group of keys, or of parts plus a margin), which follow the layout;
  - **drawn** pieces (a custom silhouette or bridge), which stay put and are checked against fit.
  
  **Accents** go on top (rounded corners, cut arcs). **Plates and the case derive from the composition.** **Fit is a constraint region** (keys, part envelopes and margin), so a key or part that sticks out is a violation. The default for first-timers is one fitted piece per group, joined automatically.
- **Why:** the user writes **intent**, not construction. Keys come first: nobody makes the keys uncomfortable to get a shape. Ergogen itself composes outlines (Corney's plate outline is the matrix outline plus an MCU polygon). The missing idea was **derived pieces**.
- **Replaces:** AD-16's "every primitive and vertex is anchored" as the main authoring path. Drawn, anchored pieces remain as the fallback.
- **Milestone 1:** the acceptance test should check **the same shape within ±0.05 mm**, not "the same vertices". Corney's exact outline can be a drawn piece if a derived one can't match it.

### D5. Build style is a live setting
- **Direction:** the build style (tray, sandwich, integrated, plateless) is a **setting that can be switched at any time**. The layers are re-derived. Manufacturing is chosen later, as a mapping from layers to files at export.
- **Why:** switching style cheaply addresses the forge's finding that the real pain is **fear of committing**.
- **Replaces:** AD-18's "a template is inserted once".

### D6. A style is the app's own recipe; your operations are a second recipe
- **Direction:** a style is an **operation recipe** owned by the app and **re-run on every change**. You see only its settings. Your own operations are **a second recipe that you own**, stored in the design and applied after the style's. For example, the tray is derived from the outline, part envelopes, case cutouts and screw parts, plus settings for wall, floor, gap and lip.

### D7. Recipes stay live
- **Direction:** applied recipes, whether a whole case or a partial one, stay as **live items with their own settings** and are re-run on every change. They are **never expanded** into raw operations. The library offers partial recipes too: magnet pockets, feet pockets, a tenting mount, a battery bay, an MCU cover, a honeycomb floor, a palm rest, a tent wedge.

### D8. Recipes are data, run by one interpreter
- **Direction:** a recipe is a **description** (operations plus settings), run by **one interpreter**, and **versioned and pinned like catalogue parts** (AD-5). Upgrading is a deliberate action.
- **Why:** pinning recipes written as code would mean shipping old code forever, and bug fixes couldn't reach old designs. As data, recipes are cheap to version and can be shared later.
- **Watch:** the interpreter is a small language that users will depend on. Scope it from evidence (see R1).

### D9. Your operations and library recipes are one concept; chaining is supported
- **Direction:** your own operations are an **unnamed recipe** in the design. A library recipe is the same thing with a name, settings and a version. "Save as recipe" turns one into the other. Operations can chain, because the tray recipe itself chains.

### D10. Operations attach through AD-3 anchors, extended with recipe spots
- **Direction:** case operations attach through the **existing anchor rule** (AD-3). An anchor can be a key, a group, a part, or a **named spot that a recipe declares** (`floor`, `wall-outer`, corners, `usb-side`). There is still one placement rule in the whole design.
- **Why:** attaching to raw derived faces is CAD's topological naming problem.

### D11. Tenting is recipes and parts
- **Direction:** tenting has no special mechanism.
  - **Built-in** tenting is a wedge recipe with an angle setting.
  - **Accessory** tenting is a stand or legs part with its own angle, plus a mount recipe.
- **Why:** in R1, 18 of 38 designs used accessories, 7 had built-in tenting, and built-in wedges were often published as fixed-angle STL variants (one design shipped 15 files).
- **Rejected:** a view-only tilt, because it would be hidden state outside the design. Every setting is already previewed live.

## Open, raised but not decided

| Item | Notes |
| --- | --- |
| **How the design lives in memory (was D1, moved here 2026-10-30)** | **Rejected:** two worlds with a boundary (an immutable core plus a reactive UI), because a split brain is hard to reason about. **Undecided:** what the one world is. Raised but not chosen: Vue's reactivity engine in the core (would mean amending AD-10's "no UI framework in the core"), plain data only at three doors (workers, file, undo), commands as the only writers (already AD-2), enforcement by a lint or dependency-cruiser rule. Risks raised: "why did this recompute?" debugging for agents, and tying the core to Vue's engine. A time-boxed spike was suggested as a way to get evidence. |
| Invalid states | Proposed: "structure is always valid, problems with meaning get flagged", and "refuse and show what depends on it" when deleting something that's referenced. The spine is already mixed (AD-2 refuses some deletes; anchor-cycle, construction-undefined, shape-failed and unresolvable-reference are flagged). With D3, `unresolvable-reference` could apply to every reference. |
| Search vs index for "who points at X" | Cheap and reversible |
| Common recipe spot names | A shared set every style declares, so attachments survive a style switch |
| Ban on attaching to raw derived faces | Implied by D10, not stated |
| Tent angle as a design-wide parameter (AD-17) | For when other recipes (the palm rest) need to read it |
| Recipe interpreter scope | Starting point: add, subtract, offset, tilt, round/chamfer edges, patterns |
| Library content as one concept | Parts, recipes and blocks (AD-9) share versioning, upgrade and provenance |
| Joining fitted pieces | The gap between the main keys and the thumbs: filled or not |
| Reproducing Corney from derived pieces | Check before changing AD-16. Fallback: a drawn piece |
| Outline-from-keys primitive | It can't be a convex hull, which would lose the stagger steps. Probably padded key cells joined |
| Design rules (AD-20) | Intent is "a fab-house preset" (e.g. JLCPCB), with the numbers as overrides |
| Rest of code style | Where behaviour lives, how derived values are divided up, the undo mechanism |
| Order, truth, teaching | Walking skeleton vs layered epics. Golden fixtures vs unit tests. Exemplar code vs docs for agents |

## Evidence

### R1. Published custom cases (38 designs)
A web survey, mostly Printables, plus GitHub split-board repos and a scan of `topic:ergogen` repos.

**Shapes:**
- 66% fully **flat** (a 2D shape plus depth).
- 32% **tilted flat planes**: wedges, sloped palm rests (~7°), faceted walls, angled stands.
- 1 **sculpted** design: a Cosmos keywell, which is a 3D layout and out of category.

No confirmed sculpted case on a flat-layout board.

**Common flat features:** screw bosses and inserts, feet pockets, port cutouts, magnet pockets, battery bays, honeycomb or voronoi floors, MCU/OLED covers, rounded edges.

**Tenting:** 18 accessory, 12 none, 7 integrated.

**Caveats:**
- Published designs over-represent people who can model a case. Stock FR4 sandwiches would push "flat" higher.
- Reddit was blocked. Thingiverse and MakerWorld were barely sampled.
- Some designs were judged from a single photo. About two-thirds publish only STL files, so the tool used is unknown.

### R2. Intent-vs-construction pass over the spine
The question for each area: does the user write *what they want*, or *how to build it*?

| Verdict | Areas |
| --- | --- |
| **Fail** | Shapes (AD-16), case (AD-18) |
| **Borderline** | Plates (built on shapes), design rules (AD-20) |
| **Pass** | Layout, parts, sides, parameters, PCB placement, netlist and matrix, routing, keymap, firmware |

The failures form one cluster: the physical body.

This was a one-minute-per-area pass. A pass means "no obvious problem", not "proven".

## Process notes
- **Sergii's experience isn't evidence about users.** Questions about how often something happens need outside evidence, or a reversible choice. Several directions above combine a principle (solid on its own) with a frequency assumption. Recheck the assumptions before treating them as facts.
- **A direction isn't a decision.** Only what is listed under **Decided** was confirmed. Items bundled into a question and not explicitly answered stay **Open**.
