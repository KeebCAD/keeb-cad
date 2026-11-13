---
title: 'Explicit anchors move dependants, cycles rejected'
type: 'feature'
ticket: 3
created: '2026-11-13'
status: 'draft'
baseline_revision: ''
route: 'full'
route_source: 'auto'
risk: 'high'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Every node sits on its default anchor. A design can't say "this thumb key hangs off that key's corner", nothing stops a loop of anchors, and placement walks the tree, so it can't follow an anchor that points elsewhere.

**Approach:** `schema` gains `Anchor` (slot and group variants), `AttachPoint`, `ref('slot')`/`ref('group')`, the node `anchor` field and the `dependency-cycle` kinds. `model` gains the dependency graph (one anchor per node), `wouldCycle`, the anchor check that finds cycles and unresolvable anchors, placement in dependency order, `setAnchor`, the anchor cascade in `deleteNode` and the remap in `duplicateNode`. `checkStructure` refuses a cycle the edit closes and a node reference of the wrong kind. `commands` gains `SetAnchor`; the worker posts layout violations beside the parts ones.

## Boundaries & Constraints

**Always:**
- Each node depends on exactly one node: a free child on its explicit anchor's target, else its parent; a chain child on its previous sibling, else its parent (AD-3, AD-4). The root depends on nothing.
- An explicit anchor replaces the default: anchor frame = target's world frame, then the attach point's move in that frame (slots: `center` when omitted; `edge-top` at +h/2, corners at (±w/2, ±h/2); groups: their origin), then the offset as written. `anchorAt` is that attach point.
- A node is placed only when its dependency chain reaches the root through no cycle and no unresolvable anchor. Unplaced rows: frame and `anchorAt` NaN, `placed: false`.
- `checkStructure(previous, next)` refuses only what `next` breaks that `previous` didn't: a new cycle (`dependency-cycle`, ids in cycle order from the member whose dependency changed) or a node reference that is missing or of the wrong kind (`unknown-target`).
- Each violation kind's message comes from one model function of its kind and ids; tests assert whole violations through it.

**Never:**
- No vertex or construction-point anchors, no parameter edges (14.2), no anchor picker (15.6), no re-anchor in place (15.3), no change to Corney's script (13.4).
- No `vi.mock`, snapshots or jsdom.

**Decisions (Sergii, 2026-11-13, party round on anchoring):**
- A chain child has no explicit anchor, not an anchor that stops the carry, because a chain child anchored outside its group makes the group's step and the child wait on each other and no paper-tested board uses one: the schema gives a chain's children no `anchor` field (`ChainChild`), a file holding one fails to load as `design-invalid`, and a turn that must not carry is cancelled by the next sibling's own offset rotation (spine AD-3, AD-4).
- A free group's child anchors anywhere.
- A group's extent counts only the slots placed from inside it; a descendant anchored outside the group, and what depends on it, is left out, not counted at its world position, because the two would wait on each other.
- `checkSetAnchor`, called by availability and apply, refuses a node or target the design lacks or of the wrong kind (`unknown-target`), a chain child (`chain-child-anchored`) and a loop (`dependency-cycle`), not the structural check alone, because availability would then say yes to an input `run` refuses. The structural check stays the guard for loops other commands close.
- Groups stay origin-only; slots keep nine attach points; anchors stay by id.

## Boundary table

Rows 1–2 run in schema, 3–20 model, 21 commands, 22 pipeline, 23–27 app.

| # | Group | Level | Input / State | Expected |
|---|---|---|---|---|
| 1 | rules | unit schema | anchor `{type:'slot',ref:'a'}` / with attach 'edge-top' / attach 'edge-middle' / `{type:'group',ref:'g',attach:'center'}` / `{type:'vertex',ref:'v'}` | ok / ok / refused / refused / refused |
| 2 | rules | unit schema | free group's slot with `anchor` / chain group's slot with `anchor` | parses, `walkReferences` yields `{ path: [..., 'anchor', 'ref'], kind: 'slot', target: 'a' }` / design-invalid at the anchor's path |
| 3 | rules | unit model | free root [chain group c [a, b], x]: wouldCycle(c → b) / (x → b) / (x → x) / (root → x) / (c → x) | true / false / true / true / false |
| 4 | rules | unit model | anchor check, loaded cycles of 1, 2 and 3 members | one `dependency-cycle` error each, ids the members in cycle order from the lowest by compareId |
| 5 | rules | unit model | cycle a ↔ b in a free group; a's child (default); b's next chain sibling; a's child anchored to unrelated x | first two unplaced; the anchored child placed |
| 6 | rules | unit model | node n anchored to 'missing' / `{type:'slot'}` naming a group; n's default child | `unresolvable-reference` error ids [n]; n and its child unplaced |
| 7 | rules | unit model | slot k at origin, rect w 18 h 17; n anchored to k at attach omitted / center / edge-top / edge-bottom / edge-left / edge-right / corner-tl / corner-tr / corner-bl / corner-br | anchorAt (0,0) / (0,0) / (0,8.5) / (0,−8.5) / (−9,0) / (9,0) / (−9,8.5) / (9,8.5) / (−9,−8.5) / (9,−8.5) |
| 8 | rules | unit model | k rotated 90deg; n anchored at edge-top, no offset | anchorAt (−8.5, 0); n's rot 90 |
| 9 | rules | unit model | free root: group g offset (10mm, 20mm); slot n offset (2mm, 0) default / anchored to g | n at (2, 0) / (12, 20) |
| 10 | rules | unit model | a offset x 10mm; b anchored to a; c anchored to b; a's offset becomes x 30mm | b and c each move +20 in x |
| 11 | rules | unit model | chain y, rect h 18, gap 1: [s0, free group G [t anchored to slot x at (50, 0), u]] | G and u at y 19 (G steps by u alone); t at (50, 0) |
| 12 | rules | unit model | the same G with u also anchored outside / free root holding G with t anchored to u | G a point: origin y 10 / G steps by t and u (t's anchor stays inside G) |
| 13 | rules | unit model | unplaced slot row | frame and anchorAt NaN, placed false, part and fit as a placed slot's |
| 14 | rules | unit model | checkStructure: next anchors to 'missing' / slot-type to a group id / to a slot / previous already dangling the same | unknown-target ['missing'] / unknown-target [group id] / ok / ok |
| 15 | rules | unit model | checkStructure: next closes a → b → c by changing c / previous already had that cycle and next edits elsewhere | dependency-cycle ids [c, a, b] / ok |
| 16 | rules | unit model | checkSetAnchor / setAnchor: n (free child, offset set) to g / with no anchor / of 'missing' / to 'missing' / slot-type naming a group / a chain child / closing n → m → n | anchor set, offset unchanged / anchor removed, offset unchanged / unknown-target ['missing'] / unknown-target ['missing'] / unknown-target [group id] / chain-child-anchored [child] / dependency-cycle [n, m] |
| 17 | rules | unit model | deleteNode m: b anchored to m, c anchored to m's child, d anchored to other | b and c lose `anchor`, offsets unchanged; d keeps its anchor |
| 18 | rules | unit model | duplicateNode g [a, b anchored to a at edge-top, c anchored to x outside g] | copy g-2 [a-2, b-2 anchored to a-2 at edge-top, c-2 anchored to x] |
| 19 | rules | unit model | violation message: dependency-cycle [a, b, c] / unresolvable-reference for an anchor [n] / for a part [s] | its string / its string / the existing part string |
| 20 | glue | unit model | createDerivations on a design with a cycle and a dangling anchor | `violations` = parts' then layout's, asserted whole; `placements` rows placed false; `meta.name` change keeps `violations` the same object (`toBe`) |
| 21 | glue | unit commands | SetAnchor apply on a plain draft; input `{id, anchor}` / `{id}` / anchor type 'vertex' | the operation's result / ok / ok / input-invalid |
| 22 | module boundaries | unit pipeline | derivations with `violations` [v] | the issues post carries [v] |
| 23 | glue | integration app | SetAnchor through `mainModules` after NewDesign and AddSlots | commits; the slot's anchor is set |
| 24 | module boundaries | integration app | SetAnchor closing a → b → a; `available` for the same input | dependency-cycle ids [a, b], design unchanged; the same rejection |
| 25 | module boundaries | integration app | DeleteNode m where z → m and P → z (z is P's child) | dependency-cycle [z, P] (z's dependency changed), design unchanged |
| 26 | module boundaries | integration app | design with a cycle through `replaceDesign`, then AddSlot elsewhere | commits |
| 27 | glue | integration app | that design's derivations wired by hand (13.2's `arrangePlacements`) | `violations` holds the dependency-cycle; its members post placed false |

</frozen-after-approval>

## Code Map

- `packages/schema/src/ref.ts:8-19` -- `targets` and overloads; add `slot` and `group` (both `idSchema`).
- `packages/schema/src/layout.ts:9-31` -- node field schemas; add `anchor: v.optional(anchorSchema)` to the slot and both group field schemas.
- `packages/schema/src/types.ts:164-175` -- `ModelRejectionKind`, `ViolationKind`; both gain `'dependency-cycle'`. `Anchor`, `AttachPoint` inferred here.
- `packages/schema/src/testing/{offset,layout}.ts` -- builder precedent; add `anAnchor`.
- `packages/model/src/references/walk-references.ts:13-64` -- the walk; `variant` picks by `v.is`, so anchors need no new case. Add `walkNodeReferences(node)` (same `walk`, from `nodeSchema`) for the copy's remap.
- `packages/model/src/check-structure.ts:37-43` -- `danglingTargets` only knows `design-part`; give it the layout's slot and group ids per kind.
- `packages/model/src/placement/place-layout.ts:54-96` -- the tree walk `arrangeGroup`/`step`; rewritten. Keep `extent.ts`, `place-slot.ts`, `read-offset.ts`, `slotPart`, `rowOf`, the IDENTITY root frame and the compareId sort.
- `packages/model/src/layout-editing/{delete-node,duplicate-node,node-tree}.ts` -- operations to extend; `findNode`, `isGroup`, `subtreeIds` reused.
- `packages/model/src/layout-editing/check-delete-node.ts` -- check-function precedent for `checkSetAnchor`.
- `packages/model/src/parts/part-violation-message{,.spec}.ts` -- moves to `violations/violation-message.ts` as `violationMessage`.
- `packages/model/src/parts/create-derivations.ts:41,123-127` -- `layout` selector, `placements` computed.
- `packages/model/src/{main,index,worker}.ts` -- entries.
- `packages/commands/src/layout/{duplicate-node,duplicate-node-input-schema,types,layout-commands-module}.ts`, `index.ts` -- command trio precedent.
- `packages/pipeline/src/pipeline/{pipeline.ts:94-108,types.ts:9-13}` -- the issues post reads `parts.value.violations`.
- `packages/pipeline/src/pipeline/pipeline-stages.spec.ts:60-81` -- arrange with fake derivations.
- `app/src/{layout-commands,corney-column}.spec.ts` -- `mainModules` arrange and `arrangePlacements`.
- `packages/editor/src/workspace/layout/use-placed-nodes.ts:22` -- already skips `placed: false`; no change.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/schema/src/{attach-point,anchor}.ts`, `ref.ts`, `layout.ts`, `types.ts`, `index.ts` -- `attachPointSchema` (picklist of the glossary's nine), `anchorSchema` (variant on `type`: slot with `ref('slot')` and optional attach, group with `ref('group')`), the `anchor` field on slots and free groups' children only: a chain group's `children` are `ChainChild[]` (the node schemas without `anchor`, hand-written types per the spine's `ChainChild`); `dependency-cycle` in both kinds and `chain-child-anchored` in `ModelRejectionKind`.
- [ ] `packages/schema/src/testing/anchor.ts` and spec -- `anAnchor` (function), one `it.each` row per field.
- [ ] `packages/model/src/dependencies/{dependency-graph,anchor-cycle,would-cycle,check-anchors,types}.ts` -- `dependencyGraph(layout)` (function): each node's one dependency (`explicit` with target and attach, `previous`, `parent`) plus each node's parent and index. `anchorCycle(graph, node, target): Option<Id[]>` (function): the cycle the edge would close, in order from `node`. `wouldCycle(design, node, target)` (function) over it. `checkAnchors(layout): AnchorCheck` (function): cycles, unresolvable anchors (missing or wrong kind) and the unplaced set.
- [ ] `packages/model/src/violations/{violation-message,layout-violations,types}.ts` -- `violationMessage(detail, ids)` (function), `partViolationMessage` moved here with `unresolvable-reference` gaining `reference: 'part' | 'anchor'` and `dependency-cycle` added; `layoutViolations(check)` (function) builds the layout `Violation[]`.
- [ ] `packages/model/src/placement/{place-layout,frame-in,types}.ts` -- `placeLayout(layout, gap, parts, unplaced)` (function); `frameIn` (function) per Design Notes.
- [ ] `packages/model/src/check-structure.ts` -- node kinds in `danglingTargets`; new cycles by `checkAnchors` on both sides.
- [ ] `packages/model/src/layout-editing/{set-anchor,check-set-anchor,delete-node,duplicate-node}.ts` -- `setAnchor`, `checkSetAnchor` (function, per the Decisions); `deleteNode` clears every `anchor` whose target it deleted, found by `walkReferences`; `duplicateNode` remaps the copy's node references whose target was copied, found by `walkNodeReferences`.
- [ ] `packages/model/src/parts/{create-derivations,types}.ts` -- `anchors` computed (`checkAnchors(layout)`), `placements` passes its unplaced set, `violations` computed (parts' then layout's); `Derivations` gains `violations`.
- [ ] `packages/model/src/{main,index}.ts` -- export `wouldCycle`, `setAnchor`, `checkSetAnchor`, `violationMessage` from main.
- [ ] `packages/commands/src/layout/{set-anchor,set-anchor-input-schema}.ts`, `types.ts`, `layout-commands-module.ts`, `index.ts` -- `SetAnchor` (service), id `layout.setAnchor`, label 'Set anchor', input `{ id, anchor? }`.
- [ ] `packages/pipeline/src/pipeline/{pipeline,types}.ts` and `pipeline-stages.spec.ts` -- post `violations.value`.
- [ ] `packages/design-file/src/round-trip.spec.ts` -- the canonical design gains a slot anchor with attach.
- [ ] Specs beside each file for rows 1–22; `app/src/anchors.spec.ts` for rows 23–27.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then each row has a passing test at its level.
- Given rows 23–27, when the implementer breaks the wiring each covers (SetAnchor unregistered, the cycle check always ok, `violations` not posted), then that test goes red; each check is named in the PR.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Design Notes

Placement computes `frameIn(G, d)`: node `d`'s frame in group `G`'s frame, memoised per pair, or none when `d` is unplaced or its dependency leaves `G`'s subtree. `frameIn(G, G)` is the identity. Otherwise the anchor frame is `frameIn(G, target)` then the attach move, `frameIn(G, parent)`, or `frameIn(G, previous)` stepped by `far(previous) + gap − near(d)`; then the offset (`placeSlot`). A group's extent takes its slots `s` with `frameIn(group, s)` defined. World frames are the root frame composed with `frameIn(root, d)`. Every call targets a smaller subtree or a node earlier in an acyclic graph, so it ends.

- Decision (plan): the dependency graph keeps one dependency per node, not extent edges from a group to its slots, because AD-3 lists the edges as "explicit anchors, default anchors (previous chain sibling, parent's origin) and parameter references". With one edge each, a cycle is found by following pointers.
- Decision (plan): a loaded cycle lists its members from the lowest id by compareId, not from whichever node the search met first, because the Violations row asks for "cycle order" and a fixed start keeps the post the same for one design.
- Decision (plan): an anchor of the wrong kind (`{type:'slot'}` naming a group) is `unresolvable-reference`, not a separate kind, because the spine's `unknown-target` already covers "a missing id or the wrong kind" for the same reference.
- Decision (plan): unplaced slot rows keep their part row and fit, not −1 and `stand-in`, because the Data Schema names only "frame and anchorAt are NaN" and parts resolve without placement.
- Decision (plan): a DeleteNode whose fallback closes a cycle is refused with `dependency-cycle`, not committed, because AD-3: "the graph is acyclic after every command".
- Decision (plan): `partViolationMessage` becomes `violationMessage` for every model kind, not a second function for anchors, because "Each kind's message is built by one `model` function from its kind and ids" (Violations row).
- Decision (plan): `Derivations` gains `violations`, not a placements value carrying them, because the pipeline posts one issues list and `placements` stays the posted `LayoutOutput`.
- Decision (plan): SetAnchor takes one `id`, not a list as 14.5's setters do, because the spine lists only 14.5's setters as taking id lists and "setAnchor anchors any node" (ticket).

Nothing visible changes: no editor surface invokes SetAnchor before 15.6, and the canvas already hides unplaced rows. The look is the test run.

## Verification

**Commands:**
- `pnpm test` -- expected: all green.
- `pnpm typecheck` -- expected: no errors.
- `pnpm depcruise` -- expected: no violations.
