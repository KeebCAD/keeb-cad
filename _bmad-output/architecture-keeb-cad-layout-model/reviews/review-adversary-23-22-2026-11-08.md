# Adversary review: spine amendment for 23.22 (`editor/devtools`)

Date: 2026-11-08. Input: the uncommitted spine diff (glossary `inspectable`, AD-25 Modules per thread, Editor state row, Structural Seed), `app/src/start-main.ts`, `packages/editor/src/mount-editor.ts`, `.dependency-cruiser.mts`, `packages/di/src/container.ts`, the 23.22 entry in `tickets.toml`.

**Verdict: sound in shape, not yet closed.** The subpath-plus-two-gates design works and no pair breaks production silently. Five pairs can still be built to the letter and disagree: three worth a sentence before planning, two small. All five close with wording and one dependency-cruiser rule; none reopens the design.

## Findings

### 1. Medium: "imported only by app's main start file" is a comment, and nothing checks it

**Where.** Only the Structural Seed says "only"; AD-25's Modules sentence says the start file adds it, and AD-25's Entry fences list omits it. `.dependency-cruiser.mts` has `editor` in `app`'s row and no `ENTRY_ONLY.app.editor`, so every file under `app/src` may import `@keeb-cad/editor/devtools`. Inside `editor`, a file may import the entry relatively.

**The pair.**
- Unit A follows AD-25: `start-main.ts` does the gated dynamic import.
- Unit B lists the module in `main-modules.ts` next to `editorModule`, with a static import, or adds `export { … } from './devtools'` to `editor`'s `index.ts`. "Exports only the module" limits what the subpath exports; it does not stop the root from exporting it too.

`pnpm depcruise` is green for both.

**What it costs.** An ungated static import is caught by the build check, because the module's ids land in `dist`. A gated static import tree-shakes away and passes everything, so it would stand as a second, undocumented way in. The rule buys a named failure at pre-commit instead of a `dist` grep at the end of `pnpm check`.

☝️ The brief asks whether anything enforces the import. The answer is that nothing does for "who imports", but the costly outcome (shipping) has its own guard. Weigh the rule as cheap and tidy, not as the thing standing between the module and production.

**Closing sentence (AD-25, Entry fences):** "Only `app`'s main start file imports `editor/devtools` (dependency-cruiser, not a review rule, because the check is one row of an existing helper); `editor`'s root does not re-export it."

**Implementation notes.** `onlyOwnersImportEntry('…', 'editor', 'devtools', [start-main, <devtools folder>], …)` fits as written: `rows` resolves to `app`, and it adds `editor` as a source. The owners need the devtools folder so its own specs pass. `rules.spec.ts` requires every configured rule to fire, so it needs a fixture in `tooling/ad10/violations/`.

### 2. Medium: the build check is underspecified in three ways that can make it vacuous

The Editor state row now rests the claim "neither gate ships it" on this check, and no check exists yet. Three independent divergences:

- **Where the id comes from.** `editor/devtools` "exports only the module", so a check in `tooling/` or `app/e2e` cannot import the plugin id through the package surface. Unit A writes the literal into the check; unit B later renames the constant in the plugin. The check then greps for a string that no longer exists and stays green forever.
- **When it runs.** `pnpm check` runs `pnpm test` before `pnpm build`. A Vitest spec reading `app/dist` sees a stale local build, and in CI no build at all, so it is either always red there or, if written to tolerate a missing folder, always green. Only a step after `build` (the smoke project, or a new step pinned in `tooling/check-steps.spec.ts`) sees the current output. Both placements obey the spine today.
- **How distinctive the id is.** "Starts with the plugin's id" does not constrain the value. An id of `keeb-cad` is legal and matches strings that ship for other reasons, so the check goes red for nothing. The same goes for any id that is a substring of shipped code.

Also, the 23.22 verify (`tickets.toml:227`) toggles "the MODE gate", singular. The amendment created a second gate, and removing only `mountEditor`'s proves nothing about `start-main.ts`'s.

**Closing sentence (Editor state row):** "The build check runs after `pnpm build`, not in `pnpm test`, because the test step precedes the build. It reads the plugin id from the one constant that defines it, by relative path, not a copied literal, because a copy goes stale green. The id is a string no shipped file contains. Removing each gate in turn makes it fail."

### 3. Medium: who else may fill `inspectables`, and whether the token is exported, is open

**Where.** The spine says `editor`'s multi token, and that `editor/devtools` exports only the module. It does not say whether the root exports the token. The in-repo precedent points the wrong way: `uiActions` and `inputBuilders` both live in a `tokens.ts` and are re-exported from `editor`'s `index.ts`.

**The pair.**
- Unit A, following that precedent, exports `inspectables` from the root.
- Unit B, a later story, needs to show an `app`-owned service (autosave's failure state, which AD-10 places in `app`). `editor` cannot import `app`, so B registers a second filler in `app` behind its own `MODE` gate, using A's export. The glossary's "filled only behind the devtools `MODE` gate" is satisfied.
- Unit C reads "the module that fills `inspectables`" as sole filler and leaves the token private, so B's service is not shown.

The token's location alone is harmless: a `createMultiToken('inspectables')` in the main chunk carries no plugin id and no entries, and token identity holds wherever it lives since all readers import one file. The export is what matters, because it decides whether there is one filler or several. A second filler in `app` is a new spot the import fence (finding 1) and the `edit` limit have to reach.

The list of shown services has the same gap: a new UI-state service in a later story can be left out without anything noticing, and "each shown service" names no owner of that list.

**Closing sentence (Editor state row):** "`inspectables` is exported from no `editor` entry and `editor/devtools`' module is its only filler, not one filler per owning package, because one file keeps every entry behind one gate; a service `editor` cannot import is not shown."

Whether every UI-state service must appear, or only those someone chose, is a call for Sergii; if the former, say so in the same place.

### 4. Low: a wiring fault in the dev branch is silent, and no automated run reaches it

**Where.** AD-25 states "A missing provider fails at the entry's first run with the resolution chain". That is not true of a multi token: `Container.resolve` returns `[]` for an unregistered one (`packages/di/src/container.ts`).

**The pair.** The plugin unit's spec registers a fake inspectable and passes. The module unit's spec passes. The `start-main.ts` unit writes `MODE === 'dev'`, or drops the `addModule` call. Result: an empty inspector, no error, and the build check is green because nothing shipped. Vitest runs in `test` mode and the smoke project runs `pnpm preview`, so neither ever takes this branch.

📐 Every automated check here proves absence in production. Nothing proves presence in development, which is the feature's whole purpose.

A related trap: making the gate testable by moving it behind a function that takes `mode` defeats Vite's static replacement, so the chunk ships. The build check catches that one.

**Closing sentence (AD-25):** "A missing provider fails at the first run for a single token; an unfilled multi token resolves empty." For the dev branch, 23.22's verify should name a toggled-bug or manual step run against the dev server. The project's end-to-end bar excludes a Playwright test here, which is a reasonable reason not to add one.

### 5. Low: the ticket contradicts the amendment

`tickets.toml:232` (`unknown`) records "editor exports the plugin and the module from a dev subpath". The amendment exports only the module and keeps the plugin behind `mountEditor`'s relative dynamic import. A planner reading the ticket first builds a different surface. Update the ticket's `unknown` when the spine lands.

## Tried and found closed

- **Same token, two instances via `@keeb-cad/editor/devtools` versus a relative path:** both resolve to one file through pnpm's symlink, and the source is not pre-bundled.
- **Import of `@vue/devtools-api` outside `editor`:** the `only-editor-ui-and-di-vue-import-vue` pattern covers `@vue/*`, reactivity aside.
- **A worker reaching the subpath:** `worker-entries-reach-no-ui` covers all of `editor`.
- **Tokens table entry needed:** no. `inspectables` is defined and consumed in `editor`, which AD-25 treats as ordinary layering.
- **Adding the module in `main-modules.ts` by top-level dynamic import, or after `autoLoad()`:** the amendment names the start file and the order.
- **`src/devtools.ts` versus `src/devtools/index.ts` as the entry:** `entry()` accepts both, and only one can exist.
- **`inspectable` field shape disagreeing between module and plugin:** one story, one declared type, and the compiler reconciles it.
