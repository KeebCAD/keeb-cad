---
name: keeb-cad editor
status: final
updated: 2026-10-26
sources:
  - ../epic-platform-baseline.md
  - ../../../initiative-keeb-cad-m1.md
  - ../../../../prd-keeb-cad-m1/prd-keeb-cad-m1.md
  - ../../../../prd-keeb-cad-m1/addendum.md
  - ../../../../prd-keeb-cad-m1/.memlog.md
  - ../../../../architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
  - ../../../../architecture-keeb-cad-layout-model/.memlog.md
---

# keeb-cad editor — Experience Spine

## Foundation

**Precedence.** On conflict with any mock, DESIGN.md and this spine win; names and values invented in the key-screen mocks (tray op names, Assembly heights, part versions, DRC text, legends, layer names) are illustrative.

Desktop web (Chromium, Firefox), mouse or trackpad and keyboard, heavy shortcut use. Floor: a 1366×768 laptop; larger monitors just get more canvas. Sole user: Sergii, an expert builder (hobby stakes).

No UI component library: custom Vue components on Catppuccin tokens. `DESIGN.md` is the visual reference; this spine is the behavior. Mocks are linked inline.

**Words.** Domain words are architecture Glossary terms only (route, component, module, pad, side-qualified id, revision…). UI chrome terms that are not domain words: workspace, inspector, slide-out, chip, palette, status strip, badge, toast, banner, keycap, legend.

**Outputs are never edited directly.** Every change is a command on the authored sections. Board routing is automatic (no Route button); there is no manual route editing on the board. Key-cell local tracks are drawn by hand in isolated cell mode (see Upstream Handoffs).

## Information Architecture

**Workspace per stage.** Five workspaces, each its own place with its own rendering, tools and panels. The 2D workspaces share one viewport: zoom, pan and design coordinates persist across switches. Isolated cell mode is the one exception. → `mockups/canvas-model-storyboard.html` (model b; the shared viewport was added after this mock).

| Workspace | Key | Canvas shows | Right panel |
|---|---|---|---|
| Layout | 1 | both halves as filled keycaps, group frames, anchor links; Outline context line (chip O) | Inspector (anchor, offset, chain, population, part, key cell with `Edit key cell` → PCB); Design settings when nothing is selected. → `mockups/key-layout.html` (J2.2 mid-rotation, Frappé and Latte) |
| Shapes | 2 | both halves as faint key outlines; shapes, vertices, construction points; selected plate with cutouts | Operation list: Shapes · Construction · Plates; selected entry's fields below. → `mockups/key-shapes.html` (polygon in `Pick vertices`, list collapsed) |
| PCB | 3 | the board: components, pads, F.Cu/B.Cu routes, ratsnest; overlay and PCB layer chips | Inspector; design rules when nothing is selected. `Edit key cell` opens isolated cell mode. → `mockups/key-pcb.html` (rerouting, Matrix and LED chain, Export menu), `mockups/key-cell.html` (isolated cell mode, track drawing) |
| Case | 4 | 3D viewer (case; Assembly chip adds plates and PCB) | Operation list of case operations; selected operation's fields; tray template parameters live in the Parameters slide-out. → `mockups/key-case.html` (at rest, Assembly, stale, empty) |
| Firmware | 5 | both halves side by side as keycaps with legends; keymap layer tabs overlaid top-left | Binding field and picker; `Matrix & pins → PCB` link. → `mockups/key-firmware.html` (binding field capturing) |

**Both halves.** The left half is authored; the right half is derived (split-reversible, AD-6) but drawn and selectable in Layout, Shapes, PCB and Firmware. In M1 the right half takes population, keymap and netlist overrides only; its geometry fields are read-only (see Population toggle). The right half reads as derived: a thin dashed mirror axis between the halves, and right-half keys at lower opacity until selected. On PCB the right board is the flipped reversible board; its copper colors swap (see DESIGN.md › Colors), and labels still name the layer.

**Panels (hybrid).** Inspector / operation list docked right in every workspace. One slide-out with Tree and Parameters tabs from the thin left rail. Ctrl+K palette everywhere. → `mockups/panel-models.html` (option c), `mockups/oplist-placement-1.html` (option c), `mockups/key-panels.html` (violations panel, palette, context menu, slide-out, Part picker).

**Global chrome.** Top bar and status strip: see Component Patterns › Global chrome. Output states: see State Patterns.

**Start.** Launch reopens the last autosaved design; otherwise the Start screen. → `mockups/key-start.html` (Start screen, banners, File menu, save state per browser).

### Surface closure

| Stated need | Surface | Journey |
|---|---|---|
| Place keys by anchor + offset, chains, pitch | Layout, inspector, Design settings, anchor picker, rotation handle | J1.2–4, J2.1–4 |
| Place parts | P, Part field (Part picker) | J1.5, J3.2–3 |
| Typed values and expressions; parameters | Expression field, Parameters slide-out | J1.3, J2.3 |
| Outline and shapes from operations; polygon vertices | Shapes operation list, vertex table | J1.6–7 |
| Plates and their exports | Shapes → Plates | J1.8 |
| Key cell (components, local tracks) | Isolated cell mode | J1.9 |
| Matrix / pin / LED overrides | PCB overlay chips + inspector | J1.10 |
| Design rules, routing, DRC | PCB right panel, status strip, violations panel | J1.11, J3.5 |
| Case from tray template; fit check | Case operation list, 3D viewer, Assembly | J1.12, J2.5 |
| Keymap for both halves | Firmware, keymap layer tabs, binding field | J1.13, J3.6 |
| Production files | Export menu, plate export buttons | J1.14, J3.7 |
| See every output follow an edit | Status strip, tab badges, staleness, Outline context line | J2 |
| Per-side population | Population toggle | J1.5, J3.4 |
| Second design from a copy | File → `Copy design…`, Design info | J3.1 |
| Save / reopen | File menu, top bar, Start screen | J1.1, J1.15 |
| Second tab / format-too-new / corrupt file | Banner, Start screen | State Patterns |

## Voice and Tone

Terse, technical, for an expert. Glossary terms only. Messages say what and where with ids — side-qualified when they name a resolved placement; no apology, no exclamation, no celebration.

| Do | Don't |
|---|---|
| `unit-mismatch: u on rotation` | "Oops! That unit doesn't look right." |
| `overlap: left/thumb-home ↔ left/thumb-tucky (1.1 mm)` | "Some keys are overlapping." |
| `0 unrouted` | "🎉 All done!" |
| `blocked: 2 DRC errors, 15 unrouted` | "Export unavailable" |
| `Undid: move thumb-home` | "Undo successful" |
| `rejected: vertex v-07 is used by outline-base` | silent failure |
| `Read-only — this design is open for editing in another tab.` | "Something went wrong" |

**Fixed status vocabulary, always lowercase:** `current`, `stale`, `rebuilding N%`, `routing N/M`, `waiting for edit to finish` `[ASSUMPTION]`, `failed: <message>` `[ASSUMPTION]`, `blocked: <reason>`, `read-only`. Revisions show as a 7-character hash: `rev 3f2a91c` `[ASSUMPTION]` (Glossary: a revision is a content hash, not a counter).

## Component Patterns

Behavioral. Visual specs live in DESIGN.md › Components. Every interactive item: hover shows `{colors.hover}`, pressed/on shows `{colors.fill-on}`; disabled items keep a visible reason and are `aria-disabled`.

### Global chrome

| Component | Use | Behavioral rules |
|---|---|---|
| Top bar | Global | File menu, design name (opens Design info) and save state (see State Patterns › File), workspace tabs, Export menu, undo/redo. |
| File menu | Top bar | `New design`, `Open…` (Ctrl+O), `Save` (Ctrl+S: writes this design to its file), `Save to file…` (Ctrl+Shift+S: same design, same id and history, another location), `Copy design…` (new name, new id, records `copied from <design> · rev <hash>`, opens the copy, original untouched), `Design info`. |
| Design info | Popover from the design name `[ASSUMPTION: placement]` | Name, id, current revision, provenance (`copied from <design> · rev <hash>`), file location (Chromium) or the Firefox save state (see State Patterns › File). Read-only. |
| Start screen | No design open (the empty state) | New design, Open file (Ctrl+O), recent autosaved designs (arrows and Enter); the first recent row has focus. |
| Workspace tabs | Top bar | `role=tablist`; keys 1–5 when no field is focused; arrows move between tabs when focused. Each tab carries a tab badge. |
| Tab badge | Workspace tabs | Repeats the worst output state of that workspace (see State Patterns › Output states). Accessible name = the state text (`PCB: routing 41/56`). |
| Status strip | Bottom, global | One entry per output — Outline, Plates (worst across plates), PCB (always shows the unrouted count, even `0 unrouted`), Case, Firmware — showing its output state (see State Patterns › Output states). When the strip overflows (at 1366 px wide), entries compress to glyph and number; the full state text shows in a tooltip and stays the accessible name. Click → that workspace. Warning/error counts open the violations panel. The left end shows pick-mode / track-drawing hints. |
| Nudge-step control | Status strip | Click opens three expression fields (arrow, Shift, Ctrl step); defaults 0.25 / 1 / 0.05 mm. |
| Export menu | Top bar, all workspaces | Lists every output. Unavailable items are `aria-disabled` with an inline reason (`blocked: 2 DRC errors, 15 unrouted`) linking to the violations panel. KiCad 10 project always enabled. STL/STEP enabled only when Case is `current`; otherwise `blocked: case stale (rev <hash>)` or `blocked: case failed: <message>`. |
| Toast | Global | Undo/redo (`Undid: <command label>` — one display label per command from the model command registry), rejections (`rejected: <what>` with ▲), re-anchor, format migration, save failure. `role=status`; auto-hides after ~4 s `[ASSUMPTION]`. |
| Banner | Under top bar | Read-only, format-too-new, autosave failure. Pushes the canvas down; never covers it. `role=alert`. → `mockups/key-start.html`. |

### Panels and overlays

| Component | Use | Behavioral rules |
|---|---|---|
| Left rail + slide-out | Left rail; T | One slide-out with Tree and Parameters tabs. T opens it on the last-used tab `[ASSUMPTION]`; palette `Open tree` / `Open parameters`. Non-modal; Esc closes. **Tree:** synced with canvas selection; arrows move, Space toggles, Shift/Ctrl+arrow extend — the keyboard route to multi-select. **Parameters:** rows `name = expression = value`; `+` adds; double-click or F2 renames (references follow); Delete removes, rejected while referenced (`rejected: ks is used by 12 expressions`). |
| Inspector | Right panel | Shows the selection's fields. Sections are collapsible; the most recently used sections stay open `[ASSUMPTION]`. Multi-selection shows fields common to all; differing values show `mixed`; typing applies to all as one undo step `[ASSUMPTION]`. In PCB with nothing selected: design rules (net classes width/clearance, edge clearance, module keep-outs) as expression fields. |
| Violations panel | Status strip counts, V | Non-modal, slides up. Grouped by workspace then kind, errors first; each group tagged with its source revision. Stale groups show `stale` and F8 skips them. Unrouted connections appear as `unrouted` entries; while routing runs they collapse to one counted row. Click a violation → switch workspace, select all named ids (side-qualified ids select that half), fit the viewport to them, flash them once. F8 / Shift+F8 step next/previous without opening the panel. No dismiss or mute: a violation leaves only when fixed. Empty: `0 violations`. |
| Command palette | Ctrl+K, everywhere | Modal. Every named command with its shortcut; jump to any node, shape, parameter or violation by id; jump to a workspace. No match: `no match for "<query>"` `[ASSUMPTION]`. |
| Context menu | Right-click, Shift+F10, Menu key | Palette commands filtered to the selection (or focused item), each with its shortcut. Arrows, Enter, Esc. Right-click is always a context menu, never a direct action — in 3D too. |
| Cheat sheet | ? | Modal. Every shortcut, grouped by workspace, including focus-dependent keys (Delete). |

### Fields and pickers

| Component | Use | Behavioral rules |
|---|---|---|
| Expression field | Every length/angle | Authored text and evaluated suffix (`0.25u + 0.37mm = 5.12 mm`); plain literals show value and unit. Each keystroke that parses and unit-checks previews live as a gesture. Enter commits one undo step; Esc restores; on blur, valid commits and invalid restores. Ctrl+Z inside a field = native text undo. A command dispatched during a field gesture (palette, Ctrl+click, workspace switch) commits the gesture first. Invalid (parse, unit-mismatch, unresolvable reference, cycle): error underline and message, `aria-invalid` + `aria-describedby`; the canvas keeps the last valid value; Enter does not commit. Ctrl+click a parameter name to open it in the Parameters slide-out. |
| Autocomplete dropdown | Expression field | Parameter names with values (`ks = 19 mm`). Open: ↑↓ move, Tab or Enter accept only (no commit). Closed: Enter commits, Tab commits and moves focus. An unknown name offers `Create parameter <name>…`: it opens the new parameter's value field and leaves the in-progress gesture uncommitted. |
| Anchor picker | Anchor fields, vertex rows, construction-point lines | Click the field → click a target node on the canvas → pick an attach point from the 3×3 grid or on the canvas (lit attach points; see Pick modes). Keyboard: type an id (autocomplete) or Tab/Shift+Tab through candidate targets, arrows in the 3×3 grid, Enter confirms. Targets that would create an anchor cycle are dimmed with `would create anchor cycle` `[ASSUMPTION]`. No canvas drag-to-anchor. Re-anchor: see Interaction Primitives. |
| Part field | Inspector, slot | Opens the Part picker anchored beside the field: searchable by name; rows show name, version, footprint preview; Enter picks. Changing part = one undo step; connections re-derive. P on the canvas places a new slot with the Part picker open. |
| Binding field | Firmware inspector | Selecting a key focuses it. While focused, plain keys, Shift and Alt combinations are captured as bindings; Ctrl combinations always reach the app and are never captured. Tab captures nothing: it advances to the next key — left half then right half, row-major by matrix row/column `[ASSUMPTION]`. Esc always leaves the field (no focus trap). To bind Tab, Esc or a Ctrl combination, use the picker: the field hint reads `Tab, Esc, Ctrl+… → pick from list (↓)`, and ↓ opens the picker. Picker: binding-type dropdown and searchable key list; mod-tap / layer-tap get two fields. Select 2+ keys → `Add combo`. |
| Population toggle | Inspector, any slot on either half | `Fitted: [x] left [x] right`; unticking unfits that side only. Multi-select + toggle = one undo step. On the right half, anchor / offset / chain fields are read-only with `derived from left/<id>` (click selects the source) and lock `geometry overrides need split-mirrored`. |
| Design settings | Layout inspector, nothing selected | Form (read-only, `split-reversible`), `pitch-x`, `pitch-y` (expression fields; may reference parameters), default key cell. The group inspector shows optional `pitch-x` / `pitch-y` / key cell overrides with `inherits <value>`; type to override, clear to inherit. Changing pitch = one undo step; chains re-space live, `u` re-evaluates. → `mockups/pitch-settings-1.html`. |

### Canvas

| Component | Use | Behavioral rules |
|---|---|---|
| Canvas keys, Group frame, Anchor link | 2D canvas | Selection and drag: see Interaction Primitives. Anchor links show each node's anchor; not draggable. Unfitted slots keep their place and index. |
| Rotation handle | Selected key or group (Layout, isolated cell mode) | Drag rotates about the pivot (⊕ shown); a group's pivot defaults to its group origin and is editable in the group inspector (Offset → pivot). The readout during the drag is the delta (`−3.4°`); the inspector shows the absolute rotation. Shift snaps 5°. One gesture, one undo step; writes the deg term. Multi-selection: each node about its own pivot `[ASSUMPTION]`. → `mockups/key-layout.html`. |
| Outline context line | Layout | The shape holding the outline marker ★, thin and non-editable, behind keys; follows live during a gesture. Plates are not shown in Layout. |
| Canvas marks | All 2D canvases | Vertices, construction points, overlap areas, violation markers, anchor-cycle paths, ratsnest, LED chain, combos: display only, except vertex drag in Shapes. Clicking a violation marker selects its ids. |
| Overlay chips (PCB) | PCB | Toggle buttons with `aria-pressed`: Matrix (M), LED chain (L), Pins (I); off by default, combinable, remembered for the session. Matrix: R·C label per key, zero-based (`R0·C0`), overrides with `*`; row/column overrides are set in the inspector for the selected keys. LED chain: numbered path; `Pick LED order` (pick mode) turns it on while active. Pins: hover or focus the MCU module to show pin → net labels; the inspector lists pins → nets as a keyboard-usable list; pick a pin to reassign. → `mockups/pcb-overrides-1.html` (option a), `mockups/key-pcb.html`. |
| Layer and view chips | PCB, Layout, Case, isolated cell mode | Toggle buttons with `aria-pressed`. PCB layer chips: F.Cu, B.Cu, Edge, Keep-outs; on by default. Outline chip (Layout, O): on by default. Assembly chip (Case, A): off by default. |

### Workspace-specific

| Component | Use | Behavioral rules |
|---|---|---|
| Operation list | Shapes, Case | Ordered named entries; selecting one highlights its result (2D in Shapes, 3D in Case) and shows its fields below. Add via `+ add operation` or Ctrl+K. A long selected operation (18-vertex polygon) collapses the list to the selected entry, with a `▸ N more` row above it that expands the list. Shapes adds Construction (line intersection from two lines, each two anchor-picker points) and Plates sections. `Use as outline` moves the outline marker ★; exactly one shape holds it. |
| Vertex table | Polygon operation | Row = anchor + offset. `Pick vertices` (pick mode): each pick appends a row anchored there with zero offset. Add a row with `+ vertex` or insert row; set its anchor with the anchor picker and type the offset. Dragging a vertex changes its offset (see Write-back). |
| Plate fields | Shapes → Plates | Shape dropdown, cutout-role checkboxes, user cutout shapes list; the canvas previews the plate with cutouts; DXF/SVG/gerber export per plate. |
| Keymap layer tabs | Firmware, overlay at the canvas top-left | `role=tablist`. `+` adds; double-click renames; drag or `Move left/right` reorders; right-click → context menu (Rename, Duplicate, Move left/right, Delete); Delete deletes the focused tab; one undo restores it. Layer references: see Upstream Handoffs. |
| Firmware legends | Firmware canvas | Show each key's binding on the selected layer: transparent = faint ▽; none = empty cap; mod-tap / layer-tap = tap over hold; hardware-less action (RGB without LEDs, Bluetooth on wired) = ▲ plus a violation naming the slot. |
| 3D viewer | Case | Left-drag orbit; middle-drag or Space+drag pan; wheel zoom to cursor; Home or 0 = top view aligned with the shared viewport; right-click = context menu (Hide body, Top view, Export). Keyboard (viewer focused): arrows orbit, Shift+arrows pan, + / − zoom. The camera starts from the shared viewport's top-down view. Never blanks once a solid exists (see State Patterns). |
| Assembly legend | Case, Assembly chip on (A) | Plates and PCB fade in at real heights; one checkbox per body hides it. → `mockups/key-case.html` (frame 2). |
| Isolated cell mode | PCB; `Edit key cell` | Opens the key cell alone, large and centered, with its own zoom; header `‹ Board (Esc) · key cell <id>`; the PCB tab stays active. Components placed by drag or inspector fields (offset/rotation expressions; same drag/nudge/rotate rules as keys). Track tool (W). Cell-level DRC runs live; while in isolated cell mode, its errors show on the canvas only (marker + callout), not in the status strip or tab badge. Per-group key-cell overrides open the same way (choose which cell). Esc (last in Esc precedence) returns to the board at the shared viewport. |
| Track tool | Isolated cell mode, W | Click a pad, click corners, click the target pad to finish; snaps to pads and 45° (Shift = free). X switches F.Cu/B.Cu and drops a via. Backspace removes the last segment; Esc cancels. Existing track: select, drag corners, Delete. Width from net class, overridable in the inspector. One finished track = one undo step. |

## State Patterns

### Output states

This table is the one home for the status strip, tab badges and staleness.

| State | Status strip / tab badge | In the workspace |
|---|---|---|
| current | ✓ + `current` | — |
| waiting for edit to finish | ◌ + text | During a gesture or nudge burst, live outputs (placement, Outline, Plates) update continuously; background outputs (PCB, Case) wait, then start after commit or a debounce pause (AD-11) |
| rebuilding / routing | spinner + `rebuilding N%` / `routing N/M`; badge progress ring | — |
| stale | hatch + `stale` | Geometry desaturated and hatched with `stale · rev <hash>`; connections being rerouted drawn as dashed ratsnest, never as finished routes; 3D: last good solid grayed under the progress bar until the new one lands |
| failed `[ASSUMPTION]` | ● + `failed: <message>` | Last good output stays, marked stale; message also in the violations panel |
| error / warning count | ● N / ▲ N | ids carry markers (see Canvas marks) |
| first build, no output yet `[ASSUMPTION]` | `rebuilding N%` | Case: `No case solid yet.` under the progress bar; PCB: ratsnest only |

After undo, PCB shows `routing N/M`: routes are not on the undo stack, so copper may differ while staying electrically equal.

### File

| State | Where | Treatment |
|---|---|---|
| saved / unsaved | Top bar | Chromium: `saved` / `unsaved changes` (not yet written to file). Firefox: `saved to browser · last download rev <hash>`. Autosave is silent; browser autosave is the source of truth |
| first save (Chromium) | Ctrl+S | File System Access: asks for a location once, then saves silently |
| save (Firefox) | Ctrl+S | Degrades openly: downloads `<design>.rev<hash>.<ext>`; Open uses the standard file picker |
| save failed `[ASSUMPTION]` | Toast | `save failed: <reason>`; state stays `unsaved changes` |
| autosave failed `[ASSUMPTION]` | Banner | `Autosave failed: browser storage full. Save to file (Ctrl+S).` |
| read-only (second tab) | Banner | `Read-only — this design is open for editing in another tab.` + `Take over editing`. Read-only disables every command that changes the authored sections; selection, navigation, export and `Copy design…` stay enabled `[ASSUMPTION]`. Take over: this tab edits; the other tab cancels its gesture, stops autosave, drops in-flight background results and shows the banner |
| format-too-new | Banner | `Made with a newer keeb-cad (format N). Read-only here.` Older formats migrate silently with toast `Upgraded from format N`; the next save writes the new format |
| cannot open `[ASSUMPTION]` | Start screen + toast | `cannot open corney.kdl: <parse or schema error> at line N`; nothing replaced |
| cold load `[ASSUMPTION]` | Whole app | The frame renders at once; status strip entries show `rebuilding N%` while WASM/replicad initialize; Layout is editable immediately |

### Empty states

| State | Where | Treatment |
|---|---|---|
| empty: no design | Start screen | See Component Patterns › Start screen |
| empty: new design | Layout | One hint: `Add a group (G) or open the command palette (Ctrl+K).` |
| empty: Shapes | Shapes | `No shapes. Add a key outline (+) to start the outline.` + `+ Key outline`. Shapes without ★: warning violation `outline: none set` |
| empty: PCB | PCB | No keys: `No parts placed. Place keys in Layout (1).` No key cell: `No key cell. Create one (Edit key cell).` |
| empty: Case | Case | Single action `Insert tray case` — expands the template once into operation list and parameters (AD-18) |
| empty: Firmware | Firmware | `No keymap. Add a layer (+).` — `+` creates `base` with every key `none` |
| empty: panels | Violations, Parameters, Tree | `0 violations`; `No parameters. Type a new name in any field to create one.`; `No nodes. Add a group (G).` `[ASSUMPTION]` |

### Interaction states

| State | Where | Treatment |
|---|---|---|
| blocked | Export menu | Disabled + `blocked: <reason>` linking to violations |
| violation | Canvas + panel | Overlap area outlined solid (error) or dashed (warning); ids carry ●/▲; anchor cycles draw the cycle path; hardware-less bindings mark the key ▲ |
| invalid expression | Field | Error underline and message; last valid value kept |
| rejected command | Toast | `rejected: <what + where>`; nothing changes |
| selection: mixed | Inspector | `mixed` placeholder; slots + groups show common fields only |
| pick mode active | Status strip left + cursor | `picking: anchor · Enter done · Esc ends` `[ASSUMPTION]`; picked target highlighted |
| isolated cell mode | Canvas header | See Component Patterns › Isolated cell mode |
| focus | Everywhere | `{colors.focus}` ring, offset outside the element |

## Interaction Primitives

**Gesture model.** begin → update → commit | cancel (AD-2). One gesture = one undo step. The undo toast names the command; no history panel in M1.

**2D pointer map.** Wheel zooms to cursor; middle-drag or Space+drag pans; trackpad two-finger scroll pans, pinch zooms. Left-drag starting on a key moves it; left-drag on a group frame's handle tab moves the group. Click on empty space inside a frame selects the group; drag from empty space (inside or outside frames) box-selects; Shift+drag always box-selects, adding to the selection. Shift-click adds. F fits the selection (or the whole board). Tree and canvas selection stay synced.

**Gestures per workspace.** Layout: key, group and rotation-handle drags, nudge, rotate. Shapes: vertex drag only; other primitives are edited in fields `[ASSUMPTION]`. PCB board: select only. Isolated cell mode: component drag, rotation handle, track tool. Firmware and Case: select only. Right half, any workspace: select only.

**Chain drag rule.** Dragging a key in a chain changes its own step; later siblings follow. The movement along the chain direction goes to `gap`, the perpendicular part to `offset.y`; rotation is untouched. Deltas are converted into the node's anchor frame. Alt-drag compensates: it takes the same change off the next step, so only the dragged key moves (Ctrl-drag if Alt collides). Groups drag by the same rule.

**Multi-selection.** A drag, nudge or rotate moves only selected nodes with no selected ancestor in the dependency graph; the world delta is converted per node into its own anchor frame.

**Write-back.** On a plain literal, a drag/nudge/rotate changes the value. On an expression, the last literal mm (or deg) term is the drag term, whoever wrote it; if there is none, one is appended (`0.25u` → `0.25u + 0.37mm`). To protect a typed constant, put it earlier or use a parameter. Values round to 0.01 mm and 0.1°.

**Nudge.** Arrows move the selection 0.25 mm, Shift 1 mm, Ctrl 0.05 mm (see Nudge-step control); Alt+arrow compensates the next step. A burst of nudges/rotates is one gesture and one undo step; the burst ends after 600 ms idle, on any non-nudge key, or on any pointer action `[ASSUMPTION]`.

**Rotate.** `[` / `]` rotate about the pivot by 1° (Shift 5°), or drag the rotation handle; same write-back.

**Re-anchor.** Through the anchor picker only. The node stays put: its offsets are flattened to plain numbers relative to the new anchor; toast `Offsets recomputed for new anchor; expressions replaced`; one undo restores all.

**Pick modes.** Anchor pick, `Pick vertices`, `Pick LED order`, construction-point line anchors, pin reassignment. While active, candidate attach points light as Mauve dots and a rubber band runs from the last picked point to the cursor. Click targets in order, or type an id / Tab through candidates and press Enter. Enter or Esc ends the mode keeping what was picked; one pick session = one undo step `[ASSUMPTION]`.

**Esc precedence.** One Esc does the innermost step only `[ASSUMPTION: order]`: (1) cancel a drag or track being drawn; (2) close an open dropdown or menu; (3) leave a field (restoring an uncommitted value); (4) end a pick mode; (5) close an overlay (palette, cheat sheet, slide-out, violations panel); (6) clear the selection; (7) leave isolated cell mode.

**Focus and regions.** F6 / Shift+F6 cycle regions: top bar, slide-out (when open), canvas, inspector, status strip `[ASSUMPTION]`. The canvas is one focusable region with an edge focus ring; nudge, rotate and Delete act on the selection only while the canvas has focus. Opening an overlay focuses its first meaningful item; modal overlays (palette, cheat sheet, Part picker) trap focus, non-modal ones (slide-out, violations panel, menus) do not; closing returns focus to the invoker, else the canvas.

**Shortcuts.** Bound to physical keys (`KeyboardEvent.code`), so they work on Ukrainian and other layouts; labels come from the layout map where available. Workspace keys are plain 1..5. With any field focused, every canvas and single-key command is off; only Ctrl+K, Ctrl+S, Ctrl+Shift+S, Ctrl+O and Ctrl+Z / Ctrl+Shift+Z stay global. Ctrl chords call `preventDefault`; each Ctrl chord (Ctrl+Shift+S and Ctrl+1..5 included) and Alt-drag is verified in Chromium and Firefox at build time (manual check) `[ASSUMPTION: manual]`, with File menu / palette and Ctrl-drag fallbacks.

| Key | Action |
|---|---|
| 1..5 | Layout, Shapes, PCB, Case, Firmware (Ctrl+1..5 too, only if the browser lets the page intercept) |
| Ctrl+K | Command palette |
| Ctrl+Z / Ctrl+Shift+Z | Undo / redo |
| Ctrl+S / Ctrl+Shift+S / Ctrl+O | Save / Save to file… / Open (all also in the File menu) |
| G / S / P | Add group / add slot / place part |
| T | Slide-out (last-used tab) |
| V | Violations panel |
| F8 / Shift+F8 | Next / previous violation |
| F | Fit selection or board |
| F6 / Shift+F6 | Next / previous region |
| Shift+F10, Menu | Context menu |
| ? | Cheat sheet |
| Delete | Delete what has keyboard focus (layer tab, row, or canvas selection) |
| Ctrl+D | Duplicate |
| Esc | Innermost step (see Esc precedence) |
| Arrows (+Shift/Ctrl/Alt) | Nudge (Alt compensates); orbit/pan in a focused 3D viewer |
| [ / ] (+Shift) | Rotate |
| Alt (during drag) | Compensate next step |
| Space+drag, middle-drag | Pan |
| O | Layout: Outline chip |
| M / L / I | PCB: Matrix / LED chain / Pins chips |
| W / X / Backspace | Isolated cell mode: track tool / switch layer + via / remove last segment |
| A | Case: Assembly chip |
| Home, 0 | Case: top view `[ASSUMPTION: 0 alias for laptops without Home]` |

## Accessibility Floor

Behavioral. Visual contrast lives in DESIGN.md › Colors.

- Everything keyboard-reachable: regions by F6, pick modes by typed id or Tab, context menu by Shift+F10, 3D viewer by arrows, multi-select through the tree. Visible `{colors.focus}` ring. No focus traps except modal overlays; Esc always leaves a binding field.
- Color is never the only signal: error ● + Red, warning ▲ + Yellow, overlap severity by solid vs dashed outline, stale hatch + label, override `*`, B.Cu by opacity and inspector label, chip state by ✓ + fill.
- WCAG AA text contrast and 3:1 non-text contrast in both themes (see DESIGN.md › Colors, Contrast targets).
- `prefers-reduced-motion`: violation flash → static highlight; auto pan/zoom-to-fit → jump; slide-out, violations panel, palette, menus and toasts appear instantly; Assembly fade-in → instant; 3D Home camera move → jump; spinner and progress ring → static ◐ beside `N%`.
- Semantic HTML for panels and fields: `role=tablist` for workspace and keymap layer tabs; tab badges have accessible names; `aria-invalid` + `aria-describedby` on fields; `aria-pressed` on chips; `aria-disabled` on blocked Export items; toasts `role=status`, banners `role=alert`. Canvas screen-reader support is out of M1 scope.
- Targets: chrome controls at least `{spacing.target-min}`; canvas handles at least `{spacing.canvas-hit-radius}` at any zoom.

## Key Flows

Protagonist: Sergii, builder and sole user, on a laptop.

### J1 — First build of Corney Island

1. Sergii launches keeb-cad; no autosave exists, so the Start screen offers New design (→ `mockups/key-start.html`). The empty Layout shows `Add a group (G) or open the command palette (Ctrl+K).`
2. With nothing selected, Design settings show form `split-reversible`; Sergii sets `pitch-x` / `pitch-y`. G adds group `matrix`; Sergii then adds column groups in a chain, with slots in each. The derived right half appears mirrored as they go.
3. Sergii types stagger offsets as expressions (`0.25u`), drags keys roughly and corrects the number; later siblings follow the chain rule.
4. Sergii builds the thumb group as a chain, anchors it with the anchor picker to a key's attach point, and rotates it with the rotation handle or `[` / `]`.
5. P places the MCU module, display and TRRS; the Part field picks each from the catalogue, and Sergii anchors each with the anchor picker. Population: all fitted on both sides.
6. Shapes (2) (→ `mockups/key-shapes.html`): the viewport stays put. Sergii adds `+ Key outline`, then a polygon; in `Pick vertices` they click key corners and construction points in order and type offsets in the vertex table; then they add an offset operation with a fillet and choose `Use as outline`.
7. Sergii adds a construction point (line intersection) in the Construction section and picks it as a vertex anchor.
8. Sergii adds plates — front plate, backplate, MCU cover — each with a shape and cutout roles; DXF export per plate.
9. PCB (3): `No key cell. Create one (Edit key cell).` In isolated cell mode (→ `mockups/key-cell.html`), Sergii places switch, diode and LED components and draws local tracks with W (X for a via); cell DRC passes; Esc returns to the board.
10. With the M and L chips on (→ `mockups/key-pcb.html`), Sergii overrides a column (`R1·C5*`) in the inspector and runs `Pick LED order`; I shows pins; Sergii reassigns an MCU pin.
11. Routing runs on its own; the strip shows `routing 41/56`, with unrouted connections as dashed ratsnest. F8 steps through DRC violations; Sergii fixes each in Layout or design rules.
12. Case (4) (→ `mockups/key-case.html`): Sergii inserts the tray case (`Insert tray case`) and sets wall and gap in the Parameters slide-out; A shows plates and PCB at real heights to check fit.
13. Firmware (5) (→ `mockups/key-firmware.html`): both halves side by side. Per layer, Sergii selects a key and presses its binding, Tab advancing key by key; Esc and Tab bindings come from the picker (↓); mod-tap gets two fields; combos go through `Add combo`.
14. From the Export menu, Sergii exports gerber + drill, STL and ZMK config. When gerber is disabled, its reason links to the violations panel.
15. **Climax:** the status strip reads ✓ across Outline, Plates, PCB `0 unrouted`, Case, Firmware — a full pass from a blank canvas. Ctrl+S asks for a location once and writes the file.

Failure: an expression with `u` on rotation shows `unit-mismatch: u on rotation` and does not commit; the canvas keeps the last valid value. Export blocked by DRC errors names them and links to each.

### J2 — The thumb-fan edit

This journey runs the PRD SM-5 edit script on the finished design; after each step, the outline, plates, PCB, case and firmware are current or visibly updating.

1. **Move one thumb-fan key.** Sergii drags thumb-home; its step changes and thumb-reachy follows (Alt-drag would compensate, keeping it still). Write-back appends `+ 0.37mm`.
2. **Rotate the thumb fan.** Sergii selects the thumb group and drags its rotation handle 5° about the group origin (→ `mockups/key-layout.html`). **Climax:** the Outline context line follows under the mouse in Layout; the status strip shows PCB and Case `waiting for edit to finish`, then `routing N/M` and `rebuilding N%` after release. Switching to PCB (3) and Case (4) confirms it: PCB reroutes only the broken connections, dashed ratsnest turning into routes; the case rebuilds; the keymap stays attached to its keys. Zero manual fix-ups.
3. **Shift one column's stagger.** Sergii edits the column's offset expression; the field previews live, and Enter commits one undo step.
4. **Change pitch.** In Design settings, Sergii changes `pitch-x`; every chain re-spaces live and `u` re-evaluates (axis: see Upstream Handoffs).
5. **Change a case parameter.** Sergii changes the case wall in the Parameters slide-out; the 3D solid grays under the progress bar and is replaced when the new one lands.
6. The status strip returns to ✓ everywhere, `0 unrouted`.

Failure: the rotation causes an overlap — the area outlines solid Red, and `overlap: left/thumb-home ↔ left/thumb-tucky (1.1 mm)` enters the violations panel (→ `mockups/key-panels.html` (a)); Ctrl+Z (`Undid: rotate thumb`) or a nudge fixes it, and the violation leaves only then. After undo, PCB shows `routing N/M`; copper may differ but stays electrically equal.

### J3 — Corney Island wireless from wired

1. File → `Copy design…` → `corney-island-wireless` (File menu → `mockups/key-start.html`); the copy opens, and Design info shows `copied from corney-island · rev <hash>`.
2. In Layout, Sergii selects the OLED slot; Part field → Part picker → nice!view (→ `mockups/key-panels.html` (e)).
3. Sergii deletes the TRRS slot (its connections and keymap entries go in the same undo step), then P places a JST PH battery connector and a power switch, each anchored with the anchor picker.
4. Population: battery connector and switch fitted on both sides.
5. PCB reroutes only the broken connections; progress shows in the status strip.
6. In Firmware, Sergii adds Bluetooth bindings on a layer.
7. Sergii exports gerber + drill and ZMK config.
8. **Climax:** PCB shows `0 unrouted` with the wired routes around the keys untouched.

Failure: a Bluetooth binding on the wired original marks the key ▲ with a violation naming the slot; the copy has no such violation.

## Inspiration & Anti-patterns

Lifted from: Catppuccin (the builder's daily theme); KiCad copper conventions (warm F.Cu, cool B.Cu; F.Cu/B.Cu/Edge naming).

Rejected:

- **Tiled outputs** (all outputs side by side) — little value in seeing every output at once.
- **Structured document** — too data-heavy for things that only make sense visually.
- **One canvas with layers and modes** — "looks strange"; the same picture every time felt wrong.
- **Typed command grammar** for shapes — would mean learning a new grammar.
- **Freehand outline drawing** — the outline is a composition of geometric operations (PRD).
- **Table-based PCB overrides** — overrides live on the canvas.
- **Peach selection** — Mauve chosen (see DESIGN.md › Colors for the rationale).

## Responsive & Platform

| Concern | Rule |
|---|---|
| Form factor | Desktop browser only. 1366×768 floor; larger screens widen the canvas, panels keep their widths. No touch, no mobile. |
| Trackpad | See Interaction Primitives › 2D pointer map. |
| Chromium | File System Access save (see State Patterns › File). |
| Firefox | Degrades openly (see State Patterns › File). |
| Keyboard layouts | See Interaction Primitives › Shortcuts. |
| Browser / WM chords | See Interaction Primitives › Shortcuts. |

## Upstream Handoffs

| Item | To | Ask |
|---|---|---|
| 3D case preview + Assembly (F-12) | bmad-architecture, Sofia | 3D rendering library in Stack, owner package and Glossary term for 3D preview, plate/PCB 3D bodies at thickness; epic-tray-case requirement. Case stories wait for this. |
| Keymap layer stable ids (F-14) | bmad-architecture | Layers need stable ids so `layer-tap` / `momentary-layer` / `toggle-layer` survive reorder, duplicate and delete; deleting a referenced layer is rejected naming the referring slots, or cascades in one command. |
| Construction point from parallel/coincident lines (F-72) | bmad-architecture | A `model` violation kind (for example `construction-undefined`); UI shows ● on the point. |
| Reversibility vs split-mirrored (raised by Sergii) | bmad-architecture, Sofia | Defer reversibility past M1? Corney's footprints are reversible; AD-6, FR-4, SM-3 would change. UX proceeds on split-reversible; right-half geometry overrides are designed but locked. |
| PRD "no manual trace editing" | Sofia | Confirm it covers board routing only, not key-cell local tracks (key cell = components + local tracks). |
| FR-5 "Save As" wording | Sofia | Behavior ships as `Copy design…`; `Save to file…` keeps the same design. Reword FR-5. |
| SM-5 "change pitch" axis | Sofia | `pitch-x`, `pitch-y` or both. |
| Epic companions (story 5 verify) | Sofia | Add DESIGN.md and EXPERIENCE.md to `companions:` in `epic-platform-baseline.md`. |

## Open Items

The register of every inline `[ASSUMPTION]` in this spine, plus gaps and naming questions. Visual open notes live in DESIGN.md › Colors.

**Assumptions** (to revisit after the Corney Island rebuild):

- Voice and Tone — `waiting for edit to finish`: renamed from `waiting for drag to finish` because nudge bursts and field previews also hold it.
- Voice and Tone — `failed: <message>` status wording.
- Voice and Tone — revisions as a 7-character hash (`rev 3f2a91c`).
- Global chrome › Design info — placement as a popover from the design name.
- Global chrome › Toast — auto-hide after ~4 s.
- Panels and overlays › Left rail + slide-out — T opens the last-used tab.
- Panels and overlays › Inspector — the most recently used sections stay open (calm density at 1366×768 needs collapsible sections; not explicitly confirmed).
- Panels and overlays › Inspector — multi-selection typing applies to all as one undo step.
- Panels and overlays › Command palette — `no match for "<query>"`.
- Fields and pickers › Anchor picker — cycle-creating targets dimmed with `would create anchor cycle`.
- Fields and pickers › Binding field — Tab order: left half then right half, row-major by matrix row/column.
- Canvas › Rotation handle — multi-selection rotates each node about its own pivot.
- State Patterns › Output states — `failed` state treatment.
- State Patterns › Output states — first build, no output yet.
- State Patterns › File — save failed.
- State Patterns › File — autosave failed.
- State Patterns › File — read-only keeps selection, navigation, export and `Copy design…` enabled.
- State Patterns › File — cannot open.
- State Patterns › File — cold load.
- State Patterns › Empty states — `No nodes. Add a group (G).`
- State Patterns › Interaction states — pick-mode hint text.
- Interaction Primitives › Gestures per workspace — Shapes primitives other than vertices are edited in fields.
- Interaction Primitives › Nudge — burst ends after 600 ms idle, on any non-nudge key, or on any pointer action.
- Interaction Primitives › Pick modes — one pick session = one undo step.
- Interaction Primitives › Esc precedence — the order.
- Interaction Primitives › Focus and regions — F6 region order.
- Interaction Primitives › Shortcuts — chord verification is a manual check at build time.
- Interaction Primitives › Shortcuts — `0` as a Home alias for laptops without Home.

**Gaps:**

- `[GAP]` Authored keep-out creation and keep-out color on the PCB canvas.

**Naming:**

- Key cell names in mocks (`choc-v2-cell`, `choc-v2-hotswap`) are user-authored design data, illustrative only; not a UX spec.
- Chain position in the inspector reads `chain thumb · 2 of 3` (1-based display; the glossary index stays 0-based in data) `[ASSUMPTION]`.

**Other:**

- Visual open notes (right-half dimming numbers; one Mauve pick color): see DESIGN.md › Colors.
- Facilitator-proposed, user-accepted bundles (output state, violations, file lifecycle, shortcuts, expression editing): revisit after the Corney Island rebuild.
