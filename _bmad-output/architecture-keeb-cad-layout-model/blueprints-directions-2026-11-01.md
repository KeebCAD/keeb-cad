---
name: 'keeb-cad: blueprints (the recipe concept, rebuilt), 2026-11-01'
type: directions-record
status: approved as a whole by Sergii, 2026-11-01
created: '2026-11-01'
origin: 'party-mode session, 2026-11-01 (room: Winston, Amelia, Sally, Mary, John, Sofia, Smithy; walk-ons Grumbal, Boundary, Level, Splinter; guest Priya as the running user)'
affects: [glossary, AD-2, AD-3, AD-5, AD-6, AD-9, AD-10, AD-11, AD-16, AD-17, AD-18, Data Schema, Open Questions]
updated: '2026-11-01'
next: 'approved; bmad-architecture folds it into architecture-keeb-cad-layout-model.md'
---

# Blueprints, 2026-11-01

These are **directions** that Sergii decided in a party session, one question at a time. They aren't spine rules yet, and the spine is untouched. This record puts them together as one concept so they can be reviewed **as a whole** before anything is folded in.

Each item says what was chosen and why. Items marked *(follows)* weren't asked on their own; they follow from a decision that was. Check them especially carefully.

**Why the session happened:** recipes had become central (keys, styles, case additions) without ever being thought through. Seven items were parked for this party, and story 13.2 was blocked on it. Sergii asked to start from the ground up and arrive at **one cohesive concept**, refined fully now even where the code comes later.

## Terms

| Term | Meaning | Replaces |
|---|---|---|
| **blueprint** | A versioned definition with declared inputs, one or more lanes, private internals and role-tagged outputs. It stays live and is never expanded | recipe |
| **lane** | The part of a blueprint that runs in one stage | — (the session's working word was "facet") |
| **role** | A tag on an output (`cutout`, `mount`, `display`, …) that consumers pull by | — |
| **alteration** | Anything the design adds on top of a named output of a blueprint: finishing, cutouts, engravings | accent (grown) |
| **build** | The design's one ordered list of blueprints applied once (styles and additions) | the `case` section's list |
| **entry** | One item of `build`: a blueprint plus its input values | recipe application |
| **shape** | A named 2D geometry, derived or drawn, that resolves to regions (meaning unchanged) | piece |
| **block** | A reusable design fragment that is copied in, owned and updated by a three-way merge (AD-9). Not a blueprint | — (was a placeholder for this concept; now kept for AD-9's meaning) |

## Decided

### B1. One concept: the blueprint
- **Direction:** keys, build styles, case additions (wedge, underglow, magnets) and the design's own work are all blueprints, or have the blueprint's shape. A blueprint has declared inputs, **one or more lanes**, private internals and **role-tagged outputs**. It is versioned and pinned in `library-versions`, stays live, and is never expanded into raw operations.
- **Two ways to use one:** **per slot** (a part blueprint, through the `parts` section and `slot.part`) or **once** (an entry in `build`).
- **Why:** three of the four former recipe kinds already shared this interface (AD-18). The part recipe had the name and almost none of the substance. One concept removes the gap.
- **Considered and rejected:** a separate "bundle" concept grouping single-stage recipes; "everything is operations in one interpreter".
- **No declared identity (added in review, Sergii's catches):** a blueprint doesn't declare *what it is*. It produces role-tagged outputs, and that's all. A blueprint that produces `case-body` **acts as** the build style. A "contract" that told producers what to deliver was considered and dropped as push thinking (see B3, cardinality).

### B2. Stages and lanes: a kind is a pipeline position
- **Direction:** a blueprint's lanes run in stages, in this order:

  ```
  parts → (layout) → shapes → extras → [netlist] → plates · pcb · firmware → case
  ```

  - `parts`: part blueprints turn inputs into parts, before the layout uses them;
  - (layout): the authored ground, not a lane;
  - `shapes`: the outline and other shapes are evaluated into regions;
  - `extras`: blueprints add parts outside slots (underglow LEDs, standoffs);
  - then the netlist;
  - then `plates`, `pcb` and `firmware`;
  - `case` last.
- A lane **reads only what is upstream** of its stage and **produces only its own outputs** there.
- **No lanes in routing or DRC.** Routing reads ready-made tracks from `pcb`, and DRC only checks.
- **Why:** `model` was holding too much at once (Sergii's catch). Named stages make two rules fall out of the order instead of being special:
  - *(follows)* a part blueprint reads only its inputs, because `parts` comes before the layout;
  - *(follows)* the outline never fits around parts placed in `extras`, which comes after `shapes`. Anything sticking out is `fit-violated`.
- **Firmware lane:** underglow produces its ZMK config itself, and the firmware stage pulls it.
- **Components with pins** (anything in the netlist) come only from `parts` and `extras` lanes.
- **Declared nets (added in review, Sergii's version):** a blueprint that places parts **declares the nets between them** explicitly, for example `led1.dout ↔ led2.din`. `model` includes those nets in the one netlist, the same way it includes a part's ready-made tracks. Nothing is inferred from roles or order, and AD-14 holds because `model` still owns the netlist.
- **Joining nets it doesn't own:** a blueprint names a **pin role**, not a specific part or pin. For example, `led1.din` joins the pin with role `led-data` (exactly one in the design), and `vcc` and `gnd` join by role. Zero or several matches is a violation. A controller swap therefore keeps the wiring.
- **New named flow `pcb → case`** (AD-10). A sandwich stacks the PCB, and a plateless case holds it by its edge.
- **Ready-made tracks** (a part's fixed tracks, underglow's data line) are `pcb` outputs, and routing reads them through `pcb → routing`.

### B3. Pull, never push
- **Direction:** a blueprint never changes a body another blueprint owns. Its outputs carry **roles**, and **the owner of a body pulls** the roles it consumes. For example, the tray pulls every `cutout` into its bottom (underglow's channel) and every `mount` into its floor (the trackball's cup).
- Roles are open strings. A role that nothing consumes is a warning (stated as part of the pull option).
- **Targets (added in review):** a role-tagged output can carry a **target**: which kind of body it's meant for (`plate`, `pcb`, `case`), as AD-5's cutouts already do. Consumers pull by role and target, so a switch hole never lands in the tray floor.
- **Cardinality is the consumer's (added in review):** a consumer declares, when it pulls, which role it needs and **how many**: exactly one, at least one, or any. Zero or too many is a violation, reported by the consumer.
  - Export and the 3D view pull **exactly one** `case-body`, which is what "exactly one build style" means.
  - A slot pulls **exactly one** `rectangle` from its part (B15).
  - The tray pulls **any number** of `cutout`s.
- **The consumer places what it pulls (added in review):** pulled geometry carries its placement as a **reference the consumer resolves**: "bottom of the body", "outer wall", or a spot name, plus an offset.
  - A producer never reads the outputs of a body it contributes to, so no loop can form, and a lane stays one function.
  - An anchor input that points at a spot is passed along as such a reference.
  - A producer can't adapt to the consumer's numbers. The consumer reports a mismatch as a violation ("pocket deeper than the floor").
- A part's cup, cutouts and keep-outs are role-tagged data on the part record. The case evaluates the solids it pulls.
- **Why:** push breaks parts on a style switch (a cup anchored to `tray/floor`), and it lets library blueprints patch each other silently.
- **Follows:**
  - the `integrated` style simply doesn't declare a switch plate, so nothing ever "suppresses" another output;
  - **display models** are outputs with the role `display`, pulled only by the 3D view (Sergii's catch: no special rule needed).
- **Open dissent (Sally):** the *shape* of a cup in the case is decided by the style that pulls it, not by the part.

### B4. Alterations
- **Direction:** the design, **and only the design**, may put alterations on top of any output: rounded corners on a style's switch plate, an engraving. Library blueprints never alter each other.
- **An alteration is a consumer (added in review):** it pulls **exactly one output by role** (Priya's rounded corners pull `switch-plate`). It doesn't point at a specific entry's output, so it survives a style switch and a plate moving to another blueprint.
- Downstream stages read the **altered** result. This answers the spine's open row about whether a reference reads the accented or the base shape.
- **Build styles share output names** (`switch-plate`, `bottom-plate`, `case-body`) as roles that alterations and other consumers pull. An alteration carries over a style switch when the new style has the same name. Otherwise it dangles as an AD-2 break with fixes.
- **Note:** things a part needs (a power switch's hole, an OLED window) are **not** alterations. They are the part's role-tagged cutouts (Sergii's catches).

### B5. The build list
- **Direction:** `build` is **one list of entries** (plain entries, no new noun), each a blueprint applied once with its input values.
  - There is no separate style field: the **build style is whichever entry produces `case-body`**.
  - "Exactly one" is checked by the consumers that pull `case-body` (B3).
  - The UI shows that entry at the top, labelled "Style". That's presentation, not schema.
- **Run order isn't list order.** Inside a stage, lanes and the design's own work run in the order their **declared reads** require: a dependency graph, where a loop is a violation, as with anchors. The list's order is only what the user sees. AD-18's "the style first, exactly one" is replaced.
- **Why one list:** the UI handles finding things, so the choice is about the file. One entry per blueprint use, whatever stages it touches.

### B6. The design's own work has the blueprint's shape
- **Direction:** the design's own shapes, plates, case operations and alterations use the **same schema** as library blueprints. The file keeps its sections: they are the design's own lanes, not an entry in `build`.
- **Why:** this is AD-5's "two places, one schema" applied to the build. "Save to library" then cuts a slice instead of converting it.
- **Save to library:** one command that asks one thing. Save as a **blueprint** (others adjust it through inputs, and it stays live) or as a **block** (others take it, change it, and pull updates by merge).

### B7. Blocks stay separate
- **Direction:** a block (AD-9) is copied in, owned, and updated by a three-way merge. A blueprint is configured and kept live. They share the library's lifecycle (versions, provenance, licence) but behave differently.
- **Why:** the thumb-cluster test split them. Splaying 15° → 20° favours a blueprint (an input). Nudging one key or adding one favours a block (owned nodes). Figma and Onshape both ended up offering both kinds.

### B8. Users can make their own parts
- **Direction:** a user can write a **part blueprint in their own design**. It holds:
  - a footprint, drawn, or **imported from KiCad as a one-off conversion** into keeb-cad's part schema (the `.kicad_mod` doesn't stay attached);
  - pins and roles;
  - an envelope and 3D keep-outs;
  - role-tagged cutouts;
  - display models;
  - a `reversible` flag.

  It uses the same schema as library part blueprints, and `type: 'built'` folds into it.
- **When:** the concept is settled now; the code comes in milestone 2.
- **Why:** today a design-local part can only apply a library recipe or recombine library parts, so a genuinely new part (Priya's haptic dial) has to go through Sergii.

### B9. Two forms, one interface: code and data
- **Direction:**
  - **Blueprints written by hand are code:** the app's own (styles), library content, and power users'. The code is JS/TS run in a **sandbox** that is hermetic, deterministic and has a step budget.
  - **The design's own work is data.** Its expressions stay at **AD-17's grammar, unchanged** (T0), plus richer **input metadata**: label, unit, default, range (which may reference other inputs), options and help.
  - Both share the inputs, lanes, outputs and version pinning.
- **App-owned blueprints use the same API and the same sandbox** as everyone else's (dogfooding).
- AD-18's "no foreign code" becomes "**no unsandboxed code**".
- *(follows)* Decision 53 is settled: inputs are typed inside code and checked at runtime at the boundary. App-owned versions ship with the app anyway.
- **Why:**
  - users don't learn a language, because they see commands and expression fields;
  - power users in this niche write code (Ergogen's JS footprints, Cosmos' TS expert mode);
  - a homemade language is never enough;
  - two forms aren't twice the work: the data form is the design's own work, needed anyway, and one op API serves both.
- **Later:** T1 (booleans, `when`, lookups, named values) can be added to the data form when a real need appears. It is additive, so old files stay valid.
- **Considered and rejected:** a bounded data language (T2, Starlark's line) or iteration only as built-in operations (T2-op); code only.

### B10. Where it lives
- **Direction:** a new kernel package, **`blueprint`**, holds the sandbox host, the blueprint API (the definitions of operations and queries) and the data-blueprint interpreter.
  - `model`, `plates`, `pcb`, `firmware` and `case` import it (new AD-10 edges).
  - **Each stage implements its own lane's operations:** `case` its 3D operations on replicad, `pcb` zones and silkscreen, `model` placing parts. The shared 2D operations come from `geometry`.
- **Why:** one concept per kernel package (AGENTS.md). `model` would swell, and `case` is a background worker while `parts` is live.

### B11. Declared reads
- **Direction:** a lane **declares what it reads**: slices of the design, upstream outputs, queries.
  - Code lists its reads.
  - Data infers them from its references.
  - An undeclared read is an error.
  - The cache key is exactly the declared slices, and only those cross into the sandbox.
- **Why:** this is AD-11's input slices per lane, and Bazel's declared inputs. Splinter's noted cost: friction for authors.

### B12. Queries and context
- **Queries** ("the tallest part", "parts with role `mount`") are defined in `blueprint` and computed once by the stage that owns the data. Every lane that declares one shares the result. The list grows with the stories that need them.
- **Sides:**
  - `parts`, `shapes` and `extras` lanes run once, on the authored side, and `model` derives the right side as today (AD-6, "only `model` mirrors").
  - `plates`, `pcb`, `firmware` and `case` lanes run **once per physical thing** they make: per half for plates, case and firmware; per board for pcb (one on a reversible board, two on a mirrored one). The context says which.

### B13. Nesting: minimal version selection
- **Direction:** code may use another blueprint (`use(id, inputs)`), in the same lane and the same sandbox.
  - Versions follow **minimal version selection**: a blueprint declares minimum versions of what it uses, and the highest minimum wins.
  - AD-5's "one pin per item per design" holds.
  - An upgrade that raises a nested pin shows it before applying.
  - A removed output is a declared break with fixes.
- **Example:** a key-or-encoder position is **one combo part blueprint**. It uses the key and the encoder blueprints, and holds both footprints plus the ready-made tracks between them.

### B14. Inputs
- **Types:**
  - quantity (with unit), boolean, option (a declared list, replacing today's free string), text;
  - **asset** (SVG or image, STEP);
  - **part reference** (library or design-local, pinned like any library item);
  - **anchor** (where something goes, picked like every AD-3 anchor).
- No shape or group references for now. They get added when a real example needs them (additive).
- **Assets:** referenced by a hash of their content and stored next to the design, not inside it. Sharing or exporting bundles them (Ergogen's bundle precedent).
- **One value per input per entry.** Every lane of the blueprint reads it, and the user can change it any time.
- **Per slot (decision 57):** a slot may override **only** the inputs its part blueprint marks as per-slot. For anything else, use a second design part.
- **Per side:** AD-6's rules are unchanged for what blueprints make. On a reversible board a half may only remove. Per-side input values come only with mirrored boards.
- **Reversible swap (decision 55):** never. A per-side override may remove a whole part, or **one component** of a part, such as the encoder or the switch of a combo. The PCB stays identical.

### B15. Slots and parts
- **Attach points:** every part blueprint produces **one rectangle** (the slot pulls exactly one `rectangle`, B3), and a slot's attach points sit on it. For a key that's the keycap; for anything else the author picks it.
- **Unresolved part:** the slot keeps its place in the chain with a **stand-in rectangle**: the default part's, or an app-defined one if that doesn't resolve either. It is shown as a placeholder and reported as a violation. Later keys stay where they were.

### B16. API, failures and fixes
- **API versioning:** the blueprint API has a version, and every blueprint version records the one it was written for. A too-old app doesn't run it and shows a violation instead.
- **Bugs are fixed in place**, in the same operation.
  - **No update is silent:** each build entry keeps a **fingerprint of its last outputs**. When an app update changes them, the user sees the difference and accepts it.
  - Fingerprints become a **second kind of saved derived data**, next to routing.
  - Rejected: a new operation for every behaviour change (an explosion of operations); Onshape-style emulation of old behaviour.
- **Violations from blueprints:** one violation kind, owned by `blueprint`, with messages the author writes, naming the entry (and the slot).
- **A failed lane** (throws, or exceeds its budget): its last good output is shown marked stale, with a violation, and pullers keep using it until it runs cleanly (AD-11's rule extended).

### B17. Lifecycle
- **Upgrades:** a new blueprint version may declare how old inputs carry over (renames, defaults for new inputs, converted values). Upgrading applies that, and an unmapped old input becomes a violation with fixes.
- **Licence and provenance** on every blueprint version, like a design's `meta` (AD-9). Anything brought in from outside (an asset, a converted footprint) keeps its source's licence.

### B18. Physical outputs
- **Build layers:** every physical thing a `case` lane makes is a **sheet** (a shape plus a thickness, cut flat) or a **solid** (printed or milled), each with its position in 3D.
- **Manufacturing information:** each build layer carries a **process** and a **material**, offered as blueprint inputs with defaults. At export the process picks the file: DXF for sheets, STL or STEP for solids.
- **Keep-outs** are 3D volumes (a shape plus a height range). Any stage that puts material there gets a violation. Space a part needs cut away (a knob opening) is a **cutout**, not a keep-out.

## What changes in the spine

| Where | Change |
|---|---|
| Glossary | recipe → blueprint; new: lane, role (with pull cardinality), alteration (grows accent), build, entry; piece → **shape** throughout (76 uses); block keeps AD-9's meaning |
| AD-2 | dangling alterations after a style switch; upgrades that raise nested pins; accepting fingerprint changes |
| AD-3 | anchors as blueprint inputs; in-stage ordering by declared reads |
| AD-5 | part blueprints; `built` folds in; user-authored parts (M2 code); MVS for nested blueprints; attach-point rectangle; unresolved-part stand-in; 3D keep-outs; display role |
| AD-6 | removing one component of a combo part per side; which lanes run per side |
| AD-9 | blocks separate from blueprints; one "save to library" command |
| AD-10 | `blueprint` kernel package and its edges; `pcb → case` flow; stages implement their lane operations |
| AD-11 | declared reads as per-lane slices; stale-on-failure for lanes; fingerprints as saved derived data (the paradigm's "one piece of saved derived data" changes) |
| AD-16 | piece → shape; downstream reads the altered result (closes that Open Questions row) |
| AD-17 | grammar unchanged; one sentence: the rule is about the expression grammar, not about computation inside lanes |
| AD-18 | rewritten around blueprints, lanes, pull, `build`, code in a sandbox, styles' shared output names, build layers |
| Data Schema | `RecipeId` → `BlueprintId` (`lib:blueprint/…`); `InputValue` types; per-slot input marking; asset references; role cardinality on pulls; the `build` section (a plain list of entries); decisions 53, 55 and 57 closed |

## Still open

- **Spike:** the live chain step through the sandbox (Boundary). Latency of a warm sandbox call on a drag.
- **Planning (Sofia, after the fold):** which story starts parts: `library-versions`, `parts`, `meta.defaultPart`, the first part blueprint and the `blueprint` package. This also covers ticket 14.7 vs the spread of part fields, 14.4's need for envelopes early, and 14.5 vs the required `meta.defaultPart`. Story 13.2 stays blocked until this is planned.
- **Not asked on its own, confirm in review:**
  - the B9 note on decision 53;
  - roles as open strings with an "unconsumed role" warning (B3);
  - the AD-17 clarifying sentence.
- **Dissents on record:**
  - Sally: the cup's shape is decided by the style (B3);
  - Splinter: users may pick the wrong one of blueprint and block (B6); a later re-save conversion would help;
  - Level: under MVS, a blueprint can run against a version it wasn't tested with (B13).
