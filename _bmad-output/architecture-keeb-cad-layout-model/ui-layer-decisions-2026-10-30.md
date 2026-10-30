---
title: 'Editor UI layer: decisions and spike evidence'
date: '2026-10-30'
status: decided
feeds: [architecture-keeb-cad-layout-model.md (AD-10, AD-22, AD-26, Stack, Structural Seed, Open Questions), ux-editor/DESIGN.md, ux-editor/EXPERIENCE.md]
---

# Editor UI layer: decisions and spike evidence (2026-10-30)

Party-mode session with Sergii. It started from "I don't remember deciding how components are created". The session found that this had never been decided.

## Why this was opened

- `EXPERIENCE.md` said "No UI component library: custom Vue components on Catppuccin tokens".
- The UX memlog's upstream entry only said "no UI component library … **chosen**", meaning not yet chosen. The wording changed during the distill.
- Styling (Tailwind or CSS) had never been discussed.
- DESIGN.md's `pad: 13px` and its spacing scale were `[ASSUMPTION]`s lifted from the calm mock's CSS.

## Decisions (all by Sergii)

1. **Headless primitives, none built by hand.** "A combobox with right keyboard accessibility is not something an agent makes right."
2. **Reka UI** for widgets. Ark UI was the alternative; the evidence is below.
3. **`@zag-js/hotkeys` for shortcuts and VueUse for low-level Vue utilities.** The hotkey store is fed *from* the command register (AD-2) and is never a second register.
4. **A `packages/ui` package with no workspace imports.** Sergii's own call: the wrappers "look like a new package". It holds:
   - the tokens
   - thin Reka wrappers
   - the hotkey layer
   - generic widgets that take plain data

   Domain components stay in `editor`, by concept.
5. **Tailwind 4**, with the tokens in `@theme`. The same custom properties are read by the utility classes and by the SVG canvas.
6. **The spacing scale is Tailwind's 4px grid.** `pad` changes from 13px to 12px ("13px looks weird"). The scale is 4 / 8 / 12 / 20, and the DESIGN.md names stay as aliases.
7. **`ui` components are written from scratch.** shadcn-vue is reading material only: no CLI and no `cn`.
8. **No `cn` and no `cva` for now.**
   - States are styled through ARIA and data-attribute variants.
   - A true variant is a plain object.
   - Callers pass only outer layout classes.

## Spike 1: Reka UI 2.11.0 vs Ark UI 5.40.0

Two agents built the same page against one checksummed Playwright suite: 22 tests per browser, Chromium and Firefox. The page held:

- an expression field that completes the token at the caret
- an SVG canvas with a context menu (pointer, Shift+F10, the ContextMenu key)
- a focus trap inside SVG
- app shortcuts

| | Reka | Ark |
|---|---|---|
| Tests | 44/44 | 44/44 |
| Lines / glue | 244 / ~40 (22 of them hotkeys, hand-rolled) | 233 / ~26 (0 for hotkeys) |
| Completing the token at the caret | `Autocomplete` (new in 2.x) fits | zag's `setCaretToEnd` fights it; the glue still has a ~16 ms race |
| Gzip JS, including Vue | 61 kB | 80 kB |
| Library defects found | none | `FocusTrap asChild` crash; `anchorPoint` prop ignored; Vue `ContextTrigger` drops `value` |

**Glue Reka needs.** This is the list `ui` has to own, with one test per item:

- `ListboxFilter` takes Home/End even while the list is closed. Stop them in the capture phase.
- A context menu opened from the keyboard can't be anchored to a point. Dispatch a synthetic `contextmenu` event at the key.
- A pointer-opened menu focuses the menu content, not the first item. Handle this in `@open-auto-focus`.
- Tab does not accept the active option. That is our own convention.
- `ListboxItem` sets no `aria-disabled`, and it fires `select` even when disabled. Spike 2 found this.

**Watch items:**

- Enter-to-accept vs Enter-to-commit depends on Reka's handler running first. Nothing documents that order.
- An open combobox or modal calls `useHideOthers`, which puts `aria-hidden` on the rest of the page. That is right for the modal palette (EXPERIENCE: Modal) and wrong for the inline autocomplete. No prop was found to turn it off.

**SVG works.** `FocusScope as="g"` and `ContextMenuTrigger as-child` on `<svg>` both work.

**Hotkeys.** VueUse was checked:

- `onKeyStroke` only filters on a key.
- `useMagicKeys` tracks pressed state, not events.
- Neither has scopes, a field guard, conflict detection or a formatter.

`@zag-js/hotkeys` 1.47.0 runs standalone (its only dependency is `@zag-js/dom-query`). Its store gives:

- a command entry (`id`, `hotkey`, `label`, `category`, `enabled`, `scopes`, `keywords`)
- sequences
- conflict behaviour
- a recorder
- `formatHotkey`

## Spike 2: `ui` components from scratch vs copied from shadcn-vue

Both builds were on Reka + Tailwind 4 with the tokens in `@theme`. Each built a `Kbd`, context-menu wrappers and a generic `CommandPalette`. The same suite ran, plus computed-style checks against DESIGN.md: 27 tests per browser.

| | From scratch | shadcn-vue, copied then edited |
|---|---|---|
| Tests | 54/54 | 54/54 |
| `src/ui` | 114 lines, 5 files | 619 lines, 23 files (42 installed, 23 deleted, 17 of the 19 kept files rewritten) |
| Longest class list | 193 chars | 281 chars |
| Hidden cost | none | shadcn's `cn` silently dropped `text-ui`, because unknown `text-*` classes count as colors, so every theme name must be registered |
| CLI | — | `add` needs `components.json`; it pulled `cn`, `lucide` and a `button` whose `cva` dependency was not installed |

shadcn gave a real head start in two places only: prop forwarding and the command filter. The from-scratch build matched both through Reka's `useFilter`.

The palette came out non-modal in both builds only because of one old spike test. EXPERIENCE.md already says the palette is modal.

## Unmade, found by a sweep of the spines

These are items the first editor slices need that were never decided, or that look decided but aren't. They are listed in the spine's Open Questions.

**Never decided:**

- the icon source for the left rail
- how JetBrains Mono is delivered (self-hosted or otherwise)
- how the user switches between dark and light, and where that choice is stored
- whether long lists are virtualized (tree, violations). Reka has `TreeVirtualizer`.
- what vue-router is for
- component tests or a workbench for `ui`
- the UI's number formatting

**Looks decided but isn't:**

- the toast mechanism, its timing and its position (all `[ASSUMPTION]`)
- the radii 3/4/6, which DESIGN.md says were "never chosen explicitly"

**Still unverified:**

- whether `@zag-js/hotkeys` can bind to physical keys (`KeyboardEvent.code`), which EXPERIENCE.md requires.
