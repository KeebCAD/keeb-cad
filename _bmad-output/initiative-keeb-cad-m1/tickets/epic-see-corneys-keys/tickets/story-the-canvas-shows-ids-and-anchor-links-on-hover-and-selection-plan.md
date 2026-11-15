---
title: 'The canvas shows ids and anchor links on hover and selection'
type: 'feature'
ticket: 35
created: '2026-11-15'
status: 'ready-for-dev'
baseline_revision: ''
route: 'full'
route_source: 'auto'
risk: 'low'
review: ''
review_source: ''
lenses_ran: []
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
- [ ] Docs on main before the branch -- spine Editor state: "Hover holds a `PlacementId` in its own service (`HoveredGroup`)" → "Hover holds the pointed node's `PlacementId`, a slot or a group, in its own service (`HoveredNode`), not the group a pointed key belongs to, because a pointed key shows its own id and anchor link (13.35)". `component-ownership.md` row "Canvas, viewport, selection …": add "13.35 (slot id label, anchor links on hover and selection)".
- [ ] `packages/editor/src/hover/{hovered-node.ts,use-hovered-node.ts,hover-grace-delay.ts,types.ts}` -- `HoveredNode` (service): `HoveredGroup` moved, its ref holding `PlacementId | undefined`, getter `id` still `Option`; its comments, `hover-grace-delay.ts`'s and `HoverSource`'s say node, not group, and `services-classified.spec.ts`'s `notShown` reason names the borders, labels and links it drives. `useHoveredNode()` (function): `hovered` (computed `PlacementId | undefined`), `pointAt(placement)`, `pointAtTreeGroup`, `leave`, `clear`, `clearTreeHover`. `editor-module.ts`, `services-classified.spec.ts` follow. Rows 3a, 12–12a.
- [ ] `packages/editor/src/group-border/{use-group-borders.ts,GroupBorder.vue,GroupBorderTab.vue,types.ts}`, `workspace/layout/CanvasSlot.vue`, `slide-out/TreeSlideOut.vue` -- callers use `pointAt`; borders show hovered mapped to `sideQualifiedId(sideOf(h), nearestGroupId(layout, nodeIdOf(h)))`. Rows 4–5, 11–11a.
- [ ] `packages/editor/src/workspace/layout/{use-pointed-and-selected-nodes.ts,use-pointed-and-selected-nodes.spec.ts}` -- `usePointedAndSelectedNodes()` (function): the placed nodes whose key is selected or hovered, in placed order, each once. Row 14.
- [ ] `packages/editor/src/workspace/layout/{use-slot-id-labels.ts,use-slot-id-labels.spec.ts}` -- `useSlotIdLabels(shown, modelToScreen)` (function): per shown slot with bounds, `{ key, id, at }`, `at` the screen point of the bounds' bottom middle; a shallow ref set in a `flush: 'post'` watch on the shown nodes (frames included) and the viewport. Rows 2, 8.
- [ ] `packages/editor/src/workspace/layout/{SlotIdLabel.vue,slot-id-label-marks.ts,types.ts,LayoutCanvas.vue}` -- `SlotIdLabel` (component, neither tag: AD-25's split is for classes and functions; props `id`, `placement`, `at`, `grayed`): rect `h-slot-id-label`, `rounded-sm`, width the text's `useElementSize` width plus insets, top at `at.y + gap`. `AnchorLink.vue` and `AnchorLinkProps` gain `placement`, and the link's `<g>` takes `role="img"` and its name. `LayoutCanvas`: links over `usePointedAndSelectedNodes`, labels over `useSlotIdLabels`, between keys and tabs; `legends` and `:121`'s stale wording go. Rows 1–10.
- [ ] `packages/ui/src/theme/theme.css`, DESIGN.md -- `components.slot-id-label` (height, radius), `--spacing-slot-id-label: 17px`. Row 9.
- [ ] `packages/editor/src/workspace/layout/show-ids-and-links.spec.ts` -- rows 1, 3–7c, 9–12a (drawn result); `use-slot-id-labels.spec.ts` holds 2 and 8, `use-pointed-and-selected-nodes.spec.ts` holds 14; `group-border/group-borders.spec.ts` -- imports renamed, the delete test at `:562` asserts the drawn result only; `switch-grace.spec.ts` -- row 13, link by `getByRole('img', { name: 'left/a anchor link', exact: true })`, every test in the file named by role ("just before the grace", "on the grace", "just after") with ms in constants; the top face stays found by `querySelectorAll('rect')` (it has no role), logged to `deferred-work.md`.
- [ ] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` -- `switch-grace.spec.ts`'s top face by position; hover's own grace and prune tests still in `group-border/group-borders.spec.ts` (`:234`, `:562`), not `hover/`.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then each row passes at its level in Chromium and Firefox.
- Given each toggled bug, applied alone, then its rows go red and pass once restored (named in the PR): links for every placed node (1); labels for fitted slots only (6); label at the frame, not the bounds (2, 8); selection dropped from the shown set (3, 4c); hover cleared on leave (3a); groups left out of links (4, 4a, 11); `pointAt` from a key recording its group (4b); borders without `nearestGroupId` (4b, 5); labels drawn for groups (4c); label text side-qualified (5); shown set not deduplicated (7); hover dropped from the shown set (7a); shown set from raw ids, not placed rows (7b, 7c); label fill `canvas` (9); label not grayed (9a); labels after tabs (10); Tree slot row pointing at its slot (11a); prune removed (12) or clearing on every commit (12a); link without the grayed class (13).

## Implementation Notes

## Plan Change Log

## Review Triage Log

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
