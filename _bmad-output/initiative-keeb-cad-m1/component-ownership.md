# Component ownership

Each shared editor component in `epic-platform-baseline/ux-editor/DESIGN.md` › Components is built once, by its owning slice, as its own story. A later slice declares `after` on that story and extends the component; it never builds a second one (initiative Decision 2026-10-30). The story column shows the planned entry where one exists; the rest are planned when their slice is.

| Component (DESIGN.md › Components) | Owning slice | Story |
| --- | --- | --- |
| Primitives: Button, Kbd, Tooltip (2026-11-06: Button's disabled reason) (and the Tabs and Tree wrappers) | a new design opens (23), Tree wrapper by see Corney's keys (13) | 23.6 (Tree wrapper 13.7) |
| Chip | outline follows the keys (17) | to plan |
| Top bar, Workspace tabs, Status strip | a new design opens (23), cursor and zoom by see Corney's keys (13) | 23.8 (counts 23.23, 2026-11-08; cursor and zoom 13.23 (split from 13.7, 2026-11-10); undo and redo buttons 16.4, 2026-11-05) |
| Status strip running-stage entry (stage name, elapsed time, Restart; 2026-11-02) and failed entry | a new design opens (23) | 23.23 (split from 23.8, 2026-11-08) |
| Tab badge, status strip output-state entries | route and fab (7) | 7.2 |
| Left rail + slide-out (Tree tab) | a new design opens (23), filled by see Corney's keys (13) | 23.8, filled by 13.7 |
| Left rail + slide-out (Parameters tab) | change a parameter (14) | to plan |
| Left rail + slide-out (Parts tab) | change a parameter (14) | to plan |
| Canvas, viewport, selection; Canvas keys, Right half, Mirror axis, Group frame, Anchor link, Unfitted slot | see Corney's keys (13) | 13.7 (canvas, selection, viewport service, Anchor link), 13.23 (viewport controls), 13.24 (Delete, Ctrl+D), 13.25 (G, S), 13.8 (2026-11-10 split), Group frame 13.26 (split from 13.7, 2026-11-10) |
| Banner, Toast | keep my work (16) | 16.1, 16.3 |
| Start screen, File menu, Design info | keep my work (16) | to plan |
| Inspector, Design settings, Fitted toggle (moved from 13.8 on 2026-10-30), This slot section (2026-11-01) | change a parameter (14) | 14.5 |
| Expression field, Autocomplete dropdown | change a parameter (14) | to plan |
| Violations panel, Violation marker, Overlap area | change a parameter (14) | 14.4, 14.6 |
| Rotation handle, Pick marks, Nudge-step control | drag keys (15) | 15.5, 15.6 (Anchor link moved to 13.7, 2026-11-10; 15.6's anchor picker extends it) |
| Anchor picker | drag keys (15) | 15.6 |
| Command palette, Context menu, Cheat sheet | drag keys (15) | to plan |
| Outline context line, Outline marks (shapes, vertices, construction points) | outline follows the keys (17), extended by draw custom shapes (18) | to plan |
| Operation list, Vertex table | draw custom shapes (18) | to plan |
| Part field (2026-11-05: built by 14.5, opens the picker from 19.2) | change a parameter (14), extended by plates to DXF (19) | 14.5 (picker opening 19.2) |
| Part picker | plates to DXF (19) | 19.2 |
| Plate fields, Export menu | plates to DXF (19) | 19.3, to plan |
| Isolated part mode, Track tool, Part DRC marker | milestone 2 (hand-built parts, decided 2026-11-01) | — |
| PCB marks | footprints on the PCB (6), extended by nets and matrix (20) and route and fab (7) | to plan |
| Keymap layer tabs, Binding field, Firmware legends, Combo | firmware and keymap (9) | to plan |
| 3D viewer | tray in 3D (8) | to plan |

Not a DESIGN.md component, recorded here because every slice's canvas depends on it: the model worker (`workers`' spawn and lifecycle, `design/worker`'s mirror, `pipeline`'s posts; AD-11) is built by 23.4 (2026-11-02; was 13.20 before the split of epic-see-corneys-keys).
