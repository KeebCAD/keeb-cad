# Reality check: spine amendment for 23.22 (editor/devtools subpath, id-prefix build check)

Date: 2026-11-08. Scope: `spine-23-22.diff` against `architecture-keeb-cad-layout-model.md`. Lens: was each committed decision confirmed against the web or the project, not asserted from training data. No build was run; `app/dist` was read as it stood.

## Verdict

**Sound, with one claim stated more strongly than its evidence.** The mechanism is confirmed: the MODE gate, the dynamic import and `addModule` before `autoLoad` all match the docs or the code. The gap is the new sentence that the single id check "proves neither gate ships it". The 2026-11-08 trial searched for the module's marker, not for an id prefix, and nothing yet makes the module carry that prefix. No finding is high. M1 and M2 should be settled before 23.22's plan freezes.

## What was checked

| Claim in the diff | Status | Evidence |
|---|---|---|
| A production build drops a branch gated on `import.meta.env.MODE === 'development'` | Confirmed for this project | Trial, 0 files with the marker, on the locked Vite 8.3.5. Vite's docs promise static replacement and tree-shaking in general. A web search found no Vite 8 or Rolldown statement specific to this pattern, so the trial is the only evidence for the current bundler |
| `--mode development` emits the module | Confirmed, with a limit (L1) | Trial, 1 file. Vite's docs table: `vite build --mode development` has MODE `development` and NODE_ENV `production` |
| The module is added before `autoLoad()` | Correct against the code, unenforced (L2) | `packages/di/src/container.ts`, `bindings.ts` |
| `editor/devtools` as a subpath works with the import rules | Confirmed for resolution, no fence (M2) | Trial, depcruise and vue-tsc clean; `.dependency-cruiser.mts` |
| `mountEditor` could not register the module itself | Confirmed | `mountEditor(selector, injector: Injector)`; `Injector` has only `resolve` (`create-injector.ts`) |
| `vite-plugin-vue-devtools` does not touch builds | Confirmed | Installed 8.2.1 `dist/vite.js` line 6741 has `apply: "serve"` |
| `@vue/devtools-api` 8.2.1 is current | Confirmed today | npm dist-tags: latest 8.2.1, rc 9.0.0-rc.3. Vite latest is 8.3.6, lock is 8.3.5; a patch behind, not material |
| Literal or derived id prefix survives into a development build and is absent from production | Sound in reasoning, not tested (M1) | See below |

## Is the id-prefix claim sound?

**Absent from production: yes, if the gates fold.** A folded branch leaves no import edge, so neither the chunk nor the id constant is emitted, provided the constant is defined only in devtools files. If it sits in a file always-on code imports, the check goes red on a clean build. That failure is loud.

**Survives when shipped: yes for the normal forms.**

- A string literal stays in the output while any reference to it survives tree-shaking.
- A derived id (`` `${pluginId}.selection` ``) stays too. The minifier either keeps the constant or inlines it into a longer literal, and the prefix is a substring of both.

It stops holding in three cases:

- The module registers no entries that reference the prefix.
- An entry's id is written out without the prefix.
- The id is assembled at runtime from parts that are not one literal.

The current bundle shows that the minifier rewrites quotes (`` AE=`keeb-cad.theme` ``). The check must therefore search for the bare id, never a quoted form.

☝️ The trial does not test this claim. It shows that a marker in the module follows the gate. It does not show that the id check goes red when app's gate breaks, because neither the id nor the check exists yet: there is no devtools code under `packages/` or `app/src`, and no check in `package.json`, `tooling/` or `.github`.

## Findings

### M1 (medium): nothing ties the check to the module, so app's gate can break while the check stays green

The diff makes the module's detection depend on "every inspectable's id starts with the plugin's id", and states that as a rule with no check behind it. An entry whose id omits the prefix, or a module with no entries yet, ships with `app/dist` still clean of the id. This is the failure the memlog's decision set out to prevent ("Prevents the inspectables module shipping while the check stays green").

Suggested for 23.22's plan, not as new spine rules unless Sergii wants them:

- A unit spec that resolves the module's `inspectables` entries and asserts each id starts with the id constant.
- The check imports or reads the constant rather than repeating the string.
- A toggled bug per gate in the PR (AGENTS.md's rule for what Stryker can't reach): open each gate alone, watch the check go red, restore it. That is cheaper than a permanent second `--mode development` build, and it is the positive control the absence check otherwise lacks.

### M2 (medium): "imported only by app's main start file" has no fence, and "depcruise clean" does not show one

The tree comment in the diff states this boundary. `.dependency-cruiser.mts` has no rule for it: `ENTRY_ONLY` has no `editor/devtools` row, and the file has the fence pattern used for `only-editor-imports-di-vue`.

- Worker entries are already barred from `editor` (the rule at line 324).
- Another `app` file, such as `main-modules.ts`, could import the subpath statically. That would ship the module, and only the build check would catch it, and only if M1 holds.

The trial's clean depcruise means no existing rule fired. It says nothing about this boundary. The spine's Agents row says "Anything that can be checked is a check", and this can be checked with one fence and one violation fixture in `tooling/ad10/violations/`. The alternative is to record it as a deliberate review rule, with the reason.

### L1 (low): the development-mode trial shows emission only, not a working inspector

`vite build --mode development` keeps NODE_ENV `production` (Vite's docs), so DEV is false, PROD is true and Vue's production runtime is used. It is a good test of a MODE-keyed gate, and only that. It does not cover the dev server path developers actually use, nor that the entries reach the plugin (the same `inspectables` token through the root and the subpath). Workspace packages should resolve to one source file, so a duplicate token is unlikely, but no run confirmed it. 23.22's verification should load the dev server and see the entries.

Related: the gate must stay the literal expression in each file. Vite replaces only the full static `import.meta.env.MODE`, and a shared `isDev` helper would make folding depend on cross-module inlining, which nothing here confirmed.

### L2 (low): "before `autoLoad()`" is a convention the container does not enforce

Confirmed from the code:

- `addModule` only checks disposal and calls `module.register`, so a call after `autoLoad` succeeds silently.
- Multi tokens are read per `resolve`, so late entries would still appear. Entries default to `eager: false`.
- An `eager` entry added late would never be resolved by `autoLoad`.
- An unregistered multi token resolves to `[]`, so a gate stuck closed gives an empty inspector with no error. AD-25's "A missing provider fails at the entry's first run" does not cover multi tokens.

The spine's ordering is right and matches the existing `start-main.ts` sequence. The fix is simply to place the awaited import before the existing `autoLoad()` line. Nothing needs changing in `di`.

### L3 (low): the id's spelling is unconstrained, and the obvious ones collide

The current production bundle already contains `` `keeb-cad` `` (the Dexie database name), `` `keeb-cad.theme` ``, and several `devtools` strings from Vue (`setDevtoolsHook`, `__VUE_DEVTOOLS_HOOK_REPLAY__`). A plugin id of `keeb-cad` or `devtools` would make the check fail on a clean build. `keeb-cad.devtools` does not appear today. Vue DevTools' docs give no format or uniqueness rule for ids (`devtools.vuejs.org/plugins/api` shows only `id: 'example'`), so this is the project's choice. Worth one clause in the plan: an id that appears nowhere else in the bundle, ASCII only.

### L4 (low): wording

- The retained sentence says a production build "replaces [the MODE comparison] with `false`". Per Vite's docs, the constant is replaced and the comparison is then folded. The outcome is the same and the trial confirms it; the sentence describes a mechanism the docs don't state.
- The memlog's rejected alternative, "Launch and mountEditor take a Container", reads like a description of today's code. Both use an `Injector` today (`mountEditor`'s parameter, `Launch`'s `InjectorToken`). That is what makes the rejection hold, so the entry would be clearer as "would have to take".

## An angle not raised

📐 The check guards only the default `vite build`. A deploy built with another mode that equals `development` would ship the module with the check never having looked at it. Nothing in the repo builds that way today (no `.env` files, one `build` script), so this is a note on the claim's limit, not a change to make.

## Sources

- [Vite: Env Variables and Modes](https://vite.dev/guide/env-and-mode)
- [Vue DevTools plugin API](https://devtools.vuejs.org/plugins/api)
- npm registry dist-tags for `@vue/devtools-api` and `vite`, read 2026-11-08
- Project: `packages/di/src/container.ts`, `bindings.ts`, `create-injector.ts`, `registration-defaults.ts`; `app/src/start-main.ts`, `app/src/launch/launch.ts`; `packages/editor/src/mount-editor.ts`; `.dependency-cruiser.mts`; `app/dist/assets/*.js`; `.memlog.md`
