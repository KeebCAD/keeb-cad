# Review: verification lens, routing-verdict spine update (2026-10-28)

Scope: uncommitted diff of `architecture-keeb-cad-layout-model.md` (AD-10 import rules, AD-12, AD-14 split rule, AD-20 clearance policy and design-rules, Stack, Deferred), against the memlog entries after "Update 2026-10-28 started: apply the signed-off routing verdict".

Lens: was each committed decision web-researched or reality-checked, or asserted from training data?

## Verdict

Most of the update is grounded. The libraries, the Worker/TS 6/pnpm-strict fit, the KiCad 0.25 mm default and the 199 limit all check out against npm, the spike code and the spike's KiCad output. Two fab and KiCad facts behind AD-20 are wrong or overstated: the JLCPCB hole-spacing note in the memlog is incorrect, and the "KiCad reports nothing for crossing traces" claim comes from one observation and goes against KiCad's own documented check. The new "router respects hole-to-hole" rule was never tested in the spike that earned the pass grade.

## Checks that passed (evidence)

| Claim | Check | Result |
| --- | --- | --- |
| flatbush 4.6.2, ISC | `npm view flatbush` 2026-10-28 | latest 4.6.2 (published 2026-06-09, well over two weeks old), ISC, ESM-only (`"type": "module"`), bundled `index.d.ts`. One runtime dependency, `flatqueue ^3.1.0` (ISC, 3.1.0) |
| clipper2-ts 2.0.1-18 exact, BSL-1.0 | `npm view clipper2-ts` | still `latest` = 2.0.1-18, BSL-1.0, ESM with types; last modified 2026-07-04. Pinning it still matters |
| Router runs in a Web Worker, no Node/DOM APIs | `spikes/src/custom.worker.ts`, `src/main.ts` (`new Worker(..., {type:'module'})`), README lines 14-62 | Confirmed: there are separate browser and Node tsc projects, and `src/deps.ts` imports clipper2-ts and flatbush in the browser project |
| TypeScript 6, pnpm strict | `spikes/package.json`: typescript 6.0.3, pnpm 12.15.0; README `verify` runs a frozen install and typecheck | Confirmed for clipper2-ts and flatbush. The strict-peer caveats in the README are all tscircuit's, and it was rejected |
| AD-10: only `routing`/`drc` import flatbush, only `case`/`routing` import clipper2-ts | `grep import` in `spikes/src` | Matches the spike: `custom-router.ts` imports both, `drc.ts` imports flatbush only |
| Deadline checked between connections | `src/custom-router.ts` lines 22-23, 374-375, 660, 681 | Implemented and tested in the spike |
| KiCad 10 default min hole-to-hole 0.25 mm | `spikes/out/custom-wired/custom-wired.kicad_pro` has no `min_hole_to_hole`, but `custom-wired.kicad-drc.json` (KiCad 10.0.7) says "board setup constraints min 0.2500 mm" | Confirmed: this is KiCad's default |
| KiCad stops some types at 199 | README lines 164-170; `out/kicad-drc.json` (`copper_edge_clearance` capped at 199 while `drc` finds 216; `clearance` reached 499) | Confirmed for KiCad 10.0.7. The spine's "some types" wording is accurate |
| Split rule (AD-14) | `spikes/SPLIT-RULE.md` | The spine transcribes it, and it is grounded in the spike |

## Findings

### F1. JLCPCB hole spacing: the memlog's "unconfirmed" note is wrong, and 0.25 mm sits below a published figure (high)

Location: AD-20 design-rules bullet (`hole-to-hole clearance ... default 0.25 mm, same-net and different-net holes alike`), and the memlog's version and decision entries ("JLCPCB via-to-via spacing not confirmed on their capabilities page"; "Rejected: 0.5 mm default (unconfirmed JLCPCB forum figure)").

What I found on 2026-10-28:
- jlcpcb.com/capabilities/pcb-capabilities currently lists **Via hole-to-hole spacing 0.2 mm** and **Pad hole-to-hole spacing 0.45 mm**.
- JLCPCB's help-centre capabilities table, which search engines still index (the URL now returns 404), listed **hole-to-hole clearance (different nets) 0.5 mm** and **via-to-via clearance (same net) 0.254 mm**.

So the 0.5 mm figure was an official JLCPCB table, not a forum figure. JLCPCB also separates same-net from different-net holes, and vias from pad holes. One 0.25 mm value for every hole meets the current via figure (0.2) but not the pad-hole figure (0.45), nor the older different-net figure (0.5). For example, a via next to a switch or MCU PTH pin on another net passes `drc` and still fails the fab's DFM check. Whether "hole-to-hole" means edge to edge is not stated by JLCPCB either; that is a forum inference.

Proposed fix:
- (a) Correct the memlog: the 0.5 mm figure is from JLCPCB's former capabilities table, and the current page gives 0.2 mm via / 0.45 mm pad.
- (b) In AD-20, keep 0.25 mm as the default, but write that it is KiCad's default and not a fab minimum.
- (c) Add a Deferred row: "Hole-to-hole per fab: same-net vs different-net, via vs PTH pad (JLCPCB 2026-10-28: via 0.2, pad 0.45; earlier table: different-net 0.5, same-net via 0.254). Revisit in epic-routing-and-fab, before the first gerber story; check edge-to-edge semantics with the fab."
- (d) Or let design-rules carry separate same-net and different-net (or via and pad) values now, since the rule is an authored field anyway.

### F2. "KiCad 10 reports nothing for crossing traces of different nets" is overstated (medium)

Location: AD-20, the `drc` bullet ("KiCad 10 stops some types at 199 and reports nothing for crossing traces of different nets"); memlog AD-20 entry ("blind to crossing different-net traces").

Evidence:
- It rests on a single spike case, `short-crossing`: two 0.15 mm F.Cu segments on nets 1 and 8 crossing at their midpoints (`spikes/out/short-crossing/short-crossing.kicad_pcb` lines 6210-6211), one run on KiCad 10.0.7.
- KiCad's documentation lists "Tracks crossing" as an error-level DRC check for tracks of different nets, and the spike's own README maps a `tracks_crossing` type (README line 133).
- No root cause or upstream issue was found. Forum threads report misses in specific setups (KiCad 6; same-named nets).
- In that run the board also had `copper_edge_clearance` at the 199 limit and 334 `unconnected_items`. A per-provider interaction with the limit, or something in the generated board, has not been ruled out.

The architectural decision does not change, because `drc` stays the gate. What is wrong is the factual claim, which is stated as a general KiCad 10 fact.

Proposed fix: say "KiCad 10.0.7 did not report the spike's one crossing case (`short-crossing`); cause not found". Then do one of two things: rerun `short-crossing` on a board with no baseline errors to rule out the limit, or file or find the KiCad issue and cite it.

### F3. "The router respects hole-to-hole" was not part of the verdict's evidence (medium)

Location: AD-20 clearance-policy bullet ("engines route at the strictest net-class clearance and respect the hole-to-hole clearance"); memlog ("The router respects it").

The spike router has no via-to-via drill rule. The README says `RoutingInput` has none, and the routed wired board got 45 `hole_to_hole` and 27 `holes_co_located` KiCad warnings (README lines 524-528; `out/custom-wired/custom-wired.kicad-drc.json`). The verdict graded the custom router "pass with fallback" without this constraint. Adding it, now at severity `error`, removes via sites, especially the co-located same-net vias that the router currently relies on. That can lower completion, and nobody has measured by how much.

Proposed fix: add a Deferred row, or add to the existing "Router reroute coverage" row: "Router with the hole-to-hole rule: rerun the Corney wired and wireless scorecards with `holeToHole` in `RoutingInput`. The verdict's pass grade did not include it. Revisit in epic-routing-and-fab, first routing story."

### F4. The tscircuit rejection names no version (low)

Location: AD-12, the "Milestone-1 engine" bullet ("tscircuit capacity-autorouter was rejected").

The verdict graded 0.0.1010. npm now has 0.0.1012, published 2026-10-27, and the package releases almost daily. Without a version, the rejection reads as permanent and general.

Proposed fix: write "tscircuit capacity-autorouter 0.0.1010 was rejected (routing verdict)".

### F5. Hole-to-hole severity differs from KiCad's default, so the cross-check will disagree (low)

Location: AD-20, "The KiCad export writes these values into its project rules" and "hole-to-hole included, has severity `error`".

KiCad 10.0.7 reports `hole_to_hole` and `holes_co_located` as `warning` (spike output). If the export writes only the values and not the rule severities, KiCad's cross-check and keeb-cad's gate grade the same finding differently, which goes against AD-20's "checkers that disagree" Prevents.

Proposed fix: say the export also writes `rule_severities` (`hole_to_hole: error`, `holes_co_located: error`) into the `.kicad_pro`.

### Minor

- The "Deadline ... It never hangs" claim relies on each A* search finishing on a finite grid. README line 485 shows a run can overrun the cap within its last search. Add "returns within one search past the deadline".
- flatbush brings a transitive `flatqueue ^3.1.0` (caret, not exact). That is harmless under pnpm strict, because flatbush declares it. If the router's A* wants a priority queue, it must declare `flatqueue` itself, which would be a third geometry import not in AD-10's rule.
- The Stack "Verified" line says "flatbush, npm". The licence and the ESM-only shape were checked here too. Nothing to change.

## Sources

- [JLCPCB PCB capabilities](https://jlcpcb.com/capabilities/pcb-capabilities) (fetched 2026-10-28)
- [JLCPCB help-centre capabilities (indexed; now 404)](https://api.jlcpcb.com/capabilities/Capabilities)
- [KiCad Forum: JLCPCB Design Rules](https://forum.kicad.info/t/jlcpcb-design-rules/22591)
- [KiCad 9 docs, inspecting / DRC checks](https://docs.kicad.org/9.0/zh/pcbnew/pcbnew_inspecting.html)
- [KiCad Forum: "crossed tracks" no DRC error](https://forum.kicad.info/t/crossed-tracks-no-drc-error-why-not/38069)
- [KiCad Forum: DRC not catching intersecting nets in v6](https://forum.kicad.info/t/drc-not-catching-intersecting-nets-in-kicad-v6/34714)
- npm registry, `npm view flatbush|clipper2-ts|@tscircuit/capacity-autorouter|flatqueue`, 2026-10-28
