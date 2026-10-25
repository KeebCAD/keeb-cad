# Input reconciliation: forge brief vs PRD (milestone 1)

- **Input:** `_bmad-output/forge-keeb-cad-preserve-work/forge-keeb-cad-preserve-work.md` (forge brief, hardened 2026-10-24)
- **Checked against:** `prd-keeb-cad-m1.md`, `addendum.md`, `.memlog.md`
- **Date:** 2026-10-25

## Intentional divergences (logged, no action)

| Brief says | PRD does | Logged decision |
|---|---|---|
| Milestone 1 has two checks, check 2 (remix) leads | M1 = check 1 only; remix in M2 | memlog SCOPE CHANGE |
| Job = remix | Remix is M2; M1 JTBD focuses on rebuild + production | memlog SCOPE CHANGE |
| Case updates live with layout | Case solids rebuild in background with progress | memlog "Case solids build in background" |
| Check 2: "the PCB works" | M1 done = fab checks pass + ZMK builds, no physical build | memlog "M1 done = files pass fab checks" |
| Freerouting (CLI) as engine | Routing must run in browser; Freerouting via CheerpJ, tscircuit | memlog "Routing must run in the browser" |
| Open: drag semantics | Deferred to UX session | memlog "Editor views/layout and drag semantics deferred" |
| Open: demand unproven, M2 tests | §2.2 Non-Users | covered |
| Rejected: importing KiCad boards | §5 Non-Goals | covered |
| Open: Ergogen config import | §5 Non-Goals | covered (see gap 5 on "follow-on" wording) |
| "Never pretend autorouting is solved" | Vision + FR-12 "reported as unrouted, never hidden" + SM-C2 | covered |
| Key-cell templates | FR-3, glossary | covered |
| Relative, structured layout model | FR-1, FR-2, glossary | covered |

## Gaps (dropped or changed without a logged decision)

### 1. Positioning lines are missing
The brief locks positioning as "one tool, two entry points" with two lines:
- "Remix any keyboard: Choc, wireless, your thumb cluster, and everything updates live."
- "Ergogen's power with a visual editor, all the way to gerbers, case and firmware."

Neither appears in the PRD or addendum, and no decision drops them. The second line is in effect the M1 pitch (check 1 = Ergogen board rebuilt visually through to production files), so it belongs in the Vision. The first line belongs in the M2 context in the addendum. The "two entry points" idea (Ergogen users vs remixers) also isn't reflected in §2 Target User.

**Suggested fix:** add the Ergogen line to §1 Vision as the M1 positioning; park the remix line in the addendum's M2 context.

### 2. kbplacer dropped silently, along with its "template routing" idea
"Build on" names **kbplacer** (accepts Ergogen points, template routing) and Freerouting as candidate engines. The addendum lists tscircuit and Freerouting/CheerpJ only. kbplacer is a KiCad Python plugin, so the browser-only decision probably rules it out, but that reasoning is never written down. Its useful idea, template routing (routing one key cell once and stamping it per key), is only partly kept (the glossary says key cells carry "local tracks"). FR-12 and the spike don't say that per-key tracks come from the template and not from the autorouter.

**Suggested fix:** in the addendum, record "kbplacer out: not browser-runnable; its template-routing approach is kept via key-cell local tracks", and make the spike/FR-12 say which tracks are templated and which are autorouted.

### 3. The "simple changes are live, complex routing is background" split has been flattened
The brief defines "Instant" precisely: simple changes update live, and **complex routing (MCU, USB, add-ons)** runs in the background. The PRD puts all routing in the background (FR-12, glossary "Routing ... runs in the background"). It never says whether key-matrix/key-cell traces update live when a key moves. The memlog only narrows *case* to background, not key-level routing. As written, moving one key could leave every PCB trace stale until the background router finishes, which is weaker than the brief's promise.

**Suggested fix:** state in §4.0 PCB row / FR-12 that key-cell local tracks follow their key live, and only inter-cell and slot-part (MCU, USB, add-on) routing is background. Or log a decision that all routing is background.

### 4. The "curated add-ons" principle and the rejected-items rationale aren't carried over
- **Curated add-ons:** the brief says "geometry is free; add-ons come from a curated set". FR-8 lists a catalogue scoped to Corney Island but never says the catalogue is curated/closed (no user-imported footprints/parts). It doesn't list that as a non-goal or open question either. This affects architecture (part schema, catalogue extensibility).
- **KLE / kle-ng:** rejected in the brief (absolute positioning). It is absent from §5 Non-Goals, though KLE import/export is an obvious request downstream readers may add back.
- **"Preserve hand edits" rejected as the wedge:** the PRD agrees with this (no manual trace editing, escape hatch stops syncing), but it doesn't record the rationale. The folder is still named "preserve-work", which invites the wrong framing.
- **Kill metrics deferred, "revisit at milestone 2":** §8 has no usage metrics, which is consistent, but the M2 revisit trigger isn't recorded anywhere (addendum M2 context omits it).

**Suggested fix:** add "user-imported parts/footprints" and "KLE import/export" to §5; add the M2 revisit of adoption/kill metrics to the addendum's M2 context.

### 5. Minor: open items recast without a note
- **Ergogen config import** was "a follow-on" in the brief; the PRD lists it as a plain non-goal. That's fine, but it loses the signal that it's the next likely feature after M1 (and fits the Ergogen-users entry point).
- **Pre-routed MCU zones** were "proposed, not yet accepted". The addendum turns them into a spike test item, which is reasonable but not logged as a decision. It should be framed in §9 as an open question.
- **Remix mechanism:** the brief locks "remix via a library of parametric building blocks modelled on known boards". §5 mentions "the block library", but the addendum's M2 context describes only the Corne→Choc target and not the mechanism. It also doesn't say whether the M1 Corney Island rebuild should be built so it can become the first block.

## Qualitative check (tone, feel)
- Pain framing (stall from fear of change cost, not loss of work) is kept well in §1 Vision.
- Sergii's personal story ("got lost in the tools") is reduced to "without learning a config language" in JTBD. That's acceptable.
- Personal-first / built-with-AI stance is kept via §2.2 and the "hobby, lean PRD" memlog decision.
