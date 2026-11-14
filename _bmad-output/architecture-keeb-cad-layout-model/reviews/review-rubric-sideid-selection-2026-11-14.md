# Review: SideId selection amendment (rubric + currency), 2026-11-14

Scope: the uncommitted diff to the spine (glossary `add flow`, AD-26 selection-operations sentence, `Editor state` row) and the five memlog decisions of 2026-11-14 (13.8).

Verdict: sound direction, but not ready to commit. The amendment relies on a `SideId` that cannot hold `whole/<id>` and on registry/hover/prune code that is keyed by bare `Id`; neither is acknowledged.

## Verified true
- `nodeIdOf` is exported from `packages/model/src/main.ts` (from `ids/side-qualified-id.ts`), so `editor` reaches it through `model/main`. `sideOf` and `sideQualifiedId` are exported too.
- `SideId` exists in `@keeb-cad/schema` (`side-id.ts`, branded, exported from `index.ts` and `types.ts`).
- 13.32's both-sides rule is real: `group-border/hovered-group.ts` ("a node id, so both halves of a group show together"); `use-group-borders.ts` compares `selection.ids.includes(id)` / `hoveredId === id` by bare id.
- Add flow's parent rule: `add-flow/parent-for-selection.ts` uses `nearestGroupId` on a bare `Id` (several selected -> root).
- `Selection` (`selection/selection.ts`) holds `Id[]` and prunes by `subtreeIds`.
- Canvas items: `CanvasItems` registry is keyed by `Id` and says "the right half shares the left's node ids"; `Viewport.fitNodes(ids: Id[])` expands by `subtreeIdsOf` then `items.bounds(ids)`.
- No external technology is introduced (currency: nothing to check outside the repo).

## Findings

1. HIGH. `SideId` cannot represent a unibody selection. `sideIdSchema` accepts only `left/` and `right/`; `PlacementSide` and the posted ids also include `whole/<id>` (`model/ids/types.ts`; the 2026-11-13 decision says "unibody whole/<id> alike"). The amended text says selection holds "`SideId[]` ... `left/x`, `right/x`" and "the Tree ... selects and points at `left/<id>`", which in a unibody design names a row that is never posted. Rule fails its claim: it does not prevent divergence, it adds one (split vs unibody). Fix: either state that selection holds a posted row id (a `PlacementSide`-qualified id, adding a `whole` case to the type or a new `PlacedId` type, "not `SideId`, because it excludes whole") and that the Tree selects the first posted side of x (`left/` or `whole/`); or state that unibody is out of scope until its milestone and say what the Tree does there. Also the add-flow glossary "else `left/<id>`" has the same hole.

2. MEDIUM. The Rule claims a `SideId[]` service but `nodeIdOf(qualified: string)` takes a plain string and also accepts `whole/`; the Rule never says who brands an id into `SideId` (the Tree builds `left/<id>` from a bare id, the canvas from a row key `PlacedNode.key`). Claim "a node's kind and parent are read through `nodeIdOf(id)`" is true, but the construction side is unspecified, so two producers can mint differently. Fix: add "a `SideId` is made only from a posted row key, or `sideQualifiedId('left', id)` for the Tree (`model/main`)", plus a validator via `sideIdSchema`.

3. MEDIUM. Amendment names consumers but not the code that must change, and two claims hide breaking changes. `CanvasItems` registers by bare `Id` (`CanvasItem = { id: Id; element }`, `CanvasSlot.vue` registers `props.placed.id`), and `fitNodes(ids: Id[])` expands subtrees with `subtreeIdsOf` over bare ids. "F fits one side" therefore needs the registry keyed by side-qualified id and `fitNodes` expanding per side; the Binds line lists "F" but the spine sentence never changes the canvas-items rule (AD around line 661). `HoveredGroup.id: Option<Id>` and `use-group-borders.ts` `shownOf` must also move to `SideId`. Fix: add one sentence to the canvas-items/viewport rule: "items register under their row key; `fitNodes` takes `SideId[]` and expands to the subtree on that side", with its rejected alternative ("not a side filter on bare ids, because the right half shares the left's ids").

4. MEDIUM. Rejected-alternative form is incomplete. The Editor state row gives "not bare node ids, because...; not `Id[]` with a separate side field, because...". Good. But the AD-26 sentence ("Delete and Ctrl+D are unavailable ... not by deleting the authored node behind it") has no "not Y because Z" for the unavailable-vs-unfit choice beyond the memlog (the memlog's rejected alternative, "act on the authored node", is not in the spine text) and the add-flow entry's "select on the side the person was on" has none (memlog: "not unavailable, because...", absent from the glossary). Fix: copy the memlog's two rejected alternatives into the spine sentences.

5. LOW. Mixed selections are unspecified. "With a right-side id in the selection, Delete and Ctrl+D are unavailable": a selection of `left/a` and `right/b` blocks Delete of `left/a` silently, no reason text. Also `left/x` plus `right/x` of one node. Fix: add "any right-side id disables the operation for the whole selection, not only for that id, because a partial delete would surprise" (or decide otherwise), with a boundary the 13.24 tests can take.

6. LOW. Prune sentence is now partly wrong: "drops every id whose node the design no longer holds" is unchanged but `Selection.#prune` compares ids to `subtreeIds` (bare). With side-qualified ids it must prune through `nodeIdOf`, and should also drop an id whose side no longer exists (a design switching from split to unibody). Fix: add "whose node, or whose side, the design no longer holds".

## Currency
All named symbols exist as described except the unibody reach of `SideId` (finding 1). The memlog says the claim "a parse shows" for `part: null` is pre-existing and not in scope. The decision about `UiAction.available()` staying boolean matches the AD-26 text in the spine (`available(handle, input?)` returns `Result` for the registry; a UiAction's own `available()` was described as a boolean there; not re-verified against `acts-on-selection.ts`, only read, so treat as unverified).
