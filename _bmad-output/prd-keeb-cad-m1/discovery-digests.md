# Discovery digests (2026-10-25) — condensed for resume

## Sources (Ergogen configs)
- All 3 boards: outline = hand-authored polygon (15–18 vertices) anchored to keys + mm shifts, fillets; helper points via intersect/affect; LambBT subtracts r=150 circle for concave arc. No board derives outline from keys.
- Offsets: Corney uses expand(+wall+tol) for walls; LambBT copies polygon with manual pads.
- Plates: outline − switch cutouts (13.8 Choc v1 / 14 v2,MX) − screws (− MCU rect / scroll-wheel).
- PCBs: footprints anchored to keys (MCU, display, battery, TRRS, jumpers); no traces in configs (Corney CI uses Freerouting).
- Cases: Corney = tray (walls = expand(pcb,wall+tol) − expand(pcb,tol), floor, MCU wall cutout 8×40, screws). LambBT = ~12 bodies incl. rings/shelves/magnet groove. Corax = 2D only.
- All split + reversible. Corney v0.3 = Choc v2 default, MX/Choc v1 presets, BOTH wired (TRRS, OLED) and wireless (nice!nano, nice!view, battery, SMD switch) PCBs. 3-key fan (15°/15°, far 1.5u).
- Matching needs epsilon (Corney vertex fudges ±0.01mm).

## Web
- Ergogen shapes: rectangle, circle, polygon, outline-ref; ops add/subtract/intersect/stack; expand/joints/fillet/bound/bind; cases = straight extrusions only.
- Tray Choc numbers: wall 1.2–2mm, tol 0.25–1mm, bottom 1–2mm, plate 1.2–1.6mm, M2 standoffs/inserts. Battery pocket guidance absent.
- Sofle v2: 29 keys/half, 5-key thumb row w/ 1.5u, EC11 encoder in inner bottom slot; angles unpublished — measure from KiCad.
- Choc v1 18×17 pitch, 13.8 cutout; v2 MX-cap spacing 18–19, 14 cutout; shared hotswap socket; combined footprint exists.
- Browser routers: Freerouting = Java, no WASM (CheerpJ plausible, unproven); tscircuit autorouter = TS, MIT, browser-native, DRC immature.

## Competitors
- No GUI tool does custom outline/cutouts/split-unibody. kle-ng plate only; Cosmos 3D key-driven case + ZMK only for own MCU; ergogen-gui = YAML + previews.
- Gap: no tool preserves manual work across layout change; firmware sync absent.

## Architecture doc gaps
- Outline "derived" with no user control; no cutouts; unibody undecided; no TRRS part; case unspecified; no tenting/whole-board rotation; case + routing are background (not live); in-app edits none — export is escape hatch.
