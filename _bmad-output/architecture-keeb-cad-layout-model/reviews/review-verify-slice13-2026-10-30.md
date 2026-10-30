---
title: 'Reviewer lens: verify (slice-13 spine amendment)'
target: _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
scope: 'uncommitted 2026-10-30 diff: AD-2 Writing / Inputs / Read-only types / Undo, AD-3 cycle rejection, AD-10 immer and valibot import rules, AD-24 Valibot as the one schema format, AD-25 one partial per package, AD-26 zag physical-key rule, Verification layer 3, Stack rows (immer, valibot, @valibot/to-json-schema), Open Questions removals; decisions in the last 14 entries of .memlog.md'
date: '2026-10-30'
lens: 'verify: every committed decision is web-researched or reality-checked, not asserted from training data'
---

# Verify lens: slice-13 amendment

**Verdict: pass with changes.** The versions are current and every named library exists and does
what the spine relies on. Immer's types block nested writes, auto-freeze and structural sharing
work as described, Vue leaves frozen values unproxied, Valibot's `parse` copies, and zag has
`parseHotkey`. Two mechanisms fail when run, though. First, "every design value is therefore frozen"
holds only for `produce` output. `replaceDesign` doesn't go through `produce`, so a loaded design
lands unfrozen, Vue proxies it, and the proxy survives into later frozen designs (F1). Second, the
read-only rule as worded ("read-only parameters", which reads as `Readonly<T>`) doesn't compile
against `Frozen<T>` once the type nests (F2). Three smaller wording gaps follow (F3 to F6).

All checks ran in a scratch directory
(`/tmp/claude-1000/-home-ruyu-projects-keeb-cad/567d6406-1f4e-4ad6-88bc-0e59130c1be6/scratchpad/verify`),
on immer 11.2.9, valibot 1.5.0, @valibot/to-json-schema 1.8.0, @vue/reactivity 3.5.44,
@zag-js/hotkeys 1.47.0 and TypeScript 6.0.3. The type checks used the repo's `tsconfig.base.json`
(`strict`, `noUncheckedIndexedAccess`). The repo itself was not touched.

## What was checked and how

| Claim in the diff | How it was checked | Result |
|---|---|---|
| immer 11.2.9 current, MIT | `npm view immer` | Confirmed: `latest` 11.2.9 (2026-10-22), MIT, maintainers mweststrate and aleclarson. 11.1.22 to 11.2.9 shipped as **12 releases in 2 days** (2026-10-20 to 22). Most fixes are in the opt-in array-methods plugin and in patches (`gh api repos/immerjs/immer/releases`). See F6 |
| valibot 1.5.0 / @valibot/to-json-schema 1.8.0 current | `npm view` | Confirmed: `latest` 1.5.0 (2026-09-09) and 1.8.0 (2026-09-11). to-json-schema's peer dependency is `valibot ^1.5.0`, so the pair is consistent |
| @zag-js/hotkeys 1.47.0, @vue/reactivity 3.5.44 | `npm view` | Both are `latest`. @vue/reactivity 3.5.44 was re-published 2026-10-30T08:01 (the registry's `modified` time) |
| TypeScript ~6.0 | `npm view typescript` | 6.0.3 is the newest 6.x. `latest` is 7.0.2 (2026-10-30), already in Deferred. Not re-decided |
| Immer exports `Immutable<T>` and `Draft<T>` | `dist/immer.d.ts:47–50, 338` | Confirmed. `castDraft`, `castImmutable`, `freeze(obj, deep)` and the `Immer` class (`autoFreeze` option) are exported too |
| A nested write on `Immutable<T>` fails to compile (TS 6, strict) | `types.ts` with `@ts-expect-error` on: a nested property, `push`, a record index, a tuple element, a nested array element. The type is inferred from a Valibot schema with a branded `Id` | **Confirmed**: all five are errors, and no `@ts-expect-error` went unused. Brands survive `Immutable` |
| `produce` over a `Frozen` base gives a `Frozen` result and a draft assignable to `Writable<Design>` | Same file | Confirmed: `const n: Frozen<Frame> = produce(f, d => apply(d))` compiles. Passing a `Frozen` value to an apply step fails, which is correct |
| "Functions take read-only parameters" when handed a `Frozen<Frame>` | `shallow(x: Readonly<Frame>)`, `plain(x: Frame)`, `deep(x: Frozen<Frame>)`, plus one level down (`Readonly<Group>` vs `Frozen<Group>`) | **`Readonly<T>` fails** whenever `T` holds an array: "readonly … cannot be assigned to the mutable type". Only `Frozen<T>` (or `readonly` written into the type by hand) compiles. See F2 |
| A package that only defines commands never needs the `Writable` name | `defineCommand<I>({ apply(d, i) { … } })`, with `d` contextually typed | Compiles. The name is only needed by **helper functions** that take the draft. See F3 |
| Moving an existing (frozen) record into a draft | `d.groups.push(design.groups[0])` | Type error ("readonly … to mutable"). Needs `castDraft`. At runtime Immer accepts frozen values. Matters for undo restore and cross-group moves. See F3 |
| Auto-freeze is on by default in v11, deep, also in production | `rt.mjs`; `immer.d.ts:286–290` ("Always freeze by default, even in production mode") | Confirmed: the result, its arrays, the changed records and the untouched shared records are all frozen. A stray write throws `TypeError` (ESM is strict mode) |
| Structural sharing: unchanged records are `===` before/after | `rt.mjs` | Confirmed: an untouched sibling record and an untouched section are `===`; the touched record and its parent array are new. A no-op recipe returns the same root, **and so does writing an equal primitive**, so reference comparison finds no spurious touched records |
| Immer freezes caller objects stored by a command; a Vue proxy can enter the design | `rt.mjs` | Both reproduced, as the memlog question said: a pushed caller object comes back frozen, and `isProxy(design.groups.at(-1))` is `true` |
| A `produce` over an unfrozen base freezes parts of that base | `rt.mjs`, `rt2.mjs` | **Yes**: untouched subtrees of an unfrozen base get frozen in place (the root does not). This feeds F1 |
| Vue 3.5.44: `ref()` of a deeply frozen object | `rt.mjs` | `ref(frozen).value` is **raw** (`isProxy` false, `=== input`), because `toReactive` → `reactive` skips non-extensible targets. `reactive(frozen)` returns the input. A non-frozen wrapper's frozen child stays raw. A `computed` over `ref.value` re-runs when `.value` is replaced. `shallowRef` is raw regardless |
| Vue: `ref()` of an **unfrozen** value (the `replaceDesign` path) | `rt2.mjs`: Valibot-parsed file → `ref` → `produce(ref.value, …)` | `ref.value` **is a proxy**. The `produce` result's root is raw and frozen, but the untouched section in it **is still the Vue proxy** (shared by reference), and `structuredClone(result)` throws `DataCloneError`. Deep-freezing first (`freeze(x, true)`) gives a raw `ref.value`. See F1 |
| Valibot 1.5.0 `v.parse` on an object schema returns a new object | `rt.mjs` | Confirmed: a new root, new nested arrays, items and optional objects; unknown keys stripped. A Vue `reactive` input comes back with no proxies, and after the `produce` the caller's object is not frozen. Frozen inputs parse fine |
| …for every schema shape | `rt.mjs` | **No**: `v.unknown()` (and `any`, `custom`, `instance`) return the input reference, and `looseObject` shares unknown-key values. See F4 |
| `v.metadata` / `v.getMetadata` in 1.5.0 | `rt.mjs` | Both exist (`getMetadata(schema)` → `{ refKind: 'slot' }`), as do `title`, `description`, `getTitle` and `getDescription`. So `ref(kind)` can read its kind through public API |
| Command input schemas export to JSON Schema | `js.mjs`, `toJsonSchema` on the likely `Id`/`Length`/`Expression` building blocks | Metadata passes through as a custom keyword (`"refKind":"slot"`), along with `title`/`description`, `lazy` and `variant`. **`v.brand`, `v.check`, `v.custom` and `v.transform` throw** under the default `errorMode: 'throw'`. `overrideAction`, `overrideSchema` and `errorMode` exist in 1.8.0. See F5 |
| zag 1.47.0 `parseHotkey` exists and tells a symbol key from a letter | `zag.mjs`; `dist/parser.mjs`, `dist/utils.mjs`, package `exports` | `parseHotkey(h, platform)` is public and returns `{ keys, codes, ctrl, alt, meta, shift }`. **It does not say whether a key is a symbol**: zag's own `isSymbolKey` lives in `utils.mjs`, which the package `exports` map doesn't expose (only `.`). The test has to restate the predicate (length 1, not `\p{L}`, not `\p{N}`). Run on R, Shift+R, `[`, Shift+/, `?`, Space, Mod+[, Alt+R, F1, Delete, 1: it classifies all of them correctly. See F3 |
| zag matches letters "by logical key **or** physical code"; symbols physically only with Ctrl/Alt/Meta; plain `[` is dead on Ukrainian | `zag2.mjs`: `matchesHotkey` on synthetic events | Confirmed: UA physical KeyR (`к`) fires `R` and `Shift+R`; `?` matches the character on both US and UA. Also found: on a **Latin non-QWERTY** layout one letter shortcut answers to **two** physical keys. On AZERTY, physical KeyW (`z`) matches `W` by code and `Z` by key. On QWERTZ, Ctrl + physical KeyZ (`y`) matches **both** `Ctrl+Z` and `Ctrl+Y`, and the store runs every match at the top priority (`store.mjs:455–460`). See F3 |

## Findings

### F1. HIGH: `replaceDesign` breaks "every design value is frozen" (shown at runtime)

AD-2 says that since `produce` is the only write, "every design value is therefore frozen, so Vue
never proxies it". But `replaceDesign` (load, file open, version switch, migration) writes without
`produce`, and the value it gets from `v.parse` is a plain unfrozen copy. Put in a `ref`, it becomes
a Vue proxy. The next command's `produce` then shares the untouched proxied sections into a frozen
result, so a proxy sits inside a "frozen" design and `structuredClone` at the crossing throws
`DataCloneError`. That is exactly what Verification layer 3 forbids, and that test runs only after
commands, not after `replaceDesign`.

**Fix (AD-2 Writing):** "`replaceDesign` deep-freezes its value with Immer's `freeze(value, true)`
in the register's file (still the only `immer` import). Design-state refs are `shallowRef`, so
proxying never depends on frozenness." Extend layer 3 to "after a command **or `replaceDesign`**, the
design is deep-frozen and holds no proxy".

### F2. MEDIUM: "Functions take read-only parameters" must mean `Frozen<T>`, not `Readonly<T>`

The memlog's first wording, "Everything else sees frozen plain values typed `Readonly<Design>`",
and the natural reading of "read-only parameters" both point to TypeScript's `Readonly<T>`. Under
strict TS 6, `Frozen<Frame>` is **not assignable** to `Readonly<Frame>`, or to `Readonly<Group>`
one level down, whenever the type holds an array. So the rule as read forces casts. Packages below
`model` (`geometry`, `reactive`) can't import `Frozen` and must write `readonly` arrays themselves.
`ReadonlyArray<readonly [number, number]>` accepts a `Frozen` point list. A makerjs-style mutable
signature does not.

**Fix (AD-2 Read-only types):** "Functions over design values take `Frozen<…>` parameters. Packages
below `model` write `readonly` into their own parameter types. TypeScript's `Readonly<T>` is not used
for design values, since it is shallow and rejects `Frozen` arrays."

### F3. MEDIUM: three claims hold only partly once run

- **"Writable types never leave `model`'s public surface"** conflicts with "packages that define
  commands" (AD-10). It works when `model` exports a `defineCommand` whose apply parameter is
  *contextually* typed (checked), so packages never name `Writable`. But a draft helper in such a
  package (e.g. `moveInto(d, …)`) has no type to write, and moving an existing record into a draft
  needs `castDraft` (a type error otherwise; also the undo restore path). **Fix:** "`model` exports
  `defineCommand` (and gesture/action equivalents), whose apply parameter is contextually typed; the
  `Writable` name is not exported. Draft helpers live in `model`'s register concept or are inlined.
  Re-inserting an existing frozen record uses `castDraft`, inside the register file only."
- **"a test … enforces both with zag's `parseHotkey`"**: `parseHotkey` doesn't report symbol-ness,
  and `isSymbolKey` isn't exported. **Fix:** "with zag's `parseHotkey` plus a local copy of zag's
  symbol predicate (one character, not a letter or digit), pinned by a test against zag's matching on
  `[` and `R`".
- The rule as written rejects **`?`** (EXPERIENCE.md keeps `?` as a logical alias for the cheat
  sheet), **Space** (zag's predicate counts `" "` as a symbol) and the 3D viewer's **`+` / `−`**. **Fix:**
  "a shortcut whose key is a symbol and that has no Ctrl/Alt/Meta is allowed only as a second, logical
  hotkey on an entry that also has a physical one (F1 + `?`)". Space-drag and viewer-local keys
  are not register hotkeys.
- EXPERIENCE.md says shortcuts are "Bound to physical keys (`KeyboardEvent.code`)". zag matches
  logical **or** physical, so on AZERTY/QWERTZ a letter shortcut answers to two keys, and
  `Ctrl+Z`/`Ctrl+Y` would both fire on QWERTZ if both were bound. Nothing in today's table collides.
  **Fix:** reword EXPERIENCE.md to "letters, digits and named keys match the logical key or the
  physical key", and have the register test reject two hotkeys with the same modifiers whose letters
  swap on QWERTZ/AZERTY (Y/Z, A/Q, W/Z).

### F4. MEDIUM: "the apply step sees … a fresh plain copy" depends on the schema's shape

Valibot copies through `object`, `array`, `record`, `tuple`, `optional` and `variant`, but
`unknown`/`any`/`custom`/`instance` return the caller's reference, and `looseObject` passes
unknown-key values through by reference. A command input built from any of these lets Immer freeze
caller objects again, and lets proxies in. **Fix (AD-2 Inputs):** "command input and design schemas
use only copying schema kinds (no `unknown`, `any`, `custom`, `instance`, `looseObject`); the schema
walk test fails on any of them". The walk already visits every schema node, so this costs one more
assertion.

### F5. LOW: JSON Schema export throws on brands and checks by default

`toJsonSchema` throws on `v.brand`, `v.check`, `v.custom` and `v.transform` unless told otherwise.
`Id` is very likely branded, and `Length`/`Expression` will likely use `check`. **Fix (AD-2):**
"`model` exports command inputs through one `toJsonSchema` call with an `overrideAction` for
`brand` (dropped) and for `Length`/`Expression` (`type: string` plus a pattern and description). A
test converts every registered command's schema with `errorMode: 'throw'`."

### F6. LOW: pin Immer exactly, and don't rely on its global defaults

Immer shipped 12 releases between 2026-10-20 and 2026-10-22. They fix array-method, patch, Set/Map
iteration and `Draft` recursion bugs, which is healthy but churny. The Stack row has `11.2.9` with no
"(exact)" marker. The spine also relies on the module-global default (`autoFreeze` true). **Fix:**
mark immer "(exact)" in Stack like Valibot. In the register file, use
`new Immer({ autoFreeze: true })` and its `produce`, not the global, and never call
`enableArrayMethods`, `enablePatches` or `enableMapSet` (patches are off, and the design holds no Map
or Set).

## Confirmed without change

- AD-3: rejecting a cycle with a typed rejection has no library dependency to verify.
- AD-25's one-partial-per-package test uses `PartialContainer.getTokens()`, which the previous
  verify review and the memlog's version entry confirm is public in @snap/ts-inject 1.2.1. It was not
  re-run here.
- Removing the Open Questions rows (update library, schema format, deep read-only typing, zag
  physical keys, ts-inject convention) is backed by the memlog's version and spike entries and by
  the checks above, apart from F1 to F4.

## Out of date or unconfirmed

- The schema spike's numbers (gzip sizes, ops/s, walk LOC) in the memlog were not re-run. Their
  scratchpad wasn't kept, so they can't be re-checked; they don't appear in the spine.
- The memlog says Valibot's reference walk "reads typed-but-undocumented fields". `getMetadata` is
  public in 1.5.0, so the kind can be read publicly. The walk over `entries`/`item`/`wrapped`/`pipe`
  still reads typed fields; the spine's walk test covers that.
- Mutative "one maintainer" (rejection reason) was not re-checked.
