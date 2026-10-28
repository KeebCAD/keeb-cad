# Review: reconcile + rubric, routing-verdict update (2026-10-28)

Scope: the uncommitted diff of `architecture-keeb-cad-layout-model.md` that applies `routing-verdict.md` ("Change list for `bmad-architecture`") and the memlog entries after "Update 2026-10-28 started: apply the signed-off routing verdict" (memlog l. 127-135). Spine line numbers are those of the working copy.

**Verdict:** the change list nearly all landed and the AD-10, Stack and Deferred edits are clean, but the update should not be signed off as is. Four problems need fixing first: pad ids now contradict the Glossary and Ids convention, the realisation tag has no owner and depends on positions, the deadline adds a clock to a pure stage and is unrelated to AD-11's cancellation, and AD-20's KiCad project-rules clause goes beyond AD-15's board-file-only export.

---

## 1. Reconcile

### AD-12

| # | Verdict item | Spine | Status |
|---|---|---|---|
| 1 | Name the engine; interface engine-neutral; tscircuit rejected | l. 292-293 | Landed |
| 2 | Fixed routes not crossed/moved/ripped up; same-net doesn't block, other net does at the router's own clearance; returns only asked ids | l. 287 | Landed, but see R-2 (same-net drills vs hole-to-hole) |
| 3 | Routes invalidated by a move are rerouted in the same request as the moved part's connections | l. 286 (sub-bullet) | Landed; the wording is narrower than it needs to be (R-8) |
| 4 | Deadline, checked between connections, returns placed + rest unrouted, never hangs | l. 288 | Landed; rubric problems in F-3 |
| 5 | A dropped-and-not-rerouted connection is `unrouted` | l. 291 | Landed |
| 6 | Fallback kept; per-connection fallback live in M1; SM-3 not triggered | l. 294 | Landed |
| 7 | Remove "Routing spike" Deferred row; add reroute-coverage and memory rows | l. 527-528 | Landed (both ULED_1 ids, 2.13 pin, typed-array estimate all present) |
| 8 | Drop routing-verdict trigger from `split-mirrored` row | l. 540 | Landed |

### AD-14

| # | Verdict item | Spine | Status |
|---|---|---|---|
| 1a | Natural-order chain, n − 1, none under two, no star | l. 316 | Landed |
| 1b | Natural order definition incl. `a01b` < `a1a` | l. 317 | Landed ("later runs are not looked at" is implied by "decided there") |
| 1c | Connection id `<net-id>:<padA>~<padB>` | l. 318 | Landed |
| 1d | Pad ids carry copper side `F`/`B`/`TH` **plus a file-order copy suffix for repeats** | l. 319 | **Distorted.** The `TH` token became the prose "through-hole", and the copy suffix was dropped. The new pad-id content also conflicts with the Glossary and Ids convention (F-1) |
| 1e | Reversible copies distinct, visibly connected; padless/netless = obstacles; no positions | l. 319 | Landed |
| 1f | Cite `spikes/SPLIT-RULE.md`; carries over to AD-14 ids | l. 315 | Cited (path exists at repo root `spikes/SPLIT-RULE.md`) |
| 2 | Each connection carries `fixed-copper`/`key-cell`/`routing`; only place positions are used; only `routing` to engine | l. 320 | Landed word for word, but the rule has no owner (F-2) |

### AD-20

| # | Verdict item | Spine | Status |
|---|---|---|---|
| 1 | Engines at strictest class clearance; drc per class own width + clearance, reported per class; no loosening | l. 404 | Landed. Dropped: the R7 evidence that the engine "places each class at its own width" (R-6) |
| 2 | Hole-to-hole clearance, same + different net, in drc and router; value and severity left to the architect | l. 403, 404, 406 | Landed with Sergii's 0.25 mm / error decision |
| 3 | KiCad DRC is a cross-check only (199 cap, crossing-trace blind spot) | l. 405 | Landed |

### Memlog decisions (l. 128-135)

- **l. 128 engine decision:** landed. Its "Prevents: re-opening the engine choice per epic" is not in AD-12's Prevents (R-7).
- **l. 129 AD-12:** landed.
- **l. 130 AD-14:** landed, with the same copy-suffix gap as 1d.
- **l. 131 AD-20 clearance policy:** landed.
- **l. 132 hole-to-hole (Sergii):** the value, scope, `.kicad_pro`, error severity and "router respects it" all landed. ☝️ **Contradicted on one point:** Sergii's entry says "drc violation kind `hole-to-hole`". The author call at l. 135 overrides this to kind `drc`, and the spine follows l. 135 (l. 406 and the Violations row). An author call should not quietly overrule a logged user decision. See F-5.
- **l. 133 AD-10 import rules:** landed (l. 239).
- **l. 134 flatbush 4.6.2:** landed in Stack. Re-checked today with `npm view`: 4.6.2 is `latest`, ISC, modified 2026-06-09, and it matches `spikes/package.json`.
- **l. 135 author calls:** hole clearance added; KiCad export writes project rules; Deferred rows changed; Gerber row moved to epic-routing-and-fab. All landed. The project-rules clause conflicts with AD-15 (F-4).

### Quiet constraints the verdict carries that the spine does not

- **Copy suffix and its order source** (SPLIT-RULE.md: `.2`, `.3` in KiCad file order). keeb-cad has no KiCad file to take an order from, so the spine needs an id-based order (F-1).
- **The bare wired fixture fails the gate** (verdict Follow-ups, epic-parts-and-pcb). There are 216 edge-clearance findings: the SK6812mini-e pads sit 0.21 mm from their own footprint's cutout, under the 0.30 mm rule. AD-16 makes `pcb`-target cutouts part of the board edge, and the new l. 406 makes every clearance finding an `error`. Together they mean Corney cannot export gerbers until the footprint or the rule changes. Nothing in Deferred records this (F-6).

---

## 2. Rubric findings

### F-1 (high) Pad id format contradicts the Glossary and the Ids convention
- **Where:** AD-14 l. 319 against the Glossary `pad` (l. 68: `<side-qualified slot id>.<component>.<pin>`) and Consistency Conventions Ids (l. 430: `<side>/<slot-id>.<component>.<pin>`).
- **Divergence:** AD-14 now says every pad id names its copper side. The two canonical formats have no slot for it, so `model` (which mints ids), `pcb`, `drc` and `firmware` can each put the side in a different place or leave it out. Natural order then sorts differently and connection ids differ. Repeated pins (TRRS: two holes per pin) also have no rule now that the copy suffix is gone.
- **Fix:** define the format once in the Ids convention: `Pads: <side>/<slot-id>.<component>.<pin>.<F|B|TH>[.<n>]`. `<n>` = 2, 3, … for repeats of the same pin and copper, in the catalogue footprint's pad order. Make the Glossary `pad` row and AD-14 l. 319 point to it, and use the literal token `TH`.

### F-2 (high) `realisedBy` is position-dependent and has no owner
- **Where:** AD-14 l. 320 and AD-12 l. 282. Related: AD-10/AD-11 put "pcb placement with key-cell and part tracks" in the `pcb` stage.
- **Divergence:** in the spike, `fixed-copper` comes from geometry: a trace end lying on pad copper (SPLIT-RULE.md). Under AD-14, `model.resolve` makes connections, but the placed tracks are `pcb`'s output and `model` never imports a stage. So either `model` repeats `pcb`'s track placement, which breaks AD-10's "shared derivations once", or `pcb` sets the tag, which breaks "pcb… derive none of their own". A move can also flip a connection between `fixed-copper` and `routing`, which changes what goes to the engine with no command.
- **Naming:** `fixed-copper` is not a Glossary term (the catalogue says "fixed tracks"), and the Glossary `connection` says "realised by a key cell, a part, or routing". That breaks the "Glossary terms only" convention.
- **Fix:** make the tag id-based. The key cell's local tracks and the catalogue's fixed tracks each declare the pin pairs they join, and `model.resolve` tags a connection by matching those pairs: `key-cell`, `fixed-tracks` or `routing`. Then delete "This is the only place positions are used", rename the tag to the Glossary word, and have `pcb`'s golden tests assert that the placed tracks really join the declared pairs.

### F-3 (high) The deadline adds a clock to a pure stage and is unrelated to AD-11 cancellation
- **Where:** AD-12 l. 288, against the Glossary `stage` ("a pure function", l. 103), Stable outputs (l. 433, "No clocks"), and AD-11 l. 271 ("a newer committed revision cancels them; partial or failed results").
- **Divergence:**
  - A wall-clock deadline makes routing output depend on machine load (the verdict shows 5.4–13.2 s for one input). The golden-file test for `routing` cannot be stable.
  - Nothing says who sets the deadline or what its value is. `pipeline` and `routing` could each assume the other picks it.
  - Cancellation and the deadline are two stop mechanisms. A `pipeline` implementer may terminate the worker, which loses the placed copper, while `routing` expects a cooperative stop.
  - "Never hangs" is not guaranteed when the check runs only between connections: one A* search can run without bound.
- **Fix:** add these to AD-12:
  - `pipeline` sets the deadline per request (the value goes in a Deferred row, revisit when live routing exists).
  - Cancellation by a newer committed revision is the same cooperative stop as the deadline. The partial result is returned and re-validated as l. 289 says, and the worker is never terminated mid-request.
  - Each connection's search is bounded by an expansion budget, so the between-connection check is reached.
  - Golden tests run with no deadline, so results are deterministic. State that a timed-out result is history-dependent like any route, and amend l. 433 to say so.

### F-4 (medium) KiCad project rules vs AD-15's board-file export
- **Where:** AD-20 l. 403 ("The KiCad export writes these values into its project rules") against AD-15 l. 331 ("a KiCad 10 board file as the escape hatch"). Binds at l. 400.
- **Divergence:** KiCad keeps design-rule constraints (min hole-to-hole, copper-to-edge, net classes) in `.kicad_pro`, not in `.kicad_pcb`. AD-15 exports only the board file, so the `exports` and `pcb` implementers will disagree on whether a project file exists. AD-20 also does not bind `pcb`, where the Structural Seed puts the KiCad writer. "These values" includes the per-slot keep-out switches, which are not project rules.
- **Fix:** AD-15: "a KiCad 10 project (`.kicad_pcb` + `.kicad_pro` carrying AD-20's net classes and clearances) as the escape hatch". AD-20: add `pcb` to Binds and say "writes net classes, edge, hole and hole-to-hole clearance into `.kicad_pro`; keep-out switches act through the board's rule areas". The Glossary's "escape hatch: a KiCad project" then matches.

### F-5 (medium) ☝️ Hole-to-hole violation kind: user decision vs author call
- **Where:** memlog l. 132 (Sergii: kind `hole-to-hole`) against l. 135 (author: kind `drc`). The spine follows l. 135 at l. 406 and the Violations row.
- **Fix:** keeping one `drc` kind is consistent with "each kind has one owner" and the Violations row, so the author call is defensible. It still needs Sergii's explicit confirmation, logged in the memlog. Alternatively, keep his `hole-to-hole` as a sub-classification inside `drc` findings (the spike's `DrcKind` already has one).

### F-6 (medium) Missed divergence point: the golden fixture fails the new error-severity gate
- **Where:** AD-20 l. 406 with AD-16 l. 342 (board edge = outline minus `pcb` cutouts). Deferred has no row for it.
- **Divergence:** it is unsettled whether a part's own `pcb` cutout counts as board edge for edge clearance. drc says yes (216 errors), while a footprint author may expect no. As the rules stand, SM-3 gerbers for wired Corney are blocked.
- **Fix:** add a Deferred row: "Edge clearance against a part's own `pcb` cutout (SK6812mini-e pads 0.21 mm vs 0.30 mm; 4 overlapping F/B LED cutouts, `invalid_outline`). Why it can wait: escape hatch always exports. Revisit: epic-parts-and-pcb, before the first gerber export of Corney: change the footprint, or add a catalogue-declared exemption read by `drc`."

### Lower-priority

- **R-2 (medium-low) Same-net fixed copper vs hole-to-hole.** AD-12 l. 287 says same-net fixed copper "does not block", but l. 403 applies hole-to-hole to same-net drills. A literal reader of AD-12 will stack a new via on a fixed same-net via, which is the defect the rule was added for. Fix: append "except that every drill, same-net included, keeps the hole-to-hole clearance (AD-20)."
- **R-3 Glossary `design rules`** (l. 91) still lists only net classes, edge clearance and keep-out switches. Add hole clearance and hole-to-hole clearance.
- **R-4 Severity of non-clearance drc findings** (track width, keep-out intrusion) is unstated now that clearance is explicitly `error`. Fix: "Every `drc` finding is `error`," or list the exceptions.
- **R-5 `clipper2-ts` in `routing`** should work on `model.flatten` output, not its own arc handling (AD-16 l. 357). AD-18 says so for `case`. Add a short clause to l. 293: "on flattened regions (AD-16)".
- **R-6 Width per class.** l. 404 fixes the engine's clearance but not its width. Add "and places each net class at its own width", which is R7's evidence and the reason tscircuit was disqualified.
- **R-7 AD-12 Prevents** lacks memlog l. 128's "re-opening the engine choice per epic". Add it.
- **R-8 l. 286 sub-bullet** presumes a move. Every dropped connection already goes back as "unrouted" in the parent bullet. Simpler: "All connections without a valid saved route, including those just dropped, go in one request."
- **R-9 Stack line** (l. 441): "…2026-10-28 (clipper2-ts and makerjs, npm and GitHub); 2026-10-28 (flatbush, npm)" repeats the date. Merge it: "2026-10-28 (clipper2-ts, makerjs, flatbush: npm; clipper2-ts and makerjs also GitHub)".

### Checks that passed

- AD-10 import rules match memlog l. 133. The package diagram needs no change, because external libraries are not drawn. The spike's `drc.ts` imports only `flatbush`, so "only routing and drc import flatbush" matches the evidence. dependency-cruiser can enforce all three rules.
- The Violations row is consistent with the spine: `unrouted` is owned by `routing`, including timed-out and dropped connections, and hole-to-hole goes under `drc`.
- The AD-15 gate together with clearance-as-`error` does stop co-located drills from reaching gerber and drill. The KiCad escape hatch can still carry them, which is intended.
- The new Deferred rows (reroute coverage, memory budget) describe quality, not contracts, so they cannot let two units diverge. The removed routing-spike row is fully answered: module zone, fixed routes and split rule are all in ADs now.
- Tech: flatbush 4.6.2 is current (npm, 2026-10-28). clipper2-ts 2.0.1-18 is unchanged. 0.25 mm matches KiCad's default minimum hole-to-hole clearance.
