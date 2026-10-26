# Accessibility review: keeb-cad editor UX spines

Lens: accessibility, sized to the stakes (one sighted expert user, hobby project). Checked against the agreed floor (`.memlog.md`, `EXPERIENCE.md` Accessibility Floor): everything keyboard-reachable with a visible focus ring, colour never the only signal, WCAG AA text contrast in both themes, `prefers-reduced-motion` respected, and no canvas screen-reader support in M1. Non-text contrast (WCAG 1.4.11, 3:1) is **not** part of the agreed floor. Findings about it are advisory and rated no higher than medium.

## Verdict

**Pass with fixes. Four high findings breach the agreed floor.**

The chrome holds up. Every text pair that `DESIGN.md.Colors` claims was recomputed and is correct. The Latte fixes for muted text and warning labels work. Mauve passes as a focus and selection colour on every chrome surface in both themes.

The gaps are in places that were never checked:
1. Text drawn on keycaps and on the canvas: Firmware legends, slot ids, R·C labels, LED numbers.
2. Latte Yellow and Teal still used as text: overrides, LED numbers, the pick-mode field.
3. Pick modes that only work by clicking the canvas: anchor picker, `Pick vertices`, `Pick LED order`, MCU pins.

☝️ The contrast table in `DESIGN.md` checks text against `panel` only. Values on `chrome` (fields, status strip), on `canvas` (selected rows, the active palette row) and on keycaps were not checked, and that is where the failures are.

📐 The Latte fixes only covered chrome text. The Latte canvas was never checked. Its background is Surface0 `#ccd0da`, a mid-tone, and most Catppuccin Latte accents drop below 3:1 against it. Latte is the secondary theme, but the floor says "both themes".

## Contrast table

Computed with the WCAG 2.x relative-luminance formula from the frontmatter tokens. Alpha tokens are blended over their background first. D = Frappé (dark), L = Latte (light). Text threshold is 4.5:1, because every UI text is 14px or smaller and never counts as large text. Non-text threshold is 3:1.

### Text (4.5:1)

| Theme | Foreground | Background | Ratio | Result | Where |
|---|---|---|---|---|---|
| D | text `#c6d0f5` | panel `#303446` | 8.06 | pass | inspector, active tab, toast |
| D | text | chrome `#292c3c` | 9.04 | pass | top bar, banner, field values (mono) |
| D | text | canvas `#414559` | 6.19 | pass | selected op row, palette active row |
| D | text-muted `#a5adce` | panel | 5.55 | pass | section labels (11px), `+ add operation` |
| D | text-muted | chrome | 6.23 | pass | inactive tabs, status strip words, evaluated suffix in field |
| D | text-muted | canvas | **4.26** | **FAIL** | suffix, shortcut or muted text on a selected row or active palette row |
| D | error `#e78284` | chrome / panel | 5.21 / 4.65 | pass | field error message, violations |
| D | warning `#e5c890` | chrome / panel | 8.55 / 7.62 | pass | warning label, ★, override in inspector |
| D | ok / progress | chrome | 7.96 / 5.99 | pass | status strip |
| D | anchor-link `#81c8be` | chrome | 7.20 | pass | pick-mode field text |
| D | override `#e5c890` | canvas | 5.85 | pass | R·C`*` label |
| D | led-chain `#81c8be` | canvas | 4.93 | pass | LED numbers |
| D | text | key-top-face `#737994` | **2.81** | **FAIL** | Firmware legends on keycaps |
| D | text | key-body `#626880` | **3.61** | **FAIL** | slot id / R·C label on a key |
| D | text-faint `#737994` | panel | 2.87 | n/a | correctly marked "never text" |
| L | text `#4c4f69` | panel `#eff1f5` | 7.06 | pass | |
| L | text | chrome `#e6e9ef` | 6.57 | pass | |
| L | text | canvas `#ccd0da` | 5.17 | pass | |
| L | text-muted `#5c5f77` | panel / chrome | 5.53 / 5.14 | pass | the decided Latte fix holds |
| L | text-muted | canvas | **4.05** | **FAIL** | selected row / active palette row |
| L | error `#d20f39` | panel | 4.80 | pass | message below field |
| L | error | chrome | **4.46** | **FAIL (marginal)** | only if error text sits on a chrome surface (status strip, banner) |
| L | warning `#df8e1d` | chrome / panel | 2.15 / 2.31 | icon only, as decided | override text still uses it, see below |
| L | override `#df8e1d` | panel | **2.31** | **FAIL** | override value in the inspector (Yellow + `*`) |
| L | override | canvas | **1.70** | **FAIL** | R·C`*` label on canvas |
| L | ok `#40a02b` / progress `#1e66f5` | chrome | 2.75 / 4.04 | icon only, as decided | |
| L | anchor-link `#179299` | chrome | **3.08** | **FAIL** | pick-mode field text (Teal) |
| L | led-chain `#179299` | canvas | **2.43** | **FAIL** | LED numbers |
| L | text | key-top-face `#9ca0b0` | **3.07** | **FAIL** | Firmware legends |
| L | text | key-body `#acb0be` | **3.69** | **FAIL** | label on a key |

### Non-text (3:1, advisory)

| Theme | Foreground | Background | Ratio | Result | Item |
|---|---|---|---|---|---|
| D | selection/focus `#ca9ee6` | chrome / panel / canvas | 6.28 / 5.60 / 4.30 | pass | focus ring, tab underline, row bar |
| D | selection | key-body | 2.50 | fail (inner edge only) | selection outline on a key; the outer edge against canvas passes |
| D | border `#51576d` | chrome / panel | 1.93 / 1.72 | fail | expression-field and button boundary |
| D | border | canvas | 1.32 | fail | chip boundary in the off state |
| D | key-body | canvas | 1.72 | fail | keycap shape (no outline specified) |
| D | key-top-face | key-body | 1.28 | fail (decorative) | height cue |
| D | key-outline-faint `#949cbb` | canvas | 3.48 at full opacity | pass, but "reduced opacity" puts it under 3:1 below about 85% | Shapes/PCB keys |
| D | group-frame `#838ba7` | canvas | 2.80 | fail | group frame |
| D | anchor-link | canvas | 4.93 | pass | anchor link |
| D | ratsnest `#a5adce` | canvas | 4.26 | pass | |
| D | F.Cu `#ef9f76` / B.Cu `#8caaee` | canvas | 4.45 / 4.10 | pass | |
| D | F.Cu | B.Cu | 1.09 | hue-only separation | |
| D | vertex / construction point / outline shape | canvas | 5.74 / 5.63 / 5.19 | pass | |
| D | stale-hatch `#737994` | canvas | 2.20 | fail | hatch (paired with a label) |
| D | plate-cutout `#626880` | canvas | 1.72 | fail | cutouts (depends on the plate fill, which is unspecified) |
| D | led-chain | canvas | 4.93 | pass | |
| D | error / warning | canvas | 3.57 / 5.85 | pass | overlap outline, markers |
| D | overlap-fill (25% Red) | canvas | 1.39 | fail (the outline carries it) | |
| D | warning / ok / progress / error glyphs | chrome | 8.55 / 7.96 / 5.99 / 5.21 | pass | strip, badges |
| L | selection/focus `#8839ef` | chrome / panel / canvas | 4.45 / 4.79 / 3.51 | pass | |
| L | selection | key-body | 2.50 | fail (inner edge only) | |
| L | border `#bcc0cc` | chrome / panel / canvas | 1.49 / 1.61 / 1.18 | fail | fields, chips |
| L | key-body | canvas | 1.40 | fail | keycap shape |
| L | key-outline-faint `#7c7f93` | canvas | 2.56 | fail, even before reduced opacity | |
| L | group-frame `#8c8fa1` | canvas | 2.07 | fail | |
| L | anchor-link | canvas | 2.43 | fail | |
| L | ratsnest `#6c6f85` | canvas | 3.20 | pass | |
| L | F.Cu `#fe640b` | canvas | 1.93 | fail | |
| L | B.Cu `#1e66f5` | canvas | 3.18 | pass | |
| L | vertex `#dd7878` | canvas | 1.93 | fail | |
| L | construction-point `#04a5e5` | canvas | 1.81 | fail | |
| L | stale-hatch `#9ca0b0` | canvas | 1.69 | fail | |
| L | outline-shape `#5c5f77` | canvas | 4.05 | pass | |
| L | led-chain | canvas | 2.43 | fail | |
| L | error / warning | canvas | 3.52 / 1.70 | pass / fail | overlap outline Red / Amber, ▲ markers |
| L | warning ▲ / ok ✓ | chrome | 2.15 / 2.75 | fail | tab badge ▲, status strip ✓ |
| L | progress / error glyph | chrome | 4.04 / 4.46 | pass | |

Two reference values for the fixes. On Latte Base `#eff1f5` as the canvas, Overlay2 reaches 3.49, Teal 3.31, Blue 4.34 and Maroon 3.48. Peach, Flamingo and Sky still sit around 2.5–2.8. On Frappé canvas, Overlay2 reaches 3.48.

## Findings

### Critical
None.

### High (breach the agreed floor)
- **[high]** Text on keycaps fails AA in both themes. Firmware legends on the top face measure 2.81 (D) and 3.07 (L). Slot ids and R·C labels on the key body measure 3.61 (D) and 3.69 (L). Legends are the whole content of the Firmware workspace. (DESIGN.md `key-top-face`, `key-body`, `canvas-label`; EXPERIENCE Firmware.) *Fix:* add a `key-legend` token pair that passes 4.5. Frappé: Crust `#232634` on an Overlay2 top face (5.5). Latte: Text on a lighter top face such as Surface0 or Mantle (5.2+). This also resolves the open item where the Latte top face is darker than the body.
- **[high]** Latte Yellow is still used as text for overrides. The decided Latte fix converted warnings to icon plus Text label, but overrides kept "Yellow + `*`". They measure 1.70 on canvas (R·C`*`) and 2.31 in the inspector. (DESIGN.md Colors "Override"; `override-light`.) *Fix:* render override text in `text-light` and keep Yellow for a non-text cue (underline, small dot or chip edge). The `*` stays the primary signal.
- **[high]** Latte Teal is used as text. LED chain numbers on canvas measure 2.43. Pick-mode field text (`expression-field-pick` foreground) measures 3.08 on chrome. (DESIGN.md `led-chain-light`, `anchor-link-light`, `expression-field-pick`.) *Fix:* LED numbers in `text-light` inside a Teal-outlined badge. Pick-mode field keeps Text and signals pick mode with the dashed border plus a `picking…` label.
- **[high]** Pick modes can only be completed with a mouse. The anchor picker needs a click on a canvas node. `Pick vertices`, `Pick LED order`, construction-line anchors and MCU pin reassignment are click-only, and pin to net labels show on hover only. The 3×3 attach grid is reachable from the inspector, but choosing the target node is not. This breaks "everything keyboard-reachable". (EXPERIENCE Component Patterns: Anchor picker, Vertex table, Overlay chips; Interaction Primitives: Pick modes.) *Fix:* in any pick mode, accept a typed id with autocomplete in the field (the palette already resolves ids), and add Tab/Shift+Tab to cycle candidate targets on canvas with a focus ring. Arrows move through the 3×3 attach grid, Enter appends or confirms, Esc ends. Pins open in an inspector list (pin → net) that works with the keyboard and shows the same data as the hover.

### Medium
- **[medium]** Muted text on a `canvas`-filled row fails AA: 4.26 (D) and 4.05 (L). This covers the evaluated suffix or shortcut hint on the selected operation or vertex row and on the active palette or context-menu row. (DESIGN.md `operation-list-row-selected`, `command-palette.active-row`.) *Fix:* switch muted text to `text` on active and selected rows, or use a row fill closer to the panel tone (Surface0 at 50% alpha over panel).
- **[medium]** Keycaps have no boundary that reaches 3:1. Key body against canvas is 1.72 (D) and 1.40 (L). Keys are the primary object on the canvas. (DESIGN.md Canvas keys.) *Fix:* draw a 1px keycap outline in Overlay2 (D 3.48) or Overlay2 on a Base canvas (L 3.49).
- **[medium]** The Latte canvas fails 3:1 for most meaningful strokes: F.Cu 1.93, vertex 1.93, construction point 1.81, anchor link 2.43, group frame 2.07, faint key outline 2.56 before reduced opacity, LED path 2.43, Amber overlap 1.70, stale hatch 1.69. (DESIGN.md Latte canvas tokens.) *Fix:* move `canvas-light` to Base `#eff1f5` with the grid on Surface0. That brings Teal, Overlay2 and Blue above 3:1. For Peach, Flamingo and Sky, use 2px strokes and markers with a 1px Text-colour casing, or accept them as hue accents on shapes that also differ in form (crosshair, dot, solid copper).
- **[medium]** Frappé group frame measures 2.80. The faint key outline drops below 3:1 at any opacity under about 85%, and the "reduced opacity" is unspecified. (DESIGN.md `group-frame`, `key-outline-faint`.) *Fix:* group frame to Overlay2 (3.48), and set the key-outline opacity to at least 0.9 or drop it.
- **[medium]** F.Cu and B.Cu differ by hue only, with a luminance ratio of 1.09 (D) and 1.65 (L). Nothing else separates front from back copper when both layers are visible. (DESIGN.md Copper; EXPERIENCE PCB.) *Fix:* draw B.Cu at reduced opacity, or under F.Cu with a lighter fill. Show the layer in the selection inspector and in hover or focus, and rely on the existing layer chips for isolation. KiCad users accept this convention, so medium rather than high.
- **[medium]** The on/off state of overlay and layer chips is carried mainly by border colour. Off is a border at 1.32 (D) or 1.18 (L) against canvas, which is barely visible. On is a Mauve border with a Text label. (DESIGN.md `chip`.) *Fix:* show the on state with a fill (Surface1) or a leading ✓, keep the Mauve border, and expose `aria-pressed`. Give the off state a visible border (Overlay1) and the label in `text-muted`.
- **[medium]** Latte ▲ warning glyph measures 2.15 on chrome and 1.70 on canvas, and the ✓ ok glyph measures 2.75. In tab badges and on keys flagged with ▲ (hardware-less bindings) the glyph appears without a Text label, so the decided fix of icon plus Text label does not apply there. (DESIGN.md `tab-badge`; EXPERIENCE State Patterns "violation".) *Fix:* draw the Latte ▲ and ✓ glyphs with a Text-colour stroke or outline (Yellow or Green fill inside), or use Peach or darker roles for the glyph only. Always show `current` beside ✓ in the status strip.
- **[medium]** The 3D viewer is mouse-only apart from Home. (EXPERIENCE 3D viewer.) *Fix:* when the viewer has focus, arrows orbit, Shift+arrows pan, +/− zoom and Home resets. List these in the cheat sheet.
- **[medium]** Some drag-only actions have no keyboard equivalent. Alt-drag compensation (moving only the dragged key) has no nudge counterpart, and box-select has no keyboard path. (EXPERIENCE Interaction Primitives.) *Fix:* make Alt+arrow nudge compensate on the next step. Note that keyboard multi-select happens in the tree slide-out (Shift/Ctrl+arrow, Space).
- **[medium]** The spec has no keyboard way to open the context menu, and some commands appear only there (`Use as outline`, layer-tab Rename/Duplicate/Move). The palette lists every command, so nothing is unreachable. (EXPERIENCE Context menu.) *Fix:* open the context menu with Shift+F10 or the Menu key on the focused item or the canvas selection, with arrow, Enter and Esc navigation.
- **[medium]** Focus management for overlays and panels is unspecified: the slide-out, command palette, context menu, violations panel, cheat sheet and Export menu. Nothing says where focus goes on open or where it returns on close. (EXPERIENCE Left rail + slide-out, Violations panel.) *Fix:* on open, focus the first meaningful item. Modal overlays (palette, menus, cheat sheet) trap focus. Non-modal ones (slide-out, violations panel) do not trap, but Esc closes them. On close, return focus to the invoker or to the canvas. Clicking a violation moves focus to the canvas or inspector of the target workspace.
- **[medium]** Keyboard entry to the canvas and movement between regions are undefined. Nudge, rotate and Delete act on "the selection", but the spec never says how focus reaches the canvas or moves between top bar, rail, canvas, inspector and status strip. (EXPERIENCE Shortcuts.) *Fix:* make the canvas one focusable region (`tabindex=0`) with a visible focus ring around its edge, and add F6 / Shift+F6 to cycle the regions.
- **[medium]** Reduced-motion coverage is a single line: "no flash, no animated transitions". The motions it needs to cover are the violation flash-once, auto pan and zoom to fit, slide-out, violations panel slide-up, palette and toasts, Assembly fade-in, 3D Home camera move, spinner and badge progress ring. (EXPERIENCE Accessibility Floor.) *Fix:* list this inventory in the floor. Under reduced motion: jump instead of pan or zoom, use a static persistent highlight instead of the flash (the selection already persists), show or hide overlays instantly, show Assembly instantly, and replace the spinner and ring with a static ◐ glyph next to the existing `N%` text.

### Low
- **[low]** Expression-field, button and chip borders measure 1.49–1.93. The field background (`chrome`) differs from `panel` by only 1.12, so fields are hard to spot as inputs. (DESIGN.md `expression-field`, `button`.) *Fix:* use Overlay0 (D, 3.22 on chrome) or Overlay1 for interactive borders and keep Surface1 for hairlines.
- **[low]** Latte error text on chrome measures 4.46, just under 4.5. (DESIGN.md `error-light`.) *Fix:* keep error text on `panel` (4.80), or use Text with a Red ● wherever an error shows on chrome.
- **[low]** Overlap severity on canvas, Red against Amber outline, is told apart by colour only. The ids carry ●/▲ markers. (EXPERIENCE State Patterns "violation".) *Fix:* use a solid outline for errors and a dashed one for warnings, or put a ●/▲ marker on the overlap area itself.
- **[low]** Frappé stale hatch measures 2.20 and plate cutouts 1.72. The hatch is backed by a `stale · rev N` label, and the plate fill colour is unspecified. (DESIGN.md `stale-hatch`, `plate-cutout`.) *Fix:* hatch in Overlay1 or Overlay2, and specify a plate fill that cutouts reach 3:1 against.
- **[low]** Focus and selection share Mauve. A focused selected row shows a ring and a bar in the same hue. The shapes differ, so this is acceptable. (DESIGN.md Selection & focus.) *Fix:* keep the focus ring offset 2px outside the element so it never merges with the selection bar or outline.
- **[low]** Target sizes are mostly fine at calm density: 30px rows, 28px fields, 44px rail and 30px strip all clear the 24×24 minimum (WCAG 2.5.8). Sizes are unspecified for the 3×3 attach-grid cells, chips, the layer-tab `+`, section collapse chevrons, the group-frame grab tab and canvas vertex handles. (DESIGN.md spacing.) *Fix:* set at least 24px for each grid cell and chrome control, and a hit radius of at least 8px for canvas handles regardless of zoom.
- **[low]** Ctrl+1..5 may collide with browser tab switching (Chromium Ctrl+1..8; Alt+1..8 on Linux), and Ctrl+D with bookmarking. Untested. (EXPERIENCE Shortcuts.) *Fix:* test whether `preventDefault` works in both browsers. If not, fall back to Alt+1..5 or palette-only switching.
- **[low]** The binding field captures Tab, which acts as a deliberate keyboard trap. Only Esc releases it. (EXPERIENCE Binding field.) *Fix:* show a persistent hint in the field, `Esc to leave · Tab next key`.
- **[low]** Esc has five meanings with no priority order. (EXPERIENCE Shortcuts.) *Fix:* define the order as leave field, then end pick mode, then close overlay, then leave isolated cell mode, then clear selection.
- **[low]** Semantics are worth naming since the floor already requires semantic HTML. Workspace and layer tabs should use `role=tablist` with arrow keys. Tab badges need an accessible name (`Shapes: 2 warnings`). Invalid fields need `aria-invalid` and `aria-describedby` pointing at the message. Blocked Export items need `aria-disabled`, not `disabled`, so the reason link stays focusable. (EXPERIENCE Component Patterns.) *Fix:* add these to the component rules.

## Counts

Critical 0 · High 4 · Medium 13 · Low 10
