---
title: 'The ui foundation renders in the workbench'
type: 'feature'
ticket: '6'
created: '2026-11-06'
status: 'ready-for-dev'
baseline_revision: ''
route: 'full'
route_source: 'auto'
risk: 'medium'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `packages/ui` is an empty `export {}`. Stories 7 and 8 need its tokens, primitives, formatters and hotkey layer (AD-26) before the editor frame can be drawn or a shortcut bound.

**Approach:** Build `ui` per AD-26. It gets:
- Tailwind 4 `@theme` tokens from DESIGN.md in both themes, and the stored theme override;
- JetBrains Mono;
- `Icon`, `Button`, `Kbd`, `Tooltip`, and a `Tabs` wrapper over Reka;
- the number and hotkey formatters;
- the hotkey layer on zag.

A workbench Vite entry renders every component state in both themes. Its state files are the same ones the browser-mode specs mount. A dependency-cruiser rule fences the workbench off from everything else, and lint rejects arbitrary-value classes. The app loads the stylesheet, and editor applies the stored theme before mount.

## Boundaries & Constraints

**Always:**
- `ui` imports no workspace package (AD-10). Only `ui` imports `reka-ui`, `@zag-js/hotkeys` and `@lucide/vue`.
- Themes swap token values and never use `dark:`. States use ARIA and data-attribute variants, with no `cn` or `cva`.
- Every DOM test runs in browser mode, in Chromium and Firefox.
- Versions come from the Stack table:
  - tailwindcss and @tailwindcss/vite 4.3.3
  - reka-ui 2.11.0
  - @zag-js/hotkeys 1.47.0
  - @lucide/vue 1.65.0
  - @fontsource-variable/jetbrains-mono 5.3.0
  - @vueuse/core 14.4.0

**Decisions (Sergii, 2026-11-06):**
- **App wiring.** 23.6 wires the stylesheet into the app; 23.8 does not. ui exports `./theme.css`, editor imports it, and `app/vite.config.ts` adds `@tailwindcss/vite`. Why: 23.8 then starts with live tokens, and its ticket doesn't name the wiring. The subpath gets an AD-10 line on main.
- **Stored theme.** It is applied in editor's `mountEditor`, before `app.mount`.
  - Not an inline script in `index.html`, whether injected by a ui Vite plugin or written by hand. Why: one call needs no plugin, no extra subpath and no duplicated storage key.
  - Accepted cost: one frame of the OS background before mount, only when the override differs from the OS theme.
  - Not in `start-main`, because only editor imports ui (AD-10). AD-26's "inline script in index.html" sentence is amended on main.
- **Theme override.** It runs on VueUse's `useColorMode`, wrapped once in ui. Rejected: a hand-written read/apply pair. Why: VueUse is in the Stack table for ui and editor. It catches storage errors, which story 7 needs because launch must survive unavailable storage. It follows OS changes, and it gives a reactive mode for the palette's `Theme:` commands and the push to viewer3d.
- **Arbitrary-value lint.** `eslint-plugin-better-tailwindcss` 4.10.0 `no-restricted-classes` with a pattern that bans values only.
  - Not `eslint-plugin-tailwindcss`'s `no-arbitrary-value`, whose fixed regex misses `hover:p-[7px]`, `[mask:none]` and `p-(--x)`.
  - Not a rule of our own, which would rebuild the plugin's job.
  - Arbitrary variants (`data-[state=active]:`) stay allowed, as AD-26 prescribes. The spine's Stack row and Monorepo row are amended on main.
- **State files.** They live in `packages/ui/workbench/states/`, not beside each component in `src/`. Why: only the workbench and ui's specs use them; the app never does.
- **Shortcut rules.** The code has no shortcut-rule checks (symbol key, Alt+letter, swap pair, reserved chord). Why: they are guidance for whoever picks a chord. AD-26 keeps them as written guidance. The ticket's "the rules refuse mod+W" and story 7's binding test are dropped. The spine and tickets are amended on main.
- **Letter matching.** When a key types a Latin letter, a letter shortcut matches that letter only. When it types a non-Latin character, it matches by physical position. The alternative was keeping zag's key-or-code match. Why: on Dvorak and Colemak, zag's match fires two shortcuts from one key, because physical `KeyK` types `t` or `e`. Many split-keyboard users type on those layouts. EXPERIENCE.md's AZERTY/QWERTZ line becomes "answers to its labelled key only", on main.
- **Number formatter.**
  - Degrees print as `15°`, not `15 deg`, as DESIGN.md writes angles. mm keeps the space: `19 mm`.
  - Negatives print with U+2212 (`−1.01`), not a hyphen, as DESIGN.md writes `−3.4°`.
  - `formatNumber` throws on NaN or ±Infinity; it never prints `—` or `NaN`. A non-finite value on screen is an upstream bug.
- **Bad hotkey string.** `formatHotkey` and the hotkey layer throw on a hotkey that zag's `validateHotkey` rejects; they never skip it. Hotkeys come from code, so a bad one is a typo to surface.
- **Icon size.** `Icon` is 16px with stroke 1.5, not lucide's 24/2 and not 20/1.5. It sits with 14px text inside the 24px `target-min`.
- **Disabled Button.** It is `aria-disabled`, stays focusable and emits no click. Its reason shows in a new `ui` `Tooltip` over Reka's tooltip. Rejected: a reason the caller places, and an inline reason. `component-ownership.md` gains Tooltip under 23.6 on main.
- **Tooltip delay.** Reka's default `delayDuration` (700 ms), not 300 ms, so we don't add a number of our own.
- **Storage key.** `THEME_STORAGE_KEY = 'keeb-cad.theme'`, not VueUse's `vueuse-color-scheme`, because an app prefix avoids clashes on a shared origin and later keys follow as `keeb-cad.<concept>`.

**Never:**
- Out of scope: the palette's `Theme:` commands, the shortcut registry, the UiActions, the chrome, the Tree wrapper and screenshot baselines.
- No Storybook, `@vue/test-utils` or jsdom.
- No `@theme` alias for DESIGN.md's numeric small scale. Its comment reads "Small scale = Tailwind's default spacing 1 / 2 / 3 / 5", so its `'4': 20px` is Tailwind's `5`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Non-Latin layout | `R` set; keydown `key 'к'`, `code 'KeyR'` | callback with R's id | — |
| Dvorak | `T` and `K` set; keydown `key 't'`, `code 'KeyK'` | callback with T's id only | — |
| Rounding moved | `formatNumber(1.005, 'mm')` | `≈ 1.01 mm` | — |
| Non-finite / bad hotkey | `formatNumber(NaN, 'mm')`, `formatHotkey('mod+')` | throws | caller's bug |
| Stored theme | storage holds `light`, OS prefers dark | `data-theme="light"` on `<html>` when `mountEditor` returns | storage that throws reads as auto |
| Disabled button | `Button` with `disabledReason`, focused | tooltip shows the reason; a click emits nothing | — |

</frozen-after-approval>

## Code Map

- `packages/editor/{tsconfig.json,tsconfig.app.json,tsconfig.node.json,tsconfig.vitest.json,env.d.ts,vitest.config.ts}` -- the layout ui copies.
  - Do not copy the vitest config's `// … (AD-26, Verification layer 2)` comment.
  - `optimizeDeps.include` becomes `vue`, `reka-ui`, `@zag-js/hotkeys`, `@lucide/vue` and `@vueuse/core`.
  - Root `vitest.config.ts:61` picks configs up by glob. A `tsconfig.vitest.json` gives ui a types project.
  - ui leaves the mutation runs, which is correct: it is not a priority package.
- `packages/ui/tsconfig.json` -- the old composite layout. Delete the stale `dist/` and `tsconfig.tsbuildinfo`. Root `tsconfig.json:11` already references the package.
- `packages/editor/src/App.spec.ts` -- the test style to follow: `render`, then `expect.element(screen.getByRole(…))`.
- `packages/editor/src/mount-editor.ts` -- gets the theme call and the stylesheet import.
- `packages/commands/package.json` -- the precedent for declaring a `workspace:*` dependency on a sibling.
- `.dependency-cruiser.mts`
  - `ws()` (L126) matches both `packages/ui/…` and `@keeb-cad/ui/…`. Editor's drawn edge already admits `@keeb-cad/ui/theme.css`; D3 only pins that.
  - `onlyImports` (L165-176) is the shape for the new rule. It does not reuse `TEST_FILE` or `TESTING_FOLDER` (L156): both match every package, and the exemption is ui's alone.
  - `only-ui-imports-reka-and-zag` (L353-358) covers `reka-ui|@zag-js/hotkeys` only. Lucide joins it.
  - `tooling/ad10/violations/packages/model/src/x.spec.ts` is the precedent for an allowed fixture.
  - A rule `comment` carries no AD-n.
- `tooling/ad10/rules.spec.ts` -- L263-267 require every rule to fire on a fixture. The hand-written list starts at L151.
- `eslint.config.ts` -- `NODE_FILES` (L37-45), the entry re-export rule (L292, scoped to `packages/*/src/**`), and plugins as root devDependencies (L10-11).
- `tooling/lint/rule-messages.ts`, `cold-config-timeout.ts` -- the lint spec helpers.
- `tooling/check-steps.spec.ts:17-27` -- pins the root scripts. Its test title names the steps.
- `pnpm-workspace.yaml` -- `catalogMode: strict`. tailwindcss and @tailwindcss/vite become shared, so they go in the catalog.
- zag 1.47.0 exports:
  - `formatHotkey(h, { platform, style, separator })`, `validateHotkey`, `parseHotkey`, `getPlatform`;
  - `createHotkeyStore({ target })` with `register`, `clear` and `destroy`. It defaults to `preventDefault: true` and `enableOnFormTags: false`, and it matches a letter by `key` **or** `code` when all four modifiers match. Every top-priority match runs.
- Reka:
  - Tabs: `role=tab`, `aria-selected`, `data-state="active|inactive"`.
  - Tooltip: `TooltipProvider`, `TooltipRoot`, `TooltipTrigger`, `TooltipContent`. `TooltipRoot` needs a provider ancestor.
- `@fontsource-variable/jetbrains-mono` registers `'JetBrains Mono Variable'`.
- Tailwind 4:
  - `@theme static` emits every variable, used or not, which canvas `var(--…)` reads need.
  - `--spacing: 4px` sets the step, and `--spacing-<name>` adds named aliases.
  - Workspace packages sit behind `node_modules` symlinks, so each needs an `@source`.
- VueUse `useColorMode({ attribute, selector, storageKey, initialValue })` -- modes `dark`, `light` and `auto`. In `auto` it writes the OS-resolved mode to the attribute.

## Tasks & Acceptance

**Execution:**
- [ ] `pnpm-workspace.yaml` and the ui, editor, app and root `package.json` files:
  - Add the dependencies. tailwindcss and @tailwindcss/vite go in the catalog.
  - Editor gains `"@keeb-cad/ui": "workspace:*"`.
  - The root devDependencies gain `eslint-plugin-better-tailwindcss`.
  - ui gets `exports["./theme.css"]` and the scripts `workbench` and `build:workbench`.
  - Root `check` runs `build:workbench` after `build`. `check-steps.spec.ts` follows. Its test is split in two: one names the `check` chain and asserts only `check`; the other names the scripts it pins and asserts them.
- [ ] `packages/ui/{tsconfig.json,tsconfig.app.json,tsconfig.node.json,tsconfig.vitest.json,env.d.ts,vitest.config.ts}`:
  - Copy editor's layout. `tsconfig.app.json` also includes `workbench/`, and `tsconfig.node.json` includes `workbench/vite.config.ts`.
  - The vitest config adds `tailwindcss()`.
- [ ] `packages/ui/src/theme/theme.css`:
  - `@import "tailwindcss"`, the font, and `@source ".."`.
  - Set `--color-*`, `--text-*`, `--radius-*`, `--font-*` and `--shadow-*` to `initial`.
  - `@theme static` holds:
    - every DESIGN.md colour at its unsuffixed (Frappé) value;
    - `--spacing: 4px` and the named spacing aliases;
    - `--radius-sm/md/lg/full`;
    - the typography tokens (`--text-<name>`, plus `--line-height`, `--letter-spacing` and `--font-weight`);
    - `--font-mono: "JetBrains Mono Variable", monospace` and `--font-ui: system-ui, sans-serif`.
  - Latte values under `[data-theme="light"]` and under `@media (prefers-color-scheme: light) { :root:not([data-theme]) }`, the pre-mount fallback. Frappé values under `[data-theme="dark"]`.
  - The selectors match any element, so the workbench can show both themes side by side.
- [ ] `packages/ui/src/theme/{theme-storage-key.ts,use-theme-choice.ts}` -- `THEME_STORAGE_KEY = 'keeb-cad.theme'`. `useThemeChoice()` wraps `useColorMode({ attribute: 'data-theme', selector: 'html', storageKey: THEME_STORAGE_KEY, initialValue: 'auto' })`. Storage errors are swallowed and the mode stays `auto`. `ThemeChoice` goes in `theme/types.ts`.
- [ ] `packages/ui/src/format/format-number.ts` -- `formatNumber(value, unit)`. `DisplayUnit = 'mm' | 'deg'` goes in `format/types.ts`.
  - It throws on non-finite input.
  - It rounds half away from zero on the shortest decimal string (`String(value)`, exponent forms too), never with binary `toFixed`.
  - At most 2 decimals, no trailing zeros.
  - `.` as the separator, no grouping.
  - `−` (U+2212) for a negative result. A result that rounds to zero prints `0`.
  - `≈ ` in front when the rounded value is not equal to `value`.
  - The unit is appended as ` mm` or `°`.
- [ ] `packages/ui/src/hotkeys/format-hotkey.ts` -- `formatHotkey(hotkey, platform)`:
  - it throws on a hotkey `validateHotkey` rejects;
  - mac: zag's symbols with separator `''`;
  - elsewhere: text with separator `+`.

  It imports zag as a namespace (`import * as hotkeys from '@zag-js/hotkeys'`), so no alias is needed. `Platform` (re-exported from zag's type) and `HotkeyEntry = { id: string; hotkey: string }` go in `hotkeys/types.ts`.
- [ ] `packages/ui/src/hotkeys/hotkey-layer.ts` -- `class HotkeyLayer`, holding one zag store:
  - `constructor(target, onHotkey: (id: string) => void)`;
  - `replaceHotkeys(entries: readonly HotkeyEntry[])` throws on a bad hotkey before it registers anything;
  - `destroy()`.

  `matches-typed-letter.ts` holds the Latin guard. A matched entry whose hotkey's key is a letter is dropped when `event.key` is a Latin letter other than that one.
- [ ] `packages/ui/src/icon/{Icon.vue,icons.ts,types.ts}`:
  - `Icon` takes `name: IconName`, keyed into `icons.ts`, ui's map of lucide components. It renders at 16px with stroke 1.5.
  - It is `aria-hidden` unless it has a `label`.
  - The map starts with `close` (`X`), and each later story adds the icons it uses.
- [ ] `packages/ui/src/button/Button.vue`:
  - Styled from DESIGN.md `button`, with `hover:` and `active:bg-fill-on`.
  - `disabledReason` gives `aria-disabled="true"`, `aria-disabled:` styles, no `click`, and a wrapping `Tooltip` that shows the reason.
- [ ] `packages/ui/src/tooltip/Tooltip.vue` -- over Reka, with `content` text and its own `TooltipProvider`. Styled from DESIGN.md's overlay tokens.
- [ ] `packages/ui/src/kbd/Kbd.vue` -- renders `formatHotkey(hotkey, getPlatform())` in a `<kbd>`.
- [ ] `packages/ui/src/tabs/{Tabs.vue,types.ts}`:
  - `v-model`, `items: readonly TabItem[]` (`{ value: string; label: string }`), and one named slot per value.
  - Styled from `workspace-tab` and `workspace-tab-active` through `data-[state=active]:`.
- [ ] `packages/ui/src/index.ts` -- re-exports only.
- [ ] `packages/ui/workbench/{index.html,main.ts,mount-workbench.ts,Workbench.vue,vite.config.ts,workbench.css,states/types.ts,states/*-states.ts}`:
  - `main.ts` only re-exports `mount-workbench.ts`.
  - `WidgetState = { name, props, slots? }` goes in `states/types.ts`.
  - Each state renders twice, side by side, under `data-theme="dark"` and `data-theme="light"`.
- [ ] `packages/ui/src/**/*.spec.ts` -- the N, H, K, C, P and W rows.
  - Component specs `it.each` over their state file. Each state asserts its element by role and accessible name.
  - Computed styles use DESIGN.md's hex values.
  - Specs that touch `localStorage` or `<html>` reset them in `afterEach`.
  - C1–C3 and E1 set the OS scheme with a Vitest browser command `setColorScheme(scheme)`, which calls Playwright's `page.emulateMedia({ colorScheme })`. It is defined in ui's and editor's vitest configs and reset in `afterEach`. C3 makes storage throw with `vi.spyOn(Storage.prototype, 'getItem' | 'setItem')`, restored in `afterEach`.
- [ ] `packages/editor/src/{styles.css,mount-editor.ts,mount-editor.spec.ts}`:
  - `styles.css` holds `@import "@keeb-cad/ui/theme.css"` and `@source "."`.
  - `mountEditor` imports it and calls `useThemeChoice()` before `app.mount`.
  - Editor's `vitest.config.ts` adds `tailwindcss()`.
- [ ] `app/vite.config.ts` -- `tailwindcss()`.
- [ ] `.dependency-cruiser.mts` -- two rule changes:
  - Add the rule `only-ui-imports-the-workbench`:
    - `from.pathNot`: `^packages/ui/workbench/`, `^packages/ui/src/.+\.spec\.ts$` and `^packages/ui/src/testing/`;
    - `to.path`: `^(packages/ui/workbench/|@keeb-cad/ui/workbench)`.
  - Rename `only-ui-imports-reka-and-zag` to `only-ui-imports-its-widget-libraries`, with target `npm('reka-ui|@zag-js/hotkeys|@lucide/vue')`.
- [ ] `tooling/ad10/violations/` -- new fixture files:
  - `packages/ui/workbench/states/button-states.ts`, the target;
  - `packages/editor/src/workbench-import.ts`, imports it by relative path (D1);
  - `packages/ui/src/button/button.spec.ts`, allowed (D2);
  - `packages/editor/src/theme-import.ts`, imports `@keeb-cad/ui/theme.css` (D3);
  - a `@lucide/vue` line in `packages/editor/src/index.ts` (D4) and an allowed one in `packages/ui/src/index.ts`.
- [ ] `tooling/ad10/rules.spec.ts` -- `v(…)` rows for D1 and D4, and `allows …` rows for D2 and D3.
- [ ] `eslint.config.ts` and `tooling/lint/no-arbitrary-values.spec.ts`:
  - better-tailwindcss with `settings.entryPoint: 'packages/ui/src/theme/theme.css'`;
  - `no-restricted-classes` on `**/*.vue`;
  - the `NODE_FILES` additions;
  - the L rows assert the whole message list as `[expect.objectContaining({ ruleId, severity: 2, line })]`, not the exported message text.
- [ ] `tooling/design-tokens.spec.ts` -- the T rows:
  - `it.each` over entries parsed from DESIGN.md's frontmatter;
  - a guard first: each group's parsed list `toHaveLength` the count DESIGN.md has.
- [ ] `_bmad-output/initiative-keeb-cad-m1/deferred-work.md` -- one entry per precedent finding, as logged.

**Boundary table** (frozen as acceptance):

| # | Group | Input | Expected | Level |
|---|-------|-------|----------|-------|
| N1 | rules | `(19, 'mm')` | `19 mm` | unit, ui |
| N2 | rules | `(1.004, 'mm')`, `(1.005, 'mm')`, `(1.006, 'mm')` (half: below, on, above) | `≈ 1 mm`, `≈ 1.01 mm`, `≈ 1.01 mm` | unit, ui |
| N3 | rules | `(0.0049, 'mm')`, `(0.005, 'mm')`, `(0.0051, 'mm')` | `≈ 0 mm`, `≈ 0.01 mm`, `≈ 0.01 mm` | unit, ui |
| N4 | rules | `(1.1, 'mm')`, `(1.25, 'mm')`, `(1.255, 'mm')` (decimals: 1, 2, 3) | `1.1 mm`, `1.25 mm`, `≈ 1.26 mm` | unit, ui |
| N5 | rules | `(-0.004, 'mm')` | `≈ 0 mm` | unit, ui |
| N6 | rules | `(0, 'mm')`, `(-0, 'mm')` | `0 mm` | unit, ui |
| N7 | rules | `(-1.005, 'mm')`, `(-3.4, 'deg')` | `≈ −1.01 mm`, `−3.4°` (U+2212) | unit, ui |
| N8 | rules | `(15, 'deg')`, `(0.123, 'deg')` | `15°`, `≈ 0.12°` | unit, ui |
| N9 | rules | `(1e-7, 'mm')`, `(1e21, 'mm')` | `≈ 0 mm`, `1000000000000000000000 mm` | unit, ui |
| N10 | rules | `(123456.789, 'mm')` | `≈ 123456.79 mm` | unit, ui |
| N11 | rules | `NaN`, `Infinity`, `-Infinity` | throws | unit, ui |
| H1 | rules | `mod+K` on mac / windows / linux | `⌘K` / `Ctrl+K` / `Ctrl+K` | unit, ui |
| H2 | rules | `mod+shift+S` on mac / windows | `⇧⌘S` / `Ctrl+Shift+S` | unit, ui |
| H3 | rules | `F1` on mac / windows | `F1` / `F1` | unit, ui |
| H4 | rules | `''`, `mod+` | throws | unit, ui |
| K1 | glue | `R` set; keydown `key 'к'`, `code 'KeyR'` | callback with R's id | unit, ui |
| K2 | glue | `R` set; keydown `key 'r'`, `code 'KeyR'` | callback with R's id | unit, ui |
| K3 | glue | `T`, `K` set; keydown `key 't'`, `code 'KeyK'` (Dvorak) | callback with T's id only | unit, ui |
| K4 | glue | `Q` set; keydown `key 'a'`, `code 'KeyQ'` (AZERTY) | no callback | unit, ui |
| K5 | glue | `R` set; the K2 keydown from a focused `<input>` | no callback | unit, ui |
| K6 | glue | `replaceHotkeys([A])`, then `replaceHotkeys([B])`, press A | no callback | unit, ui |
| K7 | glue | `replaceHotkeys([])`, press R | no callback | unit, ui |
| K8 | glue | `destroy()`, press R | no callback | unit, ui |
| K9 | glue | `ctrl+K` set, matching keydown | `defaultPrevented` true | unit, ui |
| K10 | glue | `replaceHotkeys([R, { hotkey: 'mod+' }])` | throws; pressing R fires nothing | unit, ui |
| C1 | glue | OS dark; stored `light`, `dark`, `auto`, `bogus`, nothing | `data-theme`: `light`, `dark`, `dark`, `dark`, `dark` | unit, ui |
| C1b | glue | OS light; stored nothing | `data-theme="light"` | unit, ui |
| C2 | glue | OS dark; mode set to `light`, then to `auto` | storage `light`, then `auto`; attribute `light`, then `dark` | unit, ui |
| C3 | glue | OS dark; `getItem` and `setItem` throw | mode `auto`, attribute `dark`, nothing thrown | unit, ui |
| C4 | glue | `Button` under `data-theme` dark / light | background `#303446` / `#eff1f5`; border `#838ba7` / `#7c7f93` | unit, ui |
| C5 | glue | `Button` with `disabledReason`, clicked | `aria-disabled="true"`, no `click` | unit, ui |
| C6 | glue | `Tooltip`, trigger focused | content with its text visible | unit, ui |
| C7 | glue | `Tooltip`, pointer enter, fake timers at 699 / 700 / 701 ms | hidden / visible / visible | unit, ui |
| C8 | glue | `Button` with `disabledReason`, focused | tooltip with the reason visible | unit, ui |
| C9 | glue | `Tabs`, click the second tab | `update:modelValue` with its value; it has `aria-selected="true"` | unit, ui |
| C10 | glue | `Tabs` with `items: []` | a `tablist` with no `tab` | unit, ui |
| C11 | glue | `Kbd hotkey="mod+K"` | text is `formatHotkey('mod+K', getPlatform())` | unit, ui |
| C12 | glue | `Icon name="close"` without / with `label` | `aria-hidden="true"` / `role="img"` named by the label; width 16 | unit, ui |
| P1 | glue | `font-mono` text | computed `font-family` starts with `"JetBrains Mono Variable"` | unit, ui |
| W1 | glue | each state file's states | each renders, found by its role and name | unit, ui |
| E1 | glue | OS dark; storage holds `light`; `mountEditor` returns | `<html data-theme="light">` | unit, editor |
| L1 | rules | `class="p-[7px]"`, `class="bg-[#fff]"` | error | unit, tooling |
| L2 | rules | `class="hover:p-[7px]"` | error | unit, tooling |
| L3 | rules | `class="[mask:none]"`, `class="p-(--x)"` | error | unit, tooling |
| L4 | rules | `:class="'p-[7px]'"` | error | unit, tooling |
| L5 | rules | `class="data-[state=active]:bg-panel aria-disabled:text-text-muted p-3 p-pad"` | no message | unit, tooling |
| D1 | module boundaries | `packages/editor/src/x.ts` imports `../../ui/workbench/states/button-states` | `only-ui-imports-the-workbench` | unit, tooling |
| D2 | module boundaries | `packages/ui/src/button/Button.spec.ts` imports `../../workbench/states/button-states` | allowed | unit, tooling |
| D3 | module boundaries | `packages/editor/src/theme-import.ts` imports `@keeb-cad/ui/theme.css` | allowed | unit, tooling |
| D4 | module boundaries | `packages/editor/src/index.ts` imports `@lucide/vue` | `only-ui-imports-its-widget-libraries` | unit, tooling |
| T1 | rules | each DESIGN.md colour without `-light` | its value in `@theme` and in `[data-theme="dark"]` | unit, tooling |
| T2 | rules | each `-light` colour | its value in both light blocks | unit, tooling |
| T3 | rules | each named `spacing:` entry and each `rounded:` entry | `--spacing-<name>` / `--radius-<name>` with its value | unit, tooling |
| T4 | rules | each `typography:` entry | `--text-<name>` with its size, line height, weight and letter spacing | unit, tooling |

**Acceptance Criteria:**
- Given `pnpm check`, then it passes, `build:workbench` included.
- Given `pnpm --filter @keeb-cad/ui workbench`, when Sergii opens it, then every state of every component shows in both themes (manual).
- Given every browser-mode test row (K, C, P, W, E), when its code is broken (a toggled bug), then it goes red. One line per test goes in the PR.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Design Notes

- `formatNumber` rounds the shortest decimal string, because `1.005` is `1.00499…` in binary and `toFixed(2)` gives `1.00`.
- Decision (plan): `Button` has no pressed state.
  - Rejected: a hand-set `aria-pressed`.
  - Why: AD-26 "Every ARIA widget (… toggle …) is a **Reka UI** primitive, never hand-built", and no 23.x story needs a toggle. The first toggle (Chip, slice 17) wraps Reka's `Toggle`.
- Decision (plan): `Icon` takes a `name` from ui's map.
  - Rejected: taking a lucide component.
  - Why: the Stack row "@lucide/vue (icons, `ui` only, AD-26)". A component prop would make editor import lucide.
- Decision (plan): `Tooltip` carries its own `TooltipProvider`.
  - Rejected: one provider at each root (app, workbench, every spec).
  - Why: Reka's `TooltipRoot` needs a provider ancestor, so a self-contained `Tooltip` works wherever `Button` is mounted.
- Decision (plan): `Tabs` takes `items` and named slots.
  - Rejected: exposing Reka's parts.
  - Why: AD-26 "generic widgets that take plain data".
- Decision (plan): `formatHotkey` wraps zag's.
  - Rejected: `Kbd` calling zag directly.
  - Why: AD-26 "Every `kbd` hint is formatted by its formatter", so the per-platform options live once. Its name says what it does; zag's function is imported under the same name only inside that file.
- Decision (plan): C11 expects `formatHotkey('mod+K', getPlatform())`, not a fixed `Ctrl+K`, and `Kbd` has no `platform` prop.
  - Why the expectation: the formatter is the requirement's named function, and H1–H3 pin its output per platform.
  - Why no prop: AGENTS rejects a seam only tests use ("never register a clock only so tests can control it").
- Decision (plan): E1 is an editor unit test of `mountEditor`.
  - Rejected: an `app` integration test.
  - Why: applying the theme before mount is editor's own step, since only editor imports ui (AD-10).
- Decision (plan): no hotkey fires in a form field yet (`enableOnFormTags: false`).
  - Rejected: a per-entry `global` flag.
  - Why: the ticket gives the layer only "plain { id (an entry id), hotkey } data".
- Decision (plan): `HotkeyLayer` is a plain class, not a di service.
  - Why: AD-10 "`ui` … imports no workspace package", so it can't be a di service itself. Story 7 builds it inside an editor service.
- Decision (plan): `HotkeyEntry` and `replaceHotkeys`, not `binding` or `bind`.
  - Why: the glossary's **binding** is "What one key does on one keymap layer". `entry` stays, because the spine already calls the store's commands and actions entries and the ticket says "an entry id".
- Decision (plan): `WidgetState`, not `ComponentState`, because the glossary's **component** is a part's component, while AD-26 says "generic widgets".
- Decision (plan): storage failure is tested by spying on `Storage.prototype`, not through a `storage` parameter on `useThemeChoice`. Why: AGENTS rejects a seam only tests use ("never register a clock only so tests can control it"), and ui can't use di (AD-10).
- Decision (plan): the OS scheme is set per test by a `setColorScheme` browser command over Playwright's `emulateMedia`. Rejected: a fixed `colorScheme` per browser project. Why: rows C1 and C1b need both schemes in one run.
- Decision (plan): `@theme static`, not plain `@theme`.
  - Why: AD-26 "classes and the SVG canvas's `var(--…)` read one source". A plain `@theme` drops variables no class uses.

## Conformance Log

Pass 1 (two readers, union; 0 dropped):
- `Make package entry files (`index.ts`, `main.ts`, `worker.ts`) only re-export` -- workbench `main.ts` -- fixed
- `When a decision builds by hand the main job of a dependency in the spine's Stack table, that dependency is its Y.` -- theme read/apply vs VueUse -- asked (VueUse chosen)
- `test wiring between packages as integration in `pipeline` or `app`` -- E1 level -- fixed (decision)
- `When nothing says what a boundary returns, ask.` -- storage that throws -- fixed (VueUse catches; C3); bad hotkey string -- asked (throw)
- `Give every test an `expect` that fails when the behaviour breaks.` -- per-state assertion -- fixed (W1)
- `Put every type a folder declares, private ones included, in that folder's `types.ts`` -- fixed
- editor layout copy omits `tsconfig.vitest.json` -- fixed
- `No AD-n or ticket references` -- precedents `packages/editor/vitest.config.ts`, `.dependency-cruiser.mts`, `eslint.config.ts` -- deferred
- `Take expected values from the requirement` -- precedent `tooling/lint/no-test-ids.spec.ts` -- deferred; L rows assert rule id, not the constant -- fixed
- `Give every decision its rejected alternative` -- TooltipProvider, Tabs shape, formatHotkey wrapper, Tooltip delay -- fixed
- `no expected value computed the way production computes it` -- C11 -- fixed (decision)
- `Every ARIA widget (… toggle …) is a **Reka UI** primitive, never hand-built.` -- Button pressed -- fixed (dropped)
- depcruise subpath pointer (ENTRY_ONLY) -- fixed (ws() already admits it)
- workbench `to` misses bare specifiers -- fixed
- `No `if` or loop around `expect`` -- T rows -- fixed (it.each + length guard)
- `Give every threshold three rows` -- half-rounding above -- fixed
- `Glossary terms only.` -- `binding` -- fixed (`HotkeyEntry`)
- `Name a thing for what it does … never after the library it wraps.` -- formatHotkey -- fixed (namespace import)
- Monorepo row lists ESLint plugins -- fixed (amended on main)

Gap review (0 dropped):
- gap: `packages/ui/src/button/Button.vue` toggle -- fixed
- gap: `hotkeys/`, `tabs/`, `workbench/states/`, `format/` types -- fixed
- gap: `packages/ui/workbench/main.ts` -- fixed
- gap: `HotkeyLayer.bind` vs glossary binding -- fixed
- gap: toggled-bug proof for every browser-mode test -- fixed
- gap: `replaceHotkeys([])`, `Tabs` empty, bad hotkey, half above -- fixed
- gap: `applyThemeChoice` rows in ui, `Tooltip` own rows -- fixed
- gap: unlabelled decisions (TooltipProvider, Tabs, fence exemption, getPlatform) -- fixed
- gap: spacing, rounded, typography token rows -- fixed (T3, T4)
- gap: `packages/ui/tsconfig.vitest.json` -- fixed
- gap: editor importing `@lucide/vue` via Icon -- fixed (icon map)
- gap: `packages/editor/src` classes missing from the app build -- fixed (`styles.css` `@source`)
- gap: canvas `var(--…)` with plain `@theme` -- fixed (`@theme static`)
- gap: `packages/editor/package.json` lacks `@keeb-cad/ui` -- fixed
- gap: `HotkeyLayer` in di -- fixed (decision)
- gap: ui `testing` folder blocked by the fence -- fixed

Final pass (0 dropped):
- Stack `@lucide/vue (icons, `ui` only, AD-26)` -- fence missing -- fixed (D4)
- workbench rule exemptions contradict -- fixed
- D1-D3 fixtures not listed -- fixed
- `never register a clock only so tests can control it` -- `useThemeChoice(storage?)` -- fixed
- `Give every decision its rejected alternative` -- HotkeyLayer, storage key -- fixed (key asked)
- zag import alias -- fixed
- OS colour scheme uncontrolled -- fixed (`setColorScheme`)
- `Glossary terms only.` -- `entry`, `component` -- fixed (decisions)
- `Make a test's name and its `expect`s claim the same thing.` -- precedent `tooling/check-steps.spec.ts` -- fixed (split in this PR)
- `Hold state in `di` services` / comment rule -- precedent `tooling/lint/rule-messages.ts` -- deferred

Final-pass fixes no reviewer has read: the D1-D4 fixture list, `setColorScheme`, the Storage spy, the lucide rule rename, the namespace import, the `WidgetState` rename, the check-steps split.

## Verification

**Commands:**
- `pnpm test` -- passes, with ui's specs in Chromium and Firefox.
- `pnpm check` -- passes.
