---
title: 'Explicit anchors move dependants, cycles rejected'
type: 'feature'
ticket: 3
created: '2026-11-13'
status: 'built'
baseline_revision: '64c61eb411f25f96ce546a01b4650d9860a38a47'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Every node sits on its default anchor. A design can't say "this thumb key hangs off that key's corner", nothing stops a loop of anchors, and placement walks the tree, so it can't follow an anchor that points elsewhere.

**Approach:** `schema` gains `Anchor` (slot and group variants), `AttachPoint`, `ref('slot')`/`ref('group')`, the node `anchor` field (absent on a chain's children) and the `dependency-cycle` kinds. `model` gains the dependency graph (one dependency per node), `wouldCycle`, the anchor check that finds cycles and unresolvable anchors, placement in dependency order, `setAnchor`, the anchor cascade in `deleteNode` and the remap in `duplicateNode`. `checkStructure` refuses a cycle the edit closes and a node reference of the wrong kind. `commands` gains `SetAnchor`; the worker posts layout violations beside the parts ones.

## Boundaries & Constraints

**Always:**
- Each node depends on exactly one node: a free child on its explicit anchor's target, else its parent; a chain child on its previous sibling, else its parent (AD-3, AD-4). The root has no default dependency; since every node depends on the root through its parents, any explicit anchor on the root closes a cycle.
- An explicit anchor replaces the default: anchor frame = target's world frame, then the attach point's move in that frame (slots: `center` when omitted; `edge-top` at +h/2, corners at (±w/2, ±h/2); groups: their origin), then the offset as written. `anchorAt` is that attach point.
- A node is placed only when its dependency chain reaches the root through no cycle and no unresolvable anchor. Unplaced rows: frame and `anchorAt` NaN, `placed: false`.
- `checkStructure(previous, next)` refuses only what `next` breaks that `previous` didn't: a new cycle (`dependency-cycle`, ids in cycle order from the member whose dependency changed) or a node reference that is missing or of the wrong kind (`unknown-target`).
- Each violation kind's message comes from one model function of its ids; tests assert whole violations through it.

**Never:**
- No vertex or construction-point anchors, no parameter edges (14.2), no anchor picker (15.6), no re-anchor in place (15.3), no change to Corney's script (13.4).
- No `vi.mock`, snapshots or jsdom.

**Decisions (Sergii, 2026-11-13, party round on anchoring):**
- A chain child has no explicit anchor, not an anchor that stops the carry, because a chain child anchored outside its group makes the group's step and the child wait on each other and no paper-tested board uses one: the schema gives a chain's children no `anchor` field (`ChainChild`), a file holding one fails to load as `design-invalid`, and a turn that must not carry is cancelled by the next sibling's own offset rotation (spine AD-3, AD-4).
- A free group's child anchors anywhere, not only inside its group, because Corney's thumb fan hangs off `matrix_middle_bottom`, a key in another group (AD-3).
- A group's extent counts only the slots placed from inside it; a descendant anchored outside the group, and what depends on it, is left out, not counted at its world position, because the two would wait on each other.
- `checkSetAnchor`, called by availability and apply, refuses a node or target the design lacks or of the wrong kind (`unknown-target`), a chain child (`chain-child-anchored`) and a loop (`dependency-cycle`), not the structural check alone, because availability would then say yes to an input `run` refuses. The structural check stays the guard for loops other commands close.
- Groups stay origin-only, not attach points on a group's bounding box, because a staggered group has no clean edge; slots keep nine named attach points, not `center` plus an offset, because a named point keeps its meaning on a turned key; anchors stay by id, not by path (AD-3).

**Decisions (Sergii, 2026-11-13, plan questions):**
- The cycle message is `The nodes form a loop: "a" → "b" → "c" → "a".` (the ids in order, the first repeated at the end), not a plain list, because the arrows show the order the ids carry and fit a one-member loop; the dangling-anchor message is `The node "n" has an anchor that doesn't resolve.`, mirroring the part message.
- `violations` lists the parts' violations, then the layout's: cycles, then unresolvable anchors, each by compareId of its first id; not layout first, because the parts' list keeps its place.
- When one edit leaves several faults, `checkStructure` returns `unknown-target` before `dependency-cycle`, and of several new loops the one whose changed member is lowest by compareId; not an implementer's pick, because the same edit then always gives the same rejection.
- A design whose form is unsupported reports no layout violations, as it reports no parts violations today; not cycles and dangling anchors beside an empty canvas, because nothing is placed and the form's own violation is the one to fix first.

## Boundary table

Units: mm and degrees. `R` is a free root unless a row says otherwise; rects are w 18 h 17 unless stated; `x → y` means x is anchored to y.

| # | Group | Level | Input / State | Expected |
|---|---|---|---|---|
| 1 | rules | unit schema | `anchorSchema`: `{type:'slot',ref:'a'}` / with attach 'edge-top' / attach 'edge-middle' / `{type:'group',ref:'g',attach:'center'}` / `{type:'vertex',ref:'v'}` | ok / ok / refused / refused / refused |
| 2 | rules | unit schema | `designSchema` with an anchor on: a free group's slot / a free group's child group / a chain group's slot / a chain group's child group | ok / ok / refused, issue path `[..., 'children', i, 'anchor']` / the same |
| 3 | rules | unit schema | `layoutOutputSchema` row with frame and anchorAt all NaN / all finite / frame x `'a'` | ok / ok / refused |
| 4 | rules | unit model | `walkReferences` on R [slot a, slot n → a at edge-top, group g, slot m → g] | yields `{ kind: 'slot', target: 'a' }` and `{ kind: 'group', target: 'g' }`, each with its path ending `'anchor', 'ref'` |
| 5 | rules | unit model | R [chain group c [a, b], x]: wouldCycle(c → b) / (x → b) / (x → x) / (R → x) / (c → x) | true / false / true / true / false |
| 6 | rules | unit model | `checkAnchors`: R with no anchors / loaded cycles of 1, 2 and 3 members | no cycles, no unresolvable, nothing unplaced / one cycle each, members in cycle order from the lowest by compareId |
| 7 | rules | unit model | R [free group a → b holding [a1, a2 → x], chain group b → a holding [b1, b2], slot x] | a, b, a1, b1, b2 unplaced; a2 and x placed |
| 8 | rules | unit model | n → 'missing' / n → `{type:'slot'}` naming a group; n is a free group with default child k | unresolvable [n]; n and k unplaced (each case) |
| 9 | rules | unit model | slot k at origin, rect w 18 h 17; n → k at attach omitted / center / edge-top / edge-bottom / edge-left / edge-right / corner-tl / corner-tr / corner-bl / corner-br | anchorAt (0,0) / (0,0) / (0,8.5) / (0,−8.5) / (−9,0) / (9,0) / (−9,8.5) / (9,8.5) / (−9,−8.5) / (9,−8.5) |
| 10 | rules | unit model | k rotated 90; n → k at edge-top, no offset | anchorAt (−8.5, 0); n's rot 90 |
| 11 | rules | unit model | R [group g offset (10, 20), slot n offset (2, 0)]: n default / n → g | n at (2, 0) / (12, 20) |
| 12 | rules | unit model | a offset x 10; b → a; c → b; then a's offset x 30 | b and c each 20 further in x |
| 13 | rules | unit model | R [chain y [s0, free group G [t → x, u]], slot x offset (50, 0)]; rect h 18, gap 1 | G and u at y 19 (G steps by u alone); t at (50, 0) |
| 14 | rules | unit model | the row 13 layout with u → x too / with t → u offset y −19 instead of t → x | G a point: origin y 10 / G origin y 38, u at y 38, t at y 19 (t's anchor stays inside G) |
| 15 | rules | unit model | an unplaced slot row | frame and anchorAt NaN, placed false, part and fit as a placed slot's |
| 16 | rules | unit model | checkStructure: next adds n → 'missing' / slot-type anchor naming a group / → a slot / previous already held n → 'missing' | unknown-target ['missing'] / unknown-target [group id] / ok / ok |
| 17 | rules | unit model | checkStructure: next closes a → b → c by changing c / previous already held that cycle and next edits elsewhere | dependency-cycle ids [c, a, b] / ok |
| 17a | rules | unit model | checkStructure: next both adds n → 'missing' and closes a ↔ b / next changes p and q (p before q by compareId), closing p ↔ r and q ↔ s | unknown-target ['missing'] / dependency-cycle [p, r] |
| 18 | rules | unit model | checkSetAnchor, then setAnchor: free child n (offset set) → g / n with no anchor / node 'missing' / → 'missing' / slot-type naming a group / a chain child / closing n → m → n | anchor set, offset unchanged / anchor removed, offset unchanged / unknown-target ['missing'] / unknown-target ['missing'] / unknown-target [group id] / chain-child-anchored [child] / dependency-cycle [n, m] |
| 19 | rules | unit model | deleteNode m: b → m, c → m's child, d → other | b and c lose `anchor`, offsets unchanged; d keeps its anchor |
| 20 | rules | unit model | duplicateNode free group g [a, b → a at edge-top, c → x outside g] | copy g-2 [a-2, b-2 → a-2 at edge-top, c-2 → x] |
| 21 | rules | unit model | `dependencyCycleMessage([a, b, c])` / `unresolvableReferenceMessage('anchor', [n])` / `unresolvableReferenceMessage('part', [s])` | `The nodes form a loop: "a" → "b" → "c" → "a".` / `The node "n" has an anchor that doesn't resolve.` / `The slot "s" names a part that doesn't resolve.` |
| 21a | rules | unit model | `dependencyCycleMessage([a])` | `The nodes form a loop: "a" → "a".` |
| 22 | module boundaries | unit pipeline | derivations with `violations` [v] | the issues post carries [v] |
| 23 | module boundaries | integration app | SetAnchor closing a → b → a; `available` for the same input | dependency-cycle ids [a, b], design unchanged; the same rejection |
| 24 | module boundaries | integration app | DeleteNode m where z → m and free group P → z (z is P's child) | dependency-cycle [z, P], design unchanged |
| 25 | module boundaries | integration app | a design with a cycle through `replaceDesign`, then AddSlot elsewhere | commits |
| 26 | glue | unit model | createDerivations on a design with an unresolved part, a cycle and a dangling anchor | `violations` = [part's, cycle's, dangling anchor's], asserted whole; `placements` rows placed false; a `meta.name` change keeps `violations` the same object (`toBe`) |
| 26a | glue | unit model | row 26's design with an unsupported form | `violations` holds no layout violation; `placements` empty |
| 27 | glue | unit commands | SetAnchor apply on a draft; input `{id, anchor}` / `{id}` | the draft equals `setAnchor`'s result for the same arguments / for no anchor |
| 28 | glue | integration app | SetAnchor through `mainModules` after NewDesign and AddSlots | commits; the slot's anchor is set |
| 29 | glue | integration app | row 25's design with derivations wired by the spec's `arrangeDerivations` | `violations` holds the dependency-cycle; its members' rows are placed false, asserted whole |

</frozen-after-approval>

## Code Map

- `packages/schema/src/ref.ts:8-19` -- `targets` and overloads; add `slot` and `group` (both `idSchema`).
- `packages/schema/src/layout.ts:9-55` -- `slotSchema` is a `v.pipe` carrying `v.metadata({ node: 'slot' })`; groups spread `chainGroupFieldsSchema`/`freeGroupFieldsSchema` entries into piped strict objects with `node: 'group'`; `childrenSchema` carries `flatten`. `design-file`'s `write-kdl.ts` throws when a list item's schema names no `node`, so every new pipe keeps that metadata. A strict object reports an unknown `anchor` at `children.i.anchor` (tried with valibot here).
- `packages/schema/src/layout-output.ts:9-14` -- frame and anchorAt are `v.number()`, which refuses NaN (`safeParse(v.number(), NaN).success` is false); the Data Schema says unplaced rows hold NaN.
- `packages/schema/src/types.ts:164-175` -- `ModelRejectionKind`, `ViolationKind`. `Anchor`, `AttachPoint` inferred here; `ChainChild` hand-written beside `Node`.
- `packages/schema/src/testing/{form,layout,index}.ts` -- variant-builder precedent (`aSplitForm`, `aForm`); `aChainGroup`'s `children` become `ChainChild[]`; `index.ts` is the only route to builders.
- `packages/model/src/references/walk-references.ts:9-64` -- private generator `walk(schema, value, path)`; `variant` picks by `v.is`, so anchors need no new case.
- `packages/model/src/check-structure.ts:37-43` -- `danglingTargets` knows only `design-part`; give it the layout's slot and group ids per kind.
- `packages/model/src/placement/place-layout.ts:54-125` -- the tree walk `arrangeGroup`/`step` is rewritten. Keep `extent.ts`, `place-slot.ts`, `read-offset.ts`, the IDENTITY root frame and the compareId sort; `slotPart` (line 103) and `rowOf` (line 118) move to their own files.
- `packages/model/src/layout-editing/{delete-node,duplicate-node,node-tree,check-delete-node}.ts` -- operations to extend; `findNode`, `isGroup`, `subtreeIds` reused; `checkDeleteNode` is the check-function precedent.
- `packages/model/src/parts/part-violation-message{,.spec}.ts` -- stays; its `unresolvable-reference` branch calls `unresolvableReferenceMessage('part', ids)`. `PartViolationDetail` imports `LaneFailure` from blueprint, which `model-root-and-main-reach-no-blueprint` (`.dependency-cruiser.mts:309-314`) keeps out of `main`.
- `packages/model/src/parts/create-derivations.ts:123-129` -- `placements` computed; `Derivations` in `parts/types.ts:23-27`.
- `packages/model/src/{main,worker}.ts` -- entries; app reaches model only through `worker` (`.dependency-cruiser.mts:113`).
- `packages/commands/src/layout/{duplicate-node,duplicate-node-input-schema,types,layout-commands-module}.ts` -- command trio precedent.
- `packages/pipeline/src/pipeline/{pipeline.ts:94-108,types.ts:9-13}` -- the issues post reads `parts.value.violations`. Callers of `listen`: `pipeline-stages.spec.ts:60-81`, `pipeline.spec.ts:31`, `pause/blueprint-pause.spec.ts:238`.
- `app/src/corney-column.spec.ts:17-45` -- the hand-wired store and worker derivations to follow; `only-tests-import-testing` (`.dependency-cruiser.mts:434-439`) lets only spec files and `packages/*/src/testing/` import `storage/testing`, so app arrange helpers stay inside spec files.
- `packages/design/src/store/parse-design.ts` -- `design-invalid` comes from `designSchema`; the load path is already proven by `commands/src/load/design-loader.spec.ts:151`, so row 2 tests the rule in `schema`.
- `packages/editor/src/workspace/layout/use-placed-nodes.ts:22` -- already skips `placed: false`; no change.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/schema/src/{attach-point,anchor}.ts`, `ref.ts`, `layout.ts`, `layout-output.ts`, `types.ts`, `index.ts` -- `attachPointSchema` (picklist of the glossary's nine), `anchorSchema` (variant on `type`: slot with `ref('slot')` and optional attach, group with `ref('group')`), the field schemas stay anchor-free and gain `slotFieldsSchema`; the `Node` pipes (`slotSchema`, `chainGroupSchema`, `freeGroupSchema`) add `anchor: v.optional(anchorSchema)`; `chainChildSchema` picks between the same fields without `anchor`, each piped with the same `v.metadata({ node })`; a chain group's children are `chainChildrenSchema` (`flatten`); `ChainChild` is hand-written as `InferOutput<typeof slotFieldsSchema> | (InferOutput<typeof chainGroupFieldsSchema> & { children: ChainChild[] }) | (InferOutput<typeof freeGroupFieldsSchema> & { children: Node[] })`, annotated like `nodeSchema`; frame and anchorAt as `v.union([v.number(), v.nan()])`, `dependency-cycle` in both kinds and `chain-child-anchored` in `ModelRejectionKind`.
- [ ] `packages/schema/src/testing/{anchor,attach-point}.ts` and specs, `testing/index.ts` -- `aSlotAnchor`, `aGroupAnchor`, `anAnchor(type)` (function each, the `form.ts` pattern); `anAttachPoint` (function, scalar builder); exported from `testing/index.ts`. `aChainGroup` takes `children: ChainChild[]`; `aSlot`, `aFreeGroup` and `aChainGroup` set no `anchor` by default, so their defaults are the chain-child builders per branch.
- [ ] `packages/model/src/references/walk-references.ts` -- add `walkNodeReferences(node)` (function) beside `walkReferences`, the private `walk` from `nodeSchema`, for the copy's remap.
- [ ] `packages/model/src/dependencies/{dependency-graph,anchor-cycle,would-cycle,check-anchors,types}.ts` -- `dependencyGraph(layout)` (function): each node's one dependency (`explicit` with target and attach, `previous`, `parent`) plus its parent and index. `anchorCycle(graph, node, target): Option<Id[]>` (function): the cycle the edge would close, in order from `node`. `wouldCycle(design, node, target)` (function). `checkAnchors(layout): AnchorCheck` (function): cycles, unresolvable anchors (missing or wrong kind) and the unplaced set.
- [ ] `packages/model/src/violations/{dependency-cycle-message,unresolvable-reference-message,layout-violations,types}.ts` -- `dependencyCycleMessage(ids)` (function), `unresolvableReferenceMessage(reference: 'part' | 'anchor', ids)` (function), neither importing blueprint; `layoutViolations(check)` (function) builds the layout `Violation[]`, both kinds `error`.
- [ ] `packages/model/src/parts/part-violation-message{,.spec}.ts` -- delegate the `unresolvable-reference` text; that spec row expects `unresolvableReferenceMessage('part', ids)` (tested in row 21), not the literal; move the spec's module-level `const ids` into the test.
- [ ] `packages/model/src/placement/{place-layout,frame-in,slot-part,layout-row,types}.ts` -- `placeLayout(layout, gap, parts, unplaced)` (function); `frameIn` (function) per Design Notes; `slotPart` (`slot-part.ts`) and `rowOf` (`layout-row.ts`) (function each) moved out.
- [ ] `packages/model/src/check-structure.ts` -- node kinds in `danglingTargets`; new cycles by `checkAnchors` on both sides, keyed by member set.
- [ ] `packages/model/src/layout-editing/{set-anchor,check-set-anchor,delete-node,duplicate-node}.ts` -- `setAnchor` (function), `checkSetAnchor` (function, per the Decisions); `deleteNode` clears every `anchor` whose target it deleted, found by `walkReferences`; `duplicateNode` remaps the copy's node references whose target was copied, found by `walkNodeReferences`.
- [ ] `packages/model/src/parts/{create-derivations,types}.ts` -- `anchors` computed (`checkAnchors(layout)`), `placements` passes its unplaced set, `violations` computed (no layout violations for an unsupported form); `Derivations` gains `violations`.
- [ ] `packages/model/src/{main,worker}.ts` -- main exports `wouldCycle`, `setAnchor`, `checkSetAnchor`; main and worker both export `dependencyCycleMessage` and `unresolvableReferenceMessage`.
- [ ] `packages/commands/src/layout/{set-anchor,set-anchor-input-schema}.ts`, `types.ts`, `layout-commands-module.ts`, `index.ts` -- `SetAnchor` (service: a `di`-registered command class, as `DuplicateNode`), id `layout.setAnchor`, label 'Set anchor', input `{ id, anchor? }`.
- [ ] `packages/pipeline/src/pipeline/{pipeline,types}.ts`; `pipeline-stages.spec.ts`, `pipeline.spec.ts`, `pause/blueprint-pause.spec.ts` -- post `violations.value`; each `listen` caller passes `violations`.
- [ ] `app/src/anchors.spec.ts` -- its own `arrangeStore()` (store from `mainModules`, NewDesign not run) and `arrangeDerivations(design)` (the worker's `Derivations` for that design, wired by hand as `corney-column.spec.ts` does, returning the whole `Derivations`), each a function local to the spec.
- [ ] `packages/design-file/src/round-trip.spec.ts` -- the canonical design gains a slot anchor with attach.
- [ ] Specs beside each file for rows 1–22 (with 17a, 21a), 26, 26a, 27; `app/src/anchors.spec.ts` for rows 23–25, 28, 29.

**Acceptance Criteria:**
- Given the boundary table, when `pnpm test` runs, then each row has a passing test at its level.
- Given rows 23–25, 28 and 29, when the implementer breaks the wiring each covers (SetAnchor unregistered, the cycle check always ok, `violations` not posted), then that test goes red; each check is named in the PR.

## Implementation Notes

- First build: `pnpm typecheck`, `pnpm depcruise`, `pnpm test` (600 files, 4864 tests) all green. Toggled bugs: SetAnchor unregistered (rows 23, 28 red), cycle check always ok (row 24), cycle check ignoring `previous` (row 25), layout violations dropped (row 29), pipeline posting parts' violations (row 22).
- Timing of the no-memo `frameIn` (implementer): 72 keys in y-chain columns under a free root ~3.6 ms; 30 keys three deep ~14 ms; 72 keys three deep ~90 ms, near the 100 ms visible-set budget.
- Decision (Sergii): placement computes in dependency order, not a recursive `frameIn` with no memo and not a per-call memo, because the no-memo walk took ~90 ms for 72 keys three deep. Each group, children before parents, gets the frames of its subtree's nodes placed from inside it, relative to the group, in dependency order (so a chain sibling's extent is ready before the step that reads it); world frames then compose the root frame with the root's relative frames. Supersedes the Design Notes' no-memo decision.
- Dependency-order rewrite: `dependencies/dependency-order.ts` (function) and `placement/group-frames.ts` (function); `frame-in.ts` removed. Timings: 1.95 ms / 1.37 ms / 3.24 ms for the three layouts. Toggled bug: not leaving out a node anchored outside its group turns rows 13 and 14 red.
- Decision (Sergii): `anchor` sits right after `id` in every node schema, so the file writes it there, not after every other field, because the spine's `NodeBase = { id; anchor?; offset? }` and a file then reads in placement order.
- Decision (Sergii): the `chain-child-anchored` message is `The node "x" sits in a chain, which places it, so it takes no anchor.`, not a shorter one, because it says why in the glossary's terms.
- Decision (Sergii): `checkSetAnchor` refuses in the order missing node, chain child, missing or wrong-kind target, loop; not target before chain child, because a chain child is refused whatever anchor it gets.
- Decision (build): `checkSetAnchor` with no anchor checks the fallback to the parent for a loop, because AD-3: "the graph is acyclic after every command".
- Decision (build): an unresolvable anchor is no graph edge when finding cycles, because the plan's decision makes it `unresolvable-reference` and AD-3 says such a node "is not placed, with its dependants".
- Decision (build): a "changed member" is one whose dependency kind or target changed, because the frozen block says "the member whose dependency changed".
- Decision (build): an unplaced group row is part −1, fit `fitted`, because the Data Schema says "groups: -1" and "groups: fitted, ignored".
- Real-host run: not needed; the specs fake only the repo's own services (`MemoryBackend`, fake derivations), no third-party host.
- Decision (build): `anchor` follows `id` through a private `withAnchor` helper in `layout.ts`, not every field written three times, because the field schemas stay the one list of each node's other fields; JavaScript objects keep string keys in insertion order (ECMAScript OrdinaryOwnPropertyKeys).
- Decision (build): the `unknown-target` messages reuse the existing texts, `The design has no node with the id "…".` (`check-delete-node.ts`) and `The design has nothing of the right kind with the id "…".` (`check-structure.ts`), not new wording, because the same kind already has them.
- Decision (build): layout violations carry `fixes: []`, because the Data Schema says `fixes: Fix[] // possibly empty` and `fixSchema` has no variants yet, so "only [] type-checks".
- Decision (build): `checkSetAnchor` on the root with no anchor is ok, because the root then has no dependency and AD-3's cycle needs an edge.

## Plan Change Log

## Review Triage Log

Pass 1 (quick, test-reviewer; 0 quotes dropped): 1 medium, 6 low, 1 false, 3 rejected low.
- medium -- patch -- root anchor ignored: `dependencyGraph` seeds the root with no dependency and `placeLayout` places the root at identity, so a loaded root anchor reports no cycle or unresolvable anchor and everything stays placed; contradicts the Always line "any explicit anchor on the root closes a cycle".
- low -- patch -- row 15's place-layout test marks `n` unplaced with no cause (AGENTS "Arrange only a state real commands could reach").
- low -- patch -- `dependency-order.spec.ts` "leaves out the unplaced nodes" marks `b` unplaced with no cause (same rule).
- low -- patch -- `dependency-order.spec.ts` first test narrows to booleans and a `Set` that hides duplicates (AGENTS "assert whole values"); both lenses.
- low -- patch -- row 18: `setAnchor` runs only three of the seven inputs.
- low -- patch -- `unknown-target` and `chain-child-anchored` refusals asserted with `toMatchObject({ kind, ids })`, not whole (AGENTS "assert whole values"); wording recorded as decisions above.
- low -- patch -- `set-anchor.spec.ts` module-level `const OFFSET` object placed into mutated designs (AGENTS "Keep no mutable state at module level in a spec").
- false -- `anchors.spec.ts` `part: 0`: the arranged design has one part run and PartsOutput rows are sorted by compareId, so the Data Schema's "its row in the PartsOutput" is 0.
- low -- reject -- `cycleRejection` helper written in two specs: an app spec can't import a model spec and `only-tests-import-testing` limits shared homes; a fix adds a testing subpath.
- low -- reject -- `fixes: []` undocumented: recorded as a decision above.
- low -- reject -- root `checkSetAnchor` with no anchor undocumented: recorded as a decision above.

Pass 2 (quick, test-reviewer on the patched files; 0 quotes dropped): nothing above low, no frozen line broken; review ends, lows logged, not patched.
- low -- log -- `set-anchor.spec.ts` "removes the anchor when given none…" uses `toEqual`, which can't tell a deleted key from `anchor: undefined`; `setAnchor` does `delete`.
- low -- log -- `place-layout.spec.ts` "moves every dependant along…" asserts a difference of two runs, not the frames row 12 names.
- low -- log -- `dependency-order.spec.ts` and row 15's place-layout test feed `checkAnchors`' output instead of a literal unplaced set (AGENTS "a stage gets the outputs it reads as inputs").
- low -- log -- `would-cycle.spec.ts` "answers %s" names no claim.
- low -- log -- `check-anchors.spec.ts` 2-member cycle case can't tell "from the lowest" from meeting order; the 3-member case does.
- low -- log -- `place-layout.spec.ts` "turns the attach point with a slot turned 90 deg…" puts a number in the name (AGENTS "numbers go in parameters").
- low -- log -- comments restating types in `placement/types.ts`, `placement/attach-point.ts`, `dependencies/types.ts` (AGENTS "Write a comment only for a why").
- Verification after patches: `pnpm typecheck`, `pnpm lint`, `pnpm depcruise` clean; `pnpm test --sequence.seed=1794559268850` 602 files, 4875 tests green. The first full run timed out on two unrelated `tooling/` ESLint specs (passed alone and on seed replay; logged in deferred-work.md, source unconfirmed).

## Design Notes

Rows 6–8, 26 and 26a hand the layout straight to the function; a loaded file reaches those states (AD-3: "A loaded file with a cycle reports `dependency-cycle`"; a dangling anchor "only a file can hold").

Placement computes `frameIn(G, d)`: node `d`'s frame in group `G`'s frame, or none when `d` is unplaced or its dependency leaves `G`'s subtree. `frameIn(G, G)` is the identity. Otherwise the anchor frame is `frameIn(G, target)` then the attach move, `frameIn(G, parent)`, or `frameIn(G, previous)` stepped by `far(previous) + gap − near(d)`; then the offset (`placeSlot`). A group's extent takes its slots `s` with `frameIn(group, s)` defined. World frames are the root frame composed with `frameIn(root, d)`. Every call targets a smaller subtree or a node earlier in an acyclic graph, so it ends.

- Decision (plan): `frameIn` keeps no memo, not a memo table in a module, a cache argument or a `di` service, because AD-25 says "Functions with state passed around by hand are not used" and AGENTS.md "Hold state in `di` services, never in a module-level singleton"; each call recurses only into a smaller subtree or an earlier sibling, so the walk is polynomial in a layout's node count.
- Decision (plan): the dependency graph keeps one dependency per node, not extent edges from a group to its slots, because AD-3 lists the edges as "explicit anchors, default anchors (previous chain sibling, parent's origin) and parameter references". With one edge each, a cycle is found by following pointers.
- Decision (plan): a loaded cycle lists its members from the lowest id by compareId, not from whichever node the search met first, because the Violations row asks for "cycle order" and a fixed start keeps the post the same for one design.
- Decision (plan): an anchor of the wrong kind (`{type:'slot'}` naming a group) is `unresolvable-reference`, not a separate kind, because the spine's `unknown-target` already covers "a missing id or the wrong kind" for the same reference.
- Decision (plan): unplaced slot rows keep their part row and fit, not −1 and `stand-in`, because the Data Schema names only "frame and anchorAt are NaN" and parts resolve without placement.
- Decision (plan): a DeleteNode whose fallback closes a cycle is refused with `dependency-cycle`, not committed, because AD-3: "the graph is acyclic after every command".
- Decision (plan): one message function per kind, `dependencyCycleMessage` and `unresolvableReferenceMessage`, not one `violationMessage` for every kind, because the Violations row says "Each kind's message is built by one `model` function" and a function taking `PartViolationDetail` would carry blueprint's `LaneFailure` into `main`, which `model-root-and-main-reach-no-blueprint` refuses. The rejection and the violation for `dependency-cycle` share its function.
- Decision (plan): `Derivations` gains `violations`, not a placements value carrying them, because the pipeline posts one issues list and `placements` stays the posted `LayoutOutput`.
- Decision (plan): SetAnchor takes one `id`, not a list as 14.5's setters do, because the spine lists only 14.5's setters as taking id lists and "setAnchor anchors any node" (ticket).
- Decision (plan): `anchors.spec.ts` writes its own arrange helpers, not a shared `app/src/testing/` file, because `only-tests-import-testing` (`.dependency-cruiser.mts:434-439`) admits only spec files and `packages/*/src/testing/` as importers of `storage/testing`, and AGENTS.md's "Write a shared assertion once" covers assertions, not arrange.

Nothing visible changes: no editor surface invokes SetAnchor before 15.6, and the canvas already hides unplaced rows. The look is the test run.

## Conformance Log

Pass 1 (two readers, union; 0 dropped):
- `Functions with state passed around by hand are not used.` (frameIn memo) -- fixed
- `A choice no requirement made is a decision and is labelled as one.` (violations order) -- asked
- `When nothing says what a boundary returns, ask.` (row 21 strings) -- asked
- `When nothing says what a boundary returns, ask.` (several faults in checkStructure) -- asked; empty-input rows added (6, 26) -- fixed
- `Test a rule where it is defined; a package that uses it tests only its own part.` (row 21 commands vertex case, 3 inputs / 4 results) -- fixed
- `"Valid" or "correct" without a number is a question, not a spec.` (row 12 second case) -- fixed
- AD-25 three entries (`violationMessage` from main) -- fixed (per-kind functions from main and worker)
- `Keep no mutable state at module level in a spec` (`part-violation-message.spec.ts` `const ids`) -- fixed
- `Write a shared assertion once; assert whole values` (`corney-column.spec.ts` `expect.objectContaining(at(0))`) -- deferred
- `helpers over one concept share a file named for it` (`place-layout.ts` `slotPart`, `rowOf`) -- fixed
- `(service)`/`(function)` tags missing on `setAnchor`, `walkNodeReferences`; `SetAnchor (service)` -- fixed
- AD-3 `except a **chain child**` (root anchor unstated) -- fixed (Always line)
- AD-3 `the schema gives a chain's children no \`anchor\` field` (Code Map vs task) -- fixed
- `Arrange only a state real commands could reach` (row 5) -- fixed
- `test wiring between packages as integration` (anchored chain child load path) -- fixed: rule tested in schema, load wiring already in `design-loader.spec.ts:151`
- persistent fact `sorted into four groups` (rows interleaved) -- fixed
- gap: `aSlotAnchor`/`aGroupAnchor`/`anAttachPoint`, `schema/src/testing/index.ts` -- fixed
- gap: `app/src/*.spec.ts` reach model only via `worker` -- fixed
- gap: `model-root-and-main-reach-no-blueprint` via `PartViolationDetail` -- fixed
- gap: `pipeline.spec.ts:31`, `blueprint-pause.spec.ts:238` callers of `listen` -- fixed
- gap: `walkReferences` in model, not schema (row 2) -- fixed (row 4)
- gap: row 18 (now 20) free group g; chain-child group in row 2 -- fixed
- gap: `layoutOutputSchema` refuses NaN (`safeParse(v.number(), NaN)` false) -- fixed (row 3)

Final pass (one reader, 12 findings; fixes below no reviewer has read):
- `only-tests-import-testing` (`app/src/testing/`) -- fixed (helpers stay in the spec)
- `Give every decision its rejected alternative` (two frozen decisions) -- fixed, wording from AD-3
- AD-25 `Lookups and state ... are services` (memo) -- fixed (no memo)
- `Arrange only what the test uses` (arrange shape, wrong citation) -- fixed
- `a new schema concept ships its builder` (`ChainChild`) -- fixed (default builders hold no anchor)
- `write-kdl.ts` `A list item schema names no KDL node.` (`v.omit` drops metadata) -- fixed; row 2 path corrected after a valibot run
- `helpers over one concept share a file` (`walkNodeReferences`) -- fixed
- `Test a rule where it is defined` (part spec duplicates row 21) -- fixed
- `no expected value computed the way production computes it` (`corney-column.spec.ts` `toEqual(before)`) -- deferred
- `Arrange only a state real commands could reach` (rows 6–8, 26) -- fixed (Design Notes)
- `When nothing says what a boundary returns, ask.` (unsupported form) -- asked
- `Name a thing for what it does` (file names) -- fixed

## Verification

**Commands:**
- `pnpm test` -- expected: all green.
- `pnpm typecheck` -- expected: no errors.
- `pnpm depcruise` -- expected: no violations.
