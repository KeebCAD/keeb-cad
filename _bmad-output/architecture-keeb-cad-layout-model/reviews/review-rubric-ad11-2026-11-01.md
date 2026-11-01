# Rubric review: AD-11 model worker (2026-11-01)

- **Subject:** `architecture-keeb-cad-layout-model.md`, uncommitted diff `spine-ad11.patch` (frontmatter, Glossary, Design Paradigm, AD-2, AD-10, AD-11, AD-22, Verification, Stack, Structural Seed, Capability Map, Open Questions, Deferred)
- **Decisions checked against:** `.memlog.md` from "(event) AD-11 reopened 2026-11-01" to the end (Q1–Q11, the spike events, the approval of `ad11-model-worker-2026-11-01.html` v2, the distil event)
- **Reviewer stance:** the spine itself is not edited. Every proposed fix that adds a rule is a question for Sergii (no design autofixes); wording-only fixes are marked as such.

## Verdict

**Not ready to commit as final.** The adopted decisions are carried over faithfully and nothing material was invented. But the new two-thread model leaves six divergence points open: what orders messages, how asynchronous derived-section writes stay valid, what the crossing covers, what "visible stage" means per workspace, how the worker mirror relates to AD-2's Immer fence and freeze rule, and the model worker's lifecycle. Two units built from this spine today would disagree on each of them.

## Findings

Severity: **H** = two units will diverge or a rule contradicts another; **M** = gap that a story will hit; **L** = wording or drift.

### F1 (H). "Revision" cannot order messages, and the patch tag is ambiguous

- **Where:** AD-11 "Newer revisions", "Reads on main" ("an answer for an older revision is dropped"), "The design mirror"; AD-2 "Patches to the model worker"; Glossary `revision`.
- **Problem:** A revision is a content hash of the authored sections (Glossary). A hash has no order, so "newer revision", "older revision" and "newest revision only" (Background) cannot be computed from it. Undo can bring back an earlier hash, so an answer or stage post for hash A that arrives late after A → B → A looks current. Derived-section writes do not change the revision, so two consecutive `patches` messages (a command, then a routing write) carry the same "revision they apply to". "The hash of the resulting design" is not defined: if it is the revision, it misses `routing` and `fingerprints`, so a mirror whose routing has drifted passes the check; if it is a whole-design hash, it is a second hash the Glossary does not name, and its cost on main per command is not stated.
- **Fix:** Add a monotonic sequence number that main assigns to every `design` and `patches` message, echoed in every stage post, `issues` message, response and derived-section write; "newer/older" compares sequence numbers, never revisions. Name the hash checked by the mirror (e.g. "design hash: the content hash of the whole design file, derived sections included") in the Glossary, and say whether main computes it per command.
- **Needs Sergii's decision:** yes (it adds a tag to the protocol). Recommended: sequence number plus a named whole-design hash.

### F2 (H). Derived-section writes are asynchronous and untagged; autosave and AD-12 do not account for it

- **Where:** AD-11 "Derived-section writes"; AD-2 (three writers); AD-12 "Only `pipeline` writes the routing section … While an expression field's focus session is open …"; AD-13 (saved unit, Prevents).
- **Problem:**
  1. `pipeline` computes a routing or fingerprints write for design n and posts it; by the time it reaches main the design may be at n+1. Nothing says the write names the revision it was computed for, or that the writer drops or re-checks it. AD-12's "a routing result for an older committed revision is re-validated" happens in the worker, before the post, so the race between post and the next command is uncovered.
  2. Before today, invalid routes were dropped synchronously in the graph at each committed revision, on the thread that saves. Now the drop runs in the worker after DRC and returns later, so an autosave of revision n can write routes that are invalid at n. AD-13 lists "a file pairing authored state with routes from another revision" under Prevents; nothing now prevents it (load re-validates, which limits the damage, but the rule as written is broken).
  3. AD-12 suspends drop and reroute while an expression field's focus session is open. That session lives on main; the message union (`design`, `patches`, `focus`, `stage`, `issues`, `request`/`response`, `failed`) has no way to tell `pipeline` in the worker. Also, the Glossary says each term means exactly one thing, and `focus` now names both the visible-workspace message and the field's focus session.
- **Fix:** (a) Derived-section writes carry the sequence number (F1) and revision they were computed for; the writer applies them only if that revision is still current, else drops them (pipeline recomputes at the next revision). (b) State in AD-13 what autosave writes when derived writes for the current revision have not arrived: wait for them, save the last valid pair, or save anyway and rely on load re-validation (then edit AD-13's Prevents). (c) Carry the field session state over the crossing (in `patches` or its own kind) and rename one of the two "focus" uses (e.g. the message `visible`).
- **Needs Sergii's decision:** yes for (a) and (b); (c) is mostly mechanical, but the rename touches decided words. Recommended: (a) drop stale writes; (b) save anyway and amend AD-13, since load already re-validates.

### F3 (H). The crossing's scope contradicts the case and routing workers, and the message union does not cover the decided traffic

- **Where:** Glossary `crossing`; AD-11 "The crossing", "Background", "Derived-section writes", "The design mirror"; AD-10 "Case and routing worker code never imports `reactive`"; Browser diagram (`W1 → E`).
- **Problem:**
  1. The crossing is now "the one place in `reactive` through which values leave or enter a thread". Case and routing workers never import `reactive`, yet values enter and leave them over MessageChannels, and the case worker posts straight to main (Q10, diagram). Either those channels are outside "the one crossing", or the workers break AD-10.
  2. "One dispatcher per side" on main covers the model-worker port; the case worker's port to main is a second channel with no dispatcher rule.
  3. The listed union reads as closed, but decided traffic needs kinds it does not have: derived-section writes (worker → main), the worker's request for the whole value after a hash mismatch, case and routing progress (AD-11 "report progress"), and the field session state (F2). Its message list stays as decided in Q9; it was not checked against Q4 and Q10.
  4. Who spawns the case and routing workers (main or the model worker) is not stated. It decides who can `terminate()` the case worker (cancel = terminate) and who creates the MessageChannels.
- **Fix:** Redefine the crossing as "the one main ↔ model worker protocol, plus one typed message union per worker channel, all defined in `reactive`" (and allow the case and routing workers a small import of `reactive`'s protocol module, or move the protocol types to a non-reactive module). Make the union list explicitly open-ended or add the missing kinds. Add who spawns each worker to AD-11 "Threads", or as an Open Question next to the existing case-results one.
- **Needs Sergii's decision:** yes (scope of the crossing and spawning owner). The missing kinds are mechanical once decided.

### F4 (H). "Visible stage" is undefined per workspace; posted model outputs have no named types; commands can take inputs from stale snapshots

- **Where:** Glossary `visible stage`, `preview`; AD-11 "Visible stage first", "Reads on main", "Stage outputs"; AD-10 "Every stage output type is defined in `model`"; AD-2 "A drag changes the design only on drop".
- **Problem:**
  1. A workspace shows several stage outputs (PCB: pcb placement, DRC of saved routes, routes; Layout: parts and layout). "The visible stage" is singular, and no table maps workspace → stages. The Case workspace's stage is a background stage, so the 100 ms rule has no defined meaning there.
  2. Main draws "resolved placements and shapes" from posts (Glossary `preview`), but AD-10's list of output types (`PlatesOutput`, `PcbPlacement`, `RouteSet`, `DrcResult`, `CaseOutput`, `FirmwareOutput`) has no type for layout, parts, shapes, extras, netlist or connections, and codecs are "defined beside each output type in `model`". Two story authors will invent different post shapes.
  3. Main's snapshots trail the design by up to 100 ms (more for hidden stages and after a workspace switch). A drop or a re-anchor computes its command input (an offset in the anchor's frame) from the snapshot's frames. If the snapshot is older than the design, the command is applied with the wrong offset. Neither "Reads on main" nor AD-2 says what a gesture does when its snapshot's revision is not the design's.
  4. After a workspace switch the newly visible stage may hold an older snapshot. Hidden stages' violation counts are marked updating, but the stage's own drawing has no rule (current, grayed, or hidden), even though AD-11's Prevents still lists "stale outputs shown as current".
- **Fix:** (1) A small table: workspace → the stage outputs computed first (and "Case: none live; plates and pcb first"). (2) Name the posted model outputs (e.g. `ResolvedLayout`, `ResolvedShapes`, `Netlist`) in AD-10's list. (3) A rule: a command input computed from a snapshot names the snapshot's revision, and the register rejects it with a typed `Rejection` when that is not the current revision (or the editor blocks gestures until the visible snapshot is current). (4) A rule for drawing a snapshot older than the design.
- **Needs Sergii's decision:** yes for (1), (3), (4); (2) follows the Data Schema policy (output types are named there first if they are schema). Recommended for (3): reject with a typed rejection, since a 100 ms window makes it rare and visible.

### F5 (M). The design mirror conflicts with AD-2's Immer fence and freeze rule; "main derives nothing" is not enforceable

- **Where:** AD-2 "Writing" ("the register's file is the only `produce` call and the only import of `immer`", "Every design value is therefore frozen"), "Read-only types"; AD-11 "The design mirror"; AD-10 "The main thread … derives nothing"; Verification layer 3; Open Questions "Freeze rule …".
- **Problem:**
  1. The worker applies Immer patches "mechanically". With Immer that is `applyPatches`, a second import of `immer` outside the register's file, which AD-2 forbids. Without Immer it is a hand-written patch applier, which no rule mentions.
  2. Structured clone drops frozenness (a fact Q4 records). The mirror is therefore not frozen unless the worker re-freezes it, while AD-2 says every design value is frozen and layer 3 checks frozenness only on main. The existing Open Question about freezing covers library values and worker results, not the mirror, and its "Revisit when: first background stage" is now too late (every live post enters main as buffers).
  3. "The main thread … derives nothing" has no check. Main imports `model` (commands, structural checks, who-points-at, codecs, types), and `model` imports `blueprint` (the sandbox host) and holds the derived computeds, so dependency-cruiser cannot tell main-side code from worker-side code at package level. Q3's "sandboxes never on the UI thread" relies on it.
- **Fix:** (1) Name who applies patches in the worker (e.g. "the register's file also exports the patch applier; the mirror uses it") and amend AD-2's fence. (2) Say whether the mirror is deep-frozen after each patch and extend layer 3 to it, or state that it is not and why. Move the freeze Open Question's trigger to "first story that posts a stage". (3) Make the boundary checkable: separate entry points (e.g. `model` subpath exports for main-safe and worker-only modules) and a dependency-cruiser rule from `app`'s main entry that forbids `pipeline`, stage packages and `blueprint`'s sandbox host.
- **Needs Sergii's decision:** yes for (1) and (3) (fence and package surface); (2) is a decision too, but the recommended answer (re-freeze, it costs one walk of touched records) follows AD-2's intent.

### F6 (M). Model worker lifecycle: start, crash, hang, restart are named but not decided or listed as open

- **Where:** AD-11 "The design mirror" ("at worker start, on worker restart"), "Newer revisions" ("lets the current stage finish"), message kind `failed`; Open Questions (only the case worker's restart policy is listed).
- **Problem:** The spine says a whole value is sent on restart, but not what triggers a restart (`error`/`messageerror` events, a missed heartbeat, a stage over a time limit), who restarts, what the editor shows meanwhile, or what happens to requests in flight and to the last snapshots (kept and marked stale, or dropped). Before the first post, the editor has nothing to draw: startup display is undefined. A stage that loops (the step budget covers lanes, not `model` or `geometry` code) blocks all newer revisions forever, since a newer revision waits for the current stage to finish, and main has no rule to terminate it. `failed` has no stated meaning (lane failure is already `lane-failed` inside `issues`; is `failed` a worker-level failure?).
- **Fix:** Add an Open Question "Model worker lifecycle: startup display, crash detection, hang watchdog, restart owner, in-flight requests and snapshots on restart, meaning of `failed`" with Revisit when "the first story that posts a stage". If Sergii wants it decided now, the minimum rule is: main restarts the worker on `error` or a watchdog timeout, sends the whole value, keeps the last snapshots marked stale, and drops pending requests.
- **Needs Sergii's decision:** no to list it as an Open Question; yes to decide it.

### F7 (L). Smaller consistency points

1. **Codec scope.** AD-11 "Stage outputs" says "Geometry travels in transferred typed-array buffers, packed by an own … codec". Q11 says every stage output is packed by the codec. Non-geometric outputs (`FirmwareOutput` files, the netlist, issues) are left open to plain clone. Wording fix: say which outputs the codec covers. Q11's decided fallback (own codec unpacked to plain objects, ~0.5 ms) is also not in the spine; that may be on purpose, but the fallback is part of the decision.
2. **Derived-section writer owner.** The Structural Seed moved the writer out of `pipeline` ("derived-section writes (posted to main's writer)") but no package now owns the writer on main. AD-2 places `replaceDesign` in the register concept; the writer most likely belongs beside it. Owner assignment is a decision (component ownership), small.
3. **AD-25 wording.** "Only plain data crosses (AD-11)" vs AD-11's "plain values and transferred buffers". Wording fix.
4. **Glossary `stage` vs AD-11 Live list.** AD-11 now lists "layout" as a live item; the Glossary's stage entry names `parts`, `shapes`, `extras` as stage names and the lane order shows "(layout)" in brackets. Say whether layout is a stage (it now posts, so it needs a name and an output type, see F4).
5. **Verification.** No check proves the mirror equals the design after a sequence of commands, undos and derived writes (only the runtime hash). Layer 3 could add "after every generic-check step, the mirror's hash equals main's". Layer 7 does not mention the 100 ms visible-stage target; the Deferred row covers when to measure, which is fine.
6. **PRD drift.** AD-11 says it "closes PRD §8 Q3 for the visible stage"; `prd-keeb-cad-m1.md` lines 219 and 237 still say "target set after measurement". Not a spine defect, but the spine now contradicts the PRD until it is updated.
7. **Memlog fact.** The spike event says capnp-es was dropped because "the repo is on ~7.0.2". `pnpm-workspace.yaml` pins `typescript: ~6.0.0`, matching the spine's Stack (~6.0). The verdict on capnp-es stands on its alpha status anyway, but the memlog's reason is wrong.
8. **Stories to re-read.** The approved page lists stories planned against "computeds on main" (13.1, the frame stories, 13.10's design service, 13.11's ui layer). That belongs in tickets, not the spine, but nothing in the distil event shows it was handed on.

## Checklist

| Check | Result | Notes |
| --- | --- | --- |
| Fixes the real divergence points for the level below, misses none | **Partial** | Threads, the patch stream, whole-output posts, codec, request kinds, cancel at stage boundaries are fixed. Missed: message ordering (F1), stale derived writes (F2), crossing scope and union coverage (F3), visible stage per workspace, posted model output types, stale-snapshot command inputs (F4), mirror applier and freezing (F5), worker lifecycle (F6). |
| Every AD's Rule enforceable and prevents its stated divergence | **Partial** | "Main derives nothing" has no check (F5.3). AD-13's Prevents ("file pairing authored state with routes from another revision") is no longer prevented (F2.2). AD-11's Prevents "stale outputs shown as current" is not covered for a visible snapshot older than the design (F4.4). The 100 ms rule is a target with a Deferred measurement, acceptable as such. |
| Nothing under Deferred could let two units diverge | **Pass** | The changed Deferred row (checking the 100 ms target on the max) is a measurement, not a contract. The removed "move the evaluator off the main thread" clause is correctly gone. |
| Covers every adopted decision faithfully | **Pass, with two small gaps** | Q1–Q11 are all present and faithful (table below). Gaps: Q11's fallback is missing; codec scope is narrowed to "geometry" (F7.1). Nothing undecided was added, except "No RPC library" (a generalisation of the Comlink rejection; Sergii's reasons, one-way traffic and proxies, apply to any RPC library, so it reads as faithful) and "the derived-section writer" losing its package owner (F7.2). |
| No sentence elsewhere contradicts the new rules | **Fail** | AD-2's Immer fence vs the mirror's patch applier (F5.1); AD-2's "every design value is frozen" vs the mirror (F5.2); AD-10 "case and routing worker code never imports `reactive`" vs the crossing covering every thread (F3.1); AD-12's focus-session suspension unreachable from the worker (F2.3); AD-13's Prevents (F2.2); AD-25 "only plain data" (F7.3); Glossary "each term means exactly one thing" vs two meanings of "focus" (F2.3); PRD §8 Q3 (F7.6). |
| Every touched dimension decided, deferred or open (incl. worker start, restart, crash, resync) | **Partial** | Resync on hash mismatch: decided. Start and load: decided (whole value). Restart: mentioned, trigger undecided. Crash, hang, startup display, in-flight requests, `failed` meaning: neither decided nor open (F6). Worker spawning owner: missing (F3.4). Undo/redo patches, union payload types, case results routing, sandbox engine, AC re-run: correctly opened. |

## Memlog coverage

| Memlog item | In the spine | Faithful |
| --- | --- | --- |
| Direction: one stage visible, others may lag | AD-11 Visible stage first | Yes |
| Q1 hidden stages current but delayed, counts marked updating | AD-11 Visible stage first | Yes |
| Q2 visible stage within 100 ms, closes PRD §8 Q3 | AD-11; Deferred row | Yes (PRD not yet updated, F7.6) |
| Q3 one model worker; main keeps design, commands, undo, autosave, input, drawing; sandboxes in the worker | Paradigm, AD-10, AD-11 Threads | Yes |
| Q4 Immer patches + revision + hash; whole value at start, restart, load; resync on mismatch; AD-2 patches on | AD-2, AD-11 Design mirror, Stack | Yes (tag semantics unclear, F1) |
| Q5 whole output per revision, typed buffers, shallowRef on main | AD-11 Stage outputs | Yes |
| Q6 rejection of render-ready SVG as an output form | Not stated | Acceptable (a rejection; could be a Prevents item) |
| Q7 cancel at stage boundaries, start newest from the visible stage | AD-11 Newer revisions | Yes |
| Q8 reads on main / snapshots / typed one-off requests, older answers dropped | AD-11 Reads on main | Yes |
| Q9 hand-rolled union, one dispatcher per side, plain values and buffers | AD-11 The crossing, Glossary, Seed | Yes (coverage gap, F3.3) |
| Q10 pipeline in the worker; MessageChannels; derived writes to main's writer; case stays separate | AD-11 Background, Derived-section writes, Threads; Seed | Yes (writer owner, F7.2) |
| Q11 own struct-of-arrays codec, pre-sorted ids, in `model`, round-trip test, no index on main | AD-11 Stage outputs, Seed | Mostly (scope narrowed, fallback missing, F7.1) |
| Spike events (AC re-run needed) | Open Questions | Yes |
| Approval event (sandbox live-chain spike closed) | Open Question removed; new sandbox-engine row | Yes |
