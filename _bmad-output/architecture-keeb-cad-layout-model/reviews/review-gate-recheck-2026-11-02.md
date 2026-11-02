# Gate recheck: package split (2026-11-02)

- **Reviewed:** `architecture-keeb-cad-layout-model.md`, uncommitted diff, against the memlog entries tagged "package-split gate" and the three earlier reviews (`review-{rubric,adversary,verification}-split-2026-11-02.md`).
- **Scope:** (a) did the earlier critical and high findings close; (b) did the gate edits add contradictions, stale names or a graph mismatch; (c) anything that stops 23.1 encoding the graph. I did not re-raise Open Questions rows.

## Verdict

The gate closed almost every earlier blocker, and the three graphs (the AD-10 bullets, the AD-10 mermaid and the Structural Seed) agree edge for edge across all 25 packages plus `fixtures`. One new gap matters: no one in the model worker is named as the receiver that applies patches to the mirror. `pipeline`'s between-stages patch drain can't apply them through a read-only token. If the answer is a new edge, it changes a 23.1 rule.

## (a) Earlier critical and high findings

The verification review had no critical or high findings.

| Finding | Status | Where it closed, or what is left |
| --- | --- | --- |
| Rubric C1: the model worker can't apply patches | Closed | `design/worker` owns the mirror and `applyDesignPatches`, imported only by the model worker's entry (AD-2, AD-10, AD-25). The new receiver gap is N1 |
| Rubric C2: the revision has no computable home | Closed | `hashing` kernel; `design` computes the revision on main; `pipeline` echoes it (AD-2, AD-10, glossary) |
| Rubric H1: `Frozen` and `Mutable` have no home | Closed | Plain TypeScript in `schema`; "`Writable<Design>` must be assignable to `Mutable<Design>`, checked by the compiler" (AD-2, AD-24) |
| Rubric H2: fixtures can't reach commands | Closed | `app/commands`, Vue-free, importable by `fixtures` and tests (AD-2, AD-10). Scoping is in N4 |
| Rubric H3: the `reactive` rule contradicts itself | Closed | The stage ban is gone and the glossary matches. Encoding note in N6 |
| Rubric H4: `commands` has no `reactive` edge | Closed | `design → reactive` in the bullet, the mermaid and the Seed |
| Rubric H5: resolved types have no home | Closed | `ResolvedDesign` in `schema` and Data Schema |
| Adversary C1: no package can compute the revision | Closed | As rubric C2. The filler of missing derived files is now named: `app`, through `emptyDerivedFiles` (AD-8) |
| Adversary C2: the mirror can't apply patches | **Partly** | The owner and the fence are closed. Still open: who writes the mirror in the worker, and how `pipeline` drains pending patches between stages (N1) |
| Adversary C3: no owner for seq minting and sending | **Partly** | `app`'s worker link mints and sends, and `design` declares a latest-seq token. Two parts are still unsaid. First, how `design` "hands the patches and revision to `app`'s wiring" (no outbound token or event is named; the only tokens are latest-seq and routing-file). Second, AD-11's gate bullet is unchanged: on main nothing advances the receiver gate, and only the derived-files bullet says "not main's latest". Both are wording fixes |
| Adversary H1: `Frozen` and `Mutable` | Closed | As rubric H1 |
| Adversary H2: `ref(kind)` as a function in `schema` | Closed | No lint; `ref(kind)` and `compareId` are named as allowed helpers |
| Adversary H3: subpaths let main reach `blueprint` | Closed | Three `model` entries; only `model/worker` imports `blueprint` |
| Adversary H4: worker entries have no home | Closed | The four entries are in `app`, with fences per entry |
| Adversary H5: `LayoutOutput.part` row order | **Partly** | `compareId` is now in `schema`, which `model` can import. The shape question is the Open Questions row "Derivations return wire row numbers or run ids" |
| Adversary H6: the stage input has no type home | Closed | As rubric H5 |
| Adversary H7: two holders of the derived files; no home for autosave | Closed | The service and autosave are in `app`; `storage` no longer imports `protocol`; the paradigm arrow is redrawn |

**Count:** 14 closed, 3 partly closed, 0 still open, out of 17. One part of each partly closed finding is new work (adversary C2 is N1). The rest is wording (C3) or already an Open Question (H5).

## (b) and (c) New findings

### N1. No one in the model worker receives patches, and `pipeline` can't apply them. High; decision.
- **Where:** AD-11 The design mirror ("`design/worker` … applies them in order … on a mismatch asks for the whole value"); AD-11 Newer seqs ("the worker then applies every pending patch"); AD-10 (`design` "never imports … `messaging` or `protocol`"; `pipeline` reaches the mirror "only through the token `'designMirror'`"); Data Schema `DesignMirror` (`readonly value`, `readonly revision`).
- **Problem:**
  - `design/worker` can't receive a `design` or `patches` message, and can't send "ask for the whole value", because it has no `messaging` or `protocol` edge.
  - `pipeline` runs the stage loop and must apply pending patches between stages. But its only access to the mirror is a read-only token, and the fence forbids it to import `design/worker`.
  - `app`'s bullet names only the main side of the link.
  - The result is three possible receivers (the `app` model-worker entry, `pipeline`, or `design/worker`) and no apply path for the between-stages drain.
- **Fix, decided by Sergii:** pick one of these:
  - Name the worker side of the link (most likely `app`'s `model.worker.ts`, or `pipeline`), and have `design/worker` provide a second token, an apply or enqueue port. The edges stay as drawn.
  - Add `pipeline → design/worker`. This changes 23.1's rule "only the model worker's entry imports `design/worker`".

  Decide before 23.1.

### N2. The `DesignMirror` token doesn't say its reads are tracked. Medium; wording.
- **Where:** Data Schema `DesignMirror` ("minimal, no Vue type"); AD-10 per-section selectors (`computed(() => design.value.layout)`).
- **Problem:** the selector computeds recompute only if reading `mirror.value` is reactive. The type allows a plain object that is replaced in place, and its selectors would never rerun.
- **Fix:** say that `design/worker` provides `value` backed by a `shallowRef`, read through a getter, so reads are tracked. The type stays free of Vue.

### N3. On main, no owner is named for the stage snapshots, the `focus` message or one-off requests between `editor` and `app`'s link. High; small decision.
- **Where:** AD-10 (`editor` never imports `app` or `messaging`); AD-11 Reads on main and Lifecycle; the paradigm mermaid (`LK → focus, one-off requests` and `SN → editor`).
- **Problem:**
  - `app`'s link receives the workspace sets and responses.
  - `editor` draws them and triggers `focus` and requests.
  - The spine doesn't say who holds the snapshot `shallowRef`s, or through which token `editor` asks the link. Before the split, the link was in `editor`, so this was implicit. Now an `app` story and an `editor` story will each hold snapshots.
- **Fix:** name the owner. For example, `editor` declares a snapshots service and a link token, and `app` provides them. Either way the graph stays as drawn.

### N4. "Test files" may import `app/commands` with no scope. Medium; decision.
- **Where:** AD-2, AD-10 ("`app/commands` is imported by `app`, test files and `fixtures`").
- **Problem:** take a test in `model` or `design` that imports `app/commands`. It needs a dev dependency on `@keeb-cad/app`, and `app` depends on those packages, so the workspace has a package cycle under pnpm's strict dependencies. 23.1 needs the exact test globs for its rule.
- **Fix:** say which tests may import it: tests inside `app` and `fixtures` only, or a named headless-test location.

### N5. A migration that changes the design value changes its revision, but the spine says the revision "doesn't change with the file format". Low; wording.
- **Where:** glossary `revision`; AD-8 ("revision tags stay unchanged" through migration).
- **Problem:** the value hash is stable only across changes to the writer. A schema migration changes the value, so after the migration the derived files carry the old revision. AD-12 and AD-13 tolerate an older tag, but the glossary's claim is stronger than the rule.
- **Fix:** say that a migration that changes the value gives a new revision, and that the derived files keep their old tag and are re-validated.

### N6. Small items 23.1 will trip on. Low; wording.
- **AD-24's hand-declared list:** it names `Quantity`, `Result`, `Frozen` and `Mutable` but not `DesignMirror`, which Data Schema lists as hand-declared.
- **Stale memlog event:** the earlier "Ticket follow-ups for Sofia" event still tells 23.1 to write a "schema lint", which the gate dropped. Add a superseding line.
- **The `reactive` rule:** "Any package may import `reactive`" sits beside "Dependencies point only as drawn". Say that dependency-cruiser allows `reactive` everywhere and that the drawn edges document its current users.
- **`pipeline`'s `model` import:** it imports `model` "never `model/worker`", but the spine doesn't say whether that means the root or `model/main`.

## Checked with no finding

- **The three graphs:** AD-10 bullets, AD-10 mermaid and Seed match for all 25 packages plus `fixtures`, including `app`'s main and worker-entry splits, `design → model/main`, `model/worker → blueprint, reactive`, and the `hashing` users (`design`, `pipeline`, `blueprint`, `storage`). The six import-free packages are counted correctly.
- **Stale names:** none.
  - No `commands` package remains; the token name is already an Open Questions row.
  - No `crossing` package; the glossary says it is "not a package".
  - `editor` declares no entries.
  - No `storage → protocol` edge, and no `pipeline → storage` arrow.
  - `commandsMainServices` is gone.
  - "23 packages" is gone.
- **Paradigm mermaid and Seed mermaid:** both match the text (the `app` entries, the derived files going to `app`'s link, and `storage` fed by `app`).
- **Entry fences:** each is encodable as written.
