---
title: 'Reviewer lens: verify (fold of the 2026-10-30 code decisions)'
target: _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
scope: 'uncommitted 2026-10-30 diff: AD-2 command register, AD-10 one reactive graph, AD-11 crossing, AD-25 wiring, Consistency Conventions (Verification, Fixtures, Recompute debugging, Editor state, Monorepo), Stack rows (Vue / @vue/reactivity, @snap/ts-inject), Open Questions rows (Vue 3.6, update library, ts-inject override miss)'
date: '2026-10-30'
lens: 'verify: every committed decision is web-researched or reality-checked, not asserted from training data'
---

# Verify lens: 2026-10-30 fold

**Verdict: pass with changes.** Every named package exists, the version numbers are current as of
today, and the reactivity claims hold when run. One committed mechanism is wrong as worded.
AD-2 says each package's container part (a `PartialContainer`, per the AD-25 open question)
appends its commands with `appendValue('commands', …)`. `PartialContainer` has no
`appendValue` in 1.2.1. When two package partials each provide `commands`, they silently override
each other: the last one wins (F1). The memlog's version note was checked against
`Container.d.ts` only, which is how this slipped through.

## What was checked and how

| Claim in the diff | How it was checked | Result |
|---|---|---|
| `@snap/ts-inject` ^1.2, 1.2.1 current, MIT | `npm view @snap/ts-inject` | Confirmed: `latest` 1.2.1 (2026-10-28T11:24), MIT, repo github.com/Snapchat/ts-inject. Release history: 1.0.0 2026-05-20, 1.1.0 2026-09-03, 1.2.0 2026-09-29, 1.2.1 2026-10-28 |
| `appendValue(token, value)` appends to an existing typed-array token | Installed 1.2.1: `dist/types/Container.d.ts:385–404`, README "Multi-Binding", and a run in Node | Confirmed **on `Container` only**. The token must already exist with an array type (`Token extends keyof S`, `ArrayElement<S[Token]>`). `appendClass` exists alongside it |
| "its package's container part appends it with `appendValue`" (AD-2) | `PartialContainer.d.ts` (no `append*` member), runtime `typeof new PartialContainer({}).appendValue` | **Not true for `PartialContainer`**: `undefined`. TS 6.0.3 `--strict` rejects the call. See F1 |
| Merged partials and the "silent override miss" (Open Questions) | Two partials each `providesValue('commands', [...])`, merged with `Container.provides(a).provides(b)` | Reproduced: `get('commands')` → only `b`'s commands. No error, no type error. This is exactly the miss the open question names, and here it hits the command register itself |
| Workarounds | Runtime + `tsc --strict` (TS 6.0.3) | Both work: (a) the root does `Container.providesValue('commands', [] as Command[]).appendValue(…)` for each exported command; (b) a package partial declares a dependency on `commands` and re-provides it: `provides('commands', ['commands'] as const, cs => [...cs, setGap])` → `[base, setGap]` |
| ts-inject on TypeScript ~6.0 | `tsc --strict --noEmit` on a register sample with TS 6.0.3 | Type-checks. The package was built with TS ^5.5; its README says TS 5.9 lifted the ~100-registration cap after an anonymous-object service |
| ts-inject adoption and maintenance | `gh api repos/Snapchat/ts-inject`, contributors, npm downloads API | Active (last push 2026-10-28, not archived, 4 open issues). **23 stars**, about 19.6k downloads a week (mostly as a Camera Kit dependency, most likely), and two Snap employees make almost all commits. See F3 |
| `@vue/reactivity` 3.5.44 published standalone, same version as `vue` | `npm view @vue/reactivity`, `npm view vue@3.5.44`, `npm view @vue/runtime-core@3.5.44 dependencies` | Confirmed: both `latest` 3.5.44 (2026-10-13). `@vue/reactivity` depends only on `@vue/shared` 3.5.44. `vue` reaches it through `@vue/runtime-core`, which pins `@vue/reactivity` **exactly** at 3.5.44. See F2 |
| Usable without `vue` or the DOM, and in a worker | Installed 3.5.44: grep of `reactivity.esm-bundler.js` for `window.`/`document.` (0 hits); ran `ref`/`computed`/`effect` in Node main thread and in a `worker_threads` Worker | Works in both, with no DOM globals. `sideEffects: false`. Exports: `node` → CJS (dev/prod by condition), `import`/`module` → esm-bundler. Not run in a browser Web Worker. The code has no DOM references, so that is low risk. In the spine, workers get plain values past the crossing anyway (AD-11) |
| Vue's `onTrack`/`onTrigger` are dev-only (code-decisions list) | The same script with and without `NODE_ENV=production` | Confirmed: dev gives `onTrack` ×2 and `onTrigger` ×1; production calls neither. The esm-bundler build gates them on `process.env.NODE_ENV`, so the trace exists in Vitest (`NODE_ENV=test`) and in Vite dev, never in a production build. That fits "readable by agents in test output". The spine does not say the trace is dev/test-only (F4) |
| `onTrack`/`onTrigger` survive in 3.6 | `@vue/reactivity@3.6.0-rc.14` `reactivity.d.ts:106–133, 253` | Present (`DebuggerOptions` on `computed` and effects). The internals under them (alien-signals-style links) differ from 3.5, so a trace that reads anything beyond the event payload will break on the upgrade |
| Vue 3.6 status: "3.6.0-rc.14 on 2026-10-30" | `npm view vue time`/`dist-tags` | Confirmed: `rc` tag 3.6.0-rc.14, published 2026-10-30T08:02. RCs run from rc.1 (2026-07-18), about weekly; 3.5.x patches continue in parallel (3.5.44 on 2026-10-13). 3.6 reactivity is a rewrite based on alien-signals (RC notes). It is ported inside `@vue/reactivity`, which depends only on `@vue/shared`, not on the `alien-signals` package. One web article claims a 3.6 launch in July; the registry shows no stable 3.6.0, so that claim is wrong |
| tldraw's `whyAmIRunning` exists as described | `@tldraw/state` 5.6.0 (npm `latest`), `src/lib/capture.ts:192–213`, `DOCS.md:522–549` | Confirmed. Call it inside a `react`/`computed`, and from the next run on it logs a tree of the named atoms and computeds that changed ("Effect(greeting) is executing because: ↳ Atom(name) changed"). It walks tldraw's own parent/epoch graph, and Vue exposes no public equivalent. "Modelled on" is accurate, but the multi-hop chain has to be built by keeb-cad (F4) |
| Immer / Mutative / Travels (Open Questions) | `npm view` | All exist: immer 11.2.9, mutative 2.0.1, travels 3.0.1. The "about one maintainer" note for Mutative/Travels was not re-checked here |
| Vue DevTools v9 beta reactivity graph (code-decisions list, not spine) | `npm view @vue/devtools dist-tags` | Not confirmed: the npm tags show `latest` 8.2.1, `next` 7.4.4, and no 9.x tag. The v9 beta may ship under another package name or channel. It is not in the spine, so this does not block |

## Findings

### F1 (high): AD-2's registration mechanism doesn't exist on `PartialContainer`, and the naive fix silently drops commands

AD-2 says: "its package's container part appends it with ts-inject `appendValue('commands', …)`".
In 1.2.1, `appendValue`/`appendClass` exist only on `Container`. If a package exports a
`PartialContainer` (as AD-25's open question assumes: "merged `PartialContainer`"), it cannot
call `appendValue`. The obvious alternative is for each partial to `providesValue('commands', [...])`.
That type-checks and runs, but merging keeps only the last package's commands. The register then
starts without most commands and still "refuses duplicate names". The duplicate check does not
catch a *missing* command.

Fix (pick one and state it in AD-2 / AD-25):
- **Root appends:** each package exports its command definitions (or a `(c: Container<…>) => Container<…>`
  function). The composition root does `providesValue('commands', [])` and then `.appendValue` for each.
  This matches the README's multi-binding example exactly.
- **Self-dependent partial:** each package partial does
  `provides('commands', ['commands'] as const, cs => [...cs, ...mine])`. Verified at runtime and under
  TS 6 `--strict`. It is order-dependent, and a partial merged before the root's empty array is
  provided fails to resolve.

Either way, add a check that the registered names equal the union of the commands every package
exports. A completeness test is what catches this miss. The duplicate test does not.

### F2 (medium): one reactive graph needs one `@vue/reactivity` instance, so the spine must pin it

`@vue/runtime-core@3.5.44` pins `@vue/reactivity` at exactly 3.5.44. If `model` declares
`@vue/reactivity` with a range (or with a different patch than `editor`'s `vue`), pnpm installs two copies.
Then Vue components and Pinia track one copy while `model`'s computeds live in the other. Reactivity
across the edge silently stops working: no error, the view just stops updating. The Stack row lists
`3.5.44 / 3.5.44`, but nothing says they must move together. Add: exact same version through a
pnpm `catalog:` entry (or `overrides`), plus a test that a `model` ref is `isRef` according to the
`vue` import and that a component re-renders on a `model` change. This matters again at the 3.6 upgrade,
where both must jump together.

### F3 (medium): ts-inject's adoption risk is unrecorded, unlike the risk for the update-library candidates

The spine records "Mutative and Travels are about one maintainer" as a decision factor, but says only "MIT"
about `@snap/ts-inject`. Yet ts-inject touches every package (AD-25), and the candidates are on an open
question. Facts: 23 GitHub stars, about 19.6k weekly downloads (most likely mostly through Snap's Camera
Kit), and almost all commits from two Snap employees. It is actively released (four releases since May 2026).
The ADR doesn't have to change, but the same bus-factor note belongs in the Stack row so the asymmetry
is visible. 📐 The register and services sit behind ts-inject's type-level API. Swapping it later means
touching every package's composition, so its risk weighs more than the update library's.

### F4 (low): the recompute trace is dev/test-only and needs its own cause chain; the spine says neither

Verified: `onTrack`/`onTrigger` fire only when `NODE_ENV !== 'production'`, and each event names only the
immediate dependency. tldraw's `whyAmIRunning` gives the multi-hop chain because tldraw keeps a parent/epoch
graph. Vue has no public one. So "built on Vue's hooks" means `model`'s re-export has to wrap `computed`
with a name and record trigger events to rebuild the chain. That fits AD-10's single re-export, but
the Recompute debugging row should say: (a) the trace is available in dev and tests only; (b) the
chain is built by the `model` wrapper, not read from Vue internals (those change in 3.6). The
code-decisions list already records the dev-only limit. The spine row doesn't carry it.

### F5 (low, outside the diff): TypeScript 7 is now stable

`npm view typescript` shows `latest` 7.0.2 (`rc` 7.0.1-rc, `beta` 7.1.0-beta). The Stack row pins ~6.0, and
Deferred says "TS 7 … when create-vue supports them". That trigger is still valid, but "Not needed yet"
now refers to a released major, not a future one. ts-inject's types were checked only on 6.0.3. Re-run the
register sample on TS 7 when the trigger fires.

## Not findings (checked, holds)

- `@vue/reactivity` works outside the browser and in a worker thread with no DOM. `sideEffects: false`
  keeps tree-shaking intact for stage packages that import `model`.
- Vue 3.5.44 is `latest` for both packages. 3.6 is still an RC (rc.14, today). Keeping 3.5 with the
  "3.6 goes stable" trigger is sound.
- `whyAmIRunning` exists in `@tldraw/state` 5.6.0, exactly as described.
- Immer, Mutative and Travels all exist on npm.

## Method

`npm view` / `npm pack` for @snap/ts-inject 1.2.1, @vue/reactivity 3.5.44 and 3.6.0-rc.14, vue,
@vue/runtime-core, @tldraw/state 5.6.0, immer, mutative, travels, typescript, @vue/devtools. I unpacked
and read the type definitions and READMEs. Runtime scripts (Node 2026, `worker_threads`) ran from the
session scratchpad: ts-inject append/merge behaviour, reactivity in main thread and worker, and dev vs
production hooks. `tsc --strict` ran with TypeScript 6.0.3 on a command-register sample. I also used
`gh api` for repo health and one web search for Vue 3.6 status. The spine was not edited.
