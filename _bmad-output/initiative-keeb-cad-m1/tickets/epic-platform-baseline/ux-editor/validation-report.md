# Validation Report — keeb-cad

- **DESIGN.md:** `/home/ruyu/projects/keeb-cad/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md`
- **EXPERIENCE.md:** `/home/ruyu/projects/keeb-cad/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/EXPERIENCE.md`
- **Run at:** 2026-10-26T17:30:34+02:00

## Overall verdict
The pair is a solid contract for the Layout, expression, drag and output-state work. Tokens are complete with dark/light pairs, every mock is linked, and almost every memlog decision is carried over faithfully. It is not yet complete for every editor story. The key-cell UI that R7 names is still a [GAP]. The J2 climax contradicts the interaction primitives. Error and cold-load states are missing. One memlog decision (Firmware legends) and the Inspiration/rejects section were dropped. The rubric found no critical findings.

The extra reviewers move the picture from "complete enough with gaps" to "revise before editor stories". The adversarial review found two critical problems the rubric walk missed, both traced to the architecture: SM-5 step 4 changes pitch through a user parameter instead of `meta` `pitch-x`/`pitch-y`, so the success-metric journey cannot run as written, and the derived right side and side-qualified ids have no UI, so right-half bindings, per-side population and violation navigation are unreachable. It also exposes a cluster of input-model contradictions (Esc, Tab, Delete, drag on empty canvas, Firmware capture, drag write-back) concentrated in the bundles accepted unchanged, which makes Flow coverage's "adequate" generous. The accessibility review passes the chrome but finds four breaches of the agreed floor: keycap text fails AA in both themes, Latte Yellow and Teal are still used as text, and pick modes are mouse-only. The visual spine is sound; the behaviour spine and the Latte canvas need another pass, and two items (3D scope, layer ids) need architecture before the affected stories are cut.

## Category verdicts
- Flow coverage — adequate
- Token completeness — adequate
- Component coverage — thin
- State coverage — thin
- Visual reference coverage — strong
- Bloat & overspecification — strong
- Inheritance discipline — adequate
- Shape fit — adequate

## Findings by severity

After deduplication: critical 2 · high 17 · medium 38 · low 21 (93 raw findings → 78). Each finding lists every reviewer that raised it; merged findings take the highest severity given.

### Critical (2)

**F-01 [Adversarial]** — SM-5 "change pitch" goes through the wrong mechanism (EXPERIENCE.md J1.2, J2.4; AD-4, AD-8)
Raised by: adversarial · Triage: SPINE FIX
In the architecture, pitch is `pitch-x`/`pitch-y` in `meta` (AD-8), `u` resolves against it, and the chain step is `(size(n−1)+size(n))/2` in `u` (AD-4). A user parameter `kp` re-spaces only the expressions that name it, so "every chain re-spaces" is false. The spec also has no surface for editing `pitch-x`/`pitch-y`. SM-5 cannot be run end to end as written.
Fix: Add a Pitch control (two expression fields, `pitch-x` / `pitch-y`, in the Layout inspector when nothing is selected) and rewrite J1.2/J2.4 to use it. Drop `kp` from the examples or define it as an ordinary parameter unrelated to `u`. Decide whether SM-5 "change pitch" means x, y or both.

**F-02 [Adversarial]** — The right side and side-qualified ids have no UI, but keymap, population and violations depend on them (EXPERIENCE.md Open Items (GAP right side, GAP per-side population); AD-6, AD-19)
Raised by: adversarial · Triage: USER DECISION
AD-19 keys the keymap by side-qualified slot id, and the right half's bindings must be authored (Corney is split, SM-4). AD-6 puts violations and pads on `left/`/`right/` ids. Consequences: Firmware cannot bind right-half keys; clicking a violation naming `right/thumb-home` has nothing to select; the voice example `overlap: thumb-home ↔ thumb-tucky` drops the required side qualifier; the wireless design (FR-5, SM-3) differs by population and there is no way to set it.
Fix: Decide before Firmware/PCB stories. Draw the derived right side in Firmware (optionally Layout/PCB) read-only and mirrored, selectable for bindings and population only; map a `right/x` selection to authored `x` for geometry edits; add a per-side "fitted" toggle (`setFitted`); use side-qualified ids in every violation message.

### High (17)

**F-03 [Flow coverage]** — Key-cell editor tooling is still a [GAP], though this session owns it (EXPERIENCE.md IA "Key-cell exception", J1.8, Open Items)
Raised by: rubric · Triage: USER DECISION
R7 and the architecture Deferred row assign the key-cell editor to this UX session. The spines define only how isolated cell mode is entered and left; the tooling inside it is `[GAP]` and J1.8 has no editing beat. Story-dev cannot build a key-cell editor from this.
Fix: Decide the in-cell tooling (place components, local tracks, pin roles) and add a J1 step for it, or record an explicit PO/architecture deferral.

**F-04 [Flow coverage]** — The J2 climax contradicts the interaction primitives and cannot be seen where it happens (EXPERIENCE.md J2.2, Interaction Primitives "Rotate", State Patterns "waiting for drag", IA table)
Raised by: rubric, adversarial · Triage: USER DECISION
Step 2 rotates with `Shift+]`, a discrete keypress, but the climax says outlines "follow under the hand" and PCB shows `waiting for drag to finish`, a state defined only during a gesture. No mouse-rotate gesture exists anywhere. The adversarial review adds that outline and plates render only in Shapes, so the Layout canvas where the edit happens shows nothing "under the hand"; after rejecting the combined canvas (memlog:19–20) the climax still needs that view.
Fix: Either add a rotate-drag gesture (e.g. a rotation handle on the group frame) plus a faint non-interactive outline/plate underlay in Layout (chip-toggled, on by default), or rewrite the climax around a key burst seen through the status strip and drop "under the hand". See F-39 for the burst boundary.

**F-05 [Component coverage]** — Firmware legend rules from the memlog are missing from both spines (DESIGN.md Components "Canvas keys"; EXPERIENCE.md "Binding field"; memlog L55(2))
Raised by: rubric · Triage: SPINE FIX
Decided: transparent = faint ▽, none = empty cap, mod-tap/layer-tap = two lines (tap over hold). DESIGN.md says only "Firmware: keycaps with legends".
Fix: Add the legend rules to DESIGN.md Canvas keys and the display rules to EXPERIENCE.md. Pair with F-16 (legend contrast).

**F-06 [State coverage]** — Load, failure and cold-load states are missing entirely (EXPERIENCE.md State Patterns)
Raised by: rubric · Triage: SPINE FIX
Nothing covers an invalid or corrupt design file (KDL parse error, schema error), a save failure or file-permission denial, autosave quota exceeded, or a background stage that throws (worker, replicad or routing crash, as opposed to a violation). Cold load is also missing: app start, WASM/replicad init, and the first Case build, where no "last good solid" exists, so "never blanks" cannot hold.
Fix: Add a State Patterns row for each, with voice-compliant messages.

**F-07 [Adversarial]** — Drag on empty canvas has three competing meanings, and 2D pan/zoom is never specified (EXPERIENCE.md Interaction Primitives; memlog:20; 3D viewer)
Raised by: adversarial · Triage: USER DECISION
Group frames nest and the top-level / matrix frame encloses almost the whole board, so "empty canvas" barely exists: a press-drag inside any frame is a group drag, and box-select is reachable only outside the board. Nothing says how to pan or zoom the shared 2D viewport. The floor is a 1366×768 laptop, so a trackpad (no middle button) is likely. 📐 The laptop-floor decision was made for screen size only; it also implies trackpad input, which none of the drag decisions considered.
Fix: Group selection by handle click only; empty-space drag inside or outside a frame = box-select. Pan = Space+drag / middle-drag / two-finger scroll; zoom = Ctrl+wheel / pinch, cursor-anchored; add a "fit" key. List these in the shortcut table.

**F-08 [Adversarial]** — Drag write-back cannot tell its own correction term from an authored term (EXPERIENCE.md Interaction Primitives "Write-back"; memlog:13; AD-8)
Raised by: adversarial · Triage: SPINE FIX
Expressions are stored as plain quoted strings with no marker, and comments are not preserved. An authored `0.25u + 2mm` or `wall - 1mm` is indistinguishable from a previous correction, so a drag silently rewrites the user's intent. Rounding is unspecified, so drags write float noise (`0.3700000001mm`) into a file meant for stable, diffable output.
Fix: Update the trailing term only if it is a bare `mm`/`deg` literal joined by `+`/`-` and was written by a drag/nudge in this session (tracked in Pinia, not the file); otherwise append a term. Round to a fixed precision (0.01 mm / 0.01°) and drop a term that reaches 0. Optionally add grid/snap.

**F-09 [Adversarial]** — The chain drag rule has two homes for one delta (EXPERIENCE.md Interaction Primitives "Chain drag"; AD-4)
Raised by: adversarial · Triage: SPINE FIX
A drag along the chain direction could go into `gap(n)` or `offset.x`; both move the key identically. That breaks "one way to do each thing" and makes write-back non-deterministic. The world-space delta must also be resolved into the anchor's rotated frame, which the spec does not say.
Fix: Along-direction → `gap`, perpendicular → `offset.y` (in the previous sibling's frame), rotation untouched. State that deltas are converted into the node's anchor frame.

**F-10 [Adversarial]** — Multi-selection drag, nudge and rotate are undefined for dependent or differently-framed nodes (EXPERIENCE.md Selection levels, Nudge, Rotate)
Raised by: adversarial · Triage: SPINE FIX
If node B is anchored to selected node A (or is A's later chain sibling), moving both moves B twice. An arrow key is a world direction, but each offset lives in its own rotated anchor frame. "Rotate about its pivot" for a multi-selection could mean each node's pivot or one common pivot.
Fix: Move only selected nodes with no selected ancestor in the dependency graph; convert world deltas per node; multi-rotate uses each node's own pivot (or is forbidden in M1).

**F-11 [Component coverage]** — Firmware binding capture swallows the app's own controls and cannot capture common keys (EXPERIENCE.md "Binding field"; memlog:54)
Raised by: adversarial, rubric, accessibility · Triage: USER DECISION
(a) Esc, Tab and Delete/Backspace cannot be captured, yet Corney's keymap uses them, and the spine never says the picker is the route for them (rubric). (b) Ctrl+Z, Ctrl+K, Ctrl+1..5 and Ctrl+S are captured as bindings, so with a key selected there is no undo, palette, workspace switch or save without Esc first. (c) Browser- and WM-reserved combos never reach the page. (d) "Next key" for Tab has no defined order. (e) Capture is a focus trap that contradicts "everything keyboard-reachable"; accessibility rates the trap itself low and asks for a persistent `Esc to leave · Tab next key` hint.
Fix: Make capture explicit (Enter or a `Capture` button arms it for exactly one chord, then disarms). Outside capture, Tab/Esc/Ctrl+* keep their global meanings. Capture by `KeyboardEvent.code`. Bind Esc/Tab/Delete via the picker or by typing the name. Define the advance order (e.g. matrix row-major, left then right).

**F-12 [Adversarial]** — 3D viewer and Assembly view are scope additions the journeys depend on, with no fallback (EXPERIENCE.md 3D Scope Flag, J1.11, J2.2, J2.5; AD-10; Glossary "preview")
Raised by: adversarial · Triage: UPSTREAM
The flag is raised but J1/J2 are written as if approved. Plate and PCB solids are a new derivation with no stage owner; AD-10 allows shared derivations only in `model.resolve`, the Glossary defines preview as 2D only, and "fast 3D preview" is Deferred. If architecture or PO declines, J1.11, J2.5 and the Case canvas have no specified behaviour.
Fix: Write the fallback now (Case canvas = 2D plan of the case footprint plus a rebuild state; STL download as the fit check). Ask architecture for a `preview3d` decision (owner package, Glossary term) before marking Case stories ready.

**F-13 [State coverage]** — Ctrl+S "asks location first time, then saves" does not work in Firefox, a stated target (EXPERIENCE.md Foundation, Shortcuts, State "saved / unsaved"; memlog L32(3))
Raised by: adversarial, rubric · Triage: USER DECISION
The File System Access API (`showSaveFilePicker`, persisted handles) is Chromium-only. In Firefox every save is a fresh download (`corney(1).kdl`), so the `saved` / `unsaved changes` state cannot be trusted there. The "asks location first time" rule itself is also missing from the spines (rubric).
Fix: Either Firefox Ctrl+S = download with the top bar saying `downloaded` + time, or declare Chromium the editing target and Firefox best-effort. Record it as a platform row in Responsive & Platform, and carry over the first-save rule.

**F-14 [Adversarial]** — Firmware layer reorder, delete and duplicate break layer references (EXPERIENCE.md Layer tabs; AD-19; Glossary "id")
Raised by: adversarial · Triage: UPSTREAM
`layer-tap`, `momentary-layer` and `toggle-layer` bindings reference a layer. The Glossary's ids do not cover layers. If layers are referenced by position, a drag reorder silently retargets them and a delete leaves dangling references.
Fix: Raise with architecture: layers get stable ids (Glossary + AD-19) and bindings reference them. UX: deleting a referenced layer is rejected with a message naming the referring slots, or removes those bindings in the same command (AD-2 cascade).

**F-15 [Adversarial]** — Per-side population and Save As have no surface or journey, so the wireless design is unreachable (EXPERIENCE.md Open Items (GAP population, GAP Save As), Surface closure; FR-5, SM-3/SM-4)
Raised by: adversarial · Triage: USER DECISION
SM-3/SM-4 need "both designs". Without Save As and a population surface, the wireless variant cannot be produced from the wired one. Overlaps F-02 on population.
Fix: Add J3 "Wireless from wired": Ctrl+Shift+S → swap parts / set population → reroute. This exercises AD-9 provenance and per-side population.

**F-16 [Accessibility]** — Text on keycaps fails AA in both themes (DESIGN.md `key-top-face`, `key-body`, `canvas-label`; EXPERIENCE.md Firmware)
Raised by: accessibility · Triage: SPINE FIX
Firmware legends on the top face measure 2.81 (Frappé) and 3.07 (Latte). Slot ids and R·C labels on the key body measure 3.61 and 3.69. Legends are the whole content of the Firmware workspace.
Fix: Add a `key-legend` token pair that passes 4.5: Frappé Crust `#232634` on an Overlay2 top face (5.5); Latte Text on a lighter top face such as Surface0 or Mantle (5.2+). This also resolves F-21 (Latte top face darker than body).

**F-17 [Accessibility]** — Latte Yellow is still used as text for overrides (DESIGN.md Colors "Override"; `override-light`)
Raised by: accessibility · Triage: SPINE FIX
The decided Latte fix converted warnings to icon plus Text label, but overrides kept "Yellow + `*`". They measure 1.70 on canvas (R·C`*`) and 2.31 in the inspector.
Fix: Render override text in `text-light` and keep Yellow for a non-text cue (underline, dot or chip edge). The `*` stays the primary signal.

**F-18 [Accessibility]** — Latte Teal is used as text (DESIGN.md `led-chain-light`, `anchor-link-light`, `expression-field-pick`)
Raised by: accessibility · Triage: SPINE FIX
LED chain numbers on canvas measure 2.43. Pick-mode field text measures 3.08 on chrome.
Fix: LED numbers in `text-light` inside a Teal-outlined badge. The pick-mode field keeps Text and signals pick mode with the dashed border plus a `picking…` label.

**F-19 [Accessibility]** — Pick modes and the anchor picker can only be completed with a mouse (EXPERIENCE.md Anchor picker, Vertex table, Overlay chips, Interaction Primitives "Pick modes")
Raised by: accessibility, adversarial · Triage: SPINE FIX
The anchor picker needs a click on a canvas node. `Pick vertices`, `Pick LED order`, construction-line anchors and MCU pin reassignment are click-only, and pin-to-net labels show on hover only. This breaks the Accessibility Floor's "everything keyboard-reachable" (raised by both reviewers; adversarial rated it medium).
Fix: In any pick mode, accept a typed id with autocomplete (or Ctrl+K jump), and Tab/Shift+Tab to cycle candidate targets on canvas with a focus ring. Arrows move through the 3×3 attach grid, Enter appends or confirms, Esc ends. Pins open in a keyboard-usable inspector list (pin → net).

### Medium (38)

**F-20 [Flow coverage]** — J1 never places a part (EXPERIENCE.md J1, Shortcuts, Component Patterns)
Raised by: rubric · Triage: SPINE FIX
Corney Island needs an MCU module, display and TRRS, and `P` "place part" is a shortcut, but no component pattern covers part placement or the catalogue picker, and Open Items does not list it.
Fix: Add a part-placement step and a Part picker row in both spines, or log a `[GAP]`.

**F-21 [Token completeness]** — Latte `key-top-face-light` is darker than `key-body-light` (DESIGN.md frontmatter L61–62, Elevation & Depth)
Raised by: rubric · Triage: SPINE FIX
`#9ca0b0` vs `#acb0be` (1.2:1) contradicts the decided "lighter top face" (memlog L40). Open Items says "verify", but the committed value is wrong and code will mirror it.
Fix: Pick Latte values with the top face lighter than the body (see F-16), and remove the Open Item.

**F-22 [Token completeness]** — Things the spines draw have no colour token (DESIGN.md frontmatter `colors`; EXPERIENCE.md Layer chips, State Patterns "violation")
Raised by: rubric · Triage: SPINE FIX
Missing: PCB `Edge` layer, footprints/pads/silkscreen, warning-severity overlap ("Red/Amber" but only a Red `overlap-fill`), the anchor-cycle path, 3D bodies (case, plates, PCB), Firmware legend text, and hover/pressed states for rows, chips and buttons. Keep-out is already a `[GAP]`.
Fix: Add tokens, or `[GAP]` entries for each.

**F-23 [Token completeness]** — Non-text contrast is never stated; keycaps have no boundary that reaches 3:1 (DESIGN.md Colors "Contrast", Canvas keys)
Raised by: rubric, accessibility · Triage: SPINE FIX
Key body vs canvas is 1.72 (Frappé) and 1.40 (Latte); keys are the primary canvas object. Latte Mauve selection on `canvas-light` is 3.5:1. WCAG 1.4.11 is not part of the agreed floor, so this is advisory.
Fix: State ≥3:1 targets for keys, selection outlines, anchor links and ratsnest. Draw a 1px keycap outline in Overlay2 (Frappé 3.48; Latte 3.49 on a Base canvas).

**F-24 [Component coverage]** — Design info has no component row (EXPERIENCE.md Surface closure; memlog L32(3))
Raised by: rubric · Triage: SPINE FIX
`copied from <design> · rev N` appears only in the Surface closure table, with no location in either spine.
Fix: Add a Design info component (where it opens, what it shows) to both spines.

**F-25 [Component coverage]** — Several named surfaces lack a visual spec, a behavioural spec, or both (EXPERIENCE.md IA, Component Patterns; DESIGN.md Components)
Raised by: rubric · Triage: SPINE FIX
Start screen (state row only), parameters slide-out (rows; create, rename, delete parameter), tree rows, the autocomplete dropdown, isolated cell mode (chrome and the way back), the nudge-step setting control, the Assembly body legend.
Fix: Add rows for each in both spines.

**F-26 [Component coverage]** — Some canvas marks have behaviour or tokens but no DESIGN.md component (DESIGN.md Components; memlog L48(1))
Raised by: rubric · Triage: SPINE FIX
Construction-point crosshair and guide lines, vertex markers, violation ●/▲ markers on ids, the anchor-cycle path, and how a combo is shown on the Firmware canvas.
Fix: Add canvas-mark entries.

**F-27 [Component coverage]** — Shortcuts collide with browser, OS and window-manager chords (EXPERIENCE.md Shortcuts, Chain drag rule "Alt (during drag)")
Raised by: rubric, adversarial, accessibility · Triage: SPINE FIX
☝️ The table assumes reserved chords can be taken over. `Ctrl+1..5` switch tabs in Chromium (and Firefox on Windows) and may not reach the page; `Ctrl+Shift+S` is Firefox's screenshot shortcut; `Ctrl+D`, `Ctrl+K`, `Ctrl+O`, `Ctrl+S`, `?`/`/` and F8 need `preventDefault`. Alt-drag is a window-move chord on several Linux WMs, and Firefox toggles its menu bar on Alt keyup. Nothing has been tested.
Fix: A 10-minute spike in Chromium and Firefox on the user's machine and WM. One global keydown handler with preventDefault, plus a Playwright test per chord. Name fallbacks (Alt+1..5 or plain 1..5 when no field is focused; palette `Save as…`; Shift for compensate if Alt fails).

**F-28 [State coverage]** — Selection and mode states are missing, including what `Take over editing` does (EXPERIENCE.md Inspector, Pick modes, State "read-only")
Raised by: rubric, adversarial · Triage: SPINE FIX
Undefined: the multi-selection inspector (mixed values; slots and groups together), the active-pick-mode indicator, the isolated-cell-mode indicator, what read-only disables. The adversarial review adds that the demoted tab's handling of an open gesture, autosave and routing is unstated (AD-13).
Fix: Add state rows. Demoted tab: cancel its gesture, stop autosave, show the read-only banner, drop in-flight background results.

**F-29 [Inheritance discipline]** — Some memlog decisions are missing from the spines (EXPERIENCE.md Component Patterns, State Patterns)
Raised by: rubric · Triage: SPINE FIX
Besides the legends (F-05) and rejects (F-31): L32(3) "asks location first time"; L44 "outputs never edited directly / no manual traces" (load-bearing for PCB); L51(1) "unrouted = 'unrouted' entries in the violations panel"; L42 "no typed command grammar".
Fix: Carry each over.

**F-30 [Inheritance discipline]** — Glossary drift in UI copy (EXPERIENCE.md IA, Overlay chips, State Patterns, J1, J2.2)
Raised by: rubric, adversarial · Triage: SPINE FIX
Against the memlog L7 rule "glossary terms only in UI": "footprints" (component), "mcu" / "MCU pin" (module; pads), "Amber" (palette says Yellow), "matrix group", "op", "tracks" (route), "fan". The status entry "Plate" is singular though there are several plates, and "Outline" as an output never goes stale on its own. UI-only terms (workspace, inspector, chip, keycap, legend) are never declared.
Fix: Replace with glossary terms (routes, module pins, Yellow, Plates = worst state across plates); define or fold `Outline` status; add a short "UI chrome terms (not domain)" note.

**F-31 [Shape fit]** — Inspiration & Anti-patterns is missing, though triggered (EXPERIENCE.md, after Responsive)
Raised by: rubric · Triage: SPINE FIX
The memlog records rejects a builder could reintroduce: tiled-outputs and structured-doc directions (L18), one canvas with layers and modes (L19), typed command grammar (L42), freehand polygon drawing (L43), table-based PCB overrides (pcb-overrides option b), Peach selection (L37). It also records references: Catppuccin, KiCad copper conventions.
Fix: Add the section with "Lifted from" and "Rejected" bullets, each with its reason.

**F-32 [Adversarial]** — Esc has six meanings, no precedence, and opposite meanings in different modes (EXPERIENCE.md Shortcuts, Expression field, Pick vertices; AD-2)
Raised by: adversarial, accessibility · Triage: SPINE FIX
Esc clears selection, closes overlays, ends pick mode, leaves a field, leaves isolated cell mode; in an expression field it restores (= cancel), in `Pick vertices` it ends (= keep). Gesture cancel during a drag is not listed.
Fix: One stack, innermost first: cancel gesture/drag → cancel field edit → end pick mode → close overlay → clear selection → leave isolated cell mode. Pick modes end with Enter (keep) and Esc (discard, one undo step per pick session).

**F-33 [Adversarial]** — Tab has three meanings in a field (EXPERIENCE.md Expression field, Binding field, Accessibility Floor)
Raised by: adversarial · Triage: SPINE FIX
Commit, accept autocomplete, focus traversal. With the dropdown open, Tab both accepts and commits. Enter on `Create parameter <name>…` is unspecified.
Fix: Dropdown open: Tab/Enter accept only. Closed: Enter commits; Tab commits and moves focus. `Create parameter` opens its own field and leaves the open gesture uncommitted.

**F-34 [Adversarial]** — Expression gesture lifecycle has holes: blur, Ctrl+Z in field, nested commands (EXPERIENCE.md Expression field; AD-2)
Raised by: adversarial · Triage: SPINE FIX
Undefined: blur (canvas click, Ctrl+click a parameter, workspace switch, tab takeover); whether Ctrl+Z in a focused field undoes text, cancels the gesture or undoes the previous command; how `Create parameter` interleaves with an open gesture when AD-2 allows one gesture.
Fix: Blur valid = commit, invalid = restore. Ctrl+Z in a field = native text undo. Before a command dispatches during a field gesture, the gesture commits first.

**F-35 [Adversarial]** — "Single-key shortcuts only when no field is focused" misses modifier and navigation keys (EXPERIENCE.md Shortcuts)
Raised by: adversarial · Triage: SPINE FIX
Delete, arrows, Shift+arrow, Ctrl+arrow (word jump vs 0.05 mm nudge), Ctrl+D and Home are also used by text fields.
Fix: With any field focused, all canvas commands are off; only Ctrl+K, Ctrl+S, Ctrl+Z/Shift+Z and Ctrl+1..5 stay global.

**F-36 [Adversarial]** — Delete is ambiguous between a focused layer tab and the canvas selection (EXPERIENCE.md Layer tabs, Shortcuts)
Raised by: adversarial · Triage: SPINE FIX
In Firmware a key selection exists while a tab can have focus.
Fix: Delete acts on whatever has keyboard focus; the canvas selection is the target only when the canvas has focus. Show it on the cheat sheet.

**F-37 [Adversarial]** — 3D right/middle-drag pan contradicts "right-click is ALWAYS a context menu" (EXPERIENCE.md 3D viewer vs Context menu; memlog:52 vs memlog:55)
Raised by: adversarial · Triage: USER DECISION
The user's explicit correction says right-click is never a direct action.
Fix: 3D pan = middle-drag or Shift+left-drag; right-click opens the context menu. Or ask the user whether a drag threshold is acceptable.

**F-38 [Adversarial]** — Re-anchor keeps the old expression, which preserves meaningless intent (EXPERIENCE.md Re-anchor [ASSUMPTION]; memlog:17; AD-3)
Raised by: adversarial · Triage: USER DECISION
`0.25u` from the previous key, re-anchored to a construction point, becomes `0.25u + 37.12mm`, and later pitch changes move the node for no reason. Rotation and pivot change under a new frame. No reset to the default anchor; no rule for targets that would create a cycle.
Fix: Re-anchor flattens offset x/y/rotation to literals unless the new frame is a pure translation of the old one. Disable cycle-creating targets with a hover reason. Add `Reset to default anchor`.

**F-39 [Adversarial]** — Nudge-burst = one undo step has no boundary, and the climax depends on it (EXPERIENCE.md Nudge [ASSUMPTION], J2.2; AD-2, AD-11)
Raised by: adversarial · Triage: SPINE FIX
A burst is not an AD-2 gesture unless modelled as one, and background stages start only on commit or idle. The status says "drag" when the input is a keypress.
Fix: Model a burst as a gesture that commits after ~600 ms with no nudge/rotate key, or on any other input. Rename the status to `waiting for edit to finish`.

**F-40 [Adversarial]** — Violations, counts and export-blocked reasons have no staleness treatment (EXPERIENCE.md Violations panel, Export menu, Status strip; AD-11)
Raised by: adversarial · Triage: SPINE FIX
`unrouted` and `drc` reflect an older revision during routing, F8 can jump to ids that no longer exist, and transient `unrouted` entries flood the panel.
Fix: Tag violation groups with their source revision; hatch stale groups with `stale` and make F8 skip them; collapse `unrouted` to one counted row while routing runs.

**F-41 [Adversarial]** — STL/STEP export lets a stale case through (EXPERIENCE.md Export menu; AD-11)
Raised by: adversarial · Triage: SPINE FIX
"Blocked only while the case is rebuilding": during `waiting for edit`, or after a failed rebuild, the last good solid is from an older revision.
Fix: Enable STL/STEP only when the case output is `current`; otherwise `Blocked: case stale (rev …)` or `Blocked: case failed: <message>`.

**F-42 [Adversarial]** — `rev N` contradicts the Glossary: a revision is a content hash, not a counter (DESIGN.md Stale; EXPERIENCE.md State Patterns; memlog:32)
Raised by: adversarial · Triage: SPINE FIX
`stale · rev N` and `copied from <design> · rev N` both treat revision as a counter.
Fix: Show a short hash (`rev 3f2a`), or define a session-local counter in Pinia with a different name.

**F-43 [Adversarial]** — No surface for typed command rejections (EXPERIENCE.md Toast row; Conventions; AD-2, AD-3)
Raised by: adversarial · Triage: SPINE FIX
The toast row lists only undo and migration. Deleting a vertex used by a shape, or a cyclic anchor, is rejected by the model, and the UI can fail silently.
Fix: Rejection toast in `{colors.warning}` ▲ with what + where (`rejected: vertex v-07 is used by outline-base`), plus a Toast row.

**F-44 [Adversarial]** — Which gestures exist in each workspace is undefined (EXPERIENCE.md Canvas row; AD-1)
Raised by: adversarial · Triage: SPINE FIX
Can a key or footprint be dragged in PCB, Shapes or Firmware? If yes, the drag writes the slot offset, which reads as editing an output. Can rectangles and circles be dragged in Shapes?
Fix: Add a per-workspace gesture matrix: Layout = node drag; Shapes = vertex/primitive drag; PCB, Firmware = select only in M1.

**F-45 [Adversarial]** — Letter and bracket shortcuts break on non-US layouts if bound by `event.key` (EXPERIENCE.md Shortcuts)
Raised by: adversarial · Triage: SPINE FIX
On a Ukrainian layout `[`→`х`, `]`→`ї`, G→`п`.
Fix: Bind by `KeyboardEvent.code`; show labels from `navigator.keyboard.getLayoutMap()` where available.

**F-46 [Accessibility]** — Muted text on a `canvas`-filled row fails AA (DESIGN.md `operation-list-row-selected`, `command-palette.active-row`)
Raised by: accessibility · Triage: SPINE FIX
4.26 (Frappé) and 4.05 (Latte) for the evaluated suffix or shortcut hint on selected operation/vertex rows and active palette/context-menu rows.
Fix: Switch muted text to `text` on active and selected rows, or use a row fill closer to the panel tone.

**F-47 [Accessibility]** — The Latte canvas fails 3:1 for most meaningful strokes (DESIGN.md Latte canvas tokens)
Raised by: accessibility · Triage: USER DECISION
📐 The Latte fixes only covered chrome text; the Latte canvas (Surface0, a mid-tone) was never checked. F.Cu 1.93, vertex 1.93, construction point 1.81, anchor link 2.43, group frame 2.07, faint key outline 2.56, LED path 2.43, Amber overlap 1.70, stale hatch 1.69.
Fix: Move `canvas-light` to Base `#eff1f5` with the grid on Surface0 (brings Teal, Overlay2, Blue above 3:1). For Peach, Flamingo, Sky use 2px strokes with a 1px Text casing, or accept them as hue accents on shapes that differ in form.

**F-48 [Accessibility]** — Frappé group frame is 2.80, and the faint key outline opacity is unspecified (DESIGN.md `group-frame`, `key-outline-faint`)
Raised by: accessibility · Triage: SPINE FIX
The faint outline drops below 3:1 at any opacity under about 85%.
Fix: Group frame to Overlay2 (3.48); key-outline opacity ≥0.9, or drop it. Related: F-60.

**F-49 [Accessibility]** — F.Cu and B.Cu differ by hue only (DESIGN.md Copper; EXPERIENCE.md PCB)
Raised by: accessibility · Triage: SPINE FIX
Luminance ratio 1.09 (Frappé) and 1.65 (Latte). KiCad users accept this convention, hence medium.
Fix: Draw B.Cu at reduced opacity or under F.Cu with a lighter fill; show the layer in the inspector and on hover/focus.

**F-50 [Accessibility]** — Chip on/off state is carried mainly by border colour (DESIGN.md `chip`)
Raised by: accessibility · Triage: SPINE FIX
Off is a border at 1.32 (Frappé) or 1.18 (Latte) against canvas, barely visible.
Fix: On = fill (Surface1) or leading ✓ plus Mauve border and `aria-pressed`; off = Overlay1 border with `text-muted` label.

**F-51 [Accessibility]** — Latte ▲ and ✓ glyphs fail 3:1 where they appear without a Text label (DESIGN.md `tab-badge`; EXPERIENCE.md State Patterns "violation")
Raised by: accessibility · Triage: SPINE FIX
▲ 2.15 on chrome, 1.70 on canvas; ✓ 2.75. In tab badges and on flagged keys the decided icon-plus-label fix does not apply.
Fix: Draw Latte ▲/✓ with a Text-colour stroke, or use darker roles for the glyph only. Always show `current` beside ✓.

**F-52 [Accessibility]** — The 3D viewer is mouse-only apart from Home (EXPERIENCE.md 3D viewer)
Raised by: accessibility · Triage: SPINE FIX
Orbit, pan and zoom have no keyboard path.
Fix: With the viewer focused: arrows orbit, Shift+arrows pan, +/− zoom, Home resets. List on the cheat sheet.

**F-53 [Accessibility]** — Some drag-only actions have no keyboard equivalent (EXPERIENCE.md Interaction Primitives)
Raised by: accessibility · Triage: SPINE FIX
Alt-drag compensation has no nudge counterpart, and box-select has no keyboard path.
Fix: Alt+arrow nudge compensates; keyboard multi-select lives in the tree slide-out (Shift/Ctrl+arrow, Space).

**F-54 [Accessibility]** — No keyboard way to open the context menu (EXPERIENCE.md Context menu)
Raised by: accessibility · Triage: SPINE FIX
`Use as outline` and layer-tab Rename/Duplicate/Move appear only there. The palette lists every command, so nothing is unreachable.
Fix: Shift+F10 / Menu key on the focused item or canvas selection, with arrow, Enter and Esc navigation.

**F-55 [Accessibility]** — Focus management for overlays and panels is unspecified (EXPERIENCE.md Left rail + slide-out, Violations panel)
Raised by: accessibility · Triage: SPINE FIX
Slide-out, palette, context menu, violations panel, cheat sheet, Export menu: nothing says where focus goes on open or returns on close.
Fix: Focus the first meaningful item on open; modal overlays trap, non-modal ones do not but close on Esc; return focus to the invoker or canvas.

**F-56 [Accessibility]** — Keyboard entry to the canvas and movement between regions are undefined (EXPERIENCE.md Shortcuts)
Raised by: accessibility · Triage: SPINE FIX
Nudge, rotate and Delete act on "the selection", but focus has no defined route to the canvas or between top bar, rail, canvas, inspector and status strip.
Fix: Canvas is one focusable region (`tabindex=0`) with a visible edge focus ring; F6 / Shift+F6 cycle regions.

**F-57 [Accessibility]** — Reduced-motion coverage is a single line (EXPERIENCE.md Accessibility Floor)
Raised by: accessibility · Triage: SPINE FIX
Uncovered motions: violation flash, auto pan/zoom to fit, slide-outs, palette and toasts, Assembly fade-in, 3D Home camera move, spinner and badge progress ring.
Fix: List the inventory; under reduced motion jump instead of pan, use a static highlight instead of the flash, show overlays instantly, and replace spinner/ring with a static ◐ beside `N%`.

### Low (21)

**F-58 [Flow coverage]** — J1.2 "G adds the matrix group" uses an undefined term (EXPERIENCE.md J1.2)
Raised by: rubric · Triage: SPINE FIX
It reads like a special group kind.
Fix: Name the group by id or role, using glossary terms.

**F-59 [Token completeness]** — Stated contrast ratios are slightly off; Latte error text on chrome is 4.46 (DESIGN.md Colors)
Raised by: rubric, accessibility · Triage: SPINE FIX
Latte Green is 3.0 (stated 2.7), Latte Blue 4.3 (stated 4.0). Latte Red on `chrome-light` is just under AA if error text ever sits on chrome (status strip, banner, field background).
Fix: Correct the numbers; keep error text on `panel-light` (4.80) or use Text with a Red ● on chrome.

**F-60 [Token completeness]** — Some literals and assumptions are not tokens (DESIGN.md Elevation & Depth, frontmatter `spacing`)
Raised by: rubric · Triage: SPINE FIX
Overlay shadow `0 6px 18px rgba(0,0,0,.35)` is prose only; `key-outline-faint` has "reduced opacity" with no alpha; spacing `'3'` duplicates `pad` (13px) in an odd 4/8/13/20 scale.
Fix: Add `shadow-overlay` and an alpha value; confirm the scale.

**F-61 [Component coverage]** — `T` is ambiguous: one slide-out with tree and parameters, or two panels? (EXPERIENCE.md Shortcuts; DESIGN.md Left rail + slide-out; J2.4)
Raised by: rubric, adversarial · Triage: SPINE FIX
The rail has two icons, but there is no separate shortcut for parameters; J2.4 reaches them only via Ctrl+click.
Fix: T = tree, a second key (e.g. `K`/`=`) = parameters, plus a palette entry; or state that T toggles the last-used panel.

**F-62 [State coverage]** — Empty states for Shapes, PCB, Firmware and several panels are undecided (EXPERIENCE.md State Patterns)
Raised by: rubric · Triage: USER DECISION
Shapes/PCB/Firmware empty states are already a `[GAP]`; also unspecified: 0 violations, palette with no match, empty parameters/tree slide-out.
Fix: Decide them together with the existing gap.

**F-63 [State coverage]** — Hover and disabled states are defined only for Export rows (EXPERIENCE.md, DESIGN.md Components)
Raised by: rubric · Triage: SPINE FIX
Every other interactive surface lacks them.
Fix: Add a general hover/disabled rule.

**F-64 [Visual reference coverage]** — `selection-accent-1.html` is linked without naming the chosen option (DESIGN.md Colors)
Raised by: rubric · Triage: SPINE FIX
`color-themes-1.html` variation 5 still shows Peach selection, so the reader needs the pointer.
Fix: Write "(option c, Mauve; variation 5's Peach selection is superseded)".

**F-65 [Bloat & overspecification]** — Status strip, violations panel and staleness are each described three times (EXPERIENCE.md IA, Component Patterns, State Patterns)
Raised by: rubric · Triage: SPINE FIX
Triple descriptions invite drift.
Fix: Keep one sentence in IA and point to Component Patterns.

**F-66 [Inheritance discipline]** — `sources` omits upstream documents that bind this UX (EXPERIENCE.md frontmatter)
Raised by: rubric · Triage: SPINE FIX
Missing: `initiative-keeb-cad-m1.md` (Boundaries behind R7), the PRD memlog, PRD addendum and architecture memlog (memlog L44).
Fix: Add them.

**F-67 [Inheritance discipline]** — Component names drift between files; "Layer" means two things (DESIGN.md / EXPERIENCE.md Components)
Raised by: rubric · Triage: SPINE FIX
"Layer tab" vs "Layer tabs"; "Chip" / "PCB overlays" vs "Overlay chips" / "Layer chips"; "Workspace tab" has no EXP row; "Command palette / context menu" vs two rows. "Layer" means PCB copper and keymap layers.
Fix: One name per component; rename "Layer tabs" to "Keymap layer tabs".

**F-68 [Inheritance discipline]** — Status vocabulary casing differs (EXPERIENCE.md Voice and Tone)
Raised by: rubric · Triage: SPINE FIX
`Blocked: 2 DRC errors…` vs the fixed vocabulary `blocked: <reason>`.
Fix: Pick one.

**F-69 [Adversarial]** — Home (Case top view) is missing on many laptop keyboards (EXPERIENCE.md Shortcuts)
Raised by: adversarial · Triage: SPINE FIX
Safe under the focused-field rule, but Home needs Fn on many laptops.
Fix: Add an alias (e.g. `0` or Shift+H) and a palette command.

**F-70 [Adversarial]** — The undo toast implies a full restore, but copper may differ (EXPERIENCE.md J2 Failure; AD-12)
Raised by: adversarial · Triage: SPINE FIX
Routes are not on the undo stack.
Fix: After undo PCB shows `routing N/M`; note in J2 Failure that copper may differ but stay electrically equal.

**F-71 [Adversarial]** — Undo toast names don't match the commands a chain drag issues (EXPERIENCE.md Toast)
Raised by: adversarial · Triage: SPINE FIX
"move thumb-home" vs `setGap`/`setOffset`.
Fix: One display label per command, from a table in the model command registry.

**F-72 [Adversarial]** — Construction point from parallel or coincident lines has no result and no violation kind (AD-16; Conventions violation owners)
Raised by: adversarial · Triage: UPSTREAM
Intersection of two lines is undefined when they are parallel.
Fix: Ask architecture for a `model` violation kind (e.g. `construction-undefined`); UI shows ● on the point.

**F-73 [Accessibility]** — Field, button and chip borders are 1.49–1.93 (DESIGN.md `expression-field`, `button`)
Raised by: accessibility · Triage: SPINE FIX
Field background differs from panel by only 1.12, so fields are hard to spot as inputs.
Fix: Use Overlay0/Overlay1 for interactive borders; keep Surface1 for hairlines.

**F-74 [Accessibility]** — Overlap severity on canvas is colour only (EXPERIENCE.md State Patterns "violation")
Raised by: accessibility · Triage: SPINE FIX
Red vs Amber outline; the ids carry ●/▲ but the area does not.
Fix: Solid outline for errors, dashed for warnings, or a marker on the overlap area.

**F-75 [Accessibility]** — Frappé stale hatch 2.20 and plate cutouts 1.72 (DESIGN.md `stale-hatch`, `plate-cutout`)
Raised by: accessibility · Triage: SPINE FIX
The hatch is backed by a label; the plate fill colour is unspecified.
Fix: Hatch in Overlay1/Overlay2; specify a plate fill that cutouts reach 3:1 against.

**F-76 [Accessibility]** — Focus and selection share Mauve (DESIGN.md Selection & focus)
Raised by: accessibility · Triage: SPINE FIX
Shapes differ, so acceptable.
Fix: Keep the focus ring offset 2px outside the element.

**F-77 [Accessibility]** — Target sizes are unspecified for small controls (DESIGN.md spacing)
Raised by: accessibility · Triage: SPINE FIX
3×3 attach-grid cells, chips, layer-tab `+`, collapse chevrons, group-frame grab tab, vertex handles.
Fix: ≥24px for chrome controls; ≥8px hit radius for canvas handles at any zoom.

**F-78 [Accessibility]** — ARIA semantics are not named in component rules (EXPERIENCE.md Component Patterns)
Raised by: accessibility · Triage: SPINE FIX
The floor requires semantic HTML.
Fix: `role=tablist` with arrows for workspace and layer tabs; accessible names for tab badges; `aria-invalid` + `aria-describedby` on fields; `aria-disabled` on blocked Export items.

## Mechanical notes
- Frontmatter: DESIGN.md has `name`, `description`, `status`, `updated` plus all token groups; EXPERIENCE.md has `name`, `status`, `updated`, `sources`, and all three sources resolve. No Mermaid in either file.
- All `{colors.*}`, `{typography.*}`, `{rounded.*}` and `{spacing.*}` references resolve; 31 dark tokens and 31 `-light` pairs, 1:1.
- Open naming items carried by the spine: `choc-v2-cell` vs `choc-v2-hotswap`; chain index notation; `R0·C0` (mock) vs `R1·C4` (memlog). Resolve before the first PCB story, since they leak into test fixtures.
- Ticket adoption not done: `companions: []` in `epic-platform-baseline.md` is still empty, so story 5's verify condition is unmet. The 3D scope flag still awaits architecture and PO confirmation (see F-12).
- Deduplication: 93 raw findings across three reviewers became 78. Merged findings take the highest severity any reviewer gave and list every reviewer that raised them.

## Reviewer files
- `review-rubric.md`
- `review-adversarial.md`
- `review-accessibility.md`
