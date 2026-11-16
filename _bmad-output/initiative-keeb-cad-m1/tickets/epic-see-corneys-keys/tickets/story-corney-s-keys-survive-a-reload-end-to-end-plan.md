---
title: "Corney's keys survive a reload end to end"
type: 'feature'
ticket: 34
created: '2026-11-16'
status: 'ready-for-dev'
baseline_revision: ''
route: 'full'
route_source: 'auto'
risk: 'medium'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The slice has no end-to-end journey: nothing proves, in the production build with its model worker and browser storage, that Corney's design reopens from storage with both halves drawn, that S and Delete change it through the real app, and that a reload shows what autosave kept. `pnpm smoke` runs one Chromium check that a design opens.

**Approach:** One Playwright journey, run in Chromium and a new Firefox project: a fixture builds Corney's bundle texts on Node with the real design store, commands and layout-command script, loaded through Vite's module runner; the journey writes them into the browser storage the app's first launch created, relaunches so 23.7's launch path reopens them, adds a key with S, deletes it with Delete, reloads, and asserts the canvas by role and label throughout.

## Boundaries & Constraints

**Always:**
- The journey runs against `vite preview` of the production build (today's `webServer`), in both projects, with no test entry point in `app/src` and nothing added to the production bundle (epic Decision 2026-10-30, planning).
- The seed is Corney's real design: `NewDesign` then every `corneyIslandLayout` step through `DesignStore.runById`, written with `storage`'s `writeBundle`, as `app/src/dev-seed/corney-seed.ts:16-26` and `app/src/autosave/autosave.ts:24-30` do. No hand-written design text (spine Reference designs: "There is no importer and no hand-written Corney design file").
- Every canvas check finds keys as `button`s named by placement id (`UiCanvasToggle` sets `role="button"` and `aria-label`) inside `main` named `Canvas`. No screenshot, no `data-testid`.
- The S flow is driven as a user does: focus the Canvas landmark, press `s`, fill the dialog's `Id` textbox, click `Add`; Delete is the `Delete` key (`delete-selection.ts:26`) with focus on the canvas.
- Decision (plan): Corney's bundle texts are built through Vite's `createServerModuleRunner` (Vite 8.3.5), not a plain import in the Playwright process, because the plain import fails: `TypeError: (intermediate value).glob is not a function at packages/library/src/library-data/declarations.ts:5` (probe run on 2026-11-16); and not a Vitest test writing a file, because the ticket rejects it ("not by a separate Vitest test, whose order pnpm smoke can't rely on"). The probe built them through the runner in 1.3 s.
- Decision (plan): the journey waits for autosave before the seed write and before each reload by reading the stored newest version's design text, not by going on at once, because autosave does not hold the commit: `app/src/autosave/autosave.ts:30` fires `void this.#storage.save(...)`, and the first launch's `NewDesign` commits through `replaceDesign` (`packages/design/src/store/design-store.ts:127`), so its save can land after the seed and make the blank design newest (`order.ts:9-11`); and not on a visible save state, because the top bar's save state waits for epic-keep-my-work (epic Decision 2026-10-30, planning).
- Decision (plan): the added key's id is typed (`added-key`), not left to be generated, because the journey must name it by placement id before and after the reload, and a generated id (`AddFlowView.vue:44`, "generated if empty") is known only after the run.
- Decision (plan): rows 1–4 are one test, not four, because each row's state is the one before it left, and the spine asks for "one small journey per slice" (Verification, layer 6). Its name claims all four: `reopens Corney's design, adds and deletes a key, and keeps the deletion after a reload`.
- Decision (plan): the e2e helpers are plain functions and a Playwright fixture, not `di` services in a container of the e2e folder's own, because `storeVersion` and `newestStoredDesignText` run through `page.evaluate`, which sends a function's source text to the page and so cannot close over a service (`playwright-core/types/types.d.ts:132`: "@param pageFunction Function to be evaluated in the page context."); `drawnKeys` holds no state and reads only the `page` it is handed; the Vite server's lifecycle is owned by the `corney` fixture, Playwright's documented setup-and-teardown unit (`test.extend`); and `bundleCorney`'s `Container` is the app's own design store wiring, built and dropped inside the call, as `corney-seed.spec.ts` builds one per test.
- Decision (Sergii, 2026-11-16): the journey seeds storage by writing one autosave's rows (`browser-backend.ts:18-31`: the counter, the version row, the design row, in one transaction) into the `keeb-cad` database the app's first launch created, then relaunches, not by creating the database before any launch, because the test then knows only row shapes and the app's own Dexie keeps the schema; and not through Playwright's `storageState`, whose typed option carries only cookies and localStorage (`playwright-core/types/types.d.ts:11729-11777`). Not through `BrowserBackend` and Dexie, because neither is reachable in the page without the test entry point the epic rules out.
- Decision (Sergii, 2026-11-16): `app`'s tests include its `app/e2e/` folder, so the non-spec builder `app/e2e/corney-bundle/bundle-corney.ts` may import `reference-designs/scripts`; the spine's Reference designs and `app` rows say so (docs edit on main), and `pnpm depcruise` keeps cruising only `app/src`, not also `app/e2e` with the fence's `pathNot` widened, because the builder must be a separate file Vite's runner loads by path and nothing else in `app/e2e` needs a fence.
- Decision (Sergii, 2026-11-16): the journey drives S and Delete only, as the ticket says, not also G and Ctrl+D for epic R6's wording, because the spine wants "one small journey per slice"; the e2e tests owed to G, Ctrl+D, SetAnchor, SetOverride, DeletePart and RestartModelWorker (spine layer 6, "at least one test per command and action") are logged in deferred-work.md for Sofia to slice.

**Never:**
- A screenshot baseline (Sergii 2026-11-16, parked in deferred-work.md); per-command e2e tests beyond S and Delete; changes to `app/src`, `packages/` or `reference-designs/`; a new npm dependency.

## Boundary table

`CORNEY_KEYS`, from `reference-designs/src/scripts/corney-island-layout.ts`: for each side `left`, `right`: `matrix-<column>-<row>` for column `outer`, `pinky`, `ring`, `middle`, `index`, `inner` and row `bottom`, `home`, `top`, then `thumbfan-near-home`, `thumbfan-mid-home`, `thumbfan-far-home`: 42 names, `<side>/<id>`, written out in the constant. "Drawn keys" = the sorted names of the Canvas's `button`s. Every row runs in Chromium and in Firefox.

| # | Group | Input / state | Expected | Level |
|---|---|---|---|---|
| 1 | production bugs | first launch's design stored; Corney's texts written; `/` loaded afresh | URL `#/design/<Corney's id>/layout`; drawn keys = `CORNEY_KEYS`, exactly | e2e |
| 2 | production bugs | row 1, Canvas focused, nothing selected, `s`, Id `added-key`, `Add` | no dialog open; drawn keys = `CORNEY_KEYS` + `left/added-key`, `right/added-key`; `left/added-key` pressed | e2e |
| 3 | production bugs | row 2, stored newest version holds `added-key`, then `Delete` with the canvas focused | drawn keys = `CORNEY_KEYS`, exactly | e2e |
| 4 | production bugs | row 3, stored newest version no longer holds `added-key`, page reloaded | URL `#/design/<Corney's id>/layout`; drawn keys = `CORNEY_KEYS`, exactly | e2e |
| 5 | module boundaries | `pnpm smoke` | the journey and `vue.spec.ts` each pass in `chromium` and `firefox` (4 passed) | e2e |

</frozen-after-approval>

## Code Map

- `app/playwright.config.ts:35-41` -- one `chromium` project; add `firefox` (`devices['Desktop Firefox']`). Every comment in the file goes, the header block included (its "headless Chromium" is wrong once Firefox runs): each restates its line or is a file-header essay (AGENTS.md's comment rule); only a why the code can't say may be written back. `webServer` stays.
- `app/e2e/vue.spec.ts` -- the existing smoke check; untouched, now also runs in Firefox.
- `app/e2e/tsconfig.json` -- extends `@tsconfig/node26` with `nodenext`, so importing workspace sources fails (`vue-tsc -p app/e2e/tsconfig.json`: `TS2835 Relative import paths need explicit file extensions`, `packages/commands/src/index.ts:1`), and it has no DOM lib for `page.evaluate` bodies (`TS2304 Cannot find name 'IDBDatabase'`). Probe: `extends: ["@tsconfig/node26/tsconfig.json", "../../tsconfig.base.json"]` with `module: preserve`, `moduleResolution: bundler`, `lib: ["es2025", "DOM", "DOM.Iterable"]`, `types: ["node", "vite/client"]` type-checks clean (exit 0). `app/tsconfig.json:11` references it, so `pnpm typecheck` covers it.
- `app/src/dev-seed/corney-seed.ts:16-26` -- the pattern for building Corney: `run(NewDesign, {})`, then `runById` per step, throwing on a rejection. Copy the steps, not the class.
- `app/src/autosave/autosave.ts:24-30` -- how a commit becomes a save: `label = { id, name, revision }`, `writeBundle(current)`, reason `'autosave'`.
- `packages/storage/src/browser/storage-database.ts:9-20` -- Dexie database `keeb-cad` (`browser-storage-access.ts:5`), stores `versions` (key `version`, index `designId`), `designs` (key `id`), `meta` (key `key`).
- `packages/storage/src/browser/browser-backend.ts:18-31` -- one write: in one `rw` transaction, `counter = meta.counter + 1`, put `meta`, add the version row `{ designId, name, revision, reason, savedAt, texts, version: counter }`, put `designs` `{ id, name, revision, lastVersion: counter, savedAt }`. Row types `backend/types.ts:9-16, 37-43`, `browser/types.ts:3-8` are not exported, so the e2e folder declares its own; `DesignLabel` and `BundleTexts` are exported (`storage/src/index.ts`).
- `packages/storage/src/order/order.ts:9-11` -- `listDesigns` orders by `lastVersion`; `app/src/launch/launch.ts:41-46` opens the newest on a launch with no id in the URL.
- `packages/editor/src/add-flow/AddFlowView.vue:40-58` -- dialog `Add slot in <parent>`, textbox `Id`, button `Add`; `start-add-slot.ts:43-50` -- S is available only with the canvas or tree focused, parent is the root with nothing selected; `add-slot-flow.ts:20-25` selects the new key on its side.
- `packages/editor/src/shell/CanvasLandmark.vue:12-16` -- `main`, `aria-label="Canvas"`, `tabindex="-1"`.
- `app/README.md:22` and `.github/workflows/check.yml:18-22` -- say the smoke test runs Chromium; both become both browsers. The CI image already carries Firefox.
- Not changed: `.dependency-cruiser.mts` (`pnpm depcruise` cruises `app/src`, not `app/e2e`, `package.json:16`), `eslint.config.ts:216-224` (playwright rules already cover `app/e2e/**/*.spec.ts`).

## Tasks & Acceptance

**Execution:**
- [ ] `app/e2e/tsconfig.json` -- the bundler setup in the Code Map -- the builder imports workspace sources and `page.evaluate` bodies use IndexedDB.
- [ ] `app/e2e/corney-bundle/types.ts` -- `CorneyBundle` = `{ label: DesignLabel; texts: BundleTexts }`.
- [ ] `app/e2e/corney-bundle/bundle-corney.ts` -- `bundleCorney(): Promise<CorneyBundle>` (function, see the helpers Decision): a `Container` with `designModule`, `designActionsModule`, `partsCommandsModule`, `layoutCommandsModule`, `overridesCommandsModule`, `autoLoad`, `NewDesign`, the script steps, then `label` and `writeBundle(current)`; throws `InvariantError` on a rejection as `corney-seed.ts` does.
- [ ] `app/e2e/corney-bundle/build-corney-bundle.ts` -- `buildCorneyBundle(cacheDir: string): Promise<CorneyBundle>` (function, see the helpers Decision): runs `bundleCorney` in Vite's module runner as in Design Notes, closes runner and server in `finally`.
- [ ] `app/e2e/corney-bundle/corney-keys.ts` -- `CORNEY_KEYS`, the 42 names written out, sorted.
- [ ] `app/e2e/stored-versions/stored-versions.ts` and `types.ts` -- for `page.evaluate` (functions): `storeVersion(bundle)` writes one `BrowserBackend.write`'s three rows in one transaction into `keeb-cad` opened with no version; `newestStoredDesignText(id)` returns the `texts.design` of the highest `version` row with that `designId`, or `undefined`. Row types in `types.ts`.
- [ ] `app/e2e/canvas/drawn-keys.ts` -- `drawnKeys(page)` (function): the Canvas's `button`s' `aria-label`s, sorted.
- [ ] `app/e2e/corney-bundle/corney-test.ts` -- `test` = `base.extend<{ corney: CorneyBundle }>` whose `corney` fixture calls `buildCorneyBundle` with `node_modules/.vite-e2e/<testInfo.project.name>` (test-scoped).
- [ ] `app/e2e/corneys-keys.spec.ts` -- the journey: rows 1–4 in one test, outline in Design Notes.
- [ ] `app/playwright.config.ts`, `app/README.md`, `.github/workflows/check.yml` -- the Firefox project and the wording in the Code Map.

**Acceptance Criteria:**
- Given a fresh build, when `pnpm smoke` runs, then 4 tests pass (2 specs × chromium, firefox) and no file under `app/src`, `packages/` or `reference-designs/` changed.
- Given each toggled bug below, when `pnpm smoke` runs, then the journey goes red at the named row; restored, it passes; the PR says so: row 1, `launch.ts:45` replaced by `return this.#newDesign()`; row 2, `start-add-slot.ts` `hotkeys` emptied; row 3, `delete-selection.ts:26` `hotkeys` emptied; row 4, `autosave.ts:25`'s `#save` returns at once.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Design Notes

Decisions on the Vite runner, each tried in the probe:
- Decision (plan): `configFile: false`, not `app/vite.config.ts`, which `createServer` resolves from `root` by default (`vite/dist/node/index.d.ts:3777`, `InlineConfig.configFile?: string | false`), because the builder's graph holds no `.vue` or CSS file and the probe built Corney without the app's vue, tailwind and devtools plugins.
- Decision (plan): `cacheDir` `node_modules/.vite-e2e/<project name>`, not the default `node_modules/.vite`, because the probe's run re-optimised the dev server's cache ("Re-optimizing dependencies because vite config has changed"); and one per project, not one shared, because locally the chromium and firefox runs start their servers in parallel (`workers` unset off CI, `playwright.config.ts:24`).
- Decision (plan): `server: { middlewareMode: true, hmr: false }, appType: 'custom'`, not a listening server (`middlewareMode` defaults to `false`, `vite/dist/node/index.d.ts:2393-2396`), because nothing is served; the runner imports in process.
- Decision (plan): the fixture is test-scoped (Playwright's default), not worker-scoped, because one test uses it.
- Decision (plan): the canvas gets focus by `locator.focus()`, not a click, because a click lands on whatever is drawn under the landmark's centre and can select a key; the editor's own specs focus it the same way (`add-flow.spec.ts:61`).

The journey, in outline:

```ts
await page.goto('/')
const first = /* id from the URL */
await expect.poll(() => page.evaluate(newestStoredDesignText, first)).toBeDefined()
await page.evaluate(storeVersion, corney)
await page.goto('about:blank'); await page.goto('/')
await expect(page).toHaveURL(`/#/design/${corney.label.id}/layout`)
await expect.poll(() => drawnKeys(page)).toEqual(CORNEY_KEYS)
```

## Conformance Log

Passes 1 (two readers) and gap review: 0 findings dropped for a missing quote.
- `When a decision builds by hand the main job of a dependency in the spine's Stack table, that dependency is its Y.` (raw IndexedDB rows vs Dexie) -- fixed
- AD-25 `**Lookups and state** … **are services**` (helpers tagged `(function)`, two untagged) -- fixed
- `A choice no requirement made is a decision and is labelled as one.` (configFile, cacheDir, hmr, fixture scope, focus) -- fixed
- `Make a test's name and its \`expect\`s claim the same thing.` (four rows in one test) -- fixed
- `Prove a test Stryker can't reach … with a toggled bug` (only row 3 toggled) -- fixed
- `Give each file one kind of thing` (helpers and constant in the spec) -- fixed
- `Take expected values from the requirement` (key names not spelled from the script) -- fixed
- `Name a thing for what it does, checked against the spine's glossary` (`CorneyBundle`, `load…`) -- fixed
- `Write a comment only for a why the code can't say` (precedent `app/playwright.config.ts`) -- fixed (the plan removes them)
- the autosave Decision applied to the reloads only, not the seed write (race on the first launch's save) -- fixed
- gap: commands and actions with no e2e test (`packages/commands/src/layout/add-group.ts` and five others) -- asked (Sergii: deferred-work.md)
- gap: `build-corney-bundle.ts` importing `reference-designs` against `reference-designs-only-in-tests` -- asked (Sergii: app/e2e counts as tests, spine b21ee05)
- gap: `app/README.md:22` says the smoke test runs Chromium -- fixed
- gap: first launch's save may land after the seed (`design-store.ts:127`) -- fixed
- gap: toggled bugs for rows 1, 2, 4 -- fixed

Final pass (no reviewer has read these fixes):
- `Name a thing for what it does … never after the library it wraps` (`buildCorneySaveOnVite`) -- fixed: `buildCorneyBundle`, inner `bundleCorney`
- `Glossary terms only.` (`CorneySave`, `newestDesignText`) -- fixed: `CorneyBundle`, `newestStoredDesignText`
- AD-25 split: the helpers Decision covered only the `page.evaluate` functions -- fixed: reason now covers each helper
- `Write a comment only for a why …` ("and the like" left open) -- fixed: every comment in the file goes
- Vite departures cited the probe only -- fixed: `vite/dist/node/index.d.ts:3777`, `:2393-2396`
- 📐 parallel projects sharing one `cacheDir` -- fixed: one per project

## Verification

**Commands:**
- `pnpm build && pnpm smoke` -- expected: 4 passed.
- `pnpm typecheck && pnpm lint && pnpm depcruise` -- expected: clean.
- `pnpm test` -- expected: whole suite green (AGENTS.md: the stop hook watches `app/`).

**Manual checks:**
- Nothing visible in the app changes; the look is `pnpm smoke`'s output, and optionally `pnpm --filter @keeb-cad/app exec playwright test --headed --project=firefox` to watch the journey.
