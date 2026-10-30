# Component ownership

Each shared editor component in `epic-platform-baseline/ux-editor/DESIGN.md` › Components is built once, by its owning slice, as its own story. A later slice declares `after` on that story and extends the component; it never builds a second one (initiative Decision 2026-10-30). The story column shows the planned entry where one exists; the rest are planned when their slice is.

| Component (DESIGN.md › Components) | Owning slice | Story |
| --- | --- | --- |
| Primitives: Button, Kbd (and the Tabs and Tree wrappers) | see Corney's keys (13) | 13.11 (Tree wrapper 13.7) |
| Chip | outline follows the keys (17) | to plan |
| Top bar, Workspace tabs, Status strip | see Corney's keys (13) | 13.15 |
| Tab badge, status strip output-state entries | route and fab (7) | 7.2 |
| Left rail + slide-out (Tree tab) | see Corney's keys (13) | 13.15, filled by 13.7 |
| Left rail + slide-out (Parameters tab) | change a parameter (14) | to plan |
| Canvas, viewport, selection; Canvas keys, Right half, Mirror axis, Group frame, Unfitted slot | see Corney's keys (13) | 13.7, 13.8 |
| Banner, Toast | keep my work (16) | 16.1, 16.3 |
| Start screen, File menu, Design info | keep my work (16) | to plan |
| Inspector, Design settings, Population toggle (moved from 13.8 on 2026-10-30) | change a parameter (14) | 14.5 |
| Expression field, Autocomplete dropdown | change a parameter (14) | to plan |
| Violations panel, Violation marker, Overlap area | change a parameter (14) | 14.4, 14.6 |
| Rotation handle, Anchor link, Pick marks, Nudge-step control | drag keys (15) | 15.5, 15.6 |
| Anchor picker | drag keys (15) | 15.6 |
| Command palette, Context menu, Cheat sheet | drag keys (15) | to plan |
| Outline context line, Outline marks (pieces, vertices, construction points) | outline follows the keys (17), extended by draw custom pieces (18) | to plan |
| Operation list, Vertex table | draw custom pieces (18) | to plan |
| Part field, Part picker | plates to DXF (19) | 19.2 |
| Plate fields, Export menu | plates to DXF (19) | 19.3, to plan |
| Isolated cell mode, Track tool, Cell DRC marker | footprints on the PCB (6) | to plan |
| PCB marks | footprints on the PCB (6), extended by nets and matrix (20) and route and fab (7) | to plan |
| Keymap layer tabs, Binding field, Firmware legends, Combo | firmware and keymap (9) | to plan |
| 3D viewer | tray in 3D (8) | to plan |
