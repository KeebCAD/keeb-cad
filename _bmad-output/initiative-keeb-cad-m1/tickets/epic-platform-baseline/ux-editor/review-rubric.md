# Spine Pair Review — keeb-cad

## Overall verdict
The pair is a solid contract for the Layout, expression, drag and output-state work. Tokens are complete with dark/light pairs, every mock is linked, and almost every memlog decision is carried over faithfully. It is not yet complete for every editor story. The key-cell UI that R7 names is still a [GAP]. The J2 climax contradicts the interaction primitives. Error and cold-load states are missing. One memlog decision (Firmware legends) and the Inspiration/rejects section were dropped. No critical findings.

## 1. Flow coverage — adequate
Checked: ticket R7 topics (editor views, panels, drag semantics, key-cell UI, expression UI) and the memlog journeys J1 "First build of Corney Island" / J2 "The thumb-fan edit" (memlog L58) against EXPERIENCE.md Key Flows. Both flows have a named protagonist, numbered steps, a climax and a failure path. Views, panels, drag and expression UI are exercised (J1.3, J1.5, J2.1, J2.3, J2.4).

### Findings
- **high** R7 and the architecture Deferred row ("Editor views, drag semantics, expression UI, key-cell editor → UX session") assign the key-cell editor to this session. The spines define only how isolated cell mode is entered and left. The tooling inside it is `[GAP]`, and J1.8 has no editing beat (EXPERIENCE.md IA "Key-cell exception", J1.8, Open Items). Story-dev cannot build a key-cell editor from this. *Fix:* decide the in-cell tooling (place components, local tracks, pin roles) and add a J1 step for it. Otherwise record an explicit PO/architecture deferral, since the ticket says this session decides it.
- **high** The J2 climax contradicts the Interaction Primitives. Step 2 rotates with `Shift+]`, a discrete keypress, but the climax says outlines "follow under the hand" and PCB shows `waiting for drag to finish`. That state is defined only during a gesture. Memlog L58 says "under the mouse", yet no mouse-rotate gesture exists anywhere (only `[`/`]` and typed values) (EXPERIENCE.md J2.2, Interaction Primitives "Rotate", State Patterns "waiting for drag"). *Fix:* either add a rotate-drag gesture (e.g. a rotation handle on the group frame) or rewrite the climax around a key burst. In the second case, define how background stages treat a nudge/rotate burst, which also settles the open burst-boundary assumption.
- **medium** J1 never places a part (MCU module, display, TRRS), though Corney Island needs them and `P` "place part" is a shortcut. No component pattern covers part placement or the catalogue picker, and Open Items does not list this as a gap (EXPERIENCE.md J1, Shortcuts, Component Patterns). *Fix:* add a part-placement step and a Part picker row in both spines, or log a `[GAP]`.
- **low** J1.2 "G adds the matrix group" uses an undefined term. It reads like a special group kind (EXPERIENCE.md J1.2). *Fix:* name the group by id or role, using glossary terms.

## 2. Token completeness — adequate
Checked: all 31 dark colour tokens have hex values and all 31 have `-light` pairs. Typography, rounded and spacing entries are complete. Every `{path}` reference in the DESIGN.md prose and frontmatter components, and every EXPERIENCE.md token reference, resolves. Contrast ratios were recomputed for the stated pairs.

### Findings
- **medium** Latte `key-top-face-light` `#9ca0b0` is darker than `key-body-light` `#acb0be` (1.2:1). This contradicts the decided "lighter top face" (memlog L40) and DESIGN.md Elevation & Depth ("key top face is lighter than the body"). Open Items flags it as "verify", but the committed value is wrong, and downstream code will mirror it (DESIGN.md frontmatter L61–62). *Fix:* pick Latte values with the top face lighter than the body, and remove the Open Item.
- **medium** Things the spines draw have no colour token. Missing: the PCB `Edge` layer (a named layer chip), footprints/pads/silkscreen on the PCB canvas, warning-severity overlap (State Patterns says "outlined Red/Amber", but only a Red `overlap-fill` exists), the anchor-cycle path, the 3D bodies (case, plates, PCB in Assembly), Firmware legend text, and hover/pressed states for rows, chips and buttons. The keep-out colour is already a `[GAP]` (DESIGN.md frontmatter `colors`; EXPERIENCE.md Layer chips, State Patterns "violation"). *Fix:* add tokens, or `[GAP]` entries for each.
- **medium** Non-text contrast (WCAG 1.4.11) is never stated for load-bearing canvas marks. Key body vs canvas is 1.7:1 in Frappé and 1.4:1 in Latte. Latte Mauve selection on `canvas-light` is 3.5:1. The grid is 1.3:1 (fine for a grid, not for keys) (DESIGN.md Colors "Contrast"). *Fix:* state ≥3:1 targets for keys, selection outlines, anchor links and ratsnest on the canvas, and adjust the Latte key body.
- **low** Stated ratios are slightly off: Latte Green is 3.0 (stated 2.7) and Latte Blue is 4.3 (stated 4.0). Latte Red on `chrome-light` is 4.46, below AA, if error text ever sits on chrome (status strip, field background) (DESIGN.md Colors). *Fix:* correct the numbers, and keep error text on `panel-light`.
- **low** Some literals and assumptions are not tokens. The overlay shadow `0 6px 18px rgba(0,0,0,.35)` is prose only. `key-outline-faint` has "reduced opacity" with no alpha. Spacing `'3'` duplicates `pad` (13px) in an odd 4/8/13/20 scale (DESIGN.md Elevation & Depth, frontmatter `spacing`). *Fix:* add a `shadow-overlay` value and an alpha, and confirm the scale.

## 3. Component coverage — thin
Checked: 25 DESIGN.md component entries against 23 EXPERIENCE.md Component Patterns rows, plus every component named in prose, the IA, the flows and the memlog.

### Findings
- **high** The Firmware legend rules (memlog L55(2)) are missing from both spines: transparent = faint ▽, none = empty cap, mod-tap/layer-tap = two lines (tap over hold). DESIGN.md Canvas keys says only "Firmware: keycaps with legends" (DESIGN.md Components "Canvas keys"; EXPERIENCE.md "Binding field"). *Fix:* add the legend rules to DESIGN.md Canvas keys and the display rules to EXPERIENCE.md.
- **medium** Design info (memlog L32(3): `copied from <design> · rev N`) appears only in the Surface closure table. It has no component row in either spine and no stated location (EXPERIENCE.md Surface closure). *Fix:* add a Design info component (where it opens, what it shows) to both spines.
- **medium** Several named surfaces lack a visual spec, a behavioural spec, or both. They are the start screen (state row only), the parameters slide-out (parameter rows; create, rename and delete parameter), tree rows, the autocomplete dropdown, isolated cell mode (chrome and the way back), the nudge-step setting control, and the Assembly body legend (EXPERIENCE.md IA, Component Patterns; DESIGN.md Components). *Fix:* add rows for each in both spines.
- **medium** Some canvas marks have behaviour or tokens but no DESIGN.md component: construction-point crosshair and guide lines (memlog L48(1)), vertex markers, violation ●/▲ markers on ids, the anchor-cycle path drawing, and how a combo is shown on the Firmware canvas (DESIGN.md Components). *Fix:* add canvas-mark entries.
- **medium** ☝️ Binding capture leaves gaps in its own logic. Tab "captures and advances" and Esc "leaves the field", so neither Tab nor Esc can be captured as a binding, and the spine never says the picker is the route for them. Arrow keys and `?` behave the same way (EXPERIENCE.md "Binding field"). *Fix:* state which keys are reserved during capture and that the picker binds them.
- **medium** ☝️ The shortcut table assumes browser-reserved chords can be taken over. `Ctrl+1..5` switch tabs in Chromium on Linux and may not reach the page. `Ctrl+D` (bookmark), `Ctrl+K` (search bar) and `Ctrl+O` need `preventDefault`. Alt-drag is a window-move chord on some Linux window managers (EXPERIENCE.md Shortcuts, Chain drag rule). *Fix:* verify each in Chromium and Firefox on the target OS, and name fallbacks (e.g. Alt+1..5 or plain 1..5 when no field is focused).
- **low** `T` is ambiguous: one slide-out holding both tree and parameters, or two panels sharing a key? There is no separate shortcut to open parameters (EXPERIENCE.md Shortcuts "T | Tree + parameters slide-out"; DESIGN.md "Left rail + slide-out"). *Fix:* state the model (e.g. two rail icons, `T` toggles the last one used, `Ctrl+click` opens parameters).

## 4. State coverage — thin
Checked: every IA surface (five workspaces, start screen, isolated cell mode, slide-outs, violations panel, command palette, Export menu) for empty, cold-load, focus, error, permission-denied and read-only states.

### Findings
- **high** Load and failure states are missing entirely. Nothing covers: opening an invalid or corrupt design file (KDL parse error, schema error), a save failure or file-permission denial, autosave quota exceeded, and a background stage that throws (worker, replicad or routing crash, as opposed to a violation). Cold load is also missing: app start, WASM/replicad init, and the first Case build, where no "last good solid" exists, so "never blanks" cannot hold (EXPERIENCE.md State Patterns). *Fix:* add a row for each, with voice-compliant messages.
- **medium** ☝️ Firefox has no File System Access API. "Ctrl+S asks location first time" followed by silent overwrites (memlog L32(3)) works only in Chromium, yet Foundation lists Firefox. The "asks location first time" rule itself is also missing from the spines (EXPERIENCE.md Foundation, Shortcuts, State "saved / unsaved"). *Fix:* define Firefox save behaviour (download on each save) or narrow the supported browsers, and carry over the first-save rule.
- **medium** Selection and mode states are missing. The multi-selection inspector is undefined (how expression fields show mixed values; slots and groups selected together). So are the active-pick-mode indicator (cursor, hint), the isolated-cell-mode indicator, what read-only disables, and what `Take over editing` does to the other tab (EXPERIENCE.md Inspector, Pick modes, State "read-only"). *Fix:* add state rows.
- **low** Empty states for Shapes, PCB and Firmware are already a `[GAP]`. Also unspecified: the violations panel with 0 violations, a command palette with no match, and an empty parameters/tree slide-out (EXPERIENCE.md State Patterns). *Fix:* decide them along with the existing gap.
- **low** Hover and disabled states are defined only for Export rows (EXPERIENCE.md, DESIGN.md Components). *Fix:* add a general hover/disabled rule.

## 5. Visual reference coverage — strong
Checked: all 8 files in `mockups/` (canvas-model-storyboard, color-themes-1, key-rendering-1, oplist-placement-1, panel-models, pcb-overrides-1, selection-accent-1, typography-1). Each is linked inline at its section, and the option or variation is named for 7 of 8. "Spines win on conflict" is stated. `imports/` and `wireframes/` are empty or absent. No orphans.

### Findings
- **low** `mockups/selection-accent-1.html` is linked without naming the chosen option (c, Mauve). `color-themes-1.html` variation 5 still shows Peach selection, so a reader needs the pointer (DESIGN.md Colors). *Fix:* write "(option c, Mauve; variation 5's Peach selection is superseded)".

## 6. Bloat & overspecification — strong
Checked: pixel specs, restated ticket or source content, prose that should be tables, and decorative narrative. Both spines are lean and table-heavy, and EXPERIENCE.md prose carries no editorial voice.

### Findings
- **low** The status strip, violations panel and staleness are each described three times (IA "Global chrome", Component Patterns, State Patterns), which invites drift (EXPERIENCE.md). *Fix:* keep one sentence in IA and point to Component Patterns.

## 7. Inheritance discipline — adequate
Checked: `sources` resolve (all three paths exist); journey names are verbatim from memlog L58; glossary use was compared with the architecture Glossary; component names across sections; token references; and every memlog decision line L9–L58 against the spines.

### Findings
- **medium** Some memlog decisions are missing from the spines (besides the legends in §3 and the rejects in §8): L32(3) "asks location first time"; L44 "outputs never edited directly / no manual traces" (a load-bearing rule for PCB); L51(1) "unrouted = 'unrouted' entries in the violations panel"; L42 "no typed command grammar" (EXPERIENCE.md Component Patterns, State Patterns). *Fix:* carry each over.
- **medium** Glossary drift goes against the memlog L7 rule "glossary terms only in UI". The spines use "footprints" (Glossary: component), "mcu" / "MCU pin" (Glossary: module; pins are pads), "Amber" (DESIGN.md says Yellow), "matrix group", and "op" for case operation / geometry operation. UI-only terms (workspace, inspector, chip, keycap, legend) are never declared as chrome vocabulary (EXPERIENCE.md IA, Overlay chips, State Patterns, J1). *Fix:* replace with glossary terms, and add a short "UI chrome terms (not domain)" note.
- **low** `sources` omits the parent initiative (`initiative-keeb-cad-m1.md`, the Boundaries behind R7) and the PRD memlog, PRD addendum and architecture memlog that memlog L44 says bind the workspace UX (EXPERIENCE.md frontmatter). *Fix:* add them.
- **low** Component names drift between files: DESIGN "Layer tab" vs EXP "Layer tabs"; DESIGN "Chip (overlay and layer chips)" / "PCB overlays" vs EXP "Overlay chips" / "Layer chips"; DESIGN "Workspace tab" has no EXP row; DESIGN "Command palette / context menu" vs two EXP rows. "Layer" also means both PCB copper layers and keymap layers. *Fix:* use one name per component, and rename "Layer tabs" to "Keymap layer tabs".
- **low** Status vocabulary casing differs: `Blocked: 2 DRC errors…` vs the fixed vocabulary `blocked: <reason>` (EXPERIENCE.md Voice and Tone). *Fix:* pick one.

## 8. Shape fit — adequate
Checked: DESIGN.md section order (Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts: correct and complete); EXPERIENCE.md required defaults (all 8 present); Responsive & Platform present; invented sections (3D Scope Flag, Open Items, Surface closure) each earn their place.

### Findings
- **medium** Inspiration & Anti-patterns is missing, though it is triggered. The memlog records rejects a downstream builder could reintroduce: tiled-outputs and structured-doc directions (L18), one canvas with layers and modes (L19), a typed command grammar for shapes (L42), freehand polygon drawing (L43), table-based PCB overrides (pcb-overrides option b) and Peach selection (L37). It also records references: Catppuccin as the user's own theme and KiCad copper conventions (EXPERIENCE.md, after Responsive). *Fix:* add the section with "Lifted from" and "Rejected" bullets, each with its reason.

## Mechanical notes
- Frontmatter: DESIGN.md has `name`, `description`, `status`, `updated`, plus all token groups. EXPERIENCE.md has `name`, `status`, `updated`, `sources`, and all three sources resolve. There is no Mermaid in either file.
- All `{colors.*}`, `{typography.*}`, `{rounded.*}` and `{spacing.*}` references resolve. 31 dark tokens and 31 `-light` pairs, 1:1.
- Open naming items carried by the spine: `choc-v2-cell` vs `choc-v2-hotswap`; chain index notation; `R0·C0` (mock) vs `R1·C4` (memlog). These leak into downstream test fixtures, so resolve them before the first PCB story.
- Status strip entry "Plate" is singular, while a design has several plates (front, back, MCU cover). Decide whether it aggregates.
- Ticket adoption is not done yet: the `companions: []` frontmatter of `epic-platform-baseline.md` is still empty, so story 5's verify condition ("listed in its companions") is unmet. The 3D scope flag also still awaits architecture and PO confirmation.
- 📐 The memlog notes (L35) that five bundles were accepted unchanged. The gaps above cluster in exactly those bundles: file lifecycle (Firefox save, load errors) and shortcuts (browser collisions, capture conflicts). That is consistent with proposals that were never pressure-tested.
