---
name: keeb-cad editor
description: Browser-only visual keyboard CAD for one expert builder. Catppuccin Frappé dark by default, Latte light; calm density; canvas first, chrome quiet.
status: final
updated: 2026-10-26
colors:
  # Unsuffixed = dark (Catppuccin Frappé, primary). `-light` = Catppuccin Latte.
  # Comment = Catppuccin color name. Latte uses the same name unless a decided fix says otherwise.
  # --- chrome ---
  chrome: '#292c3c'              # Mantle: top bar, left rail, slide-out, status strip
  panel: '#303446'               # Base: inspector, overlays
  border: '#51576d'              # Surface1: hairlines only
  border-interactive: '#838ba7'  # Overlay1: field, button, chip edges
  hover: '#414559'               # Surface0: hovered row/button; selected rows add the Mauve bar
  fill-on: '#51576d'             # Surface1: chip in the on state
  text: '#c6d0f5'                # Text
  text-muted: '#a5adce'          # Subtext0: labels, evaluated suffix, section headers
  text-faint: '#737994'          # Overlay0: non-text marks only (below AA as text)
  # --- semantic ---
  selection: '#ca9ee6'           # Mauve
  focus: '#ca9ee6'               # Mauve
  warning: '#e5c890'             # Yellow
  error: '#e78284'               # Red
  ok: '#a6d189'                  # Green
  progress: '#8caaee'            # Blue
  stale: '#737994'               # Overlay0 (desaturation tint)
  override: '#e5c890'            # Yellow
  # --- canvas ---
  canvas: '#414559'              # Surface0
  canvas-grid: '#51576d'         # Surface1 line grid
  key-body: '#626880'            # Surface2
  key-edge: '#949cbb'            # Overlay2, 1px keycap boundary
  key-top-face: '#949cbb'        # Overlay2 (lighter than the body)
  key-legend: '#232634'          # Crust: every text drawn on a keycap
  key-outline-faint: '#949cbb'   # Overlay2, 1px, full opacity (Shapes, PCB, unfitted slots)
  group-frame: '#949cbb'         # Overlay2, dashed
  anchor-link: '#81c8be'         # Teal, dashed
  rotation-handle: '#ca9ee6'     # Mauve ring; shown only on the selection
  outline-context: '#b5bfe2'     # Subtext1: outline drawn behind keys in Layout
  overlap-fill: '#e7828440'      # Red at 25% [ASSUMPTION: alpha]
  overlap-warning-fill: '#e5c89040'   # Yellow at 25% [ASSUMPTION]
  overlap-warning-stroke: '#e5c890'   # Yellow, dashed
  cycle-path: '#e78284'          # Red: anchor-cycle path
  outline-shape: '#b5bfe2'       # Subtext1
  vertex: '#eebebe'              # Flamingo
  construction-point: '#99d1db'  # Sky [ASSUMPTION]
  plate-fill: '#949cbb'          # Overlay2; cutouts show the canvas through
  plate-cutout: '#414559'        # = canvas
  edge: '#b5bfe2'                # Subtext1: PCB Edge layer (= outline) [ASSUMPTION]
  component-outline: '#a5adce'   # Subtext0: component outlines on the board [ASSUMPTION]
  f-cu: '#ef9f76'                # Peach
  b-cu: '#8caaee'                # Blue, drawn beneath F.Cu at 70% opacity
  ratsnest: '#a5adce'            # Subtext0, dashed
  stale-hatch: '#949cbb'         # Overlay2 hatching over desaturated geometry
  led-chain: '#81c8be'           # Teal path and badge outline; numbers in {colors.text}
  combo-link: '#949cbb'          # Overlay2, dotted [ASSUMPTION]
  body-case: '#949cbb'           # Overlay2, 3D [ASSUMPTION]
  body-plate: '#a5adce'          # Subtext0, 3D [ASSUMPTION]
  body-pcb: '#babbf1'            # Lavender, 3D [ASSUMPTION]
  mirror-axis: '#949cbb'         # Overlay2, 1px dashed: center's y-axis [ASSUMPTION: color]
  pick-point: '#ca9ee6'          # Mauve: lit attach points + rubber band in pick mode — decided
  via: '#c6d0f5'                 # Text disc; drill hole in via-hole
  via-hole: '#232634'            # Crust (also pad drill holes)
  # --- Latte (light) ---
  chrome-light: '#e6e9ef'
  panel-light: '#eff1f5'
  border-light: '#bcc0cc'
  border-interactive-light: '#7c7f93'  # Overlay2 (Overlay1 is 2.83)
  hover-light: '#dce0e8'               # Crust
  fill-on-light: '#dce0e8'             # Crust (Text on Surface1 is 4.39)
  text-light: '#4c4f69'
  text-muted-light: '#5c5f77'    # Subtext1 — decided Latte fix (Subtext0 fails AA)
  text-faint-light: '#9ca0b0'
  selection-light: '#8839ef'
  focus-light: '#8839ef'
  warning-light: '#df8e1d'       # glyph only, with Text stroke; label in {colors.text-light}
  error-light: '#d20f39'         # as text only on panel/canvas, never on chrome
  ok-light: '#40a02b'            # glyph only, with Text stroke; label in {colors.text-light}
  progress-light: '#1e66f5'      # ring/bar only; label in {colors.text-light}
  stale-light: '#9ca0b0'
  override-light: '#df8e1d'      # underline/dot only; value in {colors.text-light}
  canvas-light: '#eff1f5'        # Base — decided (latte-canvas option b)
  canvas-grid-light: '#ccd0da'   # Surface0 [ASSUMPTION]
  key-body-light: '#ccd0da'      # Surface0 — decided
  key-edge-light: '#7c7f93'      # Overlay2 — decided
  key-top-face-light: '#dce0e8'  # Crust, lighter than the body — decided
  key-legend-light: '#4c4f69'    # Text
  key-outline-faint-light: '#7c7f93'
  group-frame-light: '#6c6f85'   # Subtext0 — decided
  anchor-link-light: '#0f6f75'   # darkened Teal — decided
  rotation-handle-light: '#8839ef'
  outline-context-light: '#5c5f77'
  overlap-fill-light: '#d20f3940'
  overlap-warning-fill-light: '#df8e1d40'
  overlap-warning-stroke-light: '#4c4f69'  # Text, dashed (Yellow is 2.31)
  cycle-path-light: '#d20f39'
  outline-shape-light: '#5c5f77'
  vertex-light: '#dd7878'        # with 1px Text casing [ASSUMPTION]
  construction-point-light: '#04a5e5'  # with 1px Text casing [ASSUMPTION]
  plate-fill-light: '#7c7f93'
  plate-cutout-light: '#eff1f5'
  edge-light: '#5c5f77'
  component-outline-light: '#6c6f85'
  f-cu-light: '#c4500a'          # darkened Peach — decided
  b-cu-light: '#1e66f5'          # Blue — decided
  ratsnest-light: '#6c6f85'
  stale-hatch-light: '#7c7f93'
  led-chain-light: '#0f6f75'     # darkened Teal, as anchor link [ASSUMPTION]
  combo-link-light: '#7c7f93'
  body-case-light: '#7c7f93'
  body-plate-light: '#6c6f85'
  body-pcb-light: '#7287fd'
  mirror-axis-light: '#7c7f93'
  pick-point-light: '#8839ef'
  via-light: '#4c4f69'           # [ASSUMPTION]
  via-hole-light: '#eff1f5'      # [ASSUMPTION]
typography:
  ui:
    fontFamily: 'system-ui, Inter, sans-serif'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.3'
  ui-strong:
    fontFamily: 'system-ui, Inter, sans-serif'
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.3'
  section-label:
    fontFamily: 'system-ui, Inter, sans-serif'
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: 0.07em
  mono:
    fontFamily: '"JetBrains Mono", ui-monospace, monospace'
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.3'
  mono-small:
    fontFamily: '"JetBrains Mono", ui-monospace, monospace'
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.3'
  canvas-label:
    fontFamily: '"JetBrains Mono", ui-monospace, monospace'
    fontSize: 11px
    fontWeight: '400'
    lineHeight: '1.2'
rounded:
  # [ASSUMPTION] lifted from the mocks, never chosen explicitly
  sm: 3px
  md: 4px
  lg: 6px
  full: 9999px
spacing:
  # Calm density (chosen). Named sizes from the calm variation of mockups/color-themes-1.html.
  row: 30px
  field-height: 28px
  pad: 13px
  top-bar: 42px
  banner: 36px
  status-strip: 30px
  left-rail: 44px
  inspector-width: 320px
  slide-out-width: 260px         # [ASSUMPTION] from mockups/panel-models.html
  target-min: 24px               # chrome controls (attach grid cells, chips, chevrons, tab +)
  canvas-hit-radius: 8px         # canvas handles at any zoom (vertex, grab tab, rotation handle)
  focus-offset: 2px
  # Small scale [ASSUMPTION]; '3' equals pad by intent
  '1': 4px
  '2': 8px
  '3': 13px
  '4': 20px
components:
  top-bar:
    background: '{colors.chrome}'
    height: '{spacing.top-bar}'
    border-bottom: '{colors.border}'
  workspace-tab-active:
    background: '{colors.panel}'
    foreground: '{colors.text}'
    indicator: '{colors.selection}'
    typography: '{typography.ui-strong}'
  workspace-tab:
    foreground: '{colors.text-muted}'
    typography: '{typography.ui}'
  tab-badge:
    typography: '{typography.mono}'
    radius: '{rounded.sm}'
    border: '{colors.border}'
  left-rail:
    background: '{colors.chrome}'
    width: '{spacing.left-rail}'
  slide-out:
    background: '{colors.chrome}'
    width: '{spacing.slide-out-width}'
  inspector:
    background: '{colors.panel}'
    width: '{spacing.inspector-width}'
    border-left: '{colors.border}'
  inspector-section-header:
    typography: '{typography.section-label}'
    foreground: '{colors.text-muted}'
    height: '{spacing.row}'
  expression-field:
    background: '{colors.chrome}'
    border: '{colors.border-interactive}'
    radius: '{rounded.sm}'
    height: '{spacing.field-height}'
    typography: '{typography.mono}'
    foreground: '{colors.text}'
  expression-field-focus:
    border: '{colors.focus}'
  expression-field-invalid:
    underline: '{colors.error}'
    message: '{colors.error}'
  expression-field-pick:
    border-style: dashed
    border: '{colors.anchor-link}'
    foreground: '{colors.text}'
  evaluated-suffix:
    typography: '{typography.mono}'
    foreground: '{colors.text-muted}'
  row-selected:
    background: '{colors.hover}'
    indicator: '{colors.selection}'
    foreground: '{colors.text}'
    typography: '{typography.mono}'
  outline-star:
    foreground: '{colors.warning}'
  status-strip:
    background: '{colors.chrome}'
    height: '{spacing.status-strip}'
    foreground: '{colors.text-muted}'
    border-top: '{colors.border}'
  status-entry-compact:
    typography: '{typography.mono}'
    foreground: '{colors.text-muted}'   # glyph + number only; full text in tooltip
  violations-panel:
    background: '{colors.panel}'
    radius: '{rounded.lg}'
    width: 640px                 # [ASSUMPTION] from mockups/key-panels.html
    header-height: 40px
    group-header: '{typography.section-label}'
    group-revision: '{typography.mono}'
  violation-row:
    error-mark: '{colors.error}'
    warning-mark: '{colors.warning}'
    radius: '{rounded.sm}'
  command-palette:
    background: '{colors.panel}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
    width: 560px                 # [ASSUMPTION] from mockups/key-panels.html
    active-row: '{colors.hover}'
    active-indicator: '{colors.selection}'
  context-menu:
    background: '{colors.panel}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
  kbd:
    typography: '{typography.mono-small}'
    foreground: '{colors.text-muted}'
    background: '{colors.chrome}'
    border: '{colors.border}'
    border-width: 1px
    border-bottom-width: 2px
    radius: '{rounded.sm}'
  part-picker:
    background: '{colors.panel}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
    width: 380px                 # [ASSUMPTION] from mockups/key-panels.html
    row-height: 68px             # footprint preview + mono name · version
    search-height: 32px
    preview-width: 44px
    preview-height: 56px
  start-card:
    background: '{colors.panel}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
    width: 440px                 # [ASSUMPTION] from mockups/key-start.html
    shadow: none
  assembly-legend:
    background: '{colors.panel}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
    width: 190px                 # [ASSUMPTION] from mockups/key-case.html
    shadow: none
  right-half:
    body-opacity: 0.7            # [ASSUMPTION] key body + top face only; edges, legends, marks stay at 1
  overlay:
    shadow: '0 6px 18px rgba(0,0,0,.35)'   # [ASSUMPTION]
  chip:
    border: '{colors.border-interactive}'
    foreground: '{colors.text-muted}'
    radius: '{rounded.md}'
    min-height: '{spacing.target-min}'
    on-background: '{colors.fill-on}'
    on-border: '{colors.selection}'
    on-foreground: '{colors.text}'
    inset: 12px                  # from the canvas top-left corner
  keymap-layer-tabs:
    height: 30px
  group-frame-tab:
    height: 17px
    radius: '{rounded.sm}'
  population-toggle:
    box-size: 16px
  button:
    background: '{colors.panel}'
    border: '{colors.border-interactive}'
    radius: '{rounded.md}'
    hover: '{colors.hover}'
  banner:
    background: '{colors.chrome}'
    height: '{spacing.banner}'
    border-bottom: '{colors.warning}'
    glyph: '{colors.warning}'
    foreground: '{colors.text}'
  toast:
    background: '{colors.panel}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
  focus-ring:
    color: '{colors.focus}'
    width: 2px
    offset: '{spacing.focus-offset}'
---

## Brand & Style

keeb-cad is a precision tool for one expert builder, used daily and for long sessions. The editor sits in the builder's own desktop theme — Catppuccin — so it feels like part of the workstation, not a product asking for attention. Dark (Frappé) is primary; light (Latte) is supported.

The posture is **calm drafting table**: the canvas carries the color, the chrome stays low-contrast and quiet, and every hue on screen means something. Density is "calm" — 14px UI, 30px rows, comfortable padding — chosen over compact even on a laptop.

**Precedence.** Where a mock conflicts with the spine documents (DESIGN.md, EXPERIENCE.md), the spines win.

## Colors

Every color is a Catppuccin role with one job. Values are in the frontmatter. → `mockups/color-themes-1.html` (variation 5 for colors, except its superseded Peach selection), `mockups/selection-accent-1.html` (option c, Mauve), `mockups/latte-canvas-1.html` (option b, the Latte canvas).

- **Chrome / panel / border** — Mantle for the top bar, rail, slide-out and status strip; Base for the inspector and floating overlays; Surface1 for hairlines; `{colors.border-interactive}` for the edges of anything you can type in or press. Tone separates regions; no shadows on docked surfaces.
- **Selection & focus — Mauve (`{colors.selection}`).** Selected nodes (and a selected operation's result on the 3D solid), the rotation handle, the active tab underline, the selected row bar, the focus ring and, in pick modes, the lit attach points and rubber band (`{colors.pick-point}`). Nothing else is Mauve. Focus and selection differ by shape: selection marks the element itself (outline, bar, fill); the focus ring sits `{spacing.focus-offset}` outside it.
- **Copper — F.Cu Peach (`{colors.f-cu}`), B.Cu Blue (`{colors.b-cu}`).** KiCad-like warm front / cool back. B.Cu is drawn beneath F.Cu at 70% opacity `[ASSUMPTION]` so the layers differ in more than hue; the inspector and hover name the layer. The right board is the flipped reversible board, so its colors swap: right F.Cu draws as left B.Cu (Blue, beneath, 70%) and right B.Cu as left F.Cu (Peach, on top).
- **Errors Red, warnings Yellow, ok Green, progress Blue.** Always with a glyph (● error, ▲ warning, ✓ ok, ring/bar progress). On Latte, Yellow, Green and Blue never carry text: Yellow and Green are glyphs drawn with a 1px `{colors.text-light}` stroke `[ASSUMPTION]`, Blue is the ring or bar only, and the label is in Text. Latte error text sits on panel or canvas only; on chrome it becomes Text with a Red ●.
- **Override — `*` + Yellow.** Frappé: overridden value in Yellow with `*`. Latte: value in Text with `*` and a Yellow underline.
- **Stale — hatch.** Stale geometry is desaturated and hatched in `{colors.stale-hatch}` with a `stale · rev <hash>` label.
- **Canvas layers (Frappé).** Every canvas mark has its own token in the frontmatter (see Canvas marks). Overlaps are translucent: Red for an error, Yellow for a warning.
- **Latte canvas (decided, option b).** Values are the `-light` tokens. Flamingo and Sky marks get a 1px Text casing `[ASSUMPTION]`. Darkened Teal `#0f6f75` (anchor link, LED chain) and darkened Peach `#c4500a` (F.Cu) are the only off-palette values, kept to reach 3:1 contrast.
- **3D bodies** — case Overlay2, plates Subtext0, PCB Lavender, under real lighting `[ASSUMPTION]`.

Avoid: Peach or Red for selection (Peach collided with F.Cu and error Red, so Mauve was chosen); color as the only signal; new off-palette hues; decorative gradients.

**Contrast targets.** Text at least 4.5:1; meaningful canvas strokes, glyphs and interactive edges at least 3:1 (WCAG 1.4.11).

| Pair | Frappé | Latte |
|---|---|---|
| text / panel | 8.06 | 7.06 |
| text-muted / panel | 5.55 | 5.53 (Subtext1; Subtext0 is 4.37) |
| text / selected row (`{colors.hover}`) | 6.19 | 6.04 |
| key-legend / key-top-face | 5.53 | 6.04 |
| error text / panel · chrome | 4.65 · 5.21 | 4.80 · 4.46 (not used) |
| key-edge, key-outline-faint, plate / canvas | 3.48 | 3.49 |
| group-frame / canvas | 3.48 | 4.37 |
| anchor-link / canvas | 4.93 | 5.23 |
| selection / canvas | 4.30 | 4.79 |
| F.Cu · B.Cu / canvas | 4.45 · 4.10 | 4.13 · 4.34 |
| border-interactive / panel · chrome | 3.65 · 4.09 | 3.49 · 3.25 |
| Green · Blue as text / panel | — | 2.96 · 4.34 (glyph/ring only) |

Overlay0 (2.87:1) never carries text. Muted text never sits on a selected or active row; those rows use Text.

**Open notes.**

- `[ASSUMPTION]` Right-half dimming applies to the key body and top face only (`{components.right-half.body-opacity}`, 0.7); dimming the edges would drop them below 3:1 (2.96 at 0.85). Confirm.
- One pick color: pick-mode attach points and the anchor picker's chosen grid point both use `{colors.selection}` (Mauve) `[ASSUMPTION]`.

## Typography

Two families. → `mockups/typography-1.html` (option b).

- **Sans — `{typography.ui}`** (system-ui, Inter fallback): chrome, labels, menus, messages. `{typography.ui-strong}` for the active tab and inspector headings. `{typography.section-label}` uppercase for inspector and panel section headers.
- **Mono — `{typography.mono}`** (JetBrains Mono, ui-monospace fallback) at 13px: expression and value fields, ids, coordinates, status-strip counts, revision hashes, and code inside messages (`unit-mismatch: u on rotation`). `{typography.mono-small}` (12px) for `kbd` shortcut hints.
- **Canvas labels — `{typography.canvas-label}`**: slot ids, R·C matrix labels (zero-based, `R0·C0`), LED numbers, legends, rotation readout (signed delta, `−3.4°`).
- **Tabular digits everywhere** (`font-variant-numeric: tabular-nums`), so changing numbers never jitter.

No display sizes. Hierarchy comes from weight and the uppercase section label, not size.

## Layout & Spacing

Fixed frame at a 1366×768 minimum laptop viewport (1366×696 inside the browser): top bar `{spacing.top-bar}` with the File menu, design name, five workspace tabs and the rest of the top bar (see Components); left rail `{spacing.left-rail}`; canvas; docked inspector `{spacing.inspector-width}`; status strip `{spacing.status-strip}`. The canvas gets the rest and is the same size in every workspace; a banner (`{spacing.banner}`, full width under the top bar) pushes rail, canvas and inspector down rather than covering them. → `mockups/panel-models.html` (option c, hybrid); `mockups/key-layout.html` — the full frame at 1366×768, Frappé and Latte.

Rows are `{spacing.row}`; fields `{spacing.field-height}`; panel padding `{spacing.pad}`. Calm density does not fit a full inspector at 1366×768, so inspector sections collapse (see EXPERIENCE.md › Inspector). Chrome controls are at least `{spacing.target-min}`; canvas handles keep a `{spacing.canvas-hit-radius}` hit radius at any zoom. → `mockups/color-themes-1.html` (variation 2, calm density).

## Elevation & Depth

Docked surfaces are flat and separated by tone and a 1px `{colors.border}` hairline. Only floating overlays (slide-out, menus, command palette, context menu, violations panel, Part picker, toasts) cast `{components.overlay.shadow}`. Cards fixed to the canvas (Start card, Assembly legend, 3D progress) and canvas chips stay flat. On the canvas, depth means physical height only: the key top face is lighter than the body in both themes. The 3D viewer uses real lighting; nothing else imitates 3D.

## Shapes

Small, tool-like radii `[ASSUMPTION]`: `{rounded.sm}` fields and badges, `{rounded.md}` buttons and chips, `{rounded.lg}` overlays. `{rounded.full}` only for the progress ring, status dots and the rotation handle. Canvas geometry is drawn true to the model — keycap radius is part geometry, not a UI token.

## Components

General states: hover fills `{colors.hover}` (no Mauve bar); pressed/on fills `{colors.fill-on}`; disabled items render in `{colors.text-muted}` with no hover and keep a visible reason where one exists. Selected rows (`row-selected`) use `{colors.hover}`, a Mauve left bar and Text.

### Primitives

- **Button** — `button`: `{colors.panel}` fill, `{colors.border-interactive}` edge, `{rounded.md}`; hover `{colors.hover}`.
- **Kbd** — every shortcut hint in menus, palette, chips and the Start card: `kbd` (`{typography.mono-small}`, 1px `{colors.border}` with a 2px bottom edge).
- **Chip** (overlay chips, PCB layer chips, Outline chip, Assembly chip) — top-left of the canvas, `{components.chip.inset}` inset, label and `kbd` key. Off: `{colors.border-interactive}` edge, muted label. On: `{colors.fill-on}` fill, leading ✓, Mauve edge, Text label.

### Frame

- **Top bar** — File menu, design name and save state, workspace tabs, Export menu, undo/redo. `{colors.chrome}`.
- **Workspace tabs** — `workspace-tab` / `workspace-tab-active`; label and `1`..`5` hint.
- **Tab badge** — worst output state: progress ring (`{colors.progress}`), stale hatch, ▲ `{colors.warning}`, ● `{colors.error}`; mono count beside ● / ▲.
- **Left rail + slide-out** — the rail holds Tree and Parameters icons (the icon whose panel is open: `{colors.fill-on}` and a Mauve left bar). One slide-out (`{spacing.slide-out-width}`, `{colors.chrome}`, full work-area height, right corners `{rounded.lg}`, Tree / Parameters tabs) floats over the canvas edge. Tree rows show mono ids with group/slot glyphs; parameter rows show `name = expression = value`.
- **Status strip** — one entry per output (Outline, Plates, PCB, Case, Firmware) with label, glyph and mono state; then ● / ▲ counts, cursor coordinates, zoom, nudge-step control. `{colors.chrome}`. Pick mode and track drawing show their hint at the left end in mono Text. When entries do not fit (at 1366 px wide), each compresses to `status-entry-compact`: glyph and number (`◌`, `41/56`, `62%`).
- **Nudge-step control** — mono `0.25 mm` button; its small popover holds three expression fields (arrow, Shift+arrow, Ctrl+arrow steps).
- **Banner** — `{spacing.banner}` full-width under the top bar, `{colors.chrome}`, 1px `{colors.warning}` bottom edge, ▲ in `{colors.warning}` and a Text label, optional inline `button` (`Take over editing`). → `mockups/key-start.html` (frames 2–3).
- **Toast** — `{colors.panel}`, plain text, above the status strip at the right `[ASSUMPTION: position]`; rejections lead with ▲.
- **Start screen** — `start-card` centered near the top of `{colors.canvas}`, flat: two equal buttons (New design; Open file with a `Ctrl+O` kbd), `{typography.section-label}` `Recent autosaved designs`, mono rows with `rev <hash>` right-aligned in `{colors.text-muted}`. → `mockups/key-start.html` (frame 1).

### Inspector and fields

- **Inspector** — node heading (mono id and muted kind, for example `slot · group thumb`), then collapsible sections (Anchor, Offset, Chain, Population, Part, Key cell, …) with `{typography.section-label}` headers and chevrons at least `{spacing.target-min}`.
- **Design settings** — the inspector with nothing selected in Layout: form (read-only text), `pitch-x`, `pitch-y`, default key cell. Group overrides show `inherits <value>` as placeholder text in `{colors.text-muted}`. → `mockups/pitch-settings-1.html`.
- **Population toggle** — `Fitted: [x] left [x] right` checkboxes in the inspector (`{components.population-toggle.box-size}` box; ticked = `{colors.fill-on}`, Mauve edge and ✓). Derived geometry fields on the right half render read-only (Text on `{colors.chrome}`, no border) with `derived from left/<id>` and a lock glyph.
- **Expression field** — mono text, evaluated result as a `{colors.text-muted}` suffix (`= 5.12 mm`). Focus: `{colors.focus}` border. Invalid: `{colors.error}` underline and a message below. Pick mode: dashed Teal border, Text value, `picking…` label.
- **Anchor picker** — anchor field and a 3×3 attach-point grid (cells at least `{spacing.target-min}`); the chosen point fills `{colors.selection}` `[ASSUMPTION]`.
- **Part field** — field-styled trigger with ▾; opens the Part picker (see Overlays).
- **Binding field** — expression-field styling; while capturing, Mauve focus ring and the hint `Tab, Esc, Ctrl+… → pick from list (↓)` in muted text below.
- **Operation list** — mono rows `name = op(args)`, args in `{colors.text-muted}` (Text when selected), `row-selected` for the selection; outline marked ★ in Yellow; `+ add operation` row in muted text. Collapsed list: a muted `▸ N more` row above the selected entry; collapsed sections show a mono count (`Plates 3`). → `mockups/key-shapes.html`, `mockups/key-case.html`.
- **Vertex table** — mono rows: index, anchor, offset; `row-selected` for the selection.
- **Plate fields** — shape dropdown, cutout-role checkboxes, user cutout list, export buttons (`button`) per plate.

### Overlays

File menu, Export menu, Design info, Autocomplete dropdown and Context menu use `context-menu` styling, which matches the command palette; the Cheat sheet uses `command-palette` styling.

- **File menu** — top-bar dropdown; rows show the command and a `kbd` shortcut.
- **Export menu** — unavailable rows disabled with the reason inline.
- **Design info** — popover from the design name; mono rows for id, revision, provenance, file location.
- **Autocomplete dropdown** — under the field; mono rows `name = value`; `Create parameter <name>…` last, in `{colors.text-muted}`.
- **Command palette** — `{colors.panel}` overlay, `{components.command-palette.width}`, `{rounded.lg}`, centered in the app just under the top bar; query field, then section-labeled groups (`Commands`, `Nodes`); rows show the command and a `kbd` shortcut; active row `{colors.hover}` with a Mauve bar. → `mockups/key-panels.html` (b).
- **Context menu** — at the pointer or the focused item. → `mockups/key-panels.html` (c).
- **Cheat sheet** — command and `kbd` shortcut per row, grouped by workspace.
- **Part picker** (`part-picker`) — popover anchored beside the Part field, to the left of the inspector; search field on top (`{components.part-picker.search-height}`, focus ring); rows `{components.part-picker.row-height}` with a `{components.part-picker.preview-width}` × `{components.part-picker.preview-height}` footprint preview (`{colors.component-outline}` outline, pads in `{colors.f-cu}`) and mono `name · version`; active row `{colors.hover}` fill + Mauve bar. → `mockups/key-panels.html` (e).
- **Violations panel** — `{components.violations-panel.width}` overlay anchored above the status-strip counts. Header row: **Violations**, mono ● / ▲ counts, `F8` / `Shift+F8` kbd hints at the right. Group header per workspace: section label and mono `rev <hash>` at the right. Rows `{spacing.row}`, mono: ● / ▲ glyph, kind, side-qualified ids, message. Stale groups: header hatched in `{colors.stale-hatch}` with a dashed-edge mono `stale` tag. Collapsed unrouted row: progress ring and `N unrouted · routing N/M`. → `mockups/key-panels.html` (a).

### Canvas views

- **3D viewer** — Case canvas area; bodies in `{colors.body-case}`, `{colors.body-plate}`, `{colors.body-pcb}`; the selected operation's result outlined in `{colors.selection}`; stale solid grayed under a `{colors.progress}` bar. → `mockups/key-case.html`.
- **Assembly chip** — `Assembly` with an `A` kbd, a chip at the 3D viewer's top-left.
- **Assembly legend** — `assembly-legend` card at the top-right of the 3D viewer, flat, shown while Assembly is on: one checkbox row per body (Case, each plate, PCB).
- **Isolated cell mode** — canvas header `‹ Board (Esc) · key cell <id>` in `{typography.mono}` at the top-left; the cell fills the canvas; same chips as PCB. → `mockups/key-cell.html`.
- **Keymap layer tabs** (Firmware) — overlay at the canvas top-left (chip position), workspace-tab treatment, `{components.keymap-layer-tabs.height}` tall, `+` tab last. → `mockups/key-firmware.html`.

### Canvas marks

- **Canvas keys** — Layout: filled keycaps (`{colors.key-body}`, `{colors.key-edge}`, `{colors.key-top-face}`), selection outline `{colors.selection}`; slot ids on the top face in `{colors.key-legend}`. Shapes and PCB: keys as `{colors.key-outline-faint}` outlines. → `mockups/key-rendering-1.html` (option a).
- **Right half** — body and top face at `{components.right-half.body-opacity}` until selected; edges, legends and marks stay at full opacity to keep 3:1 contrast `[ASSUMPTION]`.
- **Mirror axis** — 1px dashed `{colors.mirror-axis}` line along `center`'s y-axis, between the halves, in every 2D workspace that draws both halves.
- **Firmware legends** — keycaps with legends in `{colors.key-legend}`: transparent binding = faint ▽ in `{colors.text-faint}`; no binding (none) = empty cap; mod-tap / layer-tap = two lines, tap over hold; hardware-less action ▲ in the top-right corner.
- **Unfitted slot** — dashed `{colors.key-outline-faint}` outline, no fill; keeps its place and index.
- **Group frame** — dashed `{colors.group-frame}` with a grab-handle tab `⠿ <group id>` (`{components.group-frame-tab.height}`, `{components.group-frame-tab.radius}`); selected: frame 2px `{colors.selection}`, tab filled Mauve with a Crust label.
- **Rotation handle** — small `{rounded.full}` ring in `{colors.rotation-handle}` outside the selection's frame; while dragging, ⊕ in `{colors.rotation-handle}` at the pivot, drawn clear of legends, and a signed delta readout (`−3.4°`) in `{typography.canvas-label}` beside the handle. → `mockups/key-layout.html`.
- **Anchor link** — dashed `{colors.anchor-link}` line with a dot at the anchor point.
- **Outline context line** (Layout) — 1px `{colors.outline-context}`, behind keys, not hit-testable.
- **Overlap area** — error: `{colors.overlap-fill}` with a solid `{colors.error}` outline; warning: `{colors.overlap-warning-fill}` with a dashed `{colors.overlap-warning-stroke}` outline.
- **Violation marker** — ● / ▲ badge on the id's top-right corner; anchor-cycle path drawn in `{colors.cycle-path}` with arrowheads.
- **Shapes marks** — outline shape `{colors.outline-shape}`; vertex markers `{colors.vertex}` dots with mono `v-NN` labels; construction point `{colors.construction-point}` crosshair with faint guide lines in `{colors.text-faint}`; plate preview `{colors.plate-fill}` with cutouts as holes; polygon being picked drawn as a 2px `{colors.selection}` polyline. → `mockups/key-shapes.html`.
- **Pick marks** — in a pick mode, candidate attach points light as small `{colors.pick-point}` dots; the hovered one gets a ring; a 1px `{colors.pick-point}` rubber band runs from the last picked point to the cursor `[ASSUMPTION: width]`.
- **PCB marks** — board edge `{colors.edge}`; component outlines `{colors.component-outline}`; pads and routes in their layer's copper (right board swapped, see Colors); ratsnest dashed `{colors.ratsnest}`. Overlays: R·C labels, zero-based (`R0·C0`; overridden labels use the Override style: `*` + Yellow); LED chain numbered `{colors.led-chain}` path with numbers in Text inside Teal-outlined badges. → `mockups/pcb-overrides-1.html` (option a), `mockups/key-pcb.html` (both boards, Matrix and LED chain on, Export menu open).
- **Track tool** (key-cell tracks) — in isolated cell mode: tracks in layer copper at net-class width, vias as `{colors.via}` discs with a `{colors.via-hole}` hole, pads in layer copper with Crust drill holes, the track being drawn at full opacity with its next segment dashed.
- **Cell DRC marker** — in isolated cell mode only: fault area drawn as an error overlap area, ● badge, and a callout (`{colors.chrome}`, 1px `{colors.error}` edge, mono message) on a Red leader line.
- **Combo** (Firmware) — dotted `{colors.combo-link}` line joining the combo's keys, combo binding label at its midpoint `[ASSUMPTION]`.

→ `mockups/oplist-placement-1.html` (option c), `mockups/canvas-model-storyboard.html` (model b) for composition. Key screens (Frappé; Layout also Latte): `mockups/key-layout.html`, `key-shapes.html`, `key-pcb.html`, `key-firmware.html`, `key-case.html`, `key-cell.html`, `key-panels.html`, `key-start.html`. Their op names, heights, part versions, DRC text, legends and layer names are illustrative.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Mauve for selection, rotation handle, focus and pick marks only | Reuse Mauve for state, copper or decoration |
| Pair every state color with a glyph, hatch or line style | Signal state or severity by color alone |
| Put all keycap text on the top face in `key-legend` | Text on the key body or on Overlay0 |
| Mono for anything the user types or reads as a value, id or hash | Mono for chrome labels and menus |
| Tabular digits in every number | Proportional digits that jitter while dragging |
| Shadows only on floating overlays | Shadows or gradients on docked panels or the canvas |
| Muted text in Subtext0 (Frappé) / Subtext1 (Latte), never on selected rows | Overlay0 or Latte Yellow/Green/Teal as text |
| Stay inside the Catppuccin palette (two darkened Latte canvas hues excepted) | Add off-palette hues for new roles |
