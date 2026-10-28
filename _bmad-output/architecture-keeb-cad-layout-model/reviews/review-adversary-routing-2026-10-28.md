---
review: adversary
target: _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
scope: update 2026-10-28 from the routing verdict (AD-10 import rules, AD-12 reroute / fixed obstacles / deadline / engine / fallback, AD-14 split rule and realisedBy, AD-20 hole-to-hole and clearance policy, Stack flatbush, Deferred rows)
evidence: _bmad-output/initiative-keeb-cad-m1/tickets/epic-risk-spikes/routing-verdict.md, spikes/SPLIT-RULE.md, spikes/src/routing-input.ts, spikes/src/main.ts, spikes/src/custom-router.test.ts
date: 2026-10-28
method: for each hole, two units one level down that each obey every AD to the letter and still build incompatible software
---

# Adversarial review: the 2026-10-28 routing update

## Verdict

**Not build-ready for epic-routing-and-fab or the first netlist/pcb stories. It needs one tightening pass, not a redesign.** The verdict's numbers, engine choice, Deferred rows and fallback are carried over faithfully. The holes come from copying the spike's rules, which were written against KiCad references on one reversible board, into a spine whose ids, sides and stage signatures are different. They fall into three groups:

1. **Ids and scope (A).** The new pad-id rule contradicts the Conventions pad grammar. It drops the spike's copy suffix. It also never says which pads make up a net when a design has two sides or two boards.
2. **Who decides what (B).** `realisedBy` has no single definition or owner. The routing stage signature has no slot for the request ids, the deadline or cancellation. Nobody owns route invalidity or `unrouted`.
3. **Rules that clash with each other (C).** "Same-net copper does not block" (AD-12) clashes with "hole-to-hole applies to same-net holes" (AD-20). "Valid saved routes are never ripped up" clashes with "route the two ULED connections" (the Deferred row). The deadline clashes with AD-11's cancellation and cache.

Severity: **critical**: the units can't be integrated, or a golden fixture can't pass, without an architecture change. **High**: they integrate but give wrong outputs or lose work. **Medium**: they behave differently in ways tests catch late. **Low**: cosmetic.

---

## A. Ids, nets and scope

### A1. Two pad-id grammars, and the copy suffix is gone. **Critical**
- **Units:** `model` (netlist, pad ids) and `pcb` / `routing` (pad lookup, connection ids).
- **Build 1 (`model`):** follows Conventions ("Pads: `<side>/<slot-id>.<component>.<pin>`") and the glossary `pad` entry. It emits `left/home-index.switch.1`, a single id for a reversible switch pin.
- **Build 2 (`pcb` + `routing`):** follows AD-14 ("Each pad id names its copper side (`F`, `B`, or through-hole). Reversible copies are distinct pads"). It needs `…switch.1.F` and `…switch.1.B` as two pads, because the router must join them by a visible connection (the verdict credits this for RST1 and PWR1).
- **Why it breaks:**
  - Build 1's netlist has one pad where Build 2's board has two or three. The F~B connections never exist, so the reversible copies are never joined. That is exactly the tscircuit failure the verdict rejected.
  - A footprint with two holes for one pin and one copper side (TRRS1 pins 2–4 in the spike) gives **duplicate pad ids** under both grammars. The spike's `.2` copy suffix, ordered by KiCad file order, was dropped from the spine, and production has no KiCad file to take an order from.
  - Duplicate pad ids give duplicate or self-loop connection ids (`…~TRRS1.2.TH`).
- **Fix:**
  - Conventions, Ids row: change to `Pads: <side>/<slot-id>.<component>.<pin>.<copper>[.<copy>]`, with copper `F` | `B` | `TH`. The copy is 2, 3, … in the catalogue footprint's pad order. Update the glossary `pad` entry the same way.
  - AD-14, the pad bullet: "copper is `TH` for a through-hole pad, else its one copper side; a repeated `<pin>.<copper>` in one component gets `.2`, `.3`, … in the catalogue footprint's pad order (AD-5), never file or placement order."

### A2. A net's pad set spans sides and boards, so the chain makes cross-board connections. **Critical**
- **Units:** `model` (netlist, split) and `routing` / `exports` (per-board routing section, AD-15 gate).
- **Build 1 (`model`):** net ids come from authored ids (`col:<chain-id>`, `led:<slot-id>`), and the authored chain describes one side (AD-6). So the `model` team puts both sides' resolved pads into one net `col:<chain-id>`, sorts them, and chains them. Natural order puts every `left/…` before every `right/…`, so one connection is `col:c1:left/…~right/…`.
- **Build 2 (`routing`):** the routing section holds routes "per board", keyed by connection id. In `split-mirrored` the two pads are on different boards, so the router can't place that connection on either one.
- **Why it breaks:**
  - The cross-board connection is `unrouted` for ever, and AD-15 then blocks gerbers for ever.
  - In `split-reversible` it is worse. AD-6 emits per-side placements, but there is one board. Whether `right/` pads exist on that board as their own pads, or are the `B` copies of the `left/` ones, is undefined. `pcb` and `model` will each choose.
  - Firmware needs per-half matrices either way, so this can't be pushed onto a single team.
- **Fix:** AD-14, new bullet:
  - "The netlist is split per board. A connection's two pads are on the same board, and a net whose pads span boards yields one chain per board. The inter-board link is a part (TRRS/cable, module) and never a connection."
  - "In `split-reversible`, the board's pads are the `left/` placements with their F/B/TH copies. `right/` ids appear only in population, keymap and firmware."
  - "The routing section key is `<board-id>` → connection id."

### A3. Natural order of minted slot ids is not the order the verdict was measured on. **High** 📐
- **Units:** `model` (mints kebab-case slot ids, AD-8) and `routing` (performance and completion).
- **Build 1:** the `model` team mints slot ids like `home-index`, `home-middle`, `thumb-far`. Under natural order these sort alphabetically.
- **Build 2:** the `routing` team relies on the verdict's 333/333, which was measured on KiCad references `D1 … D37` that Ergogen numbers in point order. Those chains are spatially sequential: neighbour to neighbour along the row.
- **Why it breaks:**
  - With alphabetical slot ids, a row net chains `bottom-…` → `home-…` → `thumb-…`, zig-zagging across the board. Every connection gets longer, the number of crossings goes up, and the router's result (tuned on Corney with `crossCost`) no longer applies.
  - SPLIT-RULE.md's claim that the rule "carries over to AD-14 ids unchanged" holds for the ids but not for routability. The spine copies the claim without that limit.
- **Fix:** AD-14, the split bullet:
  - "Pads are ordered by the net's own order: chain index for matrix nets, LED chain order for LED nets, and natural order of pad ids for the rest and to break ties. Each is an id or authored order, never a position."
  - Add a Deferred row: "route Corney with production slot ids before relying on the verdict's completion."

---

## B. Ownership and stage contracts

### B1. `realisedBy` has two definitions and two candidate owners. **High**
- **Units:** `model` (connections, AD-14) and `pcb` (places key-cell and part tracks, AD-11 live).
- **Build 1 (`model`):** follows SPLIT-RULE.md, the cited spec. `key-cell` means "both pads are on one key". `fixed-copper` means a placed trace end lies on the pad's copper, which is a geometric test that needs placed tracks.
- **Build 2 (`pcb`):** the glossary says a key cell holds "components + their local tracks", and AD-12 says "connections realised by a key cell … are pcb placement". So a `key-cell` connection is one that the cell's tracks actually join. `pcb` is the stage that places those tracks.
- **Why it breaks:**
  - **A connection nobody routes.** A key cell with no track between two of its pads gets tagged `key-cell` by Build 1, isn't sent to the engine, and isn't joined by any copper. It is neither routed nor `unrouted`. This is the Corney case: in the spike, all 63 `key-cell` connections were routed by the router (`spikes/src/main.ts` sends `key-cell` and `routing`), so the verdict's 333/333 includes work that the spine now assigns to `pcb`.
  - **Two evaluators of track geometry.** To run the `fixed-copper` test, `model` has to place tracks itself, which duplicates what `pcb` does.
  - **The wrong owner of a positional answer.** AD-14 says "this is the only place positions are used", but the answer it computes from positions is one that `pcb` owns.
- **Fix:** AD-14, replace the `realisedBy` bullet:
  - "`model` sets `realisedBy` from authored data only. A key-cell track and a catalogue fixed track each declare the pins they join (by pin id). A connection whose two pads are joined by declared tracks of one key cell is `key-cell`, by one part's fixed tracks `fixed-copper`, and anything else is `routing`. No positions are used."
  - "`drc` checks that placed declared tracks do join their pins, as a `drc` finding."
  - Add a 📐 note under AD-12: the verdict routed key-cell connections, and production keeps them as fixed copper, so the router has not been tested with them as obstacles.

### B2. The routing signature has no place for the request ids, the deadline or cancellation. **High**
- **Units:** `pipeline` and `routing`.
- **Build 1 (`routing`):** implements AD-10's `routing(resolved, placement, savedRoutes)`. It works out the ids to route itself: every `routing` connection without a route in `savedRoutes`. It re-validates `savedRoutes` with its own `drc` import, keeps a hard-coded deadline, and returns a full `RouteSet` (saved routes plus new ones).
- **Build 2 (`pipeline`):** implements AD-12. It drops invalid routes itself, passes only the valid ones, expects back copper "only for the connection ids it is asked to route", and sets the deadline per request.
- **Why it breaks:**
  - Invalidity is decided twice (once by each), possibly against different `drc` options.
  - The output shapes differ: one is the full set, the other only the requested ids. `pipeline` merging Build 1's output overwrites saved routes, which breaks "fixed obstacles are never moved".
  - "Engine-neutral interface" has nothing written down to be neutral about.
- **Fix:** AD-10, the signature bullet:
  - `routing(resolved, placement, fixed: RouteSet, request: { connectionIds, deadlineMs, signal, now }) → { output: RouteSet /* requested ids only */, violations: unrouted[] }`.
  - AD-12: "`pipeline` alone decides validity (via the `drc` stage), and `routing` uses its `drc` import only for its own candidate copper."

### B3. Which `drc` findings make a saved route invalid is undefined. **Medium**
- **Units:** `pipeline` (drops routes) and `drc` (findings name "pads, connections or shapes").
- **Build 1:** drops every route whose connection's pads appear in any finding. On Corney, the 216 baseline `edge-clearance` findings on LED pads (no routed copper involved) then make every route that ends on an LED pad invalid at every commit, so those routes are rerouted for ever and never settle.
- **Build 2:** drops only routes whose own copper is named in a finding. When two saved routes clash with each other (for example after a clearance is tightened), it drops one of them, chosen by some order of its own.
- **Fix:** AD-12, the validity bullet:
  - "A saved route is invalid when a `drc` finding names that route's own copper (a segment or via, by connection id). Every route named in such a finding is dropped. A finding on pads or fixed copper alone invalidates no route."
  - AD-20: "`drc` findings on routed copper name the connection id."

### B4. `unrouted` has one owner, but that owner is stale whenever it matters. **Medium**
- **Units:** `routing` (owns `unrouted`, Conventions) and `drc` / `exports` (the AD-15 gate needs "no unrouted connections" tagged with the same revision and routing hash).
- **Build 1:** the gate reads `unrouted` from the routing stage's last output, which is tagged with the revision that routing ran on. Routing doesn't run during gestures, or after a cancel, or on a cache hit. So the "count the UI always shows" can be stale, and the gate can pair a fresh `drc` result with stale `unrouted` data.
- **Build 2:** the editor counts "`routing` connections with no route in the routing section", which is a second implementation of the same kind.
- **Fix:**
  - Move `unrouted` to `drc`. `drc(resolved, placement, routes)` is live, already reads every connection and route, and is the tag the gate uses. Conventions: "`drc`: `drc`, `unrouted`".
  - `routing` returns `notRouted: { id, reason: no-path | deadline | cancelled }[]` inside `RouteSet`. `drc`'s `unrouted` message carries that reason when the routing hash matches.

### B5. The KiCad board writer can't see routes from where the spine puts it. **Medium**
- **Units:** `pcb` (Deferred: "KiCad writer … hidden inside `pcb`") and `exports` (AD-15, AD-20: "the KiCad export writes these values into its project rules").
- **Build 1:** puts the writer in `pcb`, whose signature is `(resolved)`. It writes a board with no routes, which makes the escape hatch worthless.
- **Build 2:** puts it in `exports`, which gets `outputs` (routes included).
- **Fix:**
  - Deferred, the KiCad writer row: "Hidden inside `exports`".
  - AD-20: "`exports` writes the design rules, the hole-to-hole clearance and the severities of `hole_to_hole` and `holes_co_located` (set to error) into the KiCad project". Otherwise KiCad's cross-check hides them as warnings, as the verdict observed.

---

## C. Rules that clash with each other

### C1. Same-net vias: AD-12 says they don't block, AD-20 says they do. **High**
- **Units:** `routing` and `drc`.
- **Build 1 (`routing`):** reads AD-12 ("same-net fixed copper does not block") and lets a new via sit on a same-net fixed via or a same-net TH drill. That is the spike's behaviour, which gave `holes_co_located` 27.
- **Build 2 (`drc`):** reads AD-20 ("hole-to-hole … same-net and different-net holes alike") and reports `error`, which blocks gerbers.
- **Why it breaks:**
  - The router "passes" its own validity checks only if it checks hole-to-hole with `drc`, which AD-12's blocking rule says not to do. Every reroute next to a same-net via then fails at the export gate.
  - Two more gaps sit nearby:
    - **No via size anywhere.** `design-rules` has no via diameter or drill, so the router picks one, `drc` can't check it, and the KiCad project gets KiCad's default.
    - **Footprint-internal holes are caught too.** The rule as written applies to holes inside one catalogue footprint (reversible hotswap or TRRS pairs). Bare boards may then fail with no routing at all, as they already do for edge clearance (216).
- **Fix:**
  - AD-12: "Same-net fixed copper does not block, **except that every drill blocks every other drill at the hole-to-hole clearance**."
  - AD-20, `design-rules`: "net classes (width, clearance, via diameter, via drill)".
  - AD-20, the hole-to-hole bullet: "applies to every pair of drills in which at least one is a via. Pairs inside one catalogue footprint are the catalogue's responsibility, checked by a `library` test, not by `drc`."

### C2. A valid saved route can never be ripped up, so the ULED requirement is unreachable. **High** ☝️
- **Units:** `pipeline` (AD-12: fixed obstacles "cannot be crossed, moved or ripped up", valid routes are never dropped) and the epic-routing-and-fab story (Deferred: "route them or show why not").
- **Build 1:** the router team can only search harder around fixed copper. If no such path exists, the connections stay `unrouted` for ever. Each commit asks for them again and spends up to the deadline on them, even after an unrelated edit, and the board never reaches the gerber gate.
- **Build 2:** the story team adds a "reroute neighbourhood" that drops nearby valid routes. That breaks AD-12, so dependency or rule review rejects it.
- **Why it breaks:** the only ways to get copper are "unrouted" or "invalid". So a connection boxed in by valid routes has no route out, apart from a later edit that happens to invalidate the blockers. The verdict measured this case (2 of 9 on wired).
- **Fix:** AD-12, new bullet:
  - "**Reroute** is a pipeline action outside commands and undo. Given connection ids (or 'all'), it drops their saved routes and routes them, and those are the only connections the engine may rip up."
  - "An automatic request routes `unrouted` connections whose reason is `deadline` or `cancelled`, or whose reachable inputs changed. A `no-path` connection is retried only when its slice changes or on Reroute."

### C3. Deadline, cancellation, gesture-idle starts and the cache don't fit together. **High**
- **Units:** `pipeline` (AD-11) and `routing` (AD-12).
- **Reading 1 (`pipeline`):**
  - "A newer committed revision cancels them" is implemented as `worker.terminate()`, so a partial result is lost. Typing in a parameter field commits on each change, so routing never finishes on a large board.
  - The AD-12 rule "a routing result for an older committed revision is re-validated" never fires, so it is dead code.
- **Reading 2 (`routing`):** cancellation works like the deadline. The engine checks a signal between connections and returns what it placed. `pipeline` re-validates that and keeps it.
- **More gaps:**
  - AD-11 lets background stages start "after a gesture has been idle". AD-12 asks for routing only at committed revisions. A routing result for a gesture-idle revision is for no committed revision, so it's unclear whether to keep it.
  - AD-11's cache key gives drc and exports the routing hash but not routing, even though routing reads `savedRoutes`. Two saved-route sets with the same resolved slice then produce a false cache hit.
  - A result cut short by the deadline would be cached and served on every retry.
  - A wall-clock deadline also makes the routing golden tests depend on the machine.
- **Fix:**
  - AD-12: "Cancellation is a signal checked at the same points as the deadline. A cancelled or timed-out request returns what it placed, with the rest `notRouted` with reason `cancelled` or `deadline`. `pipeline` re-validates it against the current committed revision and keeps the valid routes. Routing starts only at committed revisions; the gesture-idle start (AD-11) excludes routing."
  - AD-11, cache key: "+ routing hash for routing (of the fixed routes passed), drc and exports; + requested ids for routing. A result stopped by a deadline or cancel is never cached."
  - AD-12: "The engine reads time only through the request's `now`; golden tests pass an unbounded deadline."

### C4. The rules don't say which clearance applies between two classes, or what width the engine places. **Medium**
- **Units:** `routing` and `drc` (plus the KiCad project rules).
- **Build 1:** `drc` checks a pair of copper items of different classes at the first item's clearance.
- **Build 2:** the KiCad export uses KiCad's rule, the larger of the two classes' clearances.
- **Other gaps:**
  - The engine width is unstated. "Route at the strictest clearance" says nothing about width, so an engine could place everything at the narrowest width. The spike used each class's own width.
  - AD-20 says `drc` "checks each net class's own width", without saying whether that means minimum or exact.
- **Fix:** AD-20:
  - "Two copper items of different classes keep the larger of their classes' clearances."
  - "Engines place each class at its own width."
  - "`drc` reports copper narrower than its class width."

### C5. Minor. **Low**
- **AD-10:** `routing` imports `drc`, and both import `flatbush`. Add: "`drc`'s exported API takes and returns `model` types only, never a Flatbush index". Otherwise the two packages depend on sharing one index object.
- **Binds lists:**
  - AD-12's Binds should list `model` (`realisedBy`, `RouteSet`) and `exports` (the gate).
  - AD-20's Binds should list `library` if C1's footprint-internal clause is adopted.
- **Stable outputs (Conventions):** "Only routes are history-dependent". Add "and machine-speed-dependent through the deadline, which is why they are saved".

---

## Angles not covered by the change

- 📐 **The fallback interacts with the gerber gate.** After the measured wired move (331/333), AD-15 blocks gerbers until KiCad finishes the board. That matches "pass with fallback", but SM-3 then counts on the escape hatch for the flagship board after an ordinary edit. That is worth saying in AD-12's Fallback bullet, so nobody reads "pass" as "keeb-cad ships fab files for Corney".
- 📐 **The bare wired fixture already fails the gate:** 216 `edge-clearance` errors. Every new AD-20 clearance finding is `error`, so the Corney gerber golden test can't pass until epic-parts-and-pcb fixes the LED footprint or the rule. The spine should name this as a known-red fixture rather than leave it to be found.
- ☝️ **AD-14's "Prevents: routes dropped because a key … was inserted" is overstated.** Under a chain split, an insert still replaces one connection with two (`A~C` → `A~B`, `B~C`), so one saved route is dropped. Change it to "more than the inserted key's neighbours' routes dropped".
