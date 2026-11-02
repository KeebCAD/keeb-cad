# Rubric review: package split (2026-11-02)

- **Target:** `architecture-keeb-cad-layout-model.md`, uncommitted diff (package split: `expr`, `messaging`, `schema`, `commands`, `design-file`; `drc` as a checker library; worker `reactive` ban dropped; lane runner in `blueprint/worker`)
- **Decisions checked against:** the 14 `package-split` entries at the end of `.memlog.md`
- **Lens:** rubric walker (read-only; only this file written)

## Verdict

The split landed almost everywhere, and the AD-10 mermaid, the AD-10 bullets and the Structural Seed agree edge for edge. But two moves (Immer to main-only `commands`, the canonical writer to main-only, storage-only `design-file`) left the model worker unable to do two jobs the spine gives it: applying patches, and computing revisions and routing hashes. The `reactive` rule also contradicts itself and the memlog. Not ready to hand to 23.1 until C1, C2, H1 and H3 are decided.

## Rubric results

| Rubric item | Result |
| --- | --- |
| Fixes the real divergence points and misses none | **Fail**: C1, C2, H1, H2, H4 are divergence points left open or never named |
| Every AD Rule enforceable and prevents its divergence | **Partial**: AD-10's reactive bullet can't be enforced as written (H3); AD-25's entry fence is ambiguous between "imports" and "reaches" (M3) |
| Nothing under Deferred / Open lets two units diverge | **Fail**: the two new Open Questions rows (applyDesignPatches, Frozen/Mutable) are each a fork between 23.1's dependency-cruiser rules and the first code that needs them (C1, H1) |
| No self-contradiction (focus on the diff) | **Partial**: no sentence still gives `model` the register, codecs, writer, evaluator, lane runner or shared kinds; no reference to the crossing as a package; no `routing → drc` exception; no stage → `reactive` edge in the graph. Remaining contradictions: H3, M2, M4, M7, L1 |
| AD-10 mermaid = AD-10 bullets = Structural Seed | **Pass**: all 23 packages, every edge checked in each of the three places (one gap: `commands → reactive` is missing from all three, H4) |
| Each glossary term means one thing | **Partial**: "stage" (drc, M2) and "kernel" (blueprint, M8) |
| Every memlog package-split decision landed | **Partial**: 13 of 14 landed as written; the `reactive` decision landed with a ban the decision dropped (H3); one placement landed with no decision behind it (M1) |

## Findings

### Critical

**C1. The model worker cannot apply patches under the new graph.** *Needs a new decision.*
- **Location:** AD-2 Writing ("Each thread loads it separately … how the model worker loads it while `commands` is main-only is open"); AD-10 `commands` bullet ("main only … Only `editor` imports it"); AD-10 "Only `commands` imports `immer`"; AD-11 The design mirror; Open Questions row "How the model worker applies patches…"; Structural Seed mermaid (model worker lists no `commands`).
- **Problem:** AD-2 says the register's file runs in each thread and the mirror applies patches only through its `applyDesignPatches`. AD-10 says `commands` is main-only, only `editor` imports it, and only `commands` imports `immer`. Both cannot hold, so the mirror, which every live stage reads, can't be built. The Open Questions row sends it to "23.1's dependency-cruiser rewrite", but 23.1 encodes the graph, so 23.1 would make the call itself. The unit that writes the mirror would then either break the fence or invent its own patch application. AD-11's "Prevents: messages applied out of order" depends on this. Related gap: no package is named as the holder of the design mirror (`model/worker`? `pipeline`? the entry?).
- **Suggested fix:** decide one of: (a) a worker-safe subpath `commands/patches` (exports only `applyDesignPatches` and the Immer setup), importable by the model worker's mirror owner, and relax "main only" to "main only except `commands/patches`"; (b) a small kernel (for example `patches`) that is the only `immer` importer, with `commands` and the mirror owner both importing it; (c) the mirror applies patches without Immer (a second implementation, which AD-2 rules out). Name the mirror's owner package in AD-11 and the Seed at the same time.

**C2. Revision and routing hash have no computable home off main's `storage`.** *Needs a new decision.*
- **Location:** glossary `revision` ("content hash of the canonical serialisation of the authored sections") and `routing hash`; AD-8 and AD-10 (`design-file`: main only, only `storage` imports it, holds the canonical writers); AD-1 (`emptyDerivedFiles(revision)`, each derived file "tagged with that design revision"); AD-11 Cache key (routing hash), Derived files, Fingerprints; AD-15 export gate ("tagged with the same revision and routing hash"); Data Schema `Revision` ("the hashing code parses its result").
- **Problem:** before the split, the canonical writer lived in `model`, which both threads could reach. Now only `storage` can reach it. But `pipeline` (model worker) has to tag the routing and fingerprints files with the design revision, key `drc` and `exports` on the routing hash, and run the export gate on both. `commands` needs a revision for `emptyDerivedFiles(revision)`. None of them can import `design-file`. Each unit will hash something of its own (Immer value, JSON, KDL), and AD-11's "derived files saved against another revision" divergence is back. The "hashing code" in Data Schema has no package.
- **Suggested fix:** decide where canonical serialisation for hashing lives and who may call it. Options: (a) a worker-safe `design-file/canonical` subpath (writer + hash, no readers or migration), importable by `pipeline` and `commands`; (b) a separate hash kernel over a canonical plain-value form (not KDL), with the glossary's `revision` redefined to match; (c) only main computes revisions, and the worker receives the revision with each design/patches message (then say who on main computes it, and how `pipeline` gets the routing hash of a routing file it just computed).

### High

**H1. `Frozen<T>` / `Mutable<T>` have no home, and every package's signatures depend on them.** *Needs a new decision.*
- **Location:** AD-2 Read-only types ("Where `Frozen<T>` and `Mutable<T>` are defined … is open"); AD-2 Writing ("apply step receives `Writable<Design>`, passes it to its domain operation, which takes `Mutable<Design>`"); Open Questions row.
- **Problem:** stages, `model`, `editor`, `pipeline` and tests all type their parameters `Frozen<…>`, and `model`'s domain operations take `Mutable<Design>`. `schema` is the natural home, but it may hold only Valibot schemas and inferred types, and both helpers are defined over Immer's types while only `commands` imports `immer`. `model` can't import `commands`. Nothing says `Writable<Design>` must be assignable to `Mutable<Design>`. The first `model` story and the first stage story will each define their own, which becomes two read-only types. Deferring this to 23.1 has the same problem as C1.
- **Suggested fix:** decide (a) whether a type-only `import type` from `immer` counts against "only `commands` imports `immer`" (a dependency-cruiser setting 23.1 has to know), and (b) the home: `schema` (then extend "types + Valibot schemas only" to name these two), or hand-written mapped types with no Immer reference. State that `Writable<T>` is assignable to `Mutable<T>`, with a type test.

**H2. Fixtures and headless tests can't reach the command declarations.** *Needs a new decision.*
- **Location:** AD-2 ("`editor` declares every command and action, and no other package declares one"); AD-10 ("Only `editor` imports [`commands`]"; "Nothing imports `editor`"); Consistency Conventions Fixtures ("scripts of layout commands", `fixtures/`), Verification layers 3–5 (generic checks over every registered command, invariants on generated designs, headless slice scenarios).
- **Problem:** before the split, packages exported their own command lists, which `fixtures` could import. Now every entry is declared in `editor` (`app/`, a Vue app), nothing may import `editor`, and only `editor` may import `commands`. `fixtures` and the headless layers can't build a register holding the real commands. Each test story will either break the fence, put its suite inside `app/`, or re-declare commands, and AD-2 bans the last.
- **Suggested fix:** decide: (a) `editor` exports a Vue-free entries subpath (for example `@keeb-cad/editor/commands`) that `fixtures` and tests may import, with "Nothing imports `editor`" narrowed to its other subpaths; or (b) the fixtures and headless suites live in `app/`. Either way, list `fixtures`' imports in AD-10, since it is counted beside the 23 packages but its edges aren't drawn.

**H3. The `reactive` rule contradicts itself and the memlog decision.** *Needs a new decision (or confirm the wording below).*
- **Location:** AD-10 One reactive graph ("any package may import `reactive` (as drawn)" … "Stages export plain functions, never computeds, and import no `reactive`"); AD-10 first bullet ("Dependencies point only as drawn"); glossary `reactive graph` ("Other packages may use `reactive`"); memlog ("any package may import it. The ban on case/routing worker code importing reactive is dropped … the plates/pcb/firmware/drc -> reactive edges are removed").
- **Problem:** there are three readings. "Any package" says every package may import `reactive`. "(as drawn)", together with "only as drawn", limits it to `editor`, `pipeline` and `model`. "Stages … import no `reactive`" bans it for all six stages, including `case` and `routing`. That restores the worker ban the decision dropped, now as a stage-wide ban. The memlog removed the edges; it didn't ban them. 23.1 can't write one dependency-cruiser rule for all three readings.
- **Suggested fix:** Sergii to pick: (a) `reactive` is a free import for every package, AD-10's graph omits edges to it, and the dependency-cruiser rule allows it everywhere (drop "(as drawn)" and "and import no `reactive`"); or (b) only drawn edges, with "any package may" removed from AD-10 and the glossary, and the stage ban stated as a decision with its own Prevents. (a) matches the memlog.

**H4. `commands` holds `shallowRef`s but has no `reactive` edge.** *Wording fix if H3 resolves to (a); otherwise a decision.*
- **Location:** AD-2 ("Design state lives in one ts-inject service in `commands`, held in a `shallowRef`"); AD-1 (derived-files service "in `shallowRef`s"); AD-10 `commands` bullet ("imports only `model` and `schema`"); AD-10 mermaid `commands --> model & schema`; Seed `commands/ … imports: model, schema`.
- **Problem:** `commands` needs `shallowRef`. Only `reactive` re-exports it, and only `editor` and `ui` may import `vue`. Taken literally, the graph forbids the design service the spine places in `commands`.
- **Suggested fix:** add `reactive` to `commands`' imports in the AD-10 bullet, the mermaid and the Seed.

**H5. Live stages and selectors take "resolved values" whose types have no home.** *Needs a new decision (small).*
- **Location:** AD-10 Stage signatures (`(resolved) → { output, violations[] }`, `routing(resolved, …)`, `drc(resolved, …)`, `exports(resolved, outputs)`); AD-11 Input slice ("a selector, a plain function over resolved values, in the stage's own package"); AD-10 (`schema` lists "stage output types and input-slice types"); Data Schema (only "input slices of background stages").
- **Problem:** stages, `drc` and the selectors can't import `model`, so the type of `resolved` (per-side placements, parts, shapes, netlist, connections as stages read them) has to come from `schema`. The Data Schema section, which is "the same list" as `schema`, names input-slice types for background stages only. It is silent on what live stages (`plates`, `pcb`, `firmware`) and `drc` take. Each stage story will type its own view of the resolved design, which is "two types for one output" (AD-10's Prevents).
- **Suggested fix:** decide whether every stage, live ones included, takes a typed input slice defined in `schema` (one type per stage, typed before its first story), or whether `schema` holds one `Resolved` type. Add the matching line to Data Schema's closing comments.

### Medium

**M1. The derived-files service moved from `model/main` to `commands` without a recorded decision.** *Needs a new decision (confirm).*
- **Location:** AD-1 ("one derived-files service in `commands` … through `commands`' `emptyDerivedFiles(revision)`"); AD-25 (`commandsMainServices`: … derived-files service); Seed `commands/`; memlog gate fix H4 (still says `model/main`).
- **Problem:** none of the 14 package-split entries moves it. `commands`' listed holdings (memlog and AD-10 bullet) don't include it, while the Seed and AD-25 do. Under "model holds the domain only" the move looks right, but it is a placement the direction says the Seed must get exactly right.
- **Suggested fix:** Sergii confirms `commands` as its home, a memlog entry records the decision, and the AD-10 `commands` bullet lists the service and `emptyDerivedFiles` so bullet and Seed match.

**M2. "drc is a checker, not a stage", but the spine still treats DRC as a live stage.** *Wording fix.*
- **Location:** glossary `stage` (last sentence) vs. glossary `live`/AD-11 Live ("DRC of saved routes … all computeds"); AD-11 visible-set table (PCB: "DRC of saved routes", and the visible set is "the stages of the workspace"); Paradigm mermaid ("live stages: … drc of saved routes"); AD-11 Cache key ("stage id + stage version … + routing hash for drc"); AD-10 ("Every stage output type": `DrcResult`).
- **Problem:** "stage" means two things. The cache key needs a stage id and version for something the glossary says isn't a stage.
- **Suggested fix:** call it a "live check" or "`pipeline`'s DRC computed (calls the `drc` checker)" in those five places. The cache-key sentence should name its id as `pipeline`'s drc computed, and AD-10's output-type list should say "every stage output and `DrcResult`".

**M3. The entry fence is ambiguous, and `model → blueprint` can carry `blueprint` into main.** *Wording fix.*
- **Location:** AD-10 / AD-25 ("only the model worker's entry imports `model/worker`"); AD-10 (`pipeline` imports `model`, and wraps `model/worker`'s derivations); AD-25 ("main's never reaches `blueprint`"); AD-10 (`model --> blueprint`, not limited to a subpath).
- **Problem:** (1) `pipeline`, a package and not the entry, has to use `model/worker`'s derivations, so "imports" fails where "reaches" holds. 23.1 has to guess which one the rule checks. (2) `editor` imports `model/main`. Nothing says `model/main` doesn't import `blueprint`, so the main-reaches-blueprint fence fails as soon as `model/main` uses a query or operation definition.
- **Suggested fix:** phrase the fence as "only the model worker entry's module graph reaches `model/worker`", and add "`model/main` imports no `blueprint`, `reactive` computeds or `geometry` beyond …" (whatever is true). Or draw `model/worker --> blueprint` as the only `blueprint` edge from `model`.

**M4. A stale response dropped on main still hangs its caller.** *Needs a new decision (small).*
- **Location:** AD-11 Reads on main ("an answer for an older seq is dropped"); AD-11 The crossing ("a typed `stale` rejection reply to a request dropped as stale … so no caller hangs").
- **Problem:** the decision covers a request the worker's gate drops. If a command lands while a request is in flight, the response comes back with an older seq, main's gate drops it, and the pending promise never settles. That is the "hung callers" divergence AD-11 says it prevents.
- **Suggested fix:** decide that main's dispatcher rejects the pending caller with the same typed `stale` result when its gate drops a response. Add it to the crossing bullets.

**M5. Save and autosave: `storage` "saves what the derived-files service holds" but can't reach it, and autosave has no package.** *Wording fix plus a small decision (autosave's owner).*
- **Location:** AD-11 Derived files ("Main's `storage` saves the design with the derived files the derived-files service holds"); AD-13 ("Autosave writes the design plus what the derived-files service holds"); AD-8 ("`storage` never imports `commands`"); Paradigm / AD-11 Threads list autosave on main without a package.
- **Problem:** `storage` has no edge to `commands`, where both the design and the derived files live. Some caller has to pass them in, and nothing says which. The autosave service (debounce, rolling versions) could go in `editor` or `storage`, and stories will split it differently.
- **Suggested fix:** wording: "`editor` passes the design and the derived-files service's files to `storage.save`". Decide autosave's package, then name it in AD-13 and the Seed.

**M6. `storage → protocol` has no stated use.** *Wording fix (or drop the edge: decision).*
- **Location:** AD-10 mermaid `storage --> … protocol`; AD-10 protocol bullet ("Only `pipeline`, `editor` and `storage` import it"); AD-11 ("`pipeline`, `storage` and `editor` all call it"); memlog codecs entry (Binds: protocol, pipeline, editor; not storage).
- **Problem:** it is carried over from the old graph. Since load now returns the bundle to `editor`, which hands it on, nothing in the spine has `storage` send or decode a message. An unexplained edge invites code to fill it.
- **Suggested fix:** state what `storage` uses from `protocol`, or remove the edge from the mermaid, the bullet, AD-11 and the Seed together.

**M7. "Forwards to one `model` domain operation" is said of actions too.** *Wording fix.*
- **Location:** AD-2 Command register ("Each is a thin wrapper defined with `defineCommand` or `defineAction`: … an apply step that forwards to one `model` domain operation. An action's apply posts `protocol`'s `action` message …").
- **Problem:** the bullet's first sentence covers both kinds, and its next sentence contradicts that for actions. It also leaves open whether a plain setter (`setGap`) needs a domain operation in `model` or may write the draft directly. The two readings produce different `model` surfaces.
- **Suggested fix:** "A command's apply step forwards to one `model` domain operation; an action's apply posts … / calls `storage`". If setters write the draft without a domain operation, say so. If not, say every command has one.

**M8. Structural Seed "holds" lines aren't exact, though the direction says they are the only guard.** *Wording fix.*
- **Location:** Seed `model/`, `blueprint/`, `commands/`; AD-10 bullets.
- **Problem:** `model/` omits id minting (AD-8, AD-19), `reject` / `Rejection` and the structural checks (AD-2), and library lookup (AD-10 shared derivations). `blueprint/` is labelled "kernel", but AD-10 now reserves "kernel" for packages with no workspace imports, and `blueprint` imports three. `commands/` lists the derived-files service, which the AD-10 `commands` bullet doesn't (see M1).
- **Suggested fix:** add the missing items to `model/`, drop "kernel:" from `blueprint/` (or define "kernel" once in the glossary), and align `commands/` with the AD-10 bullet once M1 is settled.

**M9. The register's checks need `expr` and library declarations that `commands` can't import.** *Wording fix (route through existing edges) or decision (add edges).*
- **Location:** AD-10 One reactive graph ("The register's checks read the design and the pinned declarations, and may evaluate input ranges and upgrade conversions with `expr`'s evaluator"); Data Schema `UpgradeMapping.convert` ("applied by the register on main"); AD-3 Declared reads ("the register on main checks read loops"); AD-10 `commands` imports only `model`, `schema`.
- **Problem:** there is no `commands → expr` or `commands → library` edge. One implementer will add an edge, and another will route the check through `model/main` or through a factory `editor` fills.
- **Suggested fix:** state that the register calls `model/main`'s checks, which use `expr`, and receives pinned declarations from `editor` through its container factory (as `model` receives library data "from its caller"). Or add the edges in all three places.

### Low

**L1. KiCad writer: in `pcb` (Seed) or in `exports` (Deferred)?** *Wording fix.* Seed `pcb/ … KiCad writer` vs. Deferred row "KiCad writer … Hidden inside `exports`". This predates the split but is two homes for one writer. Pick one.

**L2. Request kinds "defined beside the stage that answers it" vs. `protocol`'s one union.** *Wording fix.* AD-11 Reads on main vs. Message unions: `protocol` imports only `schema` and `messaging`, so it can't hold request kinds defined in stage packages. Say the request and response payload types live in `schema` (Data Schema) and the handlers beside the stage.

**L3. How Export reaches `pipeline` is underspecified.** *Wording fix.* AD-2 says "Export asks `pipeline` through `protocol`" but lists only Reroute and Accept output change as `pipeline`'s `action` handlers. Say whether Export is an `action` or a `request` kind. The bytes-to-main question stays open, as recorded.

**L4. Memlog gate fix H4 still places the derived-files service in `model/main`.** *Wording fix.* Add a superseding memlog line when M1 is decided.

**L5. `commands` names three things.** *Wording fix (optional).* The package `commands`, the ts-inject token `'commands'` (AD-2, AD-25) and the glossary's `command`. A different token name (for example `registerEntries`) would keep grep and prose unambiguous.

## Checks that passed (diff focus)

- No sentence still gives `model` the register, Immer, codecs, canonical writer, `migrateBundle`, evaluator, lane runner, VM pool or shared kinds (glossary, AD-2, AD-5, AD-8, AD-10, AD-11, AD-17, AD-24, Data Schema, Seed checked).
- "crossing" is a rule owned by `messaging` everywhere. No sentence treats it as a package.
- No `plates`/`pcb`/`firmware`/`drc → reactive` edge remains in the mermaid or the Seed.
- No `routing → drc` exception remains. AD-10 and AD-20 both say "no named exception" and "checker library".
- No case/routing worker `reactive` ban remains under that name (but see H3 for the stage-wide one).
- Package count: 23 in the AD-10 mermaid, in AD-10's first bullet and in AD-25's last bullet.
- Edge-for-edge: `editor`, `commands`, `pipeline`, `storage`, `design-file`, `protocol`, `viewer3d`, `model`, `plates`, `pcb`, `firmware`, `case`, `routing`, `exports`, `drc`, `library` (and dashed `blueprint/authoring`), `blueprint`, `schema` agree in the AD-10 mermaid, the AD-10 bullets and the Seed. The five no-import packages (`expr`, `reactive`, `messaging`, `geometry`, `ui`) agree.
- Memlog entries landed: model domain only; commands; schema (with the lint and both-ways fixture); expr (the evaluator workaround is gone); messaging (gate, stale reply, restart rejection, plain-value check, production check open); design-file (only `storage`; `storage` never imports `commands`); codecs to `protocol`; lane runner, cache and VM pool to `blueprint/worker` (case worker never loads `model`); drc checker; selectors in stage packages, `pipeline`'s list, `editor` never imports `pipeline`; hotkey split (AD-26); the Seed-exactness direction (partly met, M8).
