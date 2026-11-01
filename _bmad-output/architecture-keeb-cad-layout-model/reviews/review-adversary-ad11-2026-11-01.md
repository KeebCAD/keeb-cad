---
title: 'Reviewer lens: adversary (AD-11 model worker fold)'
target: _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
scope: 'uncommitted 2026-11-01 diff: paradigm, glossary (reactive graph, crossing, model worker, live, visible stage, background, preview), AD-2 (patches on, patches to the model worker, derived-section writer), AD-10 (one graph in the model worker), AD-11 (rewritten), AD-22, Stack (immer), Monorepo (reactive, model, pipeline), Deployment diagram, Open Questions rows'
date: '2026-11-01'
lens: 'adversary: two units one level down that each obey every AD to the letter and still build incompatibly'
---

# Adversary lens: AD-11 model worker

**Verdict: not ready to build against.** The thread split is sound, but the diff names the
messages and leaves their contracts open. Who applies the patches, what the hash covers, how
messages are ordered, who owns the background workers, and which copy of the routing section is
the real one: two stories can obey every AD and still answer each of these differently. Four of
the holes below break a rule the spine already states: AD-2's `immer` fence, AD-10's "Case and
routing worker code never imports `reactive`" read against AD-11's "everything that crosses goes
through the crossing in `reactive`", AD-13's "routing valid for that revision" and AD-3's
acyclicity check on main. The other holes are open seams the open-questions table doesn't list.

Each hole below names two units (stories or packages built on their own), shows why each obeys
the spine as written, how they diverge, and the rule that closes the hole.

## Summary

| # | Hole | Severity | Seam |
|---|---|---|---|
| H1 | Nobody may apply the patches in the worker: `immer` is fenced to the register's file | blocker | AD-2 ↔ AD-11 mirror |
| H2 | Revisions are content hashes, so "older" has no order; the "hash of the resulting design" is undefined | blocker | AD-11 tags ↔ glossary `revision` ↔ undo |
| H3 | Two copies of the routing and fingerprints sections: `pipeline`'s shallow ref and the mirror | blocker | AD-10 stage signatures ↔ AD-11 derived writes ↔ AD-13 read-only tabs |
| H4 | A derived-section write computed at revision R lands on main at R+1; autosave saves routes from another revision | high | AD-11 ↔ AD-12 ↔ AD-13 |
| H5 | The message union has no package it can live in; the case and routing workers may not import the crossing | high | AD-10 ↔ AD-11 crossing |
| H6 | Who spawns the case and routing workers; terminating one needs the `Worker` object | high | AD-11 background ↔ deployment diagram |
| H7 | Case results to both main and `pipeline`: a transferred buffer has one owner | high | AD-11 ↔ AD-15 ↔ AD-22 (open question exists, but no rule binds the interim) |
| H8 | Undo and redo have no message: three ways to tell the worker, each AD-compliant | high | AD-2 undo ↔ AD-11 mirror (open question exists) |
| H9 | AD-3's acyclicity check runs on main, but declared reads come from sandboxes that run only in the worker | high | AD-2 register ↔ AD-3 ↔ AD-11 threads |
| H10 | The visible stage is a stage, but a workspace draws several: frames mix revisions | medium | AD-11 focus ↔ AD-22 |
| H11 | Before the first post, after a crash, during a restart: what the editor draws and what pending work does | medium | AD-11 ↔ AD-22 ↔ AD-25 |
| H12 | One partial per package, but `model` and `pipeline` now serve two threads | medium | AD-25 ↔ AD-11 threads |

---

## H1. Nobody may apply the patches in the worker

**Unit A: the register story (`model`, register concept).** AD-2: "The register's file is the
only `produce` call and the only import of `immer`." It turns patches on and posts them. It does
everything AD-2 asks.

**Unit B: the model-worker mirror story (`pipeline` or `model`, worker side).** AD-11: "The worker
applies them in order, checks the hash." Applying Immer patches means `applyPatches`, which is an
`immer` import outside the register's file. The story has three choices, and each keeps a rule
by breaking another or by adding a second implementation:

1. It imports `immer` in the mirror. This breaks AD-2's fence and AD-10 ("Only `model`'s register
   concept imports `immer`"), and dependency-cruiser fails it.
2. It hand-rolls a patch applier in `reactive` or `pipeline`. Nothing forbids that, and the result
   is a second implementation of Immer's patch semantics: `replace` at the root path `[]`, array
   `length` patches, `add` at an array index shifting the items after it. It drifts the first time
   Immer changes how it emits array patches, the hash then mismatches on every list edit, and each
   one costs a whole-value resend.
3. It puts the mirror service inside the register's file. That keeps the letter of the rule, but
   it ships the register's file into the worker bundle and blurs which thread owns the register.

**Tightening (AD-2, Writing).** "The register concept owns both ends of the patch stream: the
register's file exports `applyDesignPatches(mirror, patches): Frozen<Design>` (Immer's
`applyPatches` on the same `new Immer({ autoFreeze: true })` instance), and the model worker's
mirror service calls it. Still only the register's file imports `immer`. The mirror is
deep-frozen, like the design." Add the mirror to layer 3's frozen and no-proxy checks.

## H2. Revisions have no order, and the hash is undefined

The glossary defines a **revision** as "the content hash of the canonical serialisation of the
authored sections". AD-11 tags patches with "the revision they apply to and the hash of the
resulting design", and it drops "an answer for an older revision". 

**Unit A: the one-off request story (`editor` asks for something on main).** It drops a response
whose revision ≠ the current one. It reads "older" as "different".

**Unit B: the stage-post story (`editor` keeps snapshots).** It keeps a post unless its revision is
older, so it needs an order. Content hashes have none. After `A → B → undo → A`, a late post for
B arrives while A is current. Unit B can't tell whether B is older or newer. If it compares hash
strings, it accepts or drops at random.

Both units follow "tagged with its revision" and still disagree on whether a late post is
dropped.

The hash has a second split:

**Unit C: the register posts `hash = revision`**, the function that already exists. It covers the
authored sections only. A derived-section write then changes `routing` and leaves the hash
unchanged, so a mirror that missed or misapplied that write passes the hash check, and the two
routing sections drift with nothing to catch it.

**Unit D: the mirror hashes the whole `DesignFile`.** Every patch mismatches against Unit C's
hash, and the worker asks for the whole value after every command. The design still comes out
correct, but the 100 ms budget is gone and every computed recomputes.

Hashing costs time on its own. A canonical KDL serialisation of the whole design runs on main
after every command, and again in the worker. Nobody has measured this, and it is main-thread
work that the "derives nothing" rule doesn't count.

**Tightening (AD-11, the design mirror; glossary; Data Schema shared kinds).**
- "Every main → worker design message carries a **sequence number**: a counter per worker session
  that only increases, minted on main. The worker tags each post, issue and response with the
  sequence it computed from. Main drops anything below the sequence it last sent. A revision
  still tags files, routes and caches; it never orders messages."
- "The mirror hash is the **design hash**: a hash of the canonical serialisation of the whole
  `DesignFile`, derived sections included. It is computed by one function in `model`, and the
  revision is not the mirror hash." This adds `DesignHash` (or a documented use of `Hash`) to
  Data Schema's shared kinds, which the project's policy requires before code uses it.
- Add an open-question row: measure the cost of hashing per command on main. A fallback is a
  cheaper rolling hash over the patches, checked against the full hash every N messages.

## H3. Two copies of the routing and fingerprints sections

AD-10 still says "`pipeline` also holds the routing section and background results in shallow
refs." AD-11 now says derived writes go to main, and "they return to the worker as patches" into
the mirror. That leaves two places in the worker holding the routing section.

**Unit A: `pipeline`'s routing story.** It follows AD-10. It keeps `routingRef`, updates it as
soon as it re-validates a result, and `drc` reads it. It posts the write to main.

**Unit B: the mirror plus the drc wiring story.** It follows AD-10's per-section selector rule
("every derivation reads the design mirror through per-section selector computeds"), so `drc`
reads `mirror.routing`.

**Where they diverge:**
- **Read-only tab** (AD-13: other tabs "never write the derived sections"). Unit A's ref holds the
  new routes. Main's writer refuses the write, so no echo patch arrives. Unit A's tab shows DRC
  results for routes that exist only in that worker. Unit B's tab shows the saved ones.
- **Between post and echo.** Unit A has already moved on. The echo then arrives as a patch, which
  changes `mirror.routing`, which invalidates every computed reading it, and `drc` runs a second
  time on the same routes.
- **AD-12's no-retry rule** ("does not retry the same unrouted set at the same revision and
  routing hash") is keyed on a routing hash. Unit A and Unit B compute that hash over different
  copies.

**Tightening (AD-10 stage signatures, AD-11 derived-section writes).** "In the model worker the
routing and fingerprints sections exist only in the design mirror. `pipeline` holds no copy. A
derived-section write is a **proposal**: it takes effect only when its echo patch arrives. Until
then `pipeline` treats the write as pending, keyed by the sequence it was based on, and starts
no new routing request for the same connections." Remove "holds the routing section … in shallow
refs" from AD-10, and keep "background results".

## H4. A derived write computed at revision R lands on main at R+1

**Unit A: the derived-section writer (main).** AD-2: it "applies the derived-section writes
`pipeline` posts". It applies each one when it arrives.

**Unit B: `pipeline`.** AD-12: it "writes the routing section only at committed revisions", and
"a routing result for an older committed revision is re-validated … before it is kept". It
re-validates in the worker, against the mirror at revision R, then posts. Meanwhile the user has
run a command, so main is at R+1. Unit A writes routes that are valid for R into a design at R+1.

**Autosave (AD-13)** saves "the routing and fingerprints sections valid for that revision". Main
autosaves at R+1 right after the command, before the worker has re-checked anything. By
construction, every autosave holds the previous revision's routing. Opening that file
re-validates the routes, so nothing breaks, but AD-13's sentence is false every time it runs.

Fingerprints have the same race. A fingerprint computed for slice S at R, applied at R+1 where the
slice is S′, is recorded as "the same slice with different outputs", which is AD-11's change in
behaviour. That raises a false **Accept output change** prompt.

**Tightening (AD-11, derived-section writes).** "A derived-section write carries the sequence it
was computed from. The writer applies it only when it matches main's latest sequence, and
otherwise drops it. The worker recomputes at the newer sequence." Then reword AD-13: "the
routing and fingerprints sections last settled by the worker; a load re-validates them". The
alternative is "autosave waits for the worker's `settled(seq)` message, with a timeout". Sergii
picks one.

## H5. The message union has no package it can live in

AD-11: the crossing is "one TypeScript discriminated union … in `reactive`". AD-10: `reactive`
imports no workspace package. The payloads include `PlatesOutput` and the other stage output
types (defined in `model`), the request kinds ("defined beside the stage that answers it", so in
stage packages), and Immer patches (typed by `immer`, fenced to the register). The open-questions
row names this gap. Here is how it splits if a story starts before the row is answered:

**Unit A: the `reactive` crossing story.** It makes the union generic: `{ kind: 'stage';
stage: string; payload: unknown }`. It imports nothing and is "one union".

**Unit B: the `pipeline` posting story.** It needs typed payloads, so it writes
`pipeline/protocol.ts` with a narrowed union. **Unit C: the `editor` receiving story** writes its
own narrowing decoder on main. That gives three type definitions of one protocol. Each is legal,
because none of them is the crossing.

AD-10 adds a second clash: "Case and routing worker code never imports `reactive`". But AD-11
says anything leaving a thread goes through the crossing, and the case worker posts bodies to
main. So the case worker either imports `reactive` (breaking AD-10) or posts around the crossing
(breaking AD-11).

**Tightening (AD-10, AD-11, Monorepo).** "`reactive` holds the **protocol machinery**: a
`defineProtocol<Messages>()` generic, the dispatcher, the transfer-list collection and the plain
and transferable assertion. It knows no payload types. The **one concrete union** for main ↔
model worker lives in `pipeline/protocol`, as type-only exports. `editor` imports it with
`import type` only, and dependency-cruiser forbids value imports from `pipeline` into `editor`'s
main bundle. The case and routing workers' messages are a second union, in their own packages,
built on the same machinery. Their entries may import `reactive`'s crossing machinery but not its
reactivity re-export." Then reword AD-10's last sentence to say exactly that.

## H6. Who spawns the case and routing workers

AD-11: `pipeline` "hands each its input slice over a MessageChannel between workers", and "the
case worker … its cancel is a terminate". The deployment diagram shows `MW → W1` (MessageChannel)
and `W1 → E` (bodies to main).

**Unit A: the editor bootstrap story.** It spawns the case and routing workers on main. It creates
a MessageChannel and transfers one port to the model worker and one to each background worker.
That matches the "MessageChannel" wording and the `W1 → E` edge.

**Unit B: the `pipeline` case story.** It cancels by terminating, as AD-11 requires. `terminate()`
is a method on the `Worker` object, and only the thread that spawned the worker holds that
object. Under Unit A, that thread is main, so `pipeline` can't terminate the case worker. To
cancel, it would have to post a message to main, a kind the union doesn't have, so it can't obey
the cancel rule. If `pipeline` spawns a nested worker instead, the case worker can't reach main
directly (`W1 → E`) without a port that main hands it.

Lifecycle diverges too. If the model worker crashes, Unit A's case worker keeps running and posts
to a dead port, while a nested worker dies with its parent.

**Tightening (AD-11, Threads).** Name one owner. The room's likely pick is "`pipeline` spawns and
owns the case and routing workers as nested workers. It alone posts to them, terminates them and
respawns them. Background results reach main only through the model worker (see H7)." Then
replace "MessageChannel" with "posts" and drop the `W1 → E` edge. The other option is "main
spawns them; cancel is a `cancel(stage)` message from `pipeline` to main". Note that nested
dedicated workers need checking in the target browsers, including module workers inside module
workers.

## H7. Case results to both main and `pipeline`

The open-questions row names this, but the diagrams already commit to an answer: `CS → SN`
(Paradigm) and `W1 → E` (deployment), which send the bodies directly to main.

**Unit A: the case-viewer story.** It follows the diagram: the case worker transfers bodies to
main, which draws them.

**Unit B: `pipeline`.** It needs the case output for:
- the last good output and the slice-hash freshness tag (AD-11);
- the **fingerprints** of every build entry with a case lane, because the output hash feeds
  Accept output change;
- the STEP and STL bytes for exports (AD-15);
- the export gate's revision tag.

A transferred buffer is detached at the sender, so only one of the two units ends up holding the
bodies. With Unit A, `pipeline` never sees the case output, so build-style fingerprints are never
computed and a kernel update to a style changes the case **silently**. AD-11's "Nothing changes
silently" fails exactly where it matters most.

**Tightening (AD-11, Background; rewrite of the open-question row as a rule).** "The case worker
posts to `pipeline` only. `pipeline` hashes the outputs (fingerprints), keeps the STEP and STL
bytes, the slice hash and the revision, and forwards the bodies to main as a `stage` post,
transferring them. Re-transferring a buffer it received is allowed and costs nothing. Main's
snapshot is the **only holder of the bodies**, and AD-22's grayed last good bodies are main's
copy. `pipeline` keeps no bodies." Then fix both diagrams.

## H8. Undo and redo have no message

AD-2 sends "each applied command's and each derived-section write's Immer patches". Undo and redo
are neither. The open-questions row offers two choices: derive patches from the undo records, or
take them from Immer. Three AD-compliant builds are possible today:

- **Unit A (undo story 14.1) sends the whole design on undo.** "Whole value … on load" is the only
  other message, and undo resembles a load. The value crosses by structured clone, so every
  section arrives with a new identity. Every per-section selector computed invalidates, AD-10's
  must-not-recompute checks fail, and the 100 ms target is missed on a large design for the
  commonest action in the editor.
- **Unit B derives patches from the records.** A record is an item by id (AD-23). Immer paths are
  array indices (`['layout','children',3,'children',1]`). A record-to-path translator is a
  second patch producer, and it gets indices wrong after a reorder.
- **Unit C re-runs `produce` with the records put back through `castDraft`.** This produces real
  Immer patches from the one `produce` site. It is the only option that keeps the fence and a
  single producer.

**Tightening (AD-2, Undo; close the open question).** "Undo and redo are writes through the
register's one `produce` call: they put the entry's before or after records back into a draft,
and the patches go to the worker like a command's. Every design write except `replaceDesign`
produces patches the same way. `replaceDesign` alone sends the whole value." Add to layer 3's
generic checks: after do, undo and redo, the mirror's design hash equals main's.

## H9. The acyclicity check on main needs the worker's declared reads

AD-2: "After every produced value the register runs `model`'s structural checks (acyclicity,
AD-3)". The register is on main. AD-3: "Declared reads (AD-11) are edges of the same graph … a
command that would close one is rejected." For code blueprints, AD-11 says "Code lists its reads",
so the reads come from running the lane's declaration in the sandbox. The sandboxes run "never on
the UI thread", only in the model worker.

**Unit A: the register story.** It runs acyclicity on main over anchors, shape references and
parameter references, which is all it can see there. A command that closes a declared-read loop
passes.

**Unit B: the `pipeline` lane-ordering story.** It finds the loop when it orders lanes in the
worker. AD-3 says a loaded file with a cycle "reports" it. A command that closed one should have
been rejected, but the command is already committed on main with an undo entry. Unit B reports a
violation instead. The result is a cycle in the design that AD-3 says can't exist after any
command.

The same split hits any availability check or apply step that needs resolved values (for example
"align to the key's world position"). Main has only posted snapshots, possibly from an older
sequence.

**Tightening (AD-3, AD-11).** Pick one:
- "Declared reads are **data in the blueprint version's declaration** (Data Schema, *Blueprint
  declarations*), loaded with the library on main without running the sandbox. The register's
  cycle check reads them there." The blueprints architecture run has to hold this.
- Or downgrade declared-read loops to a flagged break (`read-cycle` violation, owned by
  `pipeline`), and record that as a change to AD-3.

Separately: "An apply step and an availability check read only the design. A command that needs
resolved values takes them as inputs, captured from a snapshot together with its sequence, and
the register rejects the command when that sequence is older than the design's."

## H10. The visible stage is one stage; a workspace draws several

AD-11 says "the visible stage (the one whose workspace the editor shows)". The PCB workspace draws
the resolved placements, the outline, pcb placement, saved routes and drc. The Layout workspace
draws placements, parts' rectangles and shapes.

**Unit A: the focus story.** It sends `focus: 'pcb'`. The worker computes and posts `pcb` first.

**Unit B: the PCB canvas story.** It draws each snapshot as it arrives. Until the hidden stages
arrive, the canvas shows pads at revision N+1 over an outline and keys at N. That is a frame AD-11
says must never happen ("stale outputs shown as current"), and nothing marks it stale.

Drop has the same issue. AD-2 says the dragged nodes are drawn "at their preview position" until
the drop. After the drop, main's design is at N+1, but the snapshot is still at N for up to
100 ms. If the canvas goes back to drawing the snapshot, the node snaps back and then jumps
forward again.

**Tightening (AD-11 Visible stage first, AD-22).** "`focus` names a **workspace**. Each workspace
maps to a fixed set of stages, defined in one table in `pipeline/protocol`. The worker computes
that set first and posts it as **one message**. A canvas draws only snapshots that share one
sequence. A drag preview stays drawn until a post with a sequence at or after the drop's
arrives." The 100 ms then applies to the whole set, so the latency row in Open Questions and
Deferred is about the set, not the slowest single stage.

## H11. First post, crash and restart

The spine says only "on worker restart" (whole value) and lists a `failed` message kind.

**Before the first post.** The snapshot refs start empty. Each canvas story chooses on its own: a
blank canvas, a spinner, or authored values drawn from the design. AD-22's "never blanks once a
body exists" covers only 3D.

**`failed`.** One unit reads it as "a stage threw", the lane-failed path. Another reads it as "the
worker is dying". A worker crash shows up as `worker.onerror` on main. It is not a message the
worker sends.

**In-flight state at a crash:**
- Pending one-off requests: their promises never settle.
- Derived writes posted but not yet echoed: they are lost or applied twice.
- Background workers: orphaned or killed (H6).
- Sequences: does the counter reset? If it resets, a post from the old worker could arrive late
  and pass the "not older" check.

**Tightening (AD-11, a new bullet "Worker lifecycle").**
- "Each worker session has an **epoch**. Every message carries `(epoch, seq)`. Main drops
  anything from a dead epoch."
- "On a crash main keeps every snapshot, marks it stale, rejects pending requests with a typed
  `worker-restarted` error, and sends the whole value in a new epoch."
- "Before the first post of an epoch, canvases draw the last snapshots marked stale, or at first
  load an explicit 'computing' state from one shared component."
- "`failed` means a stage failed. A dying worker is detected by `onerror` and `messageerror` on
  main, and AD-11 names both."

Add layer 6: a journey that kills the worker mid-revision.

## H12. One partial per package, two threads

AD-25: "one partial per package", "each worker builds its own container … from its package's
worker partial". The model worker hosts `model`, `pipeline`, the live stages, `blueprint` and
`geometry`, so its container is built from several packages, not one.

**Unit A: the `model` story.** It exports `modelServices`, with the register, the design service
and the derived computeds. Main merges it.

**Unit B: the model-worker entry story.** It merges `modelServices` too, because it needs the
derived computeds. Now the worker builds a second register and a second design service under the
same tokens. Either the mirror uses the `design` token, and the per-section selectors happen to
work, or the mirror is a second token. Unit A's tests pass on main, and Unit B's tests pass in the
worker.

The partial-disjointness test checks partials pairwise and can't see one partial used on two
threads.

**Tightening (AD-25).** "A package that serves two threads exports one partial per thread:
`<package>MainServices` and `<package>WorkerServices`. Disjointness is checked per container (main,
model worker, case, routing), and dependency-cruiser forbids each entry from importing the other
thread's partial. The model worker's entry is `pipeline`'s." Name the tokens too: `design` on
main, `designMirror` in the worker.

---

## Smaller seams (no pair constructed, worth one line each)

- **`editor → pipeline` in the AD-10 drawing.** `pipeline` now runs only in the worker. A value
  import from main pulls every stage into the main bundle. Make the edge type-only (see H5).
- **The export gate and file save.** The gate and `exports` run in the worker, while Save and
  download run on main. The spine doesn't say how export bytes reach main: transferred, through
  the union, as a `response`.
- **One-off request kinds "beside the stage that answers it".** That is the third place a
  protocol type lives (see H5).
- **"Main derives nothing" against the register's structural checks on main.** Acyclicity is a
  derivation. Make an explicit exception, or see H9.
- **Coalesced field commands (AD-2).** Several patch messages make one undo entry, and Esc undoes
  the entry. That works only if H8's rule holds.

## 📐 Angles the fold doesn't look at

- **The fold assumes the main thread stays idle after it hands work off.** Hashing (H2), the
  canonical writer for autosave, and Immer patch generation all run per command on main. The
  "first usable" numbers from the spike measure only the receiving side, and the cost of a
  command on main was never measured.
- **The change is reviewed one message at a time; the risk is in the order of messages.** H2, H4,
  H10 and H11 are all ordering holes, and none shows up when one story is reviewed alone. A
  single sequence diagram with two commands, an undo, a routing result and a crash would bring
  all four out.
- **Bug class to watch for.** Moving to one worker swaps synchronous computeds, which can't go
  stale, for eventual consistency. Its usual bugs are stale writes and echo loops, and H3 and H4
  are both of these.

## ☝️ Logic to check

- AD-11 claims "Every posted output carries its revision" as the replacement for "live outputs
  are current by construction". A revision is a content hash, so it can say "this is not the
  current content" but never "this is older" (H2). The guarantee the old sentence gave needs a
  sequence number.
- The paradigm says the routing section is "written only by `pipeline`" (glossary), and AD-2
  says the derived-section writer on main writes it. Both are true only if the glossary reads
  "proposed only by `pipeline`, applied only by the derived-section writer". Two stories will
  read "written by" two ways (H3).
