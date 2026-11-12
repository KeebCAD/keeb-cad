---
title: 'T toggles the slide-out'
type: 'feature'
ticket: '28'
created: '2026-11-12'
status: 'done'
baseline_revision: 'a0f7657991464436f14eab27c2e145675fe9aacc'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: [quick, test-reviewer]
review_loop_iteration: 1
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** T only opens the slide-out (unavailable while open) and Esc closes it, so Esc is taken from the innermost step (EXPERIENCE.md Esc precedence) and the rail button has to pick between two UiActions by state.

**Approach:** One UiAction, `ToggleSlideOut` (service: a UiAction resolved from `di`, changing `SlideOut`'s state; hotkey `T`, always available), opens the slide-out when closed and closes it when open; `OpenTree` and `CloseSlideOut` go, so nothing binds Esc to the slide-out. The rail's Tree button invokes the same UiAction. T opens on the last-used tab, which today is always the Tree, the only tab.

**Decisions (plan):**
- `ToggleSlideOut`, not `ToggleTree`, because EXPERIENCE.md's slide-out row says "T opens it on the last-used tab", so with a second tab T would not open the Tree. Id `slideOut.toggleSlideOut`, label `Toggle slide-out`, after `close-slide-out.ts:11-12`'s `slideOut.closeSlideOut` / `Close slide-out`.
- No last-used-tab state in `SlideOut`, not a `tab` ref now, because the ticket says "the Tree, the only tab today"; the story that adds a second tab adds it.
- `available()` returns `true`, not a state check, because the ticket asks T to act both open and closed; precedent `focus-next-landmark.ts:16-18`.
- The spec's two availability rows are dropped, not rewritten for the new handle, because the T-opens-then-closes row fails when T is unavailable in either state (AGENTS.md: "Assert what a function returns or a visible effect").

## Boundary table

| Group | Row | Input / state | Expected | Level |
|---|---|---|---|---|
| rules | T while closed | slide-out closed, press T | slide-out open, focus on its first meaningful item | unit, editor browser |
| rules | T while open | slide-out open, press T again | slide-out closed, focus returned (invoker, else canvas, unless moved out) | unit, editor browser |
| rules | Esc while open | slide-out open, focus on a Tree row, real Esc keydown | slide-out stays open | unit, editor browser |
| glue | rail button | click Tree twice | open with `aria-expanded=true`, then closed with `false` | unit, editor browser |

</frozen-after-approval>

## Implementation Notes

Oneshot: six files, about 60 lines, one UiAction swap plus its spec rows.

- `open-tree.ts` renamed to `toggle-slide-out.ts` (`ToggleSlideOut`); `close-slide-out.ts` deleted; `editor-module.ts` registers the one UiAction; `LeftRail.vue`'s `toggle()` invokes it; `slide-out.spec.ts` rows rewritten, `arrange(design?)` now takes the design.
- Toggled bug (Esc row): `hotkeys = ['T', 'Escape']` turned "stays open on Esc with focus in the Tree" red in Chromium and Firefox, light and dark; restored.
- Toggled bug (T row): `available()` back to `!isOpen` turned "closes on T typed with focus on a Tree row" and every close-on-T row red (24 failures); restored.
- No structural changes (tsconfig, package.json, configs); no fakes of a third-party host, so no `Real-host run:` needed.
- Decision (build): the extra row "closes on T typed with focus on a Tree row", typed with `userEvent.keyboard('t')`, not only `press('T')` on `document`, because `press` (`testing/press.ts:9-21`) bypasses the focused row, and Reka's TreeRoot also handles printable keys on a row (review pass 1); it passes, so typeahead does not swallow T.
- Verification: `pnpm test` 578 files / 4712 tests green, no type errors; `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm depcruise` clean.

## Review Triage Log

Pass 1 (quick, test-reviewer): 0 high, 0 medium, 3 low, 0 false, 0 maybe-false, plus 1 deferred.
- quick: palette `Open tree` / `Open parameters` vs the toggle's label: real, no palette exists yet; defer (deferred-work.md entry).
- quick: no test types T on a focused Tree row (Reka typeahead): low; patched, new row "closes on T typed with focus on a Tree row", green.
- quick: the Esc row and the `it.each` mount the shell outside `arrange`: low, simple correction; patched, `arrange(design?)`.
- test-reviewer: the Esc row's `toBeVisible()` could pass before a late close: low; rejected, the realistic regression (Esc bound again) was proven red by a toggled bug, and `ToggleSlideOut.apply` closes synchronously.

Pass 2 (quick, test-reviewer, on the patched spec): 0 high, 0 medium, 2 low, 2 false. Ends the loop.
- test-reviewer: the Esc row's late-close concern again: low, logged, as pass 1.
- quick: the T row uses row `a`, so typeahead never moves focus on `t`: low, logged; with a row starting with `t` focus moves inside the slide-out and `returnFocus` (`use-slide-out.ts:14-21`) still returns it to the invoker.
- quick: no Review Triage Log: false, written at finalize (this section).
- quick: no toggled-bug proof for the Esc row: false, done (Implementation Notes).

## Verification

**Commands:**
- `pnpm --filter @keeb-cad/editor test -- src/slide-out` -- expected: green in Chromium and Firefox
- `pnpm test` -- expected: whole suite green
- `pnpm lint` -- expected: clean
