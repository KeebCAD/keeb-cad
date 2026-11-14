---
title: 'The canvas draws group borders on hover and selection'
type: 'feature'
ticket: '32'
created: '2026-11-14'
status: 'built'
baseline_revision: '48a02774ec97e65c713e0485908106f724803008'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Model posts each group's border (13.26), but the Layout canvas draws none, so nothing shows which keys a group holds, and a group can be selected only from the Tree.

**Approach:** The canvas draws each placed group row's posted `border` (outer loops only) beneath the keys, stroked only while the group is hovered or selected, with a `⠿ <id>` tab above its topmost posted point; an empty group shows ⊕ at its frame. A `HoveredGroup` UI-state service in `editor` takes the pointer from keys, borders, tabs and `ui`'s Tree, which gains a hover output. The tab and empty space inside a border select the group. `group-frame` tokens become `group-border` in `theme.css` and DESIGN.md.

## Boundaries & Constraints

**Always:**
- The canvas computes no geometry (AD-22): it draws posted points as SVG paths in model mm inside the viewport's y-flipped group, `vector-effect: non-scaling-stroke`, one path per region from its `outer` loop; holes are never drawn, and the whole area inside the outer line hit-tests as the group.
- Nothing is stroked at rest. A group is stroked while hovered (1px dashed `--color-group-border`) or selected (2px dashed `--color-selection`); a selected group draws only its own border, not its ancestors'. The root draws nothing, selected or hovered.
- Each group has two kinds of path: an always-present hit path per region (`aria-hidden`, `fill="none"`, `pointer-events="fill"`), and, only while shown, a stroked path per region inside a `<g role="img" aria-label="<group id> border">`, which tests find by role and name. ⊕ is a `<g role="img" aria-label="<group id> origin">`.
- Border paths are drawn before the keys' group, and outside it, so keys cover them and the fit's `getBBox` of the keys is unchanged.
- Group paths are in the design's pre-order (`subtreeIds(design.layout)`), so a nested group's path lies above its ancestors' and the browser's hit test picks the innermost.
- Every posted group row is drawn, `right/` rows included; hover and selection hold node ids, so both sides of a group show together, as a selected key does today (`CanvasSlot.vue:16`).
- Tab: `⠿ <group id>`, its bottom-left corner at the border's topmost posted point (largest `y` over every region's outer loop; ties: smallest `x`), drawn in screen space through `modelToScreen`, horizontal, above the keys, in its own `<g>` after the legends that is neither `aria-hidden` nor `pointer-events-none`. Its rect's height is the class `h-group-border-tab` (new `--spacing-group-border-tab: 17px`, DESIGN.md `group-border-tab.height`) and its corner `:style="{ rx: 'var(--radius-sm)' }"`; its label `font-mono text-canvas-label`, 4 px from each end, the rect as wide as the label's `getComputedTextLength()` plus 8 px (`mockups/group-frame-7.html`, which DESIGN.md names for the tab, sets the label at `x: 4`). Selected: filled `--color-selection`, label `--color-key-legend` (Crust). Hovered: filled `--color-canvas`, 1px `--color-group-border` stroke, label `--color-text` (`mockups/group-frame-9.html` `tab()`).
- A placed group row whose design subtree has no slot placed on its side draws, while hovered or selected, ⊕ at its frame (circle r 6 px, cross ±9 px, screen space) and its tab with its bottom-left 8 px right of and 6 px above the origin (`mockups/group-frame-9.html` option 2).
- The tab is a `UiCanvasToggle` (`aria-label` the group id, `aria-pressed` selected) whose `press` selects `[id]`; a click on a border path selects `[id]`. Clicking a key still selects the key.
- Hover sources: pointer over a slot on the canvas → its nearest group; over a border path or a tab → that group; over a group's Tree row → that group; over a slot's Tree row → none (EXPERIENCE.md Left rail: "pointing at a group row shows that group's border"). Unmounting the canvas clears it at once; unmounting the Tree slide-out clears at once only a hover its own rows set (Sergii, 2026-11-14, at review: a canvas hover survives T).
- Decision (plan): unmounting clears at once, not after the grace, because the grace exists only so a tab can be reached (Sergii's decision below) and an unmounted canvas or a closed slide-out leaves no tab to reach.
- Decision (Sergii, 2026-11-14): leaving a hover source clears the hovered group 300 ms later, not at once, so a tab over a curved top or wider than its column can be reached; entering any source first replaces it (or keeps it, the same group) and cancels the clear. Not leaving the tab reachable on flat tops only, and not deferring to 15.4. The 300 ms is `hoverGraceDelayMs` in its own file, as `switch-grace-delay.ts`; the timer is `@vueuse/core`'s `useTimeoutFn`, run in a detached `effectScope(true)` as `SwitchGrace` does.
- While grayed (13.7's switch grace) borders, tabs and ⊕ use `--color-stale`, as `CanvasSlot` and `AnchorLink` do.
- Contrast is DESIGN.md's token property; no runtime check (13.7's plan).

**Never:**
- The drag and nudge rule (15.1, 15.4), box select, a click on empty space outside every border changing the selection, multi-select.
- A canvas hover target for an empty group's ⊕ (EXPERIENCE.md Canvas row: an empty group "follows the same rule", whose sources are keys, the outer line and the Tree row; AD-22: when a border shows "is EXPERIENCE.md's").
- Decision (Sergii, 2026-11-14): a test of the root selected, not arranged through `Selection.select`, because no command or click selects the root today (no Tree row, `use-layout-tree.ts`; no canvas mark, `use-placed-nodes.ts`) and AGENTS says "Arrange only a state real commands could reach"; deferred-work.md gives it to the first story that makes the root selectable.
- A test of a failed border (no command reaches one: AGENTS "Arrange only a state real commands could reach").
- `evenodd` fills, a hover highlight on keys, any new design-file field.

## Boundary table

| # | Group | Input / state | Expected | Level |
|---|---|---|---|---|
| 1 | production bugs | column group `c` (slots `a`, `b`) with a posted border, at rest | no group border path is stroked; no tab | unit, editor |
| 2 | production bugs | pointer over key `a` | `c`'s border stroked 1px `group-border`, dashed; tab `⠿ c` shown | unit, editor |
| 3 | production bugs | pointer leaves key `a` to empty space outside every border; 299 ms pass | still stroked, tab shown | unit, editor (fake timers) |
| 3a | production bugs | same; 300 ms pass | no stroke, no tab | unit, editor (fake timers) |
| 3b | production bugs | same; 301 ms pass | no stroke, no tab | unit, editor (fake timers) |
| 3c | rules | pointer leaves key `a`, enters tab `c` 100 ms later; 400 ms pass | still stroked, tab shown | unit, editor (fake timers) |
| 3d | rules | pointer leaves key `a` of `c`, enters key of `d` 100 ms later | `d` stroked, `c` not, at once | unit, editor |
| 4 | module boundaries | pointer over Tree row `c` | as row 2 | unit, editor |
| 5 | module boundaries | pointer over Tree row `a` (a slot) | as row 1 | unit, editor |
| 6 | module boundaries | row 4, then the slide-out closes (T) | as row 1 | unit, editor |
| 6a | module boundaries | slide-out open, pointer over key `b` (the open slide-out covers `a`; both in `c`; Sergii, 2026-11-14), then T closes the slide-out | `c` still stroked, tab shown, past the grace | unit, editor (fake timers) |
| 6c | rules | pointer from Tree row `c` to slot row `a`, then to slot row `b` 200 ms later; 299 ms after leaving `c` | `c` still stroked, tab shown | unit, editor (fake timers) |
| 6d | rules | same; 300 ms after leaving `c` | as row 1 (crossing slot rows does not restart the grace; Sergii, 2026-11-14) | unit, editor (fake timers) |
| 6e | rules | same; 301 ms after leaving `c` | as row 1 | unit, editor (fake timers) |
| 6b | module boundaries | pointer on Tree row `c`, then off the Tree to empty canvas; T 100 ms later, within the grace | as row 1 at once | unit, editor (fake timers) |
| 7 | module boundaries | row 2, then click the tab `c` | selection `['c']`; Tree row `c` selected; `c` stroked 2px `selection`; tab filled `selection` | unit, editor |
| 8 | rules | click empty space inside `c`'s outer line, off its keys | selection `['c']` | unit, editor |
| 9 | rules | `c` nested in group `h`, both bordered; pointer inside `c`'s line off keys | `c` stroked, `h` not | unit, editor |
| 10 | rules | same; pointer inside `h`'s line, outside `c`'s | `h` stroked, `c` not | unit, editor |
| 11 | rules | `h`'s border has a hole; pointer inside the hole | `h` stroked; click there selects `['h']` | unit, editor |
| 12 | rules | `c` selected | `c` stroked, `h` not | unit, editor |
| 13 | rules | `c` selected, pointer over a key of sibling group `d` | `c` 2px `selection`, `d` 1px `group-border` | unit, editor |
| 14 | rules | slot `r` directly under the root; pointer over `r` | nothing stroked, no tab | unit, editor |
| 15 | rules | `c` and `d` bordered, `d` after `c` in the design; a point on `c`'s outer line under `d`'s key | `elementFromPoint` there is `d`'s key, not `c`'s path | unit, editor |
| 16 | rules | rows `left/c` and `right/c` with borders; pointer over `left/a` | both `c` paths stroked, two tabs | unit, editor |
| 17 | rules | empty group `e` placed, selected | ⊕ at `e`'s frame and tab `⠿ e`, no path | unit, editor |
| 18 | rules | `e` placed, at rest | no ⊕, no tab | unit, editor |
| 19 | rules | `e` unplaced (`placed: false`), selected | nothing drawn | unit, editor |
| 19a | rules | placed group `u` whose only slot is unplaced (an anchor cycle), selected | ⊕ and tab, no border | unit, editor |
| 19b | rules | placed group `p` holding only group `c` with placed slots, selected | `p`'s border, no ⊕ | unit, editor |
| 20 | rules | outer loop points (0, 5), (3, 5), (−1, 4.999999) | tab at (0, 5) (just below the top: not chosen) | unit, editor |
| 21 | rules | points (2, 5), (0, 5) | tab at (0, 5) (on: leftmost tie) | unit, editor |
| 22 | rules | points (0, 5), (4, 5.000001) | tab at (4, 5.000001) (just above: new top) | unit, editor |
| 23 | rules | two regions, the second's topmost point higher | tab at the second's | unit, editor |
| 24 | rules | an empty border `[]` | no tab point | unit, editor |
| 25 | rules | hovered, grayed by the switch grace | stroke and tab `--color-stale` | unit, editor |
| 26 | glue | row 2, switch to Outline and back | as row 1 | unit, editor |
| 27 | module boundaries | `UiTree`, pointer enters row `x` then leaves the tree | emits `hover` with row `x`, then `leave` | unit, ui |
| 28 | module boundaries | `sideOf` of `left/c`, `right/c`, `whole/c` | `'left'`, `'right'`, `'whole'` | unit, model |
| 28a | module boundaries | `sideOf` of `c` (no prefix), `''`, `up/c` (not a `PlacementSide`) | throws `InvariantError` | unit, model |
| 29 | rules | `borderPath` of three points (0,0) (1,0) (1,1) | `M 0 0 L 1 0 L 1 1 Z` | unit, editor |
| 29a | rules | `borderPath` of one point (2,3) | `M 2 3 Z` | unit, editor |
| 29b | rules | `borderPath` of `[]` | `''` | unit, editor |

</frozen-after-approval>

## Code Map

- `packages/editor/src/workspace/layout/LayoutCanvas.vue:59-90` -- `<g :transform>` (:63) holds `<g ref="keys">` (:64) with `CanvasSlot`s; a `pointer-events-none` screen-space group (:69-88) holds anchor links and legends. Fit runs `getBBox()` on `keys` (:47-56).
- `workspace/layout/use-placed-nodes.ts:11-29` -- reads `ModelWorkerLifecycle.layout`, `readLayoutRow` per row; drops unplaced rows and the root; `PlacedGroup` carries no `border` yet. `types.ts:6-27` -- `PlacedCommon`, `PlacedGroup`.
- `workspace/layout/CanvasSlot.vue` -- `UiCanvasToggle` precedent (`:label`, `:pressed`, `@press`), stroke classes `stroke-selection`/`stroke-stale`, dash `'4 3'`; `keycap-proportions.ts` holds DESIGN geometry as a TS constant.
- `packages/protocol/src/layout-output/layout-output-codec.ts:25-40,69-92` -- `readLayoutRow(...).border`: `{ outer: Point[]; holes: Point[][] }[]`.
- `packages/model/src/layout-editing/node-tree.ts:28,47` -- `nearestGroupId(root, id)` (a group gives itself, a slot its parent), `subtreeIds` (pre-order); both exported from `model/src/main.ts:20-22`.
- `packages/model/src/ids/side-qualified-id.ts:7,12` -- `sideQualifiedId`, `nodeIdOf`; `PlacementSide` in `ids/types.ts`.
- `packages/editor/src/selection/{selection.ts,use-selection.ts}` -- `ids`, `select(ids)`; the Tree and canvas sync through it.
- `packages/editor/src/viewport/canvas-cursor.ts` -- `point`/`leave` UI-state precedent with `Option` in a `shallowRef`; `use-viewport.ts` -- `modelToScreen`.
- `packages/editor/src/editor-module.ts:33-62` -- `container.register(X).useClass(X)`; `devtools/services-classified.spec.ts:20-31` lists every service.
- `packages/ui/src/tree/{UiTree.vue,types.ts,Tree.spec.ts}` -- Reka `TreeItem` per flattened row (:47-57); emits only `update:selected`.
- `packages/editor/src/slide-out/TreeSlideOut.vue:31-37` -- `<UiTree :rows :selected @update:selected>`; `onBeforeUnmount` at :24.
- `packages/editor/src/testing/layout-canvas.ts` -- `arrangeLayoutCanvas`, `layoutOf` (left rows only, root added), `keyAt`, `key(id)`, `clientAt`; `schema/testing`'s `aBorder`, `aBorderRegion`, `aLayoutRow({ kind: 'group', border })`.
- `packages/ui/src/theme/theme.css:39,145,201,259` -- `--color-group-frame`; no class uses it.
- DESIGN.md (`ux-editor/`) -- `group-frame` (:36), `group-frame-light` (:91), `group-frame-tab` (:310), contrast row (:374), Group border (:477-485).

## Tasks & Acceptance

**Execution:**
- [x] `packages/model/src/ids/side-qualified-id.ts` + spec -- `sideOf(qualified): PlacementSide` (function), throwing `InvariantError` when the prefix is missing or not a `PlacementSide`; export from `model/main`. Rows 28–28a.
- [x] `packages/ui/src/tree/{UiTree.vue,types.ts,Tree.spec.ts}` -- emits `hover: [row: TreeRow]` on a row's `pointerenter`, `leave: []` on the tree's `pointerleave`; the new test builds its rows inside the test. Row 27.
- [x] `packages/editor/src/group-border/hover-grace-delay.ts` -- `hoverGraceDelayMs = 300`.
- [x] `packages/editor/src/group-border/{hovered-group.ts,use-hovered-group.ts}` -- `HoveredGroup` (service, `Disposable`: stops its pending timer): `id: Option<Id>`, `point(id)`, `leave()` (clears after `hover-grace-delay.ts`'s 300 ms), `clear()` (at once). Rows 3–3d. `useHoveredGroup()` (function) returns `hovered`, `pointAtGroup(id)`, `pointAtSlot(slotId)` (via `nearestGroupId` on the open design) and `leave`. Register in `editor-module.ts`; classify `notShown` in `services-classified.spec.ts`.
- [x] `packages/editor/src/group-border/tab-point.ts` + spec -- `tabPoint(border): Option<Point>` (function). Rows 20–24.
- [x] `packages/editor/src/group-border/border-path.ts` + spec -- `borderPath(outer): string` (function). Rows 29–29b.
- [x] `packages/editor/src/group-border/use-group-borders.ts`, `types.ts` -- `useGroupBorders()` (function): placed group rows in design pre-order, each `{ id, key, frame, outers, empty, tabAt, shown: 'selected' | 'hovered' | 'none' }`; `empty` when no slot in its design subtree has a placed row on its `sideOf` side. `use-placed-nodes.ts` gains `border` on `PlacedGroup`.
- [x] `packages/editor/src/group-border/{GroupBorder.vue,GroupBorderTab.vue,GroupOriginMark.vue,group-border-marks.ts}` (Vue components: neither service nor function) -- hit paths with `@pointerenter`/`@pointerleave`/`@click`; the stroked paths only while shown; the tab a `UiCanvasToggle`, also a hover source; `group-border-marks.ts` holds ⊕'s r 6 and ±9 px, the empty group's tab offset (8, −6) px and the tab's 4 px label inset.
- [x] `LayoutCanvas.vue` -- borders before `keys` inside the transform group; tabs and ⊕ in their own screen-space `<g>`; `onBeforeUnmount` calls `clear`. `CanvasSlot.vue` -- `pointerenter` → `pointAtSlot`, `pointerleave` → `leave`. `TreeSlideOut.vue` -- `hover` → `pointAtGroup` for a group row, else `leave`; `leave` → `leave`; `onBeforeUnmount` calls `clear`.
- [x] `packages/editor/src/testing/layout-canvas.ts` -- `layoutOf` (function) uses a key that already holds `/` as given (`right/c`), else prefixes `left/`; group rows are `aLayoutRow({ kind: 'group', border })`.
- [x] `packages/editor/src/group-border/group-borders.spec.ts` -- rows 1–19b, 25–26 through `arrangeLayoutCanvas`; pointer by `userEvent.hover`/`click` on `key(id)` and tabs, and on the `canvas()` locator with a `position` from `clientAt` for rows 8–11 (the hit paths have no name, being `aria-hidden`); row 15 reads `document.elementFromPoint` at a `clientAt` point and expects it inside `key('d')`'s element; borders by `getByRole('img', { name: '<id> border' })`, tabs by `getAllByRole('button', { name: '<id>' })` where both sides post.
- [x] `packages/ui/src/theme/theme.css` -- `--color-group-frame` → `--color-group-border` (4 lines); `--spacing-group-border-tab: 17px`. DESIGN.md -- `group-frame`, `group-frame-light`, `group-frame-tab` and the contrast row renamed; the Group border bullet's "Tokens: still … until 13.32 renames them" sentence removed; Stroke and Tab read the new names.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then each row has a passing test at its level.
- Given each browser group, when its toggled bug is applied, then its rows go red and pass once restored (named in the PR): stroked paths always rendered (1, 3a, 3b, 5); every group shown as hovered (1, 14, 18); `CanvasSlot`'s `pointerenter` removed (2, 16); the Tree's `hover` handler removed (4); the slide-out unmount `clear` removed (6); the grace clearing at once (3, 3c); the grace never clearing (3a, 3b); `point` keeping the current group while a clear is pending (3d); the hit path's `@click` removed (8, 11); the hit path's `@pointerenter` removed (9–11); holes drawn as `evenodd` hit paths (11); the pre-order sort reversed (9); `shown` ignoring selection (7, 12–13); borders drawn after the keys (15); `empty` always false (17, 19a); `empty` always true (19b); the `placed` filter removed (19, 19a); `grayed` ignored (25); the canvas unmount `clear` removed (26); `UiTree`'s `pointerenter` emit removed (27).

## Implementation Notes

- Files: `model` `ids/side-qualified-id.ts` (`sideOf`), `main.ts`; `ui` `tree/{UiTree.vue,types.ts,Tree.spec.ts}`, `theme/theme.css`; `editor` `group-border/` (new), `editor-module.ts`, `devtools/services-classified.spec.ts`, `workspace/layout/{LayoutCanvas.vue,CanvasSlot.vue,types.ts,use-placed-nodes.ts}`, `slide-out/TreeSlideOut.vue`, `testing/layout-canvas.ts`; DESIGN.md.
- Real-host run: not applicable. The specs fake no third-party host: `FakeWorker` stands in for the repo's own worker, and Vitest's fake timers set time as AGENTS asks.
- No unplanned structural change: no `tsconfig`, `package.json`, workspace, Vitest, ESLint, Stryker or dependency-cruiser file changed.
- Implementer's decisions (build), each with its citation:
  - `useHoveredGroup` also returns `clear`, not only the listed four, because the plan's tasks call `clear` from both unmount hooks.
  - A slot directly under the root points at the root (`nearestGroupId` gives its parent, `node-tree.ts:28`), not `leave()`, so the previous group's border goes at once; the root draws nothing (`use-placed-nodes.ts` drops it).
  - `useGroupBorders` drops posted group rows whose id is not in the open design, not sorting them last, because such a row is from a set posted before its node was deleted (spine AD-11: a set is posted per seq, after the commit).
  - The stroked `<g>` has `pointer-events="none"` and renders only with paths, not on every shown state, because the plan's hit path is the one hover source for the inside and an empty group "draws ⊕ … no path" (row 17).
  - ⊕ takes the border's width and colour by state, not one fixed style, because DESIGN.md says "an origin mark ⊕ in the same colours".
  - Grayed tabs: a selected tab fills `--color-stale` with a Crust label; a hovered tab strokes and labels `--color-stale`, not graying the selected label too, because the plan says the tab "use[s] `--color-stale`" as `CanvasSlot` does, which grays its fill and edge but keeps the legend in `fill-key-legend` (`LayoutCanvas.vue` legend `<text>`).
  - The tab is re-measured after `document.fonts.ready`, not only on mount, because the first measure can run before JetBrains Mono loads.
  - `GroupMarksAt` lives in `workspace/layout/types.ts`, as `LayoutCanvas` declares it ("Put every type a folder declares … in that folder's `types.ts`").
  - Tests aim pointers from the keys group's `getScreenCTM` (model points), not `clientAt` (canvas px); park the pointer on the status strip before each set; take "outside every border" at the middle of the canvas's top edge, because the width-limited fit puts the right edge inside a border.
- `pnpm test`: 640 files passed and 1 failed, 5184 tests passed and 1 failed. The failure is a timeout at 15000 ms in `tooling/lint/entry-files-re-export.spec.ts` › "still rejects a type declared in an entry file". The same file passes alone, 10 of 10 in 22.6 s, so it ran out of time under the full run's load. Not changed here; reported.

## Plan Change Log

- Toggled-bug claims corrected after running them (the frozen rows are unchanged): "root kept" cannot turn row 14 red, because the root has no placed row and posts no border (`use-placed-nodes.ts`, `model/src/borders/group-borders.ts`). Row 14 is proven by "every group shown as hovered" instead, as are 1 and 18. "Pre-order reversed" turns only row 9 red, so rows 10–11 are proven by "hit `@pointerenter` removed". A grace that clears at once still passes 3a–3b, so "the grace never clearing" proves them. Each was run (`scratchpad/toggles.py`, Chromium).

## Review Triage Log

Pass 1 (quick, test-reviewer; 0 quotes dropped): high 0, medium 0, low 13, false 1, maybe-false 0.

| # | Lens | Finding | Verdict | Route | Evidence / action |
|---|---|---|---|---|---|
| 1 | quick | row 19a arranges an unreachable anchor cycle | false | — | a loaded design file with an anchor cycle leaves its members unplaced (spine AD-3, `dependency-cycle` on load); the spec's comment said otherwise and was reworded (patch) |
| 2 | quick | `NOTHING`, `HOVERED_C` mutable at module level | low | patch | `as const` |
| 3 | quick | `HOVERED_C` literal written out four more times | low | patch | uses `HOVERED_C` |
| 4 | quick | `useHoveredGroup().hovered` read by no caller | low | patch | deleted with its type member |
| 5 | quick | closing the slide-out clears a canvas hover under the pointer | low | patch (Sergii) | the frozen line read "clears it"; Sergii chose a patch over the revert loop: the slide-out clears only a hover its rows set (`ownsHover`), row 6a added (hovers key `b`, which the open slide-out does not cover, same group `c`); toggled: unconditional clear turns 6a red |
| 6 | quick | three implementer decisions lack "not Y" | low | reject | its fix edits this build's plan; the decisions are restated in X-not-Y form at the look |
| 7 | quick | Verification not green (timeout), lint/typecheck unrecorded | false | — | the timeouts came from a dev server and a background test run beside the suite; with both stopped `pnpm test` passed 641/641 files, 5188/5188 tests; `pnpm lint` and `pnpm typecheck` clean |
| 8 | quick | EXPERIENCE.md:387 still lists the rename as open | low | patch | "(done in 13.32)" appended |
| 9 | quick | `editor-module.ts` import out of path order | low | patch | moved |
| 10 | quick | `LayoutCanvas.vue` type import out of path order | low | patch | moved |
| 11 | test-reviewer | `DIGITS = 0` is an unnamed ±0.5 px tolerance | low | patch | `SCREEN_PX_DIGITS` with its why |
| 12 | test-reviewer | `advance(201)` copies 13.7's grace | low | patch | `switchGraceDelayMs + 1` |
| 13 | test-reviewer | two absence checks assert before a frame passes | low | patch | `await nextFrames()` first |
| 14 | test-reviewer | `drawn()` reads stroke from the outer `<g>` only | low | reject | no child path sets its own stroke; a bug overriding it per path is unlikely in use and the fix adds reading logic to the helper |

Pass 2 (quick, test-reviewer, on the files changed since pass 1; 0 quotes dropped): high 0, medium 0, low 3, false 0, maybe-false 0. Test reviewer: 7 tests checked, no findings.

| # | Lens | Finding | Verdict | Route | Evidence / action |
|---|---|---|---|---|---|
| 1 | quick | the Tree's hover outlives its slide-out for up to 300 ms when the pointer left the Tree before T | low | patch | breaks the frozen line "clears at once only a hover its own rows set": `ownsHover` went false on `leave`, while the hover stayed the Tree's until another source pointed. Fixed by `HoveredGroup` recording the source (`point(id, by)`, `clearSetBy('tree')`), the view flag removed; row 6b added; toggled "leave forgets the source" turns 6b red |
| 2 | quick | `ownsHover` sticks when the Tree is removed under the pointer, so a later T clears a canvas hover | low | patch | gone with the view flag (same fix); the hovered id the removed row set stays until the next source, which draws nothing while its group is deleted |
| 3 | quick | row 6a's test asserts within the grace, so a `leave()` on unmount would pass | low | patch | the test freezes time and advances past the grace; toggled "clear unconditional" turns 6a red |

Pass 2 verification: `pnpm test` 1 failed of 5191, a Firefox timeout (17349 ms) in "selects the group on a click of its tab, in the canvas and the Tree"; it passes alone in 620 ms or less, and a rerun of the full suite (seed 1794645433830) passed 641/641 files, 5191/5191 tests. The failing run's seed was not kept. Flaky triage: source not confirmed; suspected a race between `arrange()`'s two-frame wait for the fit and the fit moving the keys under a loaded run, after which the pointer leaves key `a`, the grace clears the hover and `click()` waits for a tab that is gone. Handed to Sergii. `pnpm lint`, `pnpm typecheck` clean.

Pass 3 (quick, test-reviewer, on the files changed since pass 2; 0 quotes dropped): high 0, medium 0, low 4 (quick), test reviewer 2 lows noted as needing no change.

| # | Lens | Finding | Verdict | Route | Evidence / action |
|---|---|---|---|---|---|
| 1 | quick | entering a slot's Tree row (and each `CanvasSlot` leave) calls `leave()`, whose `useTimeoutFn.start` restarts the 300 ms, so a pointer crossing slot rows keeps the last group shown while it moves | low | to Sergii | touches the frozen lines "over a slot's Tree row → none" and "clears the hovered group 300 ms later"; the fix is one guard (`leave()` starts the timer only when none is pending) plus a row, after which the review would need a fourth pass |
| 2 | quick | the hover-source API (`point(id, by)`, `clearSetBy`, initial `'canvas'`, tabs and borders as `'canvas'`) has no X-not-Y decision | low | reject | its fix edits this build's plan; stated in X-not-Y form at the look |
| 3 | quick | `pointAtGroup` takes `string` and parses, though its canvas callers hold an `Id` | low | reject | a parse per pointer enter; no user or developer meets a defect, and splitting the signature adds surface |
| 4 | quick, test-reviewer | row 6a's test hovers key `b`, the frozen row names `a` | low | to Sergii | the open slide-out covers `a`; `b` is in the same group `c`; the frozen row's wording is Sergii's to change |

Pass 3 resolution: Sergii (2026-11-14) chose the guard and a row for finding 1: `leave()` starts the timer only when none is pending; row 6c added; toggled "guard removed" (`leave()` always `start()`) turns 6c red, restored. Finding 4 (row 6a's key) is with Sergii.

Pass 4 (quick, test-reviewer, limited to the guard and row 6c): high 0, medium 0, low 3. Test reviewer: 1 test, no findings.

| # | Lens | Finding | Verdict | Route | Evidence / action |
|---|---|---|---|---|---|
| 1 | quick | no toggled bug recorded for row 6c | false | — | run and recorded in the pass 3 resolution above |
| 2 | quick | 6c can't tell "no restart" from "a slot row clears at once" (`else clear()`) | low | to Sergii | true: 6c asserts only 301 ms; a 299 ms row would catch it; the frozen row lists 301 ms only |
| 3 | quick | 6c is not a three-row threshold (299, 300, 301) | low | to Sergii | same root as 2; filling it changes frozen row 6c's wording |

Verification after the guard: `pnpm lint`, `pnpm typecheck` clean; `packages/editor` alone 86/86 files, 990/990 tests. The full `pnpm test` (seed 1794646024498) had 8 timeouts of 16–19 s across unrelated files (`tooling/lint`, `app`) and row 6c's test, while the load average stood at 10–12 from the person's VS Code, dev server, Playwright run and another project's nx; to rerun on a quiet machine.

Pass 4 resolution: Sergii (2026-11-14) chose three rows for findings 2–3: row 6c split into 6c (299 ms, shown), 6d (300 ms, cleared) and 6e (301 ms, cleared), one `it.each`. Toggled "a slot row clears at once" (`else clearTreeHover()`) turns 6c red; "guard removed" turns 6d–6e red; both restored. `group-borders.spec.ts` 64/64 in Chromium and Firefox.

Pass 3 finding 4 resolution: Sergii (2026-11-14) renamed row 6a's key to `b`, matching the test.

## Design Notes

- Decision (plan): hover holds a node id, not a side-qualified row id, because a Tree row has no side (`use-layout-tree.ts:7-15` maps node ids) and selection already marks both sides by node id (`CanvasSlot.vue:16`).
- Decision (plan): innermost by DOM order (design pre-order) and the browser's hit test, not a containment test in `editor`, because canvases compute no geometry (AD-22) and AD-22 names "pointer hit-testing" as what DOM canvas items give. Overlapping siblings resolve to the later one in the design.
- Decision (plan): borders dash `5 3` in both states, not `CanvasSlot`'s `4 3`, because DESIGN.md's Group border names `mockups/group-frame-5.html` for the shape and `group-frame-7.html` for the tab, and both stroke the border, selected included, with `'stroke-dasharray': '5 3'`; DESIGN.md's Stroke says "1px dashed" and Selected changes only width and colour.
- Decision (plan): the tab is a hover source, not only the border, because EXPERIENCE.md's pointer map makes the tab clickable ("clicking the tab selects the group"), which needs it to stay while pointed at.
- Decision (plan): tab ties go to the smallest `x` with exact comparison, not the mockup's 0.6 mm band (`group-frame-7.html:76`), because AD-22 places it "at the topmost posted point" and points are rounded at precision 6 (AD-16), so a flat top edge's ends compare equal.
- Decision (plan): the tab's height and corner come from theme tokens through CSS properties, not TS constants, because AD-26 says "classes and the SVG canvas's `var(--…)` read one source", and a probe in Chromium and Firefox (Playwright 1.64.1) gave a `rect` styled `height: var(--h); rx: var(--r)` a `getBBox().height` of 17 and a computed `rx` of `2px` in both, while `border-radius` left `rx` at 0, so Tailwind's `rounded-sm` would not round it.
- Decision (plan): the tab's width is measured with `getComputedTextLength()`, not estimated from the label's length, because a measure is the browser's drawing, as `getBBox` is for the fit (AD-22), and an estimate would need JetBrains Mono's advance width copied into code.
- Decision (plan): `UiTree` emits `hover` and `leave`, not a `v-model:hovered`, because the Tree never reads the hovered row back: the pointer, not the parent, decides it.
- Decision (plan): rows 1–19b and 25–26 run in `editor` through the mounted shell, labelled unit as 13.7's rows 15–16 (`LayoutCanvas.spec.ts`) are, not in `app`, because the hover rule is defined in `editor` ("Test a rule where it is defined").
- Decision (plan): ⊕'s size, the empty group's tab offset and the tab's label inset are TS constants (`group-border-marks.ts`), not theme tokens, because DESIGN.md has no token for them, only the mockup `group-frame-9.html` it names, as `keycap-proportions.ts` holds `key-rendering-1.html`'s geometry; the tab's height and radius are tokens because DESIGN.md defines them.
- Decision (plan): `HoveredGroup`, `hoverGraceDelayMs` and `GroupBorderTab` take DESIGN.md's and EXPERIENCE.md's words ("Group border", its "Tab", "pointing at"), not new glossary rows, because the glossary's `group border` is the concept and the tab and hover are its display, which the glossary leaves to DESIGN.md; not `PointedGroup`, since the ticket says "the hovered group".
- Decision (plan): `GroupOriginMark`, because the glossary's group "has an origin frame" and its anchor row names "a group origin"; not `GroupFrameMark`, since a group frame was this mark's old, superseded name.
- Decision (plan): `HoveredGroup` is `notShown` in devtools, as `CanvasCursor` ("the pointer, shown live in the status strip", `services-classified.spec.ts:30`), not an editable inspectable, because it follows the pointer and the canvas shows it live.

## Conformance Log

Pass 1 (two conformance readers and a gap reader; 18 findings, 0 dropped):
- `Find elements by role, then label, then text` (border paths, ⊕) -- fixed
- `Canvas items are DOM elements` (tabs in the aria-hidden group) -- fixed
- `A choice no requirement made is a decision` (tab padding, label style, Tree emits, measured width) -- fixed
- `add empty input and an input that breaks an assumption` (`sideOf`) -- fixed
- every class or function carries a tag (`groupWith`, components) -- fixed
- `Naming | Glossary terms only.` (`GroupOriginMark`, `pointAtKey`) -- fixed
- `A rejection needs evidence` (dash pattern) -- asked, then fixed from DESIGN.md's mockups
- `The tokens live in ui's @theme` (tab size) -- fixed (probe)
- `Keep no mutable state at module level in a spec` (`Tree.spec.ts:10` `const ROWS: TreeRow[] = [`) -- deferred
- test-reviewer level check (rows through the mounted shell) -- fixed (decision)
- gap: toggled bug per browser row group -- fixed
- gap: `empty` threshold rows (unplaced-only, nested-only) -- fixed
- gap: `borderPath` unit spec -- fixed
- gap: border and ⊕ locators -- fixed
- gap: Tree emit vs `v-model:hovered`, tab width -- fixed
- gap: root selected unreachable -- asked (Sergii: leave out, deferred)
- gap: Corney border meets, not passes under, a neighbour key -- fixed (manual check notes it; row 15 proves it)
- 📐 key-to-tab hover gap -- asked (Sergii: 300 ms grace)

Final pass (9 findings): Tree emit name in row 27 -- fixed; `empty` toggle unreachable -- fixed; hit-path locator -- fixed; `layoutOf` encoding and `groupWith` -- fixed; ⊕ and inset constants' home -- fixed; unmount clears at once unlabelled -- fixed; grace constant file and names -- fixed; component tags -- fixed; toggle for row 3d -- fixed. These final-pass fixes have had no reviewer read.

## Verification

**Commands:**
- `pnpm test` -- expected: all green, including the new specs.
- `pnpm lint && pnpm typecheck` -- expected: clean.

**Manual checks:**
- `pnpm dev`, open `/?seed=corney`: nothing drawn at rest; pointing at a key shows its column's dashed border and `⠿` tab, as does its Tree row; clicking the tab or empty space inside the border selects the column (2px Mauve, filled tab) in canvas and Tree; on Corney (gap 1 mm = margin) a column's border meets its neighbour's key edge rather than passing under it, so row 15 is what proves the hiding; G adds an empty group that shows ⊕ and its tab while selected; both halves' borders show together.
