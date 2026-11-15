---
title: 'The canvas shows ids and anchor links on hover and selection'
type: 'feature'
ticket: 35
created: '2026-11-15'
status: 'done'
baseline_revision: 'b6f626a41756ffa08927e5cd298561961494fad6'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Layout canvas draws every fitted slot's id on its top face and every node's anchor link at all times, so Corney's ids overrun their keys and the links crowd the board; DESIGN.md and EXPERIENCE.md (2dd41f6) now want keys only at rest. Hover holds only a group (`HoveredGroup`, collapsed from a pointed key by `nearestGroupId`), so the canvas cannot tell which key is pointed at.

**Approach:** Hover records the pointed node, a key or a group, as a `PlacementId` (spine Editor state), in a service renamed `HoveredNode`; the group border derives the innermost group from it. The canvas draws the anchor link of the pointed and the selected node, and for a slot its id in a label just below the key, in screen space above keys and borders.

## Boundaries & Constraints

**Always:**
- At rest (nothing pointed, nothing selected) the canvas draws no id and no anchor link; the top-face legends go.
- Pointing at a key records that key; pointing inside a border or at a tab records the group; the border shown from a key is its innermost group's on the same side, as 13.32 and 13.8 draw it. A key directly under the root shows its label and link and no border (the ticket: "every slot shows it").
- The pointed and the selected node each show their anchor link (posted `anchorAt` to frame, `AnchorLink.vue` as today); a slot also shows its id label, a group none. A node both pointed and selected shows one link and one label. Only nodes with a placed posted row show anything (spine: an id with no posted row "draws … nothing"), with no error.
- The id label: authored id (no `right/`), every slot whatever its fit, centred under the key's browser-measured bounds, `{colors.panel}` fill, 1px `{colors.key-edge}`, `{typography.canvas-label}` in `{colors.text}`; during the switch grace it grays like the tab (stroke and text `stale`).
- Label and link are `role="img"`, named `<placement id> id` and `<placement id> anchor link`, drawn after keys and borders and before tabs, `pointer-events="none"`.
- A Tree group row points at its group (border and link); a Tree slot row points at nothing, as today.
- Decision (Sergii, 2026-11-15): the label's size is a DESIGN.md `components.slot-id-label` entry, `height: '{components.group-border-tab.height}'` (17px), `radius: '{rounded.sm}'`, text inset 4px from each end, top 3px below the key, not B2's 18px height and 3px radius, because it matches the tab beside it and stays on the 2/4/8 radius scale; it goes on the code branch with `theme.css`.
- Decision (Sergii, 2026-11-15): a pointed key's label and link linger for the hover grace after the pointer leaves, with its group's border, not vanish at once, because one hover with one grace keeps label, link and border coming and going together; the other would need a second hover value.
- Decision (Sergii, 2026-11-15): labels and links paint below the tabs, where today's legends sit (`LayoutCanvas.vue:110-140`), not over them, because a tab is a clickable target and should never be covered.

**Never:**
- Hover-to-link for the Outline or PCB canvases; multi-select; draggable links (EXPERIENCE: not draggable); the e2e journey and its screenshot (13.34).

## Boundary table

Frames are model mm; "screen point of P" is `modelToScreen(P, view, size)` (unit-tested in `viewport-transform.spec.ts`) for a viewport the test sets, as `status-strip/readouts.spec.ts` does. Keys 18 × 18 mm unless a row says otherwise. Fixture **T** (split, both sides posted, right rows at mirrored x): root ⊃ free group `matrix-middle` ⊃ `matrix-middle-top` (frame (0, 19), `anchorAt` (0, 9.5)), `matrix-middle-bottom` (frame (0, 0)); root ⊃ chain group `thumbfan` (frame (10, −25), `anchorAt` (9, −9)) ⊃ `thumbfan-near-home` (frame (10, −25)), `thumbfan-mid-home` (frame (29, −25)). Rows naming one key arrange only that key under the root.

| # | Group | Input / state | Expected | Level |
|---|---|---|---|---|
| 1 | production bugs | T, nothing pointed or selected | no `… id` image, no `… anchor link` image, no text in any key | unit, editor |
| 2 | production bugs | T, pointer over key `left/matrix-middle-top` | exactly one label, `left/matrix-middle-top id`, text `matrix-middle-top`, centred on the key's measured screen x, its top 3 px below the key's measured screen bottom; exactly one link, `left/matrix-middle-top anchor link`, from the screen point of (0, 9.5) to that of (0, 19) | unit, editor |
| 3 | production bugs | T, `left/thumbfan-mid-home` clicked, pointer leaves, grace + 1 ms passes | its label and link still drawn; nothing else | unit, editor |
| 3a | rules | one key under the root, pointer leaves it; 299, 300, 301 ms later | label and link drawn; gone; gone | unit, editor |
| 4 | production bugs | T, pointer inside `left/thumbfan`'s border, over no key | one link, `left/thumbfan anchor link`, from the screen point of (9, −9) to that of (10, −25); no label; `left/thumbfan border` hovered | unit, editor |
| 4a | rules | T, pointer over tab `left/thumbfan` | as row 4 | unit, editor |
| 4b | rules | T, pointer over key `left/thumbfan-near-home` | its own link and label only, no `left/thumbfan anchor link`; `left/thumbfan border` hovered | unit, editor |
| 4c | rules | T, tab `left/thumbfan` clicked, pointer away past the grace | `left/thumbfan anchor link` only, no label | unit, editor |
| 4d | rules | one key `k` directly under the root, pointed | label `left/k id` and link `left/k anchor link`; no border | unit, editor |
| 5 | production bugs | T, pointer over key `right/thumbfan-near-home` | label `right/thumbfan-near-home id`, text `thumbfan-near-home`; `right/thumbfan border` hovered, no `left/…` | unit, editor |
| 6 | rules | one key posted `fit` `empty`, then `stand-in`, pointed | its label drawn, each | unit, editor |
| 7 | rules | T, `left/matrix-middle-top` clicked and pointed | one label, one link | unit, editor |
| 7a | rules | T, `left/thumbfan-mid-home` clicked, pointer over `left/matrix-middle-top` | two labels and two links, one per key | unit, editor |
| 7b | rules | one key `k` posted, selection `['left/k', 'left/new']` by `Selection.select`, `new` held by the design with no posted row | label and link for `left/k` only; no error | unit, editor |
| 7c | rules | one key `k` posted `placed: false`, selected | no label, no link | unit, editor |
| 8 | rules | one key 27 × 18 mm (`1.5u`) at rot 0°, 30°, 90°, pointed | label top 3 px below the key's measured lowest screen point, centred on its measured screen x middle | unit, editor |
| 9 | rules | one key pointed, Frappé and Latte | label fill `panel`, stroke `key-edge` 1px, text `text`, 11 px JetBrains Mono, per theme | unit, editor |
| 9a | rules | one key pointed during the switch grace | label stroke and text `stale`; link `stale` | unit, editor |
| 10 | module boundaries | one key pointed | label and link follow every key and border and precede every tab in document order; `pointer-events: none` | unit, editor |
| 11 | rules | T, pointer over Tree row `thumbfan` | `left/thumbfan border` hovered and `left/thumbfan anchor link` drawn | unit, editor |
| 11a | rules | T, pointer over Tree row `thumbfan-near-home` | no label, no link, no border | unit, editor |
| 12 | rules | T, pointer over `right/thumbfan-near-home`; DeleteNode `thumbfan` committed | no label, link or border, at once (fake timers, no advance) | unit, editor |
| 12a | rules | same, DeleteNode of `matrix-middle-top` | label and link of `right/thumbfan-near-home` still drawn | unit, editor |
| 13 | module boundaries | switch grace spec, pointer over `a` | its link stale while grayed, `anchor-link` while drawn, at the same times as the key's body today | unit, editor |
| 14 | rules | `usePointedAndSelectedNodes` over placed `[a, b, g]`: hovered none / `b`, selected `[]` / `[a]` / `[b]` | `[]`; `[b]`; `[a]`; `[b]`; hovered `b` + selected `[a]` → `[a, b]` (placed order) | unit, editor |

</frozen-after-approval>

## Code Map

- `packages/editor/src/group-border/hovered-group.ts:12-80` -- `HoveredGroup`: `point(id, by)`, `leave` (grace, `hover-grace-delay.ts`), `clear`, `clearSetBy`, commit prune by `holdsPlacement`; `#id` stores an `Option` (`:48`), which the spine's "A value that is stored (a computed, a ref) … is unwrapped first" refuses.
- `group-border/use-hovered-group.ts:15-50` -- `pointAtSlot` collapses a key to `nearestGroupId` (`model/src/layout-editing/node-tree.ts:28`, which returns a group itself); that moves to `use-group-borders.ts`. `pointAtTreeGroup`, `leave`, `clear`, `clearTreeHover` keep their logic.
- `group-border/types.ts:22-33` -- `HoverSource`, `UseHoveredGroupResult` move with the service.
- `group-border/use-group-borders.ts:21-25` -- `shownOf` compares the hovered id to the row key.
- Callers: `GroupBorder.vue:41`, `GroupBorderTab.vue:63` (`pointAtGroup`), `CanvasSlot.vue:61` (`pointAtSlot`), `slide-out/TreeSlideOut.vue:30-35` (keep), `LayoutCanvas.vue:41-42`, `editor-module.ts:47`, `devtools/services-classified.spec.ts:38`, `group-border/group-borders.spec.ts:31` and `:562` (asserts the service's state; the recast rows assert the drawn result only).
- `workspace/layout/LayoutCanvas.vue:44-56,110-140` -- `legends` (fitted only) and `links` (every node) in an `aria-hidden` screen-space group, before the tabs group; `:121`'s comment names the legends.
- `workspace/layout/use-placed-nodes.ts` -- placed rows only, root left out; the shown set filters it.
- `viewport/canvas-items.ts:31-35` -- `bounds(ids)`: browser-measured union of a key's drawn corners in model mm; the viewport has no rotation (`viewport-transform.ts:4-6`), so model min y is the screen bottom.
- `group-border/GroupBorderTab.vue:28-36` -- grayed colours to follow. `group-border-marks.ts` -- screen-px constants; don't copy its header comment.
- `workspace/layout/switch-grace.spec.ts:80-95,98+` -- finds the link by `querySelector('line')`, the top face by `querySelectorAll`, and names tests with `199 ms`/`200 ms`/`201 ms`.

## Tasks & Acceptance

**Execution:**
- [x] Docs on main before the branch -- spine Editor state: "Hover holds a `PlacementId` in its own service (`HoveredGroup`)" → "Hover holds the pointed node's `PlacementId`, a slot or a group, in its own service (`HoveredNode`), not the group a pointed key belongs to, because a pointed key shows its own id and anchor link (13.35)". `component-ownership.md` row "Canvas, viewport, selection …": add "13.35 (slot id label, anchor links on hover and selection)".
- [x] `packages/editor/src/hover/{hovered-node.ts,use-hovered-node.ts,hover-grace-delay.ts,types.ts}` -- `HoveredNode` (service): `HoveredGroup` moved, its ref holding `PlacementId | undefined`, getter `id` still `Option`; its comments, `hover-grace-delay.ts`'s and `HoverSource`'s say node, not group, and `services-classified.spec.ts`'s `notShown` reason names the borders, labels and links it drives. `useHoveredNode()` (function): `hovered` (computed `PlacementId | undefined`), `pointAt(placement)`, `pointAtTreeGroup`, `leave`, `clear`, `clearTreeHover`. `editor-module.ts`, `services-classified.spec.ts` follow. Rows 3a, 12–12a.
- [x] `packages/editor/src/group-border/{use-group-borders.ts,GroupBorder.vue,GroupBorderTab.vue,types.ts}`, `workspace/layout/CanvasSlot.vue`, `slide-out/TreeSlideOut.vue` -- callers use `pointAt`; borders show hovered mapped to `sideQualifiedId(sideOf(h), nearestGroupId(layout, nodeIdOf(h)))`. Rows 4–5, 11–11a.
- [x] `packages/editor/src/workspace/layout/{use-pointed-and-selected-nodes.ts,use-pointed-and-selected-nodes.spec.ts}` -- `usePointedAndSelectedNodes()` (function): the placed nodes whose key is selected or hovered, in placed order, each once. Row 14.
- [x] `packages/editor/src/workspace/layout/{use-slot-id-labels.ts,use-slot-id-labels.spec.ts}` -- `useSlotIdLabels(shown, modelToScreen)` (function): per shown slot with bounds, `{ key, id, at }`, `at` the screen point of the bounds' bottom middle; a shallow ref set in a `flush: 'post'` watch on the shown nodes (frames included) and the viewport. Rows 2, 8.
- [x] `packages/editor/src/workspace/layout/{SlotIdLabel.vue,slot-id-label-marks.ts,types.ts,LayoutCanvas.vue}` -- `SlotIdLabel` (component, neither tag: AD-25's split is for classes and functions; props `id`, `placement`, `at`, `grayed`): rect `h-slot-id-label`, `rounded-sm`, width the text's `useElementSize` width plus insets, top at `at.y + gap`. `AnchorLink.vue` and `AnchorLinkProps` gain `placement`, and the link's `<g>` takes `role="img"` and its name. `LayoutCanvas`: links over `usePointedAndSelectedNodes`, labels over `useSlotIdLabels`, between keys and tabs; `legends` and `:121`'s stale wording go. Rows 1–10.
- [x] `packages/ui/src/theme/theme.css`, DESIGN.md -- `components.slot-id-label` (height, radius), `--spacing-slot-id-label: 17px`. Row 9.
- [x] `packages/editor/src/workspace/layout/show-ids-and-links.spec.ts` -- rows 1, 3–7c, 9–12a (drawn result); `use-slot-id-labels.spec.ts` holds 2 and 8, `use-pointed-and-selected-nodes.spec.ts` holds 14; `group-border/group-borders.spec.ts` -- imports renamed, the delete test at `:562` asserts the drawn result only; `switch-grace.spec.ts` -- row 13, link by `getByRole('img', { name: 'left/a anchor link', exact: true })`, every test in the file named by role ("just before the grace", "on the grace", "just after") with ms in constants; the top face stays found by `querySelectorAll('rect')` (it has no role), logged to `deferred-work.md`.
- [x] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` -- `switch-grace.spec.ts`'s top face by position; hover's own grace and prune tests still in `group-border/group-borders.spec.ts` (`:234`, `:562`), not `hover/`.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then each row passes at its level in Chromium and Firefox.
- Given each toggled bug, applied alone, then its rows go red and pass once restored (named in the PR): links for every placed node (1); labels for fitted slots only (6); label at the frame, not the bounds (2, 8); selection dropped from the shown set (3, 4c); hover cleared on leave (3a); groups left out of links (4, 4a, 11); `pointAt` from a key recording its group (4b); borders without `nearestGroupId` (4b, 5); labels drawn for groups (4c); label text side-qualified (5); shown set not deduplicated (7); hover dropped from the shown set (7a); shown set from raw ids, not placed rows (7b, 7c); label fill `canvas` (9); label not grayed (9a); labels after tabs (10); Tree slot row pointing at its slot (11a); prune removed (12) or clearing on every commit (12a); link without the grayed class (13).

## Implementation Notes

- The docs task was already on main (b6f626a: spine Editor state row and `component-ownership.md`), so the branch carries no spine edit.
- Decision (build): `CanvasItems` makes its registrations reactive (a `shallowRef` it only triggers on register and unregister, read by `bounds`, `allBounds`, `size` and `drawsAny`), not a plain `Set`, because Vue runs `LayoutCanvas`'s post-flush label watch before a newly mounted `CanvasSlot` registers its body (both are post jobs, ordered by component uid), so a label for a key mounted in the same flush, such as a duplicated key that is selected, would miss its bounds until the next hover. Writes never read the ref, so the effect that registers a key does not track its own registration. Citation: `show-ids-and-links.spec.ts` "shows the label and link of a selected id once a later set places it", Chromium, with baseline `canvas-items.ts` (b6f626a): `AssertionError: expected { labels: [], …(2) } to deeply equal { labels: [ 'left/new id' ], …(2) }`; with this change, passed.
- Real-host run: the specs fake only the repo's own model worker (`workers/testing`'s `FakeWorker`, checked against the real one in `app` specs); `useElementSize` and `CanvasItems`' measuring run in real Chromium and Firefox in browser mode. No third-party fake.
- No unplanned structural change: the diff since `baseline_revision` touches no `tsconfig*.json`, `package.json`, `pnpm-workspace.yaml`, or Vitest, ESLint, Stryker or dependency-cruiser config, and adds no `declare global` or `declare module`. `pnpm test`: 679 files, 5415 tests, exit 0; `pnpm typecheck`, `pnpm lint` clean.
- Decision (build): the label's corners are CSS `rx: var(--radius-sm)` on the `<rect>`, as `GroupBorderTab.vue` does, not Tailwind's `rounded-sm`, because `border-radius` does not apply to an SVG `<rect>`.
- Decision (build): the label's 4px text inset and 3px gap live in `slot-id-label-marks.ts`, not in DESIGN.md's `components.slot-id-label`, because the task names only height and radius for DESIGN.md, as `group-border-tab` keeps its inset in `group-border-marks.ts`.
- Decision (build): row 7c arranges a second, placed key `a` beside the unplaced `k`, not `k` alone, because a set placing no slot shows the new-design hint and draws nothing, so the row could never go red.
- Decision (build): row 6 sends the unfitted key a `pointerenter`, not a real pointer move, because an unfitted key draws no fill and only its 1px edge catches the pointer; Playwright's hover on it times out ("svg intercepts pointer events"). Logged to `deferred-work.md` as a question for Sergii: in the app, an unfitted slot can't be pointed at or clicked from its inside.
- Decision (build): rows 2 and 8 measure the key and the label through `getBBox` and `getScreenCTM`, not `getBoundingClientRect`, because Firefox counts the stroke in an SVG element's client rect and Chromium does not (Firefox read the label 1px higher).
- Decision (build): fixture T's group rows: `matrix-middle`'s border 1 mm outside its keys, `thumbfan`'s 4 mm above its keys, so row 4 has a point inside the border and on no key at zoom 4; the right half mirrored about x = 60 mm; canvas 648 × 448 px at centre (60, −5), zoom 4, not the fit, so screen points are known. These numbers come from no requirement.
- Decision (build): `rectangle` and `groupRow` move from `group-borders.spec.ts` to `testing/layout-canvas.ts`, not copied, because the new specs build group rows too; `arrangeLayoutCanvas`'s `post` takes an optional parts output for row 8's 1.5u key.
- Decision (build): `group-borders.spec.ts`'s other commit test (`:583`) also drops its read of the service and keeps the selection and the drawn result, not only `:562`, because it read `HoveredGroup` the same way and the hovered id is now the key, not the group.
- Decision (build): the screen-space group of labels and links loses `aria-hidden`, not keeps it, because its children are now named images.
- Toggled bugs, each alone, Chromium, the four specs of this story (baseline 41 green): every bug in the Acceptance list turned its named rows red and passed once restored. Two were toggled as nearest equivalents: "shown set from raw ids" as `usePlacedNodes` keeping unplaced rows (7c red; 7b's id has no posted row at all, so no raw-id variant reaches it), and "labels drawn for groups" as a label at a fixed point for a group (a group registers no canvas item, so a label through bounds can't appear). "Hover cleared on leave" turns only 3a's just-before row red, the other two expect the clear. Broad toggles (links for every node, hover dropped, `pointAt` recording the group) turn many rows red beyond those named.

- Review pass 1 superseded two build records above: `useHoveredNode().hovered` was deleted (no caller read it), so the composable returns `pointAt`, `pointAtTreeGroup`, `leave`, `clear`, `clearTreeHover`; and DESIGN.md's `components.slot-id-label` now also holds `inset: 4px` and `gap: 3px`, as Sergii's decision names them, with `slot-id-label-marks.ts` keeping the same numbers for the canvas (unlike `group-border-tab`, whose inset is only in `group-border-marks.ts`).
- Row 4a's patch kept the border-first arrange and instead freezes time, hovers the tab and advances the hover grace + 1 ms, so only the tab's own `pointAt` outlives the border's leave; toggled: `@pointerenter` removed from `GroupBorderTab.vue` → red (`expected { labels: [], links: [], borders: [] } …`), restored → green.

## Plan Change Log

## Review Triage Log

Pass 1 (quick, test-reviewer; 0 findings dropped for a missing quote). Verdicts: high 0, medium 1, low 12, false 1, maybe-false 0.
- medium, patch -- row 4a "shows its link, no label, for a pointer on its tab" arranges the group already hovered through its border, so the grace keeps it shown if the tab's `pointAt` did nothing (test-reviewer). Patch: hover the tab from nothing hovered; toggle `@pointerenter` on `GroupBorderTab.vue`.
- low, patch -- the drawing-order test pins link before label, which row 10 doesn't state (test-reviewer). Patch: assert row 10's relations only.
- low, patch -- `line === null ? undefined : …` in the stale-colour test (test-reviewer). Patch: throwing lookup.
- low, patch -- `use-slot-id-labels.spec.ts` comment cites DESIGN.md for the 3 px gap, which DESIGN.md didn't hold (quick). Patch: comment states the value only.
- low, patch -- DESIGN.md's `components.slot-id-label` lacked the inset and gap Sergii's decision names (quick). Patch: `inset`, `gap` added.
- low, patch -- `--spacing-slot-id-label: 17px` copies the tab's height instead of aliasing it, as DESIGN.md does (quick). Patch: `var(--spacing-group-border-tab)`.
- low, patch -- `useHoveredNode().hovered` is returned and read by no caller (quick). Patch: deleted.
- low, patch -- test helper `pointAt(x, y, side)` shares the hover API's name but mirrors a point (quick). Patch: renamed.
- low, patch -- `switch-grace.spec.ts:119` steps 2 ms after the set, not today's 10 ms, contrary to row 13's "at the same times" (quick). Patch: 10 ms restored as a named constant.
- low, defer (already logged) -- row 6 proves an unfitted slot's label only through a synthetic `pointerenter`; in the app an unfitted slot catches the pointer only on its 1px edge, which predates this change (both lenses). `deferred-work.md` holds it as a question for Sergii.
- low, rejected -- the 3 px gap is checked to ±0.5 px (test-reviewer): screen positions come from float transforms, as `group-borders.spec.ts`'s `SCREEN_PX_DIGITS = 0` already accepts; a tighter bound has no browser-agnostic basis.
- low, rejected -- row 10 can't catch a missing `pointer-events="none"` on the label or link themselves, since their parent group sets it (quick): the visible behaviour "catches no pointer" holds either way; the child attribute is redundant, not a defect.
- low, rejected (test decision, not defect) -- `arrangeIdsAndLinks` resets the pointer on the status strip (test-reviewer note): a visible arrange step, named in the helper.
- false -- `use-pointed-and-selected-nodes.spec.ts` builds a group `g` no row hovers or selects (test-reviewer): frozen row 14 arranges "placed `[a, b, g]`", so `g` is the requirement's input (a group in the placed set the shown set must leave out).

Pass 2 (quick, test-reviewer on the pass-1 patches; 0 dropped). Verdicts: high 0, medium 0, low 6. Nothing above low and no frozen line broken: the review ends; lows logged, not patched.
- low, logged -- row 10's `afterKeysAndBorders` uses `indexOf`, so a key or border missing from the DOM reads -1 and still passes that half; `beforeTabs` and the label and link lookups still fail on a missing name (both lenses).
- low, logged -- the Implementation Notes decision on inset and gap, the `hover/` task's `hovered`, and pass 1's row 4a patch wording no longer matched the code (quick): corrected by appended Implementation Notes, not by editing the records.
- low, logged -- `switch-grace.spec.ts` keeps its own inline lookup of `left/a`'s link line beside the new shared `anchorLinkLine` helper (quick).
- low, logged -- the inset and gap now sit in DESIGN.md and `slot-id-label-marks.ts` with no check tying them, as `tooling/design-tokens.spec.ts` reads no `components` group (quick).

## Design Notes

- Decision (plan): the service becomes `HoveredNode` in `hover/`, not `HoveredGroup` in `group-border/`, because AGENTS says "Name a thing for what it does" and it now holds "a group or a slot" (glossary **node**), read by keys, borders and links.
- Decision (plan): the label sits under the key's browser-measured bounds, not at the frame plus half the key height, because DESIGN.md puts it "just below the key", which a rotated key's corner would overlap, and AD-22's canvases "compute no geometry"; `CanvasItems` is "measured by the browser" (`canvas-items.ts:7-8`).
- Decision (plan): the innermost group is derived in `useGroupBorders`, not stored in `HoveredNode`, because the spine's hover "holds a `PlacementId`", one value.
- Decision (plan): a Tree slot row keeps pointing at nothing, not at its slot, because pointing at a slot shows its group's border, and `TreeSlideOut.vue:30` keeps EXPERIENCE.md's Left rail rule that "a group row shows that group's border".
- Decision (plan): the label grays during the switch grace, not stays coloured, because the spine's Switch grace row draws "an older snapshot … grayed", as the tab does (`GroupBorderTab.vue:28-36`).
- Decision (plan): label and link catch no pointer, as today's legends and links (`LayoutCanvas.vue:113-114`), not catch it, because a label over the key below (B2's caption) would end the pointed key's hover with a leave.
- Decision (plan): the label's width comes from vueuse's `useElementSize` on its `<text>`, not the tab's hand-written `getComputedTextLength` plus `document.fonts.ready` re-measure, because vueuse is the Stack's dependency for it and handles SVG: for an element whose namespace includes `svg` it reads `getBoundingClientRect()` on each ResizeObserver entry (`@vueuse/core` 14.4.0 `dist/index.js:3292-3303`), so a re-layout once JetBrains Mono loads re-measures without a font hook (spine: "Canvas legends must fit by its glyph widths").
- Decision (plan): the names say `label` (`SlotIdLabel`, `useSlotIdLabels`), not the spine's `legend`, because DESIGN.md calls it "a label just below the key" and says "the Layout id label below the key is not keycap text", while a legend is keycap text; `usePointedAndSelectedNodes`, not `useShownNodes`, because `GroupBorderShown` already means selected, hovered or none.
- Decision (plan): label and link become named images, not `aria-hidden`, because AGENTS says "Find elements by role, then label", as the border names itself (`GroupBorder.vue:46`).

Visible: `pnpm --filter app dev`, `/?seed=corney`: keys only at rest; pointing at a key shows its id in a label below it and its anchor link; pointing inside a group's border or at its tab shows the group's link; a clicked key keeps its label and link after the pointer leaves; right-half labels read without `right/`.

## Conformance Log

Pass 1 (two readers, 22 findings, union; 0 dropped) and gap reviewer (8, 0 dropped):
- spine `A component never calls useService itself … tested on their own` (shown set, label bounds) -- fixed (`usePointedAndSelectedNodes`, `useSlotIdLabels`)
- spine `A value that is stored (a computed, a ref) … is unwrapped first` (precedent `hovered-group.ts:48`) -- fixed
- spine `An id with no posted row yet … draws … nothing` -- fixed (rows 7b, 7c)
- `add empty input and an input that breaks an assumption` (stand-in, selected group, key under root) -- fixed (rows 6, 4c, 4d)
- `Give every threshold three rows` (hover grace for label and link) -- asked: Sergii, linger; rows 3a
- `Take expected values from the requirement` (row 4 "screen" coordinates) -- fixed (`modelToScreen`)
- `Arrange only what the test uses` (one fixture for all rows) -- fixed (fixture T, one-key rows)
- `Find elements by role` (precedent `switch-grace.spec.ts:84`) -- fixed; top face deferred
- `numbers go in parameters` (precedent `switch-grace.spec.ts` test names) -- fixed
- selecting `a` breaks `switch-grace.spec.ts`'s edge rows -- fixed (point at `a`)
- `Assert what a function returns or a visible effect` (precedent `group-borders.spec.ts:562`) -- fixed
- `no file-header essays` (precedent `group-border-marks.ts:1`) -- fixed (not copied)
- `Give every decision its rejected alternative` (spine sentence, pointer wording) -- fixed
- `Prove a test Stryker can't reach … with a toggled bug` (rows 4, 4a, 7, 7a, 9, 9a, 11, 12a, 13) -- fixed
- paint order against tabs -- asked: Sergii, below tabs
- glossary **key** (`pointAt(key)` for groups) -- fixed (`placement`)
- `SlotIdLabel` untagged -- fixed (component, noted)
- gap: `component-ownership.md` row lacks 13.35 -- fixed (docs task)
- gap: Stack dependency as Y (hand-measured width) -- fixed (`useElementSize`, source cited)
- gap: AD-22 `both themes` (row 9 Frappé only) -- fixed (Latte)
- gap: row 8's 18 × 36 key unreachable -- fixed (27 × 18, `1.5u`)
- gap: frames 20 apart vs 1 mm gap -- fixed (19)
- gap: unposted, unplaced and unmeasured ids -- fixed (rows 7b, 7c; the shown set from placed rows)

Final pass (7 low, 0 dropped; these fixes no reviewer has read):
- `A choice no requirement made is a decision` (where the link's role is set) -- fixed (`AnchorLink.vue` task)
- `Test a rule where it is defined` (rows split across specs; hover tests outside `hover/`) -- fixed (rows assigned) and deferred (hover's own tests)
- `Write a comment only for a why` (moved comments, `notShown` reason) -- fixed
- Naming `Glossary terms only` (`label`, `shown`) -- fixed (decision; rename)
- `SlotIdLabel` tag -- fixed (noted as neither)
- `numbers go in parameters` (every test in `switch-grace.spec.ts`) -- fixed
- `Find elements by role` (top face) -- deferred

## Verification

**Commands:**
- `pnpm test` -- expected: every project green, Chromium and Firefox.
- `pnpm typecheck && pnpm lint` -- expected: clean.

**Manual checks:**
- The Visible list in both themes; Sergii confirms the label against `mockups/canvas-legend-2.html` B2.
