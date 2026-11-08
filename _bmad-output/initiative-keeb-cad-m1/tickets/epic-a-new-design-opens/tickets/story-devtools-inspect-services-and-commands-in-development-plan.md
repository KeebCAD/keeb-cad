---
title: 'Devtools inspect services and commands in development'
type: 'feature'
ticket: '22'
created: '2026-11-08'
status: done
baseline_revision: '5ba4dff5f2c42412f91a7e1524e8347ae21444b7'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick', 'test-reviewer']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A developer can't see what the editor's services hold or which commands ran, short of adding logging, and whatever is added for that must not reach a production build.

**Approach:** A dev-only Vue DevTools plugin in `editor` adds a services inspector over the `inspectables` multi token and a two-layer commands timeline (invocations from a new `Invoke` event, commits from the design store's). Two `MODE` gates keep it out of production, and a build check proves that against `app/dist`.

## Boundaries & Constraints

**Always:**
- Both gates are written inline as `import.meta.env.MODE === 'development'` around a dynamic import: in `mountEditor`, and in `app`'s start file before `autoLoad()`.
- `editor/devtools` exports the `inspectables` token, the module and the plugin's id `keeb-cad.devtools`; it does not export the plugin.
- Every inspectable's id starts with the plugin's id. Only `editor`'s UI-state services have a field with `set`; the design store's fields are read-only.
- Handlers answer only for the plugin's own inspector id: the kit's hooks are shared by every plugin (`@vue/devtools-kit/dist/index.js:660`, inspectors live in one global list).
- `Invoke` emits exactly one event per call, refusals included, and its returned results don't change.

- Decision (Sergii, 2026-11-08): the `editor/devtools` module shows the design store (read-only), the slide-out (`edit`) and the design location (read-only), not landmarks or the model worker status and not the store and slide-out alone.
- Decision (Sergii, 2026-11-08): an inspectable is `{ id, label, fields }`, a field `{ get }` or `{ get, schema, set }`, not `state()` plus `edit(key, value)`, because a separate pair can drift apart and makes every service repeat the key and value checks (spine, Editor state row, f1c1503). An unknown key or a value the field's schema refuses changes nothing.
- Decision (Sergii, 2026-11-08): a new `editor` service must be classified for the devtools, enforced by a spec comparing what `editorModule` registers (UiActions left out) to a table of service to inspectable id or "not shown" with a reason, not a line in `AGENTS.md` that nothing fails on and not a table with no "not shown", which would force empty inspectables. `Invoke`, `ShortcutRegistry` and `Landmarks` start as "not shown".

**Never:**
- No plugin export from `editor`'s root or `editor/devtools`; no `app` filler module (ticket: "this story adds none"); no dependency-cruiser fence on `editor/devtools` (ticket: "a reviewer rule").
- No `set` on the design store's fields. No `vi.mock`. No tree filtering (the ticket doesn't ask for it).

## I/O & Edge-Case Matrix

| Group | Scenario | Input / State | Expected | Level |
|---|---|---|---|---|
| production bugs | dist clean | files without the id | no matches | unit, `tooling` |
| production bugs | just below the id | a nested file holding `keeb-cad.devtool` | no matches | unit, `tooling` |
| production bugs | on the id | a nested chunk holding `keeb-cad.devtools` | that file is listed | unit, `tooling` |
| production bugs | just above the id | a file holding `keeb-cad.devtools.services` | that file is listed | unit, `tooling` |
| production bugs | dist missing | no folder | the check fails, naming the folder | unit, `tooling` |
| production bugs | dist empty | a folder with no files | the check fails, naming the folder | unit, `tooling` |
| production bugs | real build | `pnpm build`, then `pnpm check:dist` | exits 0 | build |
| production bugs | `mountEditor`'s gate removed | toggled bug, build, check | check fails | build, toggled |
| production bugs | start file's gate removed | toggled bug, build, check | check fails | build, toggled |
| rules | module's ids | every entry the module registers | every id starts with the plugin's id | unit, `editor` |
| rules | design store read-only | its entry's fields as rows; an edit payload for its node | every row `editable: false`; `store.current` unchanged | unit, `editor` |
| rules | edit reaches a UI-state service | test field over a `v.boolean()`, path `['open']`, value `true` | the service holds `true`; the inspector state is re-sent | unit, `editor` |
| rules | value the schema refuses | test field, value `'yes'` | service unchanged; the inspector state is re-sent | unit, `editor` |
| rules | edit of an unknown key | path `['other']` | nothing changes, no throw | unit, `editor` |
| rules | slide-out opened | a closed slide-out, value `true` | open | unit, `editor` |
| rules | slide-out closed | an open slide-out, value `false` | closed | unit, `editor` |
| rules | slide-out refuses | a closed slide-out, value `'yes'` | closed | unit, `editor` |
| rules | edit of an empty path | path `[]` | service unchanged | unit, `editor` |
| rules | edit of a nested path | path `['open', 'x']` | service unchanged | unit, `editor` |
| rules | edit that removes | `state.remove: true` | service unchanged | unit, `editor` |
| rules | edit for another inspector | another `inspectorId` | service unchanged | unit, `editor` |
| rules | edit of an unknown node | unknown `nodeId` | nothing changes, no throw | unit, `editor` |
| rules | every service classified | `editorModule`'s registered classes against the table of `editorModule`'s classes | equal: each is shown or "not shown" | unit, `editor` |
| rules | a table id is really registered | the table's shown ids plus the design store's against `inspectables`' ids | equal | unit, `editor` |
| rules | a new service, unclassified | `editorModule` plus one class the table lacks (toggled bug) | the spec fails, naming the class | toggled, `editor` |
| module boundaries | setup run twice | two `api` objects, one plugin | one inspector, two layers (invocations, commits), each event added once | unit, `editor` |
| module boundaries | setup with a design | a committed design | no commits-layer event | unit, `editor` |
| module boundaries | setup with no design | nothing committed | no commits-layer event | unit, `editor` |
| module boundaries | tree | the plugin's inspector | one node per inspectable, id and label | unit, `editor` |
| module boundaries | tree for another inspector | another `inspectorId` | `rootNodes` untouched | unit, `editor` |
| module boundaries | state | a node's id | its fields as rows, `editable` true only with `set` | unit, `editor` |
| module boundaries | state for another inspector | another `inspectorId` | `state` untouched | unit, `editor` |
| module boundaries | no inspectables | none registered | the tree has no nodes | unit, `editor` |
| module boundaries | no fields | an inspectable with `fields: {}` | no rows | unit, `editor` |
| module boundaries | state of an unknown node | unknown `nodeId` | `state` untouched | unit, `editor` |
| module boundaries | live state | an inspectable's ref changes | the inspector state is re-sent | unit, `editor` |
| module boundaries | after dispose | plugin disposed, then a commit | no event | unit, `editor` |
| module boundaries | command invoked | caller input, available | one event: id, label, that input, ok | unit, `editor` |
| module boundaries | builder's input | no caller input, builder registered | the event's input is the builder's | unit, `editor` |
| module boundaries | refused, each kind (`it.each`: command, action, UiAction) | check says no, no caller input | one event: `unavailable`, input `undefined`, builder not asked | unit, `editor` |
| module boundaries | command rejected | `apply` returns a rejection | one event carrying that rejection | unit, `editor` |
| module boundaries | action fails | `apply` gives its error | one event carrying that error | unit, `editor` |
| module boundaries | UiAction applies | available, valid input | one event: ok | unit, `editor` |
| module boundaries | invalid input | a UiAction, input its schema refuses | one event: `input-invalid` | unit, `editor` |
| module boundaries | action | an action that succeeds | one event, after it settles | unit, `editor` |
| glue | one invocation and its commit | real `Invoke`, store and plugin; a command that changes the design | one invocations event and one commits event | integration, `editor` |
| glue | dev server | `pnpm --filter @keeb-cad/app dev` | the inspector lists the module's entries | the look |

</frozen-after-approval>

## Code Map

- `packages/editor/src/mount-editor.ts` -- sync, returns `Router`; holds only an `Injector`. The gate goes here and stays sync (`void import(...)`).
- `app/src/start-main.ts` -- builds the container; the second gate goes before `await container.autoLoad()`.
- `packages/editor/src/invoke/invoke.ts` -- `Invoke`; three branches each call `#inputFor` after their guard, `#unavailable` builds the refusal. Keep the guard-then-builder order.
- `packages/design/src/store/design-store.ts` -- the `events` field and the `current` getter; `design/src/store/types.ts` exports `CommitEvent`, `TypedEmitter`, `Subscribable` (reuse them; `nanoevents` is `catalog:`).
- `packages/editor/src/slide-out/slide-out.ts` (`isOpen`, `open()`, `close()`), `router/design-location.ts` (`workspace`).
- `packages/di/src/container.ts:72` -- an unregistered multi token resolves `[]`; `registration-builder.ts` -- `useClass` on a multi token.
- `packages/design/package.json:6` -- the subpath `exports` shape.
- `tooling/check-steps.spec.ts:16,29` -- pins `scripts.check` and the script list; it changes with `package.json`.
- `@vue/devtools-kit/dist/index.js:2243` -- `callDevToolsPluginSetupFn` builds a new `api` per call, and `:4097` plus `:2265` run setup again per app: why setup is idempotent. `:636` -- a layer starts switched off in the Timeline tab, so the look enables it.
- Don't change: `packages/editor/vitest.config.ts`, `.dependency-cruiser.mts`.

## Tasks & Acceptance

**Execution:**
- [x] `packages/editor/package.json` -- `"./devtools": "./src/devtools.ts"`; add `@vue/devtools-api` `8.2.1` and `nanoevents` `catalog:`.
- [x] `packages/editor/src/devtools.ts` -- re-exports `devtoolsPluginId`, `inspectables`, `devtoolsModule`; nothing else.
- [x] `packages/editor/src/devtools/plugin-id.ts` -- `devtoolsPluginId = 'keeb-cad.devtools'`; imports nothing.
- [x] `packages/editor/src/devtools/tokens.ts` -- `inspectables` multi token.
- [x] `packages/editor/src/devtools/types.ts` -- `Inspectable { id; label; fields: Record<string, InspectableField> }`, `InspectableField` (`ReadOnlyField { get(): unknown }` or `EditableField { get(): unknown; schema: v.GenericSchema; set(value: unknown): void }`, `set` a method as in `design/src/entries/types.ts:8` so a narrower setter fits); `PluginHost`, the `Pick` of the setup callback's parameter that the plugin uses.
- [x] `packages/editor/src/devtools/devtools-plugin.ts` (service) -- `DevtoolsPlugin implements Disposable`; `setup(api)` returns at once on a second call; otherwise adds the inspector (`keeb-cad.devtools.services`), both layers (`….invocations`, `….commits`), the three handlers, a `watch` re-sending the state, subscribes to `Invoke.events` and `store.events`, and adds no event for the current `Committed`. An edit parses with `design`'s `parse` (`packages/design/src/index.ts`) against the field's schema, then calls `set`. `[Symbol.dispose]` stops the watch and both subscriptions.
- [x] `packages/editor/src/devtools/connect-devtools.ts` (function) -- `connectDevtools(app, injector)`: `setupDevToolsPlugin({ id, label, app }, (api) => injector.resolve(DevtoolsPlugin).setup(api))`. Only this file imports the library as a value.
- [x] `packages/editor/src/devtools/inspectable-field.ts` (function each) -- `readOnlyField(get)` and `editableField({ schema, get, set })`, typing `set`'s parameter as `v.InferOutput` of the schema.
- [x] `packages/editor/src/devtools/design-store-inspectable.ts`, `design-location-inspectable.ts`, `slide-out-inspectable.ts` (service each) -- one `Inspectable` per file over the service's public API. Ids `….design-store`, `….design-location`, `….slide-out`; labels `Design store`, `Design location`, `Slide-out`. Fields: `seq`, `revision`, `design`, `routing`, `fingerprints`; `workspace`; `isOpen`; only the slide-out's `isOpen` is an `editableField` over `v.boolean()`.
- [x] `packages/editor/src/devtools/devtools-module.ts` (function: a `Module` object's `register`, as `editorModule`) -- registers `DevtoolsPlugin` and the entries on `inspectables` with `useClass`.
- [x] `packages/editor/src/devtools/devtools-plugin.spec.ts`, `devtools-module.spec.ts` (browser) -- the `editor` rule and boundary rows; a spec-local fake `api` (function) and test inspectable (function) over a `shallowRef`.
- [x] `packages/editor/src/devtools/services-classified.spec.ts` (browser) -- a spec-local `Container` subclass overriding `register` (service) collects the class tokens `editorModule.register` passes, leaving out multi tokens and UiAction handles (`kind === 'ui-action'`); compares them to a spec-local table holding only `editorModule`'s classes; compares the table's shown ids plus the design store's to the resolved `inspectables`' ids.
- [x] `packages/editor/src/invoke/types.ts` -- `InvokeEvent { id; label; input: unknown; result: Result<void, unknown> }`, `InvokeEvents`.
- [x] `packages/editor/src/invoke/invoke.ts` -- public `events`; `#reported(handle, input, result)` (service: private method) emits once the result settles and returns that same result; every branch and `#unavailable` go through it.
- [x] `packages/editor/src/invoke/invoke.spec.ts` -- the invocation-event rows; their `arrange` takes the `Recorder` as an argument, not copying today's unconditional registration.
- [x] `packages/editor/src/mount-editor.ts` -- `if (import.meta.env.MODE === 'development') void import('./devtools/connect-devtools').then(({ connectDevtools }) => connectDevtools(app, injector))`.
- [x] `app/src/start-main.ts` -- before `autoLoad()`: `if (import.meta.env.MODE === 'development') container.addModule((await import('@keeb-cad/editor/devtools')).devtoolsModule)`.
- [x] `tooling/check-dist/files-containing.ts` (function) -- `filesContaining(dir, text)`: the paths under `dir` holding `text`; throws naming `dir` if it is missing or holds no files. Spec beside it, on real temp folders.
- [x] `tooling/check-dist/check-dist.ts` (function: a script's top level) -- imports `packages/editor/src/devtools/plugin-id.ts` by path, checks `app/dist`, lists offenders, exits 1 on any.
- [x] `package.json` -- `"check:dist": "node tooling/check-dist/check-dist.ts"`; `check` runs it straight after `pnpm build`. `tooling/check-steps.spec.ts` -- pin both.

**Acceptance Criteria:**
- Given each table row at `unit` or `integration` level, when `pnpm test` runs, then a test named for it passes, the `editor` rows in Chromium and Firefox.
- Given `pnpm build`, when `pnpm check:dist` runs, then it exits 0; given either gate removed and a rebuild, it exits 1 naming a file; each restored afterwards.
- Given each toggled bug, its tests go red and return to green once restored: setup not idempotent; an edit reaching a read-only field; a value the schema refuses reaching `set`; handlers answering any inspector id; `#reported` skipped for a refusal; an event added on setup; a class registered in `editorModule` and missing from the table; the plugin not stopping on dispose; the `watch` removed; a nested path, an empty path or a removal applied; the event's input always the caller's; the commit subscription dropped (the `one invocation and its commit` row).

## Implementation Notes

- Decision (Sergii, 2026-11-08): a commit's timeline event carries `patches` for an edit and `{ seq, revision }` for a whole commit, not the full `Committed` and not `{ seq, revision }` alone, because the inspector already shows the design live, a whole commit is the one costly row (the kit sends layer-on events to its client, `@vue/devtools-kit/dist/index.js:817`), and without patches the timeline can't say what an edit did. The look checks that patches read well.

- Decision (Sergii, 2026-11-08), accepting the implementer's picks: inspector rows under one `fields` section, not one per inspectable; no design or workspace shows as `undefined`, not an `Option`; every edit to the plugin's inspector re-sends state, not only a refused one; an error with no string `kind` has the subtitle `error`, not a stringified value; `filesContaining` searches bytes and sorts its paths, not decoded text; a call that throws emits no event, not caught to report it, because the store "throws only on a bug" (narrow exception to "exactly one event per call").
- Decision (Sergii, 2026-11-08): the plugin adds no event for the current `Committed` on setup, not a kept call, an inspector button or a forced toggle, because the kit resets a plugin's Record toggle to off at every setup and drops events while it is off (`@vue/devtools-kit/dist/index.js:636,818`). The frozen `setup with a design` row changed with his approval, and the targeted removal replaced a rebuild.
- Decision (build): the invocation specs compare `result` flattened to `'ok'` or `{ error }`, not `Result.err(...)`, the removal row uses `v.optional(v.boolean())`, not `v.boolean()`, and `RecordingContainer.recorded` starts undefined, not initialised at declaration; the implementer's run showed `Err`'s iterator throwing in Vitest's equality, the toggled bug staying green, and `Container`'s constructor calling `register` before subclass fields exist.

- Decision (build, after Sergii's look): the panel's read of a node calls `api.selectInspectorNode`, not left to the panel, because the kit stamps a pushed state with `selectedNodeId` (`@vue/devtools-kit/dist/index.js:790`), only that call sets it (`:809`, `:1285`), and the panel ignores a push naming another node; before it, the overlay run showed `selectedNodeId` empty.
- Decision (build, after Sergii's look): the live refresh waits 150 ms with `@vueuse/core`'s `watchDebounced`, not an immediate `watch`, because the kit has one 120 ms debounce shared by every inspector (`index.js:785`) and vue-router's inspector replaces our send on each navigation: the overlay run logged only `router-inspector:0` sends with the immediate `watch`, and ours with the delay.

## Plan Change Log

## Review Triage Log

- 2026-11-08, pass 1 (lenses: quick, test-reviewer; quotes checked, none dropped). Verdicts: high 0, medium 1, low 9, false 1, rejected low 3.
  - medium, intent_gap, settled by Sergii -- `devtools-plugin.ts` setup event never reaches the panel (quick): confirmed at the kit's `:636` and `:818`; removed.
  - low, patch -- `invoke.ts` `#reported`: a rejecting result adds a second unhandled rejection (quick): `AsyncResult.then` forwards the rejection to the derived promise.
  - low, patch -- `devtools-plugin.ts:13-15` ids in a class file (quick): AGENTS.md "a class file holds only its class".
  - low, patch -- `files-containing.ts:4` comment restates the code (quick).
  - low, patch -- glue test fixes commit-before-invocation order (test-reviewer 5/8).
  - low, patch -- `openWhen` hides a branch (test-reviewer 5).
  - low, patch -- `reports an action once` uses a real `setTimeout` (test-reviewer 6): AGENTS.md "Set time with Vitest's fake timers".
  - low, patch -- accepted-edit test depends on the `watch` not having flushed (test-reviewer 1).
  - low, patch -- `gives one node per inspectable` has one inspectable (test-reviewer 1).
  - low, patch -- `[true, true, true]` hard-codes the count and hides the failing id (test-reviewer 5).
  - false -- read-only test can't detect an in-place change (test-reviewer 1): the `Committed` is deep-frozen, so a change must replace it, which the comparison sees.
  - rejected -- log the invocation `data` shape (test-reviewer 8): the fix edits this build's plan.
  - rejected low -- `classifies` compares names (test-reviewer 5): two same-named classes in `editorModule` are unlikely and the fix is a restructure.
  - rejected low -- `localeCompare` in `filesContaining` (test-reviewer 6): the output only lists offenders for a person.

- 2026-11-08, pass 2, on pass 1's patches (lenses: quick, test-reviewer; quotes checked, none dropped). Verdicts: high 0, medium 1, low 2, false 0.
  - medium, patch -- `invoke.ts` `#reported`: the no-op handler pass 1 added marks the result itself handled, so a rejecting action on `void shortcut.invoke()` reports nothing, in production (quick): `AsyncResult.then` attaches to the inner promise (`packages/result/src/async-result.ts:35`). Pass 1's patch reversed: no handler, one unhandled rejection stays the signal. Its spec is removed with it, since without the handler the runner fails on that rejection by design.
  - low, patch (same cause) -- `lets a rejecting action reject` builds its rejection before arrange and only covers an awaiting caller (quick, test-reviewer 6): removed with the handler.
  - low, patch -- `gives every entry an id` passes on an empty list (test-reviewer 1): also asserts entries exist.

- 2026-11-08, pass 3, on pass 2's patches (lenses: quick, test-reviewer; quotes checked, none dropped). Verdicts: high 0, medium 0, low 1, false 0. Ends the review.
  - low, logged, not patched -- `invoke.ts` `#reported`: a caller that awaits a rejecting action still gets one unhandled rejection from the derived promise (quick). Real, but it needs an action that rejects, which is a bug, and the only non-spec caller is `void shortcut.invoke()` (`shortcut-registry.ts:59`), where that rejection is the signal. Returning one chained `AsyncResult` from `tap`/`tapErr` would remove it.

- 2026-11-08, pass 4, on the fix after Sergii's look (lenses: quick, test-reviewer; quotes checked, none dropped). Verdicts: high 0, medium 0, low 5, false 0. Ends the review; lows logged, not patched.
  - low -- `[Symbol.dispose]` leaves a pending debounced send (quick): `watchDebounced`'s stop doesn't clear its timer; the only effect is one `sendInspectorState` after dispose, and the app never disposes its container while running.
  - low -- the delay test takes its numbers from `stateRefreshDelayMs`, so 100 ms stays green though the kit's window is 120 ms (quick, test-reviewer 5).
  - low -- that threshold has no just-above row (quick).
  - low -- 150 ms narrows but doesn't close the shared-debounce race: another inspector's send inside the following 120 ms still replaces ours (quick); no trigger in this app was established, and the panel catches up on the next change.
  - low -- `tells the host which node the panel reads, so its later pushes name that node` claims more than its `expect` (test-reviewer 1).

## Design Notes

- **Decision (plan): `DevtoolsPlugin` is a `di` service the module registers, not a closure flag in `connect-devtools.ts`,** because AGENTS.md says "Hold state in `di` services" and it holds the once-flag and two subscriptions.
- **Decision (plan): a repeated setup keeps the first `api`, not one setup per `api`,** because the spine says "Its setup is idempotent (the DevTools kit runs a plugin's setup on the active app and again when it replays registered plugins)", and a second would add a second inspector: `addInspector` pushes with no id check (`@vue/devtools-kit/dist/index.js:660`).
- **Decision (plan): the verify's "one timeline layer" is read as each layer once (two in all), not one layer,** because the ticket's description says "A commands timeline with two layers" and the spine "The timeline has two layers".
- **Decision (plan): the plugin re-sends state from a Vue `watch`, not after each timeline event,** because the spine says "state is live" and a back-button navigation changes `DesignLocation` without passing through `Invoke`.
- **Decision (plan): the event's `input` is what the entry ran with, the caller's when refused first, not always the caller's,** because the spine's invoke path "takes the caller's input, else the handle's input builder's, else `{}`", and the plan's refusal row keeps the builder unasked.
- **Decision (plan): the event fires when the result settles, not at the call,** because the ticket's event carries the "result".
- **Decision (plan): `editor` declares `nanoevents`, not a hand-written listener set,** because AGENTS.md makes a Stack dependency the thing a hand-built version must reject, and `design` already emits through it.
- **Decision (plan): the build check is a script after `pnpm build`, not a `tooling` spec,** because `pnpm check` runs `pnpm test` before `pnpm build` (`tooling/check-steps.spec.ts:17`), so a spec would read a stale or absent `app/dist`.
- **Decision (plan): the check imports `plugin-id.ts` by path, not `@keeb-cad/editor/devtools`,** because Node can't load the workspace's sources: `node -e "import('packages/editor/src/router/create-editor-router.ts')"` gives `ERR_MODULE_NOT_FOUND … packages/schema/src/id`. The file imports nothing, so it loads.
- **Decision (plan): the plugin's specs run in the browser project, not on Node,** because `SlideOut.open` reads `document.activeElement`, and a Node project would need the root Vitest config's includes edited.

- **Decision (plan): timeline events are titled by the handle's label with `ok` or the rejection's kind as subtitle, and commits `seq N` with `patches` or `whole`, not the raw payload as title, because the ticket names the data and leaves the title open and a title has to fit one row;** `TimelineEvent.title` is a short string in the kit's types (`@vue/devtools-kit/dist/index.d.ts:847`). The inspector is labelled `Services`, the layers `Invocations` and `Commits`, after the ticket's words.
- **Decision (plan): `filesContaining` and the `check-dist.ts` script are plain functions, not `di` services,** because `tooling/` runs no container and its file readers are plain functions (`tooling/hooks/read-text-if-exists.ts`); AD-25's containers are per thread entry.
- **Decision (plan): `connectDevtools` is a function, not a service,** because it holds nothing: the plugin's state is on `DevtoolsPlugin`, and it is the one call into the library.
- **Decision (plan): the glue row stays in `editor`, not `app`,** because the spine says the plugin is "not the plugin, which `mountEditor` reaches inside `editor` and `app` never uses", so `app` can't construct it.
- **Decision (plan): `editor/devtools` keeps the field helpers and types internal, not exported,** because the spine lists three exports, and only `editor`'s UI-state services edit, so a future `app` module writes `{ get }` against the token's type.
- **Decision (plan): a nested path, an empty path and a removal change nothing, not applied to the first key,** because the spine's field is one value with one `set` ("A field is `{ get }`, or `{ get, schema, set }`").
- **Decision (plan): a missing or empty `app/dist` fails the check, not passes,** because the ticket's check runs "after the build", and a folder with nothing in it proves only that no build ran.

## Conformance Log

First pass: two conformance readers and one gap reviewer (Sonnet, context-free). Dropped 0.

- `Both gates are written inline` (sketches lacked the condition) -- fixed
- `which exports the `inspectables` token` (extra exports) -- fixed
- `test wiring between packages as integration in `pipeline` or `app`` -- fixed (decision)
- `Name a thing for what it does` (`DevtoolsApi`) -- fixed (`PluginHost`)
- `Pure logic is plain functions` (`filesContaining`, `connectDevtools`, untagged script and module) -- fixed
- `A choice no requirement made is a decision` (nested path, removal, empty dist) -- fixed
- `add empty input and an input that breaks an assumption` -- fixed
- `Make a test's name and its `expect`s claim the same thing` (slide-out row) -- fixed
- `Assert what a function returns or a visible effect` (spy on `register`) -- fixed
- `When a decision departs from a Stack dependency's documented setup` -- fixed (the spine requires it)
- gap: state handler, another inspector -- fixed
- gap: `Invoke` branches and outcomes -- fixed
- gap: empty path, no inspectables -- fixed
- gap: `DesignStore` in the `editorModule` table -- fixed

- Final pass (read by no reviewer): script's decision -- fixed; `Module` tag -- fixed; toggled bugs for the remaining browser rows -- fixed; precedent `invoke.spec.ts` `Arrange only what the test uses` -- deferred; ids, labels and shown fields -- fixed; line citations -- fixed

## Verification

**Commands:**
- `pnpm test` -- expected: all pass.
- `pnpm check` -- expected: exit 0, `check:dist` included.

**Manual checks (if no CLI):**
- `pnpm --filter @keeb-cad/app dev`, open the Vue DevTools overlay (Alt+Shift+D): a services inspector lists the module's entries; toggling the slide-out's `isOpen` opens the Tree slide-out; the design store's rows can't be edited. On the services inspector's page, press Record: `1`-`5` keys add invocation events; expand a commit event to check the patches read well.
