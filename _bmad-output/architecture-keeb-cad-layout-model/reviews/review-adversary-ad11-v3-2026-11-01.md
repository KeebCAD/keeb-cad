---
title: 'Reviewer lens: adversary (AD-11 model worker fold, v3)'
target: _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
scope: 'uncommitted 2026-11-01 diff (spine-ad11-v3.patch): paradigm, glossary (design bundle, routing file, fingerprints file, revision, seq, epoch, model worker, live, visible set, background, preview, crossing), AD-1, AD-2, AD-3, AD-8, AD-10, AD-11, AD-12, AD-13, AD-21, AD-22, AD-24, AD-25, Data Schema, Conventions, Stack, Monorepo, Deployment, Open Questions, Deferred'
date: '2026-11-01'
lens: 'adversary: two units one level down that each obey every AD to the letter and still build incompatibly'
prior: reviews/review-adversary-ad11-2026-11-01.md
---

# Adversary lens: AD-11 model worker, v3

**Verdict: close, not yet ready to build against.** v3 closes most of the first draft's
twelve holes, and the cleanest move is taking `routing` and `fingerprints` out of `Design`: with
that, the mirror holds the authored sections only and the revision is already a correct mirror
hash. The new holes all sit on the **derived files' path**. They don't reach the worker at load,
start or restart. Seq has two possible scopes. Autosave and undo pair the files with a revision
that main never has in hand when it needs it. Accept output change has no path to `pipeline`.
On top of these, AD-25's own rules contradict each other: "partials from the package root" and
the main entry fence can't both hold for `model`.

## Status of the first review's holes

| # | Hole | Status | What's left |
|---|---|---|---|
| H1 | `immer` fence vs applying patches in the worker | **Closed** | `applyDesignPatches` is exported from the register's file, each thread loads it, and layer 3 covers the mirror. Residual: the worker bundle loads the register's file, so the file must not import the register service (see N3) |
| H2 | Revisions have no order; hash undefined | **Closed (order); open question (hash form)** | (epoch, seq) orders messages. The mirror is authored-only, so the revision is a valid hash. The open-question row is fine, but seq's own scope is now ambiguous (N1) |
| H3 | Two copies of the routing section | **Mostly closed** | The worker has one copy (`pipeline`'s ref) and main has one copy (beside undo, for storage). `pipeline` never learns whether main dropped or accepted a file, so the two diverge after every drop until the next post. That works only if `pipeline` reposts at every seq (N4) |
| H4 | Derived write from R lands at R+1; autosave pairs wrong revision | **Half closed** | The drop rule was picked. AD-13 and AD-11 still say "for the same revision", and main never holds derived files for the revision it autosaves (N4) |
| H5 | Message union has no home | **Mostly closed** | `protocol` exists. Case and routing channel types are open-questioned. **Still a hole:** request kinds are "defined beside the stage that answers it", but `protocol` imports only `model` and `reactive`, so the union can't include them (smaller seam S1) |
| H6 | Who spawns the case and routing workers | **Closed** | Main spawns, hands over ports, and respawns case on request. Residual: on a model-worker restart, nothing says whether case and routing are respawned or only re-ported (S6) |
| H7 | Case bodies to both main and `pipeline` | **Closed** | Case posts only to `pipeline`, which forwards by transfer. Residuals: the Fresh-buffers wording forbids the forward as written (S2), and the case cache has no holder of the bodies (S3) |
| H8 | Undo and redo have no message | **Half closed** | Undo and redo now send patches. "Undo's own patches are derived from those records on demand" still allows a record-to-path translator as a second patch producer next to `produce` + `castDraft`. Wording fix: "re-run through the register's one `produce` call with the records put back by `castDraft`" |
| H9 | Acyclicity on main needs worker-only reads | **Closed (rule); fence clash** | Declared reads are declaration data, and snapshot-based commands carry seq. But the main entry fence forbids reaching `blueprint`, `model` imports `blueprint`, and the declaration schema's home is unnamed (N3) |
| H10 | Visible stage vs a workspace's several stages | **Mostly closed** | There is a workspace table and one message per seq. Residuals: a canvas may still draw a stage outside its set (S4). The drop snap-back is not covered: AD-2 says nothing about holding the preview until a post at or after the drop's seq (S5) |
| H11 | First post, crash, restart | **Mostly closed** | Epoch, crash detection, startup "computing" and `failed` (stage-only) are settled. Open: pending one-off requests on restart (settle or hang), and **derived files are not resent on restart** (N2) |
| H12 | One partial, two threads | **Closed (rule); fence clash** | There are now per-thread partials. But they are "exported from its root", so main's import of `modelMainServices` reaches the worker partial's graph (N3). The mirror's owner package and token are still unnamed |

---

## New holes

### N1. Seq has two scopes: every message or only design messages

**The text.** Glossary: seq is "the number main mints for **each message it sends** to the model
worker". AD-11 Ordering: "Every message main sends to the model worker (whole design or patches)
carries (epoch, seq) … seq counts up per message". AD-2: a command from a snapshot is rejected
"when that seq is not main's latest". AD-11 Derived files: main drops a file "whose seq is not
main's latest".

**Unit A: the `reactive` protocol-machine story.** It follows the glossary. Every main → worker
send (`design`, `patches`, `focus`, `request`, undo's derived files) mints the next seq, because
the machine is generic and knows no payload kinds.

**Unit B: the `pipeline` story.** It reads the parenthetical as the scope: seq numbers design
versions. It tags the visible set with the seq of the last applied patch and ignores seq on
`focus` and requests.

**How they diverge.**
- The user switches from Layout to PCB, which sends `focus` at seq 6. The worker posts the PCB set at
  seq 5, the design it computed. Main's latest is 6, so every drop on the PCB canvas carries seq
  5 and is **rejected** ("the layout changed, drop again") until the next command.
- A one-off request, such as a measurement readout, bumps seq to 7. A routing file computed for seq 5
  arrives and is dropped. `pipeline` "re-validates at the newest seq": the newest it applied is
  still 5, so it posts at 5 again, and main drops it again. With Unit A's machine and Unit B's
  pipeline, **no derived file is ever accepted** while requests keep flowing.
- Undo sends patches plus the restored derived files. Unit A mints two seqs, so the worker's posts
  for the undo patches arrive one seq short and are dropped.

**Tightening (wording, AD-11 Ordering and glossary).** "Seq counts **design messages** only
(`design`, `patches`; undo's derived files ride in the same message as its patches). Every other
main → worker message carries the current seq and does not advance it. 'Main's latest' is the
seq of the last design message main sent."

### N2. The derived files never reach the worker at load, start or restart

**The text.** AD-11 mirror: "Main sends the whole design value at worker start, on worker restart
and on load (`replaceDesign`) … Undo and redo **also** send the routing and fingerprints files."
`Design` is now authored-only (AD-2), so "the whole design value" doesn't include the derived files.
AD-12: "Automatic routing never moves a valid saved route." AD-11: fingerprints make "a kernel
update" show as a change in behaviour.

**Unit A: the load story (`editor` + `storage`).** It loads the bundle, calls `replaceDesign`,
sends `design`, and keeps the routing and fingerprints files on main for the next autosave. That
is exactly what the text lists.

**Unit B: the `pipeline` routing and fingerprints story.** At a new epoch it starts with empty
refs. It finds no saved routes, so it routes every connection from scratch. It also finds no saved
fingerprints, so it writes a fresh pair for every entry.

**How they diverge.**
- Every reopen **re-routes the board**. The saved, history-dependent routes, the only thing the
  routing file exists to keep, are replaced, and the next autosave overwrites them. That breaks AD-1's stable
  outputs and AD-12's "never moves a valid saved route".
- An app update that changes a kernel's output is exactly the case fingerprints exist for. With empty
  fingerprints, `pipeline` sees "a different input slice" (none, then some), writes the new pair,
  and **the change goes through silently**. That breaks "Nothing changes silently".
- A crash restart (new epoch, whole design) has the same effect in the middle of a session.

**Tightening (wording, AD-11 mirror and Lifecycle).** "At worker start, restart and load, main
sends the whole design **and the current routing and fingerprints files** in one `design`
message. `pipeline` treats them as saved data, re-validated before use (AD-12)."

### N3. "Partials from the package root" against "main's graph never reaches `blueprint`"

**The text.** AD-25: each package exports one partial per thread "from its root". Entry fences:
"main's [module graph] never reaches `blueprint`, the stage packages or the sandbox runtime".
AD-10: `model` imports `blueprint` (the interpreter takes `model`'s evaluator, AD-17), and the
register (in `model`) runs on main. AD-3: the register reads "the pinned declarations" on main,
and the declaration schema's home is unnamed (`blueprint` holds "the blueprint API", `model` "the
design's own lanes' schema").

**Unit A: the `model` package story.** It exports `modelMainServices` and `modelWorkerServices`
from `model`'s root, as AD-25 says. The root module imports the worker partial, which imports the
derivations, which import `blueprint` and `geometry`.

**Unit B: the entry-fence story (`tooling/ad10/`, dependency-cruiser).** It walks `main.ts`'s
module graph. `main.ts` imports `model` (the register, `modelMainServices`), so the walk reaches
`model`'s root, then `blueprint`. **The fence fails on the first commit**:
dependency-cruiser follows imports, not tree-shaking, so both units cannot pass at once.

Unit C, the AD-3 declared-reads story, puts the declaration schema in `blueprint`, next to the API.
The register on main then can't read it at all.

**Tightening (wording plus a small rule, AD-25 and AD-10).** "A package that serves two threads
exposes one **subpath export per thread** (`model/main`, `model/worker`), each exporting only that
thread's partial and functions. The root export holds only types and thread-neutral pure
functions, and the entry fences check subpaths. The register's file lives under `model/main` and
`applyDesignPatches` in a file both subpaths reach. The blueprint declaration schema is data in
`model`, with `blueprint` consuming it." This decides where three things live, so Sergii approves
it. It also covers the `editor → pipeline` open-question row (`pipeline/main` with types only).

### N4. Autosave and undo pair the design with derived files main doesn't have yet

**The text.** AD-13: the bundle is "the design file plus the routing and fingerprints files **for
the same revision**", written atomically. AD-2: autosave after a command. AD-2 undo: "beside each
undo record main keeps the routing and fingerprints files **current at that revision**". AD-11:
main drops any derived file whose seq is not its latest. RoutingFile and FingerprintsFile carry
`revision`.

When a command lands at revision R, main holds derived files tagged R−1 at best. Routing takes
seconds, and each command during it drops the result.

- **Unit A: the autosave story.** It writes design R plus the files it holds (tagged R−1). Each
  file honestly carries its own tag and load re-validates. It breaks AD-13's "same revision" on
  every save.
- **Unit B: the autosave story, read strictly.** It writes only when it holds files tagged R. During
  continuous editing it never writes, or it writes the design alone and adds the files later, so
  one bundle takes two writes, and the 20-version rolling window counts both.
- **Unit C: the `pipeline` story.** It posts a derived file only when its content changes, so a
  keymap edit posts no routing file. Unit B then waits forever, and Unit A's file never moves past
  an old revision tag.
- **Undo record.** At command time the "after" revision's files don't exist yet. One story stores
  the pre-command files as both before and after. Another patches the record when the files arrive,
  but the drop rule means a late file never arrives. Undo then restores routing tagged with another
  revision. The worker re-validates it, so nothing breaks, but "current at that revision" is false.

**Tightening (new rule, Sergii picks).** Option (a), the room's likely pick, because the
re-validation rule already exists: "`pipeline` posts both derived files **once per accepted seq,
even when their content is unchanged**, retagged with the revision. Autosave writes design R with
the latest accepted files, whatever their tag. A load re-validates any file whose revision differs
from the design's. An undo record keeps the files accepted last before its command (before) and
the first accepted after it (after, filled in when it arrives)." Reword AD-13 to "the derived
files last settled, each tagged with its revision". Option (b): autosave waits for `settled(seq)`,
with a timeout, and falls back to (a).

### N5. Accept output change has no path to `pipeline`, and undo brings back the old pair

**The text.** Accept output change is an action on main's register (AD-2). The fingerprints file is
"computed only by `pipeline`; saved only by main's `storage`" (glossary). The union lists no
main → worker message that changes `pipeline`'s state. Requests are reads ("answered
asynchronously"). The only open-question row is about where Reroute is defined. AD-2: undo and redo
restore "those files" and send them to the worker.

**Unit A: the Accept output change story (`editor`).** Main holds the fingerprints file, so it
writes the new output hash into the pair and lets `storage` save it. That makes main a **second
computer** of the fingerprints file. `pipeline`'s ref still holds the old pair, so on its next
post it reverts main's write, and the prompt comes back.

**Unit B: the `pipeline` story.** It adds a `request` kind `acceptOutputChange` that writes the pair
and posts the file. That stretches "request" into a mutation, and Reroute will do the same.

**And undo, either way.** The user accepts the change, then undoes an unrelated earlier command.
AD-2 restores that record's fingerprints file, from before the accept, and sends it to the worker.
The slice is unchanged and the outputs still differ, so **the accepted change prompts again**. The
Accept story expects acceptance to stick; the undo story restores the file exactly as AD-2 says.
Before v3, fingerprints were outside undo. AD-2 now puts them inside it.

**Tightening (wording plus one rule).** Wording: add an `action` message kind (main → worker)
to the union, used by Accept output change and Reroute, with seq. Only `pipeline` changes the
derived files. Rule (Sergii): "Undo restores the routing file only. The fingerprints file is never
restored by undo; `pipeline` keeps accepted pairs across undo." Or restore both and record the
re-prompt as intended.

---

## Smaller seams (one line each)

- **S1. Request kinds vs `protocol`'s imports.** "Each defined beside the stage that answers it"
  puts them in stage packages, and `protocol` may import only `model` and `reactive`. Reword: the
  request kinds live in `protocol`, and the answer function lives beside the stage.
- **S2. Fresh buffers vs case forwarding.** "Transfers only buffers packed for that one post" forbids
  forwarding the case worker's buffers, which `pipeline` didn't pack. Add: "or a buffer received
  for forwarding and not kept".
- **S3. Case cache vs the one holder of the bodies.** `pipeline` owns "caching" (Monorepo), and main
  is "the only holder of the bodies". On undo to a cached revision, a `pipeline`-side cache has no
  bodies to post. Say the case cache lives in the case worker (`case/`'s "cache per named solid").
- **S4. A canvas drawing outside its set.** The PCB set is pcb placement plus drc. A PCB canvas that
  also draws `layout` slot rectangles or `shapes` mixes seqs. Add: "a canvas draws only its
  workspace's set; anything else it shows comes from the design".
- **S5. Drop snap-back.** The design is at N+1 after the drop, and the snapshot stays at N for up
  to 100 ms. Add to AD-2: "the preview position stays drawn until a set at or after the drop's seq
  arrives". This rule also covers the nudge-after-drop rejection (a nudge from snapshot N while main is at N+1).
- **S6. Model-worker restart and the background ports.** The old ports die with the model worker.
  Say whether main respawns case and routing or only hands new ports, and that pending one-off
  requests reject with a typed `worker-restarted`.
- **S7. A late routing result after undo.** A cancelled request "returns what it placed, which
  `pipeline` re-validates before it is kept". After an undo has restored routing R−1, valid routes
  from the undone design merge in, and undo no longer restores the routing it kept. Say whether a
  result for a seq older than an undo's is kept or dropped.
- **S8. Mirror owner.** Neither the package (`model` or `pipeline`) nor the token (`design` or
  `designMirror`) of the mirror service is named, and per-section selectors read
  `design.value.…`.

## 📐 Angles the fold doesn't look at

- **The derived files are now the riskiest path, and they have the least text.** N2, N4 and N5 are
  all on the routing and fingerprints files' trip main → worker → main → storage → undo. Taking
  them out of `Design` fixed the mirror, and their own life cycle was never walked through. A
  single sequence diagram (load, two commands, a routing result, an undo, an accept, a crash)
  would surface all three.
- **"Seq" is doing three jobs**: message order, snapshot freshness for commands, and derived-file
  acceptance. Each job wants a different scope, which is why N1 shows up.
- **Rejections are tuned for correctness, not for the user.** AD-2's snapshot check rejects any drop
  or nudge made within the ~100 ms after any design message. Under N1's wide scope, it also rejects
  after a focus or a request. Nobody has asked how often "drop again" appears in a normal session.

## ☝️ Logic to check

- The glossary says the fingerprints file is "computed only by `pipeline`", and Accept output
  change is an action on main. Both can be true only through a message the union doesn't have (N5).
- AD-13 keeps "for the same revision" while AD-11 adopted the drop rule. Together they make
  autosave impossible to write as stated during any edit faster than routing (N4).
