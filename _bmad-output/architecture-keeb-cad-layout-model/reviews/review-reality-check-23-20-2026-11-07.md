# Reality check: spine pass for 23.20 (devtools, composables lint), 2026-11-07

Scope: the uncommitted diff of `architecture-keeb-cad-layout-model.md` — the Editor state row (composables and lint sentences, devtools sentences), the two new Stack rows (`vite-plugin-vue-devtools`, `@vue/devtools-api`) and the new Verified entry. Lens: is each committed decision checked against reality (npm, installed sources, docs, a run), or asserted?

Verdict: **mostly confirmed; one stated cause is wrong, one doc citation over-claims, one lint gap.** No version is out of date.

## Checked and confirmed

| Claim | Evidence |
| --- | --- |
| `@vue/devtools-api` 8.2.1 is current | `npm view @vue/devtools-api dist-tags`: `latest` 8.2.1 (published 2026-07-25), `rc` 9.0.0-rc.3 (2026-11-06), `beta` 9.0.0-beta.1. Installed: `node_modules/.pnpm/@vue+devtools-api@8.2.1`. |
| `vite-plugin-vue-devtools` 8.2.1 is current | `npm view`: `latest` 8.2.1 (2026-07-25), `rc` 9.0.0-rc.3 (2026-11-06). `app/package.json` has `^8.2.1`. |
| "9.x is a release candidate" | True as of 2026-11-06 (rc.3). Note also a `stable` dist-tag pointing at 7.7.9 on both packages; `latest` is still 8.2.1, so the pin is right, but the tag is worth knowing if anyone reads "stable". |
| `setupDevToolsPlugin` exists | `@vue/devtools-api` 8.2.1 `dist/index.d.ts` re-exports `setupDevToolsPlugin` (and alias `setupDevtoolsPlugin`) from `@vue/devtools-kit`; kit `index.d.ts:895` `setupDevToolsPlugin(pluginDescriptor: PluginDescriptor, setupFn: PluginSetupFunction): void`. `PluginDescriptor` requires `id`, `label`, `app`. |
| `addInspector`, `addTimelineLayer` | `DevToolsV6PluginAPI` (kit `index.d.ts:655`, `:661`): `addInspector(options)`, `addTimelineLayer(options)`, plus `addTimelineEvent`, `sendInspectorTree`, `sendInspectorState`. |
| `getInspectorState`, `editInspectorState` | Exist, but as hooks: `api.on.getInspectorState(handler)`, `api.on.editInspectorState(handler)` (kit `index.d.ts:647-649`), not as methods beside `addInspector`. The spine's wording "addInspector with getInspectorState and editInspectorState" is accurate enough; see finding 4 for the missing `getInspectorTree`. |
| These APIs survive v9 | devtools.vuejs.org/plugins/api: "Vue DevTools v9 continues to provide the v6-style plugin setup API for its supported custom inspectors, component hooks, timeline layers and plugin settings." Only `addCustomTab`, `addCustomCommand`, `removeCustomCommand` are removed in v9. The design uses none of them. |
| `vite-plugin-vue-devtools` is dev-server only | Installed `dist/vite.js:6739-6741`: `name: "vite-plugin-vue-devtools", enforce: "pre", apply: "serve"`. Already wired in `app/vite.config.ts` (`vueDevTools()`). |
| `import.meta.env.DEV` → `false` in a build, guarded dynamic import emits no chunk | Vite documents static replacement of `import.meta.env.*` in builds. Reality-checked with the repo's Vite 8.3.5: a scratch app with `if (import.meta.env.DEV) { await import('./devtools.js') }` built to a single `index-*.js`; `grep` for the module's marker string and "devtools" in `dist/` found nothing. |
| typescript-eslint `no-restricted-imports` has `allowTypeImports` | Installed `@typescript-eslint/eslint-plugin` 8.72.0 `dist/rules/no-restricted-imports.js:23-24,170,182,202-205`: option on both `paths` and `patterns`; it allows `import type …` and imports whose every specifier is `type` (inline `import { type X }` included). |
| It can apply to `.vue` files here | `eslint.config.ts` already lints `**/*.{vue,ts,mts,tsx}` through `@vue/eslint-config-typescript` (`vueTsConfigs.recommended`, typescript-eslint parser inside `vue-eslint-parser`), so `importKind` is on the AST for `<script setup lang="ts">`. Existing `.vue`-scoped blocks (`keeb-cad/no-arbitrary-values`, etc.) show the pattern. The core `no-restricted-imports` is on only in `keeb-cad/type-specs` (`**/*.types.spec.ts`), so the typescript-eslint rule on `.vue` files does not collide with it. |
| Build check "no trace of the plugin's id in `app/dist`" | Sound as a check: the scratch build shows the guarded module's strings vanish. The 2026-10-30 spike also grepped `vite build` output and source maps (`ui-layer-decisions-2026-10-30.md`, DevTools section). |

## Findings

### 1. The stated cause of the double setup is not what 8.2.1 does (medium)

Spine: "Its setup is idempotent (DevTools' early proxy runs it twice)". In 8.2.1 nothing at runtime reads `enableEarlyProxy`: it appears only in kit's `index.d.ts`/`index.d.cts`; `grep -c enableEarlyProxy` on kit's `dist/index.js` is 0, and `@vue/devtools-api` 8.2.1 is a thin re-export of the kit (the v6-era early proxy lived in the old standalone api package). What does run the setup twice is the kit itself: its `setupDevtoolsPlugin` hook buffers the plugin and calls the setup on the active app at once (`index.js:4087-4093`), and `registerDevToolsPlugin(app)` later replays the whole buffer for that app (`index.js:2262-2267`); the legacy path re-emits the buffer too (`index.js:4094+`). The spike observed the double call but attributed it to `enableEarlyProxy`. The idempotence requirement is right; the reason is wrong. Fix: "(DevTools 8 calls a plugin's setup again when it registers the app)", or drop the parenthesis. Re-verify on 9.x before upgrading.

### 2. The Verified line cites a doc that doesn't cover most of what it verifies (low-medium)

Verified 2026-11-07 names "devtools.vuejs.org's plugin API". That page documents `setupDevToolsPlugin` and shows `addInspector`, but does not document `on.getInspectorTree`, `on.getInspectorState`, `on.editInspectorState`, `addTimelineLayer`, `addTimelineEvent` or `enableEarlyProxy`. Those are confirmed only by the 8.2.1 type declarations (kit `index.d.ts:636-662`) and the 2026-10-30 spike. Fix: cite "`@vue/devtools-kit` 8.2.1 type declarations" alongside the docs page.

### 3. The lint no longer covers what made hot reload safe (medium; reality of the claim)

Old text: components "never import the container or service modules as values". New text bans only `di` and `di/vue` as values, then says a component "may import handles from `commands`, `ui` and `schema`". The rule as specified does not stop a value import of a service module, e.g. today's `packages/editor/src/views/DesignCanvas.vue` imports `DesignStore` from `@keeb-cad/design` as a value (and `useService` from `@keeb-cad/di/vue`). After the refactor the second import is caught; a leftover value import of `@keeb-cad/design` would not be, and the spike's stale/duplicate-instance hazard is about component modules importing service-owning modules. "With that rule, a hot reload of a component keeps state" therefore rests on a ban the lint as written doesn't enforce. Either the "may import" sentence is the allow-list (then say the lint is an allow-list via `patterns` with `allowTypeImports`), or `design` and other service-owning packages join the restricted list. This is a design question for Sergii, not a wording fix.

### 4. A services inspector needs `getInspectorTree` too (low)

With `addInspector`, the panel shows nothing to select until `api.on.getInspectorTree` fills `payload.rootNodes`; `getInspectorState` only answers for a selected node. The spike's working inspector must have used it. Naming the trio (`getInspectorTree`, `getInspectorState`, `editInspectorState`) keeps the planner from discovering it in code.

### 5. Smaller reality notes (low)

- `editor` does not declare `@vue/devtools-api` today (`packages/editor/package.json`); it is only present transitively (vue-router, pinia peers). Under `hoist: false` the 23.20 build must add it to `editor` — consistent with the Stack row, just not done yet.
- `import.meta.env.DEV` is `true` in Vitest, so `mountEditor`'s browser-mode tests will load the devtools module. `setupDevToolsPlugin` with no DevTools hook only buffers, so it should be harmless; worth a note in the plan rather than a surprise.
- "shown in the overlay `vite-plugin-vue-devtools` serves": confirmed only by the 2026-10-30 spike (no doc says custom v6-style inspectors appear in the v8 overlay; the commands timeline "sits under that inspector's tab and needs recording turned on" per the spike). Fine as evidence, but it is spike evidence, not docs.

## Not checked

- The 2026-10-30 spike code itself (not in the repo's `spikes/`); its observations are taken from `ui-layer-decisions-2026-10-30.md`.
- Behaviour of the 9.0 RC.
