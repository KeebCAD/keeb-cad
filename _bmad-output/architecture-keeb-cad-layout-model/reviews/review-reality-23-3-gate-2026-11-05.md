# Reality check: 23.3 gate spine update (2026-11-05)

**Scope.** The uncommitted diff to `architecture-keeb-cad-layout-model.md` and the 2026-11-05 `.memlog.md` decisions (Q1–Q15, and Q16–Q17, which landed while this review ran). Lens: was each decision checked against the code, the TypeScript compiler and the libraries, or only asserted?

**Method.** I read `packages/di`, `packages/result`, `packages/design` and `packages/schema`. I type-checked and ran a prototype against the real `di` and `result` sources with the repo's `tsc` (TypeScript 6.0.3) and `jiti`. The prototype has a `DesignStore`-shaped service, class-handle commands and actions, multi tokens that list classes, and overloads on `kind`. I ran `@vue/reactivity` 3.5.44 and `valibot` 1.5.0 from `node_modules`. I downloaded `@bgotink/kdl@0.4.1` (`npm pack`), read its source and ran its parser. The prototypes are in the session scratchpad, not in the repo.

**Verdict.** The core decision holds up when run. Commands and actions as `di` classes, with lazy instance resolution, give no `CircularDependencyError`. Overloading `run` on `kind`, the Vue cut-off and the Valibot paths also check out. Three claims go further than the code or types support: the registration-time check, the input type of `run`, and the KDL message. One return path has no type: an action that is unavailable or gets invalid input. None of this undoes a decision. Each needs a sentence in the spine, or a design-owned helper, before 23.3 is coded.

---

## Verified (no action)

| Claim | Evidence |
|---|---|
| A class is a token, and singletons are the default lifetime | `packages/di/src/token.ts:13-16,31-33` (`class` source check); `registration-defaults.ts:5-8` (`Lifetime.Container`) |
| A multi token can list classes rather than instances | `register(multi).useValue(Class)`: `registration-builder.ts:26-28`; `container.ts:75-77` returns `T[]`. Prototype: `useValue(SetGap)` into `MultiToken<CommandHandle>` compiles and resolves to the classes |
| `inject()` in the fields of a class resolved lazily, after the container is built, with an entry that injects the store, raises no `CircularDependencyError` | `inject.ts:23-39` checks the cycle only on the live `chain`. `slot.ts:14-19` returns a resolved store without pushing a context. Prototype: an eager `Store` with `inject(InjectorToken)` later calls `injector.resolve(NewDesign)`, whose field is `inject(Store)`. It runs and prints `action ok`, then `command ok` |
| `InjectorToken` inside the store resolves against the container | `container.ts:123-130` (transient, `currentResolver() ?? this`) |
| The duplicate-id check can read the static ids at construction | Prototype constructor maps `h.id` over both multi tokens; works as `design-store.ts:29-34` does today |
| The class-side interface `extends Class<Command<I>>` compiles, and `implements Command<v.InferOutput<typeof X.input>>` may name the class's own static | Prototype `tsc` exit 0 |
| `run` overloaded on the handle's `kind` literal picks the right return type and rejects the wrong kind | Prototype: `Result<void, Rejection>` for `SetGap`, `AsyncResult<void, never>` for `NewDesign`; `useValue(NewDesign)` into `commands` fails as expected |
| A synchronous action can return an already-resolved `AsyncResult` | `async-result.ts:10-22` (`AsyncResult.ok()`, `fromResult`); `AsyncResult<void, never>` satisfies `Action<_, never>` in the prototype |
| `Option.fromNullable` exists, so `Option<Committed>` availability works | `packages/result/src/option.ts:13-15` |
| `Result.flatMap` chains `migrateBundle(raw).flatMap(…)` into a union error | `ok.ts:27-29`, `err.ts:29-31` (`Result<U, E \| F>`) |
| `computed` cuts off by `Object.is`, so selectors on `.design` don't re-run their dependents on `acceptDerivedFiles` | Vue 3.5.44 run: replacing the `Committed` with the same `design` re-ran the computed getter (2 runs) but not its dependent effect (1 run). A whole-`Committed` reader re-ran (2), the cost the spine accepts. This holds through a wrapper computed too |
| Valibot issue paths start at the schema root | valibot 1.5.0 run: `{meta:{id:'Bad'}}` gives `["meta","id"]`; a missing key gives `["meta","id"]`; a root type error gives `[]`. `to-schema-issue.ts:6-8` copies them as is |
| `Design` already has no `formatVersion`, so the revision hashes authored content only | `packages/schema/src/design.ts`; `design-store.ts:86-88` hashes `design` |
| `design-file` may return `Result` and `design` may use `di` and `result` without new graph edges | `.dependency-cruiser.mts:19` (`OPEN_KERNELS = ['di','reactive','result']`), `:39-40` |

---

## Findings

### F1. The class-side check at registration does not compare the static input with `apply`'s parameter (Medium)

**Claim (AD-2, line 203; memlog Q5).** `CommandHandle` and `ActionHandle` are "checked wherever the class is registered into a multi token or passed to `run`".

**Reality.** The multi tokens are `MultiToken<CommandHandle>`, which is `CommandHandle<any>` or `<unknown>`, so registration checks only the shape: `kind`, `id`, `label`, that `input` is a schema, and the constructor. Take a class whose `static input = v.object({ gap: v.string() })` while `apply` takes `{ gap: number }`. `c.register(commands).useValue(Mismatch)` compiles. Only `store.run(Mismatch, …)` fails (prototype `proto2.ts`: no error at registration, TS2769 at both `run` calls). A command reached only as data (a violation's fix or a reference-design script) is never passed to `run` in typed code, so the mismatch goes unchecked until runtime.

**Fix.** Give `design` one registration helper and make it the only way to add an entry. For example, `registerCommand<I, In>(c, handle: CommandHandle<I, In>)` and `registerAction<…>`, each doing both registrations (see F2). The generic parameters force the input and `apply` to agree. The prototype (`proto3.ts`) shows the helper rejects `Mismatch` at registration. Reword the spine: "checked by the registration helper and by `run`".

### F2. Each entry needs two registrations, and the spine names only one (Medium)

**Claim (line 203).** "One `di` module per concept folder … registers each class and adds it to the `commands` … multi token". "The store … resolves an entry's instance (a singleton) only when it first runs it."

**Reality.** The store can only resolve an instance from a class registered as its own token. `container.resolve(SetGap)` throws `TokenNotRegisteredError` otherwise (`container.ts:71-73`). `di` has no API to build an unregistered class inside an injection context (`withResolutionContext` is not exported, `index.ts`). An entry added to the multi token but not registered as its own token passes the startup duplicate check and fails only on its first run. The spine's sentence "a forgotten module is silent, caught by that command's end-to-end test" covers a missing module, not half a registration. The sentence can be read either way.

**Fix.** Same helper as F1: it does `c.register(H).useClass(H)` and `c.register(commands).useValue(H)` together. State in AD-2 that modules register entries only through it. Optionally, the store checks each listed class at startup, but `di` has no `has(token)`. Adding one would be a `di` change.

### F3. `run`'s input must be the schema's input type; the spine's `Command<Input>` makes it the output type (Medium)

**Claim (line 203).** `Command<Input>` has `apply(draft, input)`. `run(handle, input)` is "checked by the compiler". `v.brand` is allowed in schemas (line 648).

**Reality.** A schema with a brand (`idSchema`, `packages/schema/src/id.ts`) has output `string & Brand<'Id'>` and input `string`. If the handle is generic only over `apply`'s input, which is the parsed output, `store.run(Rename, { id: 'thumb' })` fails to compile (prototype TS2769: `string` is not assignable to `string & Brand<"Id">`). Every editor call site would then have to brand values before the store parses them. Today's code takes `v.InferInput` (`design-store.ts:40-43`). The spine is silent on this point, so 23.3 could regress it.

**Fix.** Type the handles over both, `CommandHandle<Out, In>` with `input: v.GenericSchema<In, Out>`, and give `run` `input: NoInfer<In>`. The prototype compiles the brand case this way. Add one clause to AD-2: "`run` takes the schema's input type; `apply` receives its output."

### F4. `run` for an action has no type for an unavailable action or invalid input (Medium)

**Claim (line 203; Q4, Q7).** `run` on an action "returns its `AsyncResult`" (`AsyncResult<void, E>`). The store parses inputs and checks availability.

**Reality.** For a command these two outcomes are `Rejection` (`'unavailable'`, `'input-invalid'`, `packages/schema/src/types.ts:30-34`). The action path declares only `E`, so `run` must throw or fold a `Rejection` into `E` without a type for it. Menus and the palette, the reason Q7 exists, would then handle two shapes again.

**Fix.** Declare the action overload as `AsyncResult<void, E | Rejection>`. Or state that an action's input is parsed and its availability checked before `run` returns, and refused as `AsyncResult.err(rejection)`. Put the signature in Data Schema next to the `replaceDesign` line.

### F5. The KDL reader's message does not always carry a line and column (Medium)

**Claim (Data Schema `LoadError` `file-unreadable`; AD-8 line 296; Q12).** "message is the KDL reader's text with line and column."

**Reality (`@bgotink/kdl` 0.4.1).**
- `error.js` (`InvalidKdlError` constructor) appends `at L:C` (1-based, `parser/token.d.ts:13-24`) only when the error has a start location. At end of input it appends `at end of input`. A run on `meta {` gave `Invalid node children at end of input`.
- When several errors occur, `parser/parse.js:178-183` throws `"Encountered multiple errors"` with no location. The located messages are in `.errors` and `.flat()`. A run gave the top message alone, with the details `…at 1:5` and `…at 2:1`.
- Two of the three causes Q12 names come from no KDL reader at all: a missing or non-whole `format-version` node, and a bundle with no design file. They are `design-file`'s own checks and have no reader text.

**Fix.** Make `message` `design-file`'s text. Build it from `[...error.flat()]`, each with its `start.line`/`start.column` when present, or from the node's location for a bad `format-version` (parse with `storeLocations: true`). Or add an optional `{ line, column }` field. Reword the Data Schema comment so it doesn't promise a location for every cause.

### F6. `Committed`, the commit event's new shape and the accept event are not in Data Schema (Low–Medium)

**Claim.** Q2, Q8 and Q9 change `Committed` (adding `routing`, `fingerprints`), the `whole` commit event (now carrying `Committed`), the undo/redo commit event (adding the restored routing file) and a new accept event. `workers` and `app` consume all of them.

**Reality.** These live in prose only. Data Schema has no `Committed`, `CommitEvent` or accept-event type. The code has them in `packages/design/src/store/types.ts:5-17`, and the new shape needs edits there. AGENTS.md: "Add or change a … schema or shared kind only after the spine's Data Schema section defines it; if it doesn't, stop and ask." 23.3 stopped on an unknown once already.

**Fix.** Add `Committed`, `CommitEvent` (`patches` with optional `routing`; `whole` carrying `Committed`), `AcceptEvent` and `acceptDerivedFiles(files, seq)` to Data Schema, under a design-store heading.

### F7. `BundleFile` admits values the spine says cannot happen (Low)

`emptied: BundleFile[]` can only hold `'routing' | 'fingerprints'`, and `file-unreadable.file` can only be `'design'` (Q13, Data Schema comment). The type allows `emptied: ['design']` and `file: 'routing'`, so `app`'s notice code must handle states that don't exist.

**Fix.** Use `DerivedFile = 'routing' | 'fingerprints'` for `emptied`, and drop `file` from `file-unreadable` (or type it `'design'`). Keep `BundleFile` only where all three apply.

### F8. "Only when it first runs it" ignores availability (Low)

Line 203 says the store resolves an instance "only when it first runs it". Availability is an instance method, though, and `editor` reads "labels and availability from the store", so a menu render resolves instances before any run. This is still lazy and after construction, so it is cycle-free (verified), but the sentence is wrong.

**Fix.** Write "resolves an entry's instance on first use (availability or run), never during its own construction".

### F9. Smaller items (Low)

- **`Scope` breaks the "empty multi token resolves to `[]`" claim.** `Scope.resolve` throws `TokenNotRegisteredError` for an empty multi token (`scope.ts:31-33`), unlike `Container` (`container.ts:72`). This only matters if a store is ever resolved through a scope. Either name it, or align `Scope` in `di`.
- **Writing `static kind = 'command'` without `readonly` widens to `string`.** Registration then fails with a confusing error (prototype `Widened`). Give a one-line convention in the Naming row or a type test: `static readonly kind`.
- **Line 200, "The routing and fingerprints files are not part of it (AD-1)".** It sits next to the new `Committed` that holds them. "It" means the authored design, but the reader can take it as the store's value. Reword it as "are not part of the design".
- **The memlog's Q11 says `Result<void, LoadError | DesignInvalid>`.** Q15 superseded it with `{ emptied }`. The spine is right (`Result<…, …>`), but the memlog shows the old type unless annotated.
- **The "~13 s on Corney" re-route cost (Q13) is cited, not measured.** It comes from the spine's own deferred-items table (line 1220), and no routing code exists yet. Mark it "estimated" where it justifies Q13.
- **`replaceDesign` used as a callback.** `.flatMap(store.replaceDesign)` loses `this`. Line 296's `flatMap(…replaceDesign)` should read `flatMap((bundle) => store.replaceDesign(bundle))` in the ticket.

---

## Not checked

- Q17 (rolling autosave keyed per revision) and Q16 (the `LoadError` fields) are policy. Nothing in the code or the libraries bears on them yet: `storage` and `design-file` are empty stubs (`packages/storage/src/index.ts`, `packages/design-file/src/index.ts`).
- Whether `Writable<Design>` is assignable to `Mutable<Design>` once `routing` and `fingerprints` join `Committed` is unaffected, because commands still draft only `design`.
