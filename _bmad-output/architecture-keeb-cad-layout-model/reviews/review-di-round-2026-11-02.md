# Review: DI round and forbidden-but-needed fold (2026-11-02)

Scope: the uncommitted spine changes since b9b4ec5 (`architecture-keeb-cad-layout-model.md`) and `architecture-blueprints.md`, against the 17 memlog entries added since b9b4ec5 (later entries win). Read-only; checks (a) to (d) only.

**Verdict:** the layout spine is clean of the superseded tokens, and its three graphs agree edge for edge. Two problems remain. `di` is drawn as imported by only five packages, although AD-25 makes every package with services import it. The blueprints doc still injects stage operation tables through `di` tokens, which contradicts AD-25's token rule and the new AD-10 rule.

## (a) Leftovers and stale sentences

Searched both docs for `designMirror`, `designMirrorWriter`, `latestSeq`, `stageSnapshots`, `workerLink`, `libraryDeclarations`, `designCommits`, `derivedFiles`, "derived-files service", `ts-inject`, `PartialContainer`, `appendValue`, `app/commands`, "seeded", "unchecked", "worker link" and "link" in `app`.

- Layout spine: no hits. The glossary rows (design, routing file, fingerprints file, seq, epoch, command id, command register), AD-1, AD-2, AD-11, AD-12, AD-13, AD-25, the Structural Seed and the Capability map all say what the later memlog entries say. `design` holds the bundle and mints the seq. `workers` keeps the epoch and the snapshots. `design` subscribes nothing; `workers` and autosave subscribe to its commit event. `pipeline` imports `design/worker`. `createDerivations(design: ReadonlyRef<Frozen<Design>>)`. `design` imports `library` (main subpath). The AD-25 token table is empty.
- "name" as a command identifier: gone. AD-2, the glossary, Naming, Violations and Fixtures all use **command id**. The `{ command, input }` field name in fixtures holds a command id, which is consistent.
- **Blueprints doc, Inherited Invariants:**
  - The AD-25 row says "Per-thread **partials**", which is ts-inject `PartialContainer` vocabulary. It should say "per-thread `di` modules".
  - The AD-10 row says "`blueprint` imports only `geometry`, `expr` and `schema`". The spine adds `hashing`, for the lane cache key, and the row is missing it. It would also need `di` if BP-9's tokens stay; see (c).
- Low, wording: AD-2 says "`app`'s entries add the modules". AD-25 says "`main.ts` adds `commands`' modules". `commands` is main-only, so AD-2 should say `main.ts`.
- Low, wording: AD-2 says "Reroute and Accept output change post `protocol`'s `action` message to `pipeline`", and AD-12 says an action's apply "posts `protocol`'s `action` message through `workers`". Read literally, `commands` builds a `protocol` message, but `commands → protocol` is not drawn. Better: "ask `workers` to send the `action` message".

## (b) AD-10 bullets vs mermaid vs Structural Seed

I compared the three edge by edge for all 28 packages plus `fixtures`: expr, reactive, messaging, hashing, geometry, di, ui, schema, blueprint, drc, model, design, design-file, plates, pcb, firmware, case, routing, exports, library, protocol, pipeline, storage, viewer3d, commands, workers, editor and app. There are 28 packages, and the seven no-import kernels are named. Every out-edge list matches, including the subpath labels:

- model root, `model/main` and `model/worker`
- `design/worker` (only `pipeline`)
- `library` main vs `library/worker` (only app's worker entries)
- `di/vue` (only `editor`)

The "imported by" claims also match:

- `workers` is imported by `editor`, `commands` and `app`.
- `commands` is imported by `editor` and `app`.
- `protocol` is imported by `pipeline`, `workers` and `editor`.
- `messaging` is imported by `protocol`, `pipeline`, `workers`, `case` and `routing`.

I found no package-level cycle.

Two notes:
- The `app → design` edge is unlabelled. It also has to carry the model-worker entry's import of `design/worker`, which AD-25's fence allows ("only it and `pipeline` import `design/worker`"). That is consistent, but a label like "main entry: root; model worker entry: design/worker" would make the depcruise rule obvious.
- **The edges agree with each other but not with AD-25.** See (d)1: `di` edges are missing from all three graphs.

## (c) The new AD-10 rule applied to every remaining cross-package token, injection or indirection

| # | Indirection | Forbidden edge it stands in for | Classification |
| --- | --- | --- | --- |
| 1 | `commands` / `actions` multi tokens (defined in `design`, filled by `commands`' modules) | `design → commands` (cycle) | **Legitimate plugin registry.** The register is the mechanism and the handles are plug-ins; both edges point at `design` and depcruise sees them. Cost already recorded: a forgotten module is silent, caught by each command's e2e test. |
| 2 | `design`'s commit event (`workers`, autosave subscribe) | `design → workers`, `design → app` | **Legitimate observer.** Ordinary layering; the subscribers import `design`. |
| 3 | `design.acceptDerivedFiles` called by `workers` | none | Plain call down the graph. |
| 4 | `createDerivations(design: ReadonlyRef<Frozen<Design>>)`, called by the model-worker entry | `model → design` | **Legitimate argument.** `model/worker` needs a value, not `design`'s code; the type is in `schema`. |
| 5 | Derivations handed to `pipeline` by the model-worker entry | `pipeline → model/worker` | **Legitimate argument.** `pipeline` needs only `schema`-typed values; the entry fence keeps one graph. |
| 6 | **Blueprints BP-9: each stage's operation table and handle converter reach `blueprint/worker`'s lane runner through `di` tokens that `blueprint/worker` defines, "provided by `pipeline`" and by the case worker's entry** | `blueprint → stages`, `blueprint → model` (cycles) | **Plugin-shaped, but the token is an unneeded indirection, and it is broken as written.** (i) AD-25 exempts only classes and multi tokens defined in the consumer. A `createToken` defined apart from its provider must be in the table, which is "empty", yet BP-9 says it is "not a token in the AD-25 table". (ii) `blueprint` would import `di`, an edge that is not drawn. (iii) `pipeline` imports `model`'s root only, so it cannot provide `model/worker`'s operations for the `parts`, `shapes` and `extras` lanes (AD-10: "`model` placing parts and shapes"). The caller of each lane run (`model/worker`, `pipeline` for plates, pcb and firmware, `case` in the case worker) already holds that stage's operations and converter. Passing them as **arguments** to the runner removes the token, the `di` edge and the provider gap. **Decision for Sergii.** |
| 7 | "`model` receives library part and blueprint data from its caller" (`checkInputs(design, declarations, input)`, the `library lookup` derivation, parts lanes) | `model → library` | **Not yet examined under the new rule.** On main it is a legitimate argument: `design` reads the declarations and passes them to `checkInputs`. In the worker, `createDerivations(design)` has no library parameter, yet `model/worker` derives "library lookup" and runs part blueprints. `design → library` was chosen over a token for the same need. **Decision:** state the argument in `createDerivations`' signature, or draw `model → library` (main subpath). |
| 8 | Compiled scripts reaching `blueprint/worker`'s VM pool | `blueprint → library/worker` (pnpm cycle via the library build's `blueprint/authoring`) | **Legitimate argument, but unstated.** Only worker entries import `library/worker`, so the entry must hand the scripts to the pool. Neither doc says how, and `pipeline → library` does not say which subpath. |
| 9 | `CommandId` union in `schema` naming `commands`' ids; fixes and fixture scripts name commands by id | `stages`/`model`/`fixtures → commands`, plus a thread crossing | **Legitimate data contract.** One direction is unchecked: if `defineCommand` takes a `CommandId`, a new command must be in the union, but a stale union member has no check. Low. |
| 10 | Cross-thread messages (`action`, case respawn, ports, fixes) | n/a | Data across threads, not wiring. Legitimate. |
| 11 | `ui`'s command menu takes plain `{ id, label, hotkey, disabledReason }[]` | `ui → design` | Legitimate argument (AD-26). |

No pipeline-provided token remains in the layout spine. The only live `di` token left in either doc is #6, BP-9.

## (d) What would stop story 23.1 from encoding the graph in dependency-cruiser

1. **`di` edges are missing (High, decision).** AD-25 says three things:
   - "Each package that has services exports its `di` modules" (exporting a module means importing `di`).
   - The command register, the pipeline and the derived graph "are services wired by `di`".
   - Each worker's "cache, kernel, progress and other state are services".

   AD-10, the mermaid and the Seed draw `di` only from `app`, `editor`, `commands`, `workers` and `design`. Missing, at least: `pipeline` (the pipeline service), `blueprint` (the VM pool and lane cache; BP-9's tokens), `case` (the cache per named solid), `routing`, and probably `storage` (interface plus backends). A rule encoded as drawn would fail the first worker service.

   Fix: either draw the edges, or give `di` the same clause as `reactive` ("any package may import `di`; the drawn edges document its users"). Also say whether `model/worker`'s "derived graph" is a service. AD-25 calls it one, but `createDerivations` is a plain function and `model` has no `di` edge.
2. BP-9's tokens (c #6) need `blueprint → di` and a provider that cannot exist for `model`'s lanes. 23.1 would have to encode either an exception or a broken rule.
3. "Only worker entries import `library/worker`" must be encoded as a **direct-import** rule from `app/*.worker.ts`. Otherwise the route by which `pipeline` and `blueprint/worker` get scripts is undefined (c #8).
4. Not blocking: subpath-to-folder mapping (`model/main`, `design/worker`, `blueprint/worker`, `blueprint/authoring`, `library/worker`, `di/vue`) comes only from each package's `exports`. 23.1 has to derive its path patterns from there.
