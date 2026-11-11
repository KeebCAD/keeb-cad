# Reconcile review: Flows amendment (2026-11-11)

Scope: the uncommitted diff to `architecture-keeb-cad-layout-model.md` (glossary `add flow` and `flow` rows; AD-26 Prevents and new **Flows** bullet; Editor state row's devtools sentences; `load flow` -> `design loader` in AD-1, AD-13 and Data Schema; AD-10/AD-16 `flow` -> `read`; Open Questions `entry` row), reconciled against the memlog from "update run opened from 13.25 planning (Open Question: AddFlow's devtools classification)" to the end, ticket 13.25, EXPERIENCE.md and AGENTS.md.

Verdict: **revise before 13.25's plan resumes.** Every memlog decision lands, and none is contradicted. One typing rule does not compile as written (F1). Several divergence points between flow stories are left open (F2 to F7). Most rejected alternatives are carried, and the missing ones are low.

---

## 1. Memlog decisions vs the spine

| # | Decision (memlog) | Lands? | Notes |
|---|---|---|---|
| D1 | Flow defined: one intended outcome and needs input; palette and context menu are not flows; rejected Winston's broader lean | Yes (glossary `flow`) | The rejected alternative is not carried (low). The definition's scope is ambiguous for fields and action-finishing dialogs (F3). |
| D2 | Surface-independent: add flow, Part picker, anchor picker, pick modes | Yes (glossary, "Modal or not by its view") | The rejected alternative (flow = dialog and popover only) is carried implicitly by "a pick mode is a flow that is not modal". |
| D3 | Finish or cancel; Enter finishes and Esc cancels a pick mode, discarding picks; rejected EXPERIENCE l.234 | Mostly | "cancel ... changes nothing" and "CancelFlow (Escape)" imply discarding, but the spine never says so for a pick mode, and the rejected EXPERIENCE rule is not carried. Add "Esc in a pick mode cancels, discarding the picks so far, not EXPERIENCE's 'ends keeping what was picked', because one Esc meaning across flows is easier to learn" (low). |
| D4 | One flow at a time, parent-offered children; rejected B, C, D | Yes | C is carried ("not stacking any flow started while another is open"). B (flow-starting keys dead while a flow is open) and D (each story decides) are not (low). |
| D5 | A flow's own input starts nothing else; zoom, pan and fit run beside | Yes | |
| Q | Which actions count as viewing | Yes, inline "Open for the first pick-mode story" | Not in the Open Questions table. That matches how AD-26's other inline Opens are kept, so no change is needed. |
| D6 | One `Flows` service; verbs start, finish, cancel; rejected per-flow service plus coordinator, and event coupling | Yes | "Event coupling" (C) is not carried (low). |
| D7 | Stack; the draft lives on `Flows` | Yes | "Not the draft in the view" is carried. |
| D8 | The draft is the command's input as filled so far; no request type | Yes in words, **broken in its type** | `start<H>(flow, draft: CommandInput<H['command']>)`: `CommandInput` is `apply`'s parameter (`design/src/entries/types.ts:39`), so it is the parsed output, and `idSchema`'s output is branded `Id` (`schema/src/id.ts`). A draft holding `id: ''` or `Foo Bar` does not type-check. See F1. |
| D9 | Chaining with `land`; each finish its own commit; rejected a transaction rolled back on parent cancel | Yes | The rejected alternative is not carried (low; it is the one that explains why a parent's cancel keeps a child's commit). |
| Q | `entry` naming | Yes (Open Questions row) | |
| D10 | Class shaped like a command; `registerFlow` compile check (proved in a types spec); capabilities static; one press function; one per-item computed; status strip `hint`; one host | Yes | The names `FlowHandle` and `FlowCheck` and "proved in a types spec" are dropped (low). Rejected `defineFlow` plain object is not carried (low). The capabilities-at-start and canvas-tool-state rejections are carried. Inconsistency: "its instance methods are pure: ... and an optional `finished(draft)`". `finished` selects through an injected `Selection`, so it is not pure (F8). |
| D11 | No flows multi token | Yes, with reason | |
| D12 | `finished(draft)` only for the bottom of the stack | Yes | Rejected alternatives (Flows detecting "created", a static flag, the UiAction selecting) are not carried (low). |
| D13 | Devtools: read-only inspectable plus a flows timeline layer | Yes (Editor state row) | Id `keeb-cad.devtools.flows` and the event payloads (depth, dropped draft, parent's new draft) are reduced to prose (low). The cancel reason "Esc" is wrong for a modal flow: under a modal, Reka's dismiss calls `Flows.cancel` (Esc, outside click or a close button), so `Flows` can't know the key. Use "cancelled by the person" (low). "Not shown" as a rejected alternative is missing (low). Flow classes themselves are unclassified (F5). |
| D14 | `flow` is the person-facing concept; LoadFlow -> DesignLoader; AD-10 wording | Yes | Every `load flow` is now `design loader` (all 8, plus the Data Schema comments), and no stray meaning of `flow` remains. AD-10 reads "live read" rather than the memlog's "a live stage reading another": an equivalent wording. |
| D15 | A flow names its view; `FlowHost`; `useOpenFlow()`; accepted cost: a .ts flow imports a .vue | Mostly | `useOpenFlow()` and the accepted cost are not in the spine (low; precedent exists: `mount-editor.ts` and `create-editor-router.ts` import .vue). Rejected alternatives: the procedural await is carried; per-dialog watching and the `registerFlowView` registry are not (low). |
| D16 | `CancelFlow`/`FinishFlow` UiActions, available whenever a flow is open | Yes | The rejected alternatives (per-flow keys, non-modal only, leave it to the pick story) are not carried (low). The rule itself causes F2. |
| Q | Deferred items and the owed list | Partly | The spine says "13.25 builds `Flows` with its first flow". The memlog leaves "one story or a foundation story before it" to Sofia, so the spine prejudges her slicing. Reword to "the story that builds the add flow builds `Flows`" (low). |

Nothing in the spine lacks a supporting decision. The only additions are derived restatements ("the draft is the caller's input, so a parse failure is `input-invalid`", which follows from AD-26), and the name `rejectionText` for the Data Schema's unnamed "one pure editor function from a Rejection to the text". Name it in Data Schema too, or drop the name here (low).

## 2. Findings (rubric: divergence points, enforceability, open ends)

**F1 — High: the draft's type doesn't hold what the draft is said to hold.** `CommandInput<H>` is the parsed (`InferOutput`) type, with a branded `Id`. The add flow's draft must hold the typed text, empty or malformed included (AD-26: "a form passes its field as typed, empty included"). `invoke` and `available` already take `v.InferInput<H['input']>` (`invoke.ts:34`, `design-store.ts:54`). A pick flow's draft "as filled so far" also lacks required fields before its first pick (anchor target, attach point), which even `InferInput` refuses. As written, 13.25 has to cast, or pick its own type, and pick-mode stories will each choose differently. Fix: the draft is `v.InferInput<H['command']['input']>`, not `CommandInput`, because the draft is the caller's unparsed input. Then decide how a pick flow starts before its first pick: a starting value its UiAction or field supplies, or a declared partial draft type with `Flows` asking `available` only once it is complete.

**F2 — Medium: Enter (and Esc) claimed globally while any flow is open.** "`FinishFlow` (Enter) ... available whenever a flow is open" plus "a matched hotkey claims its key only when its entry is available" means:

- Enter on a focused button, link or Tree item finishes the pick instead of activating the focused element.
- Enter is claimed even when `Flows` has disabled finish on a refusal. That contradicts "a refusal disables finish".
- Inside the pick mode's own id field (EXPERIENCE: "type an id ... and press Enter"), the layer is off, so Enter never reaches `FinishFlow`. The spine doesn't say who finishes from that field.

Esc has a parallel gap. The hotkey layer listens on `document` and Reka's DismissableLayer on `window`, and dismisses only when not defaultPrevented (memlog l.534). So a non-modal Reka layer open beside a pick flow can't close on Esc before `CancelFlow` runs. Fix:

- `FinishFlow` is available when a flow is open and its draft's `available` is ok.
- State whether both keys act regardless of focus or only with focus on the canvas or Tree (AD-26: "each UiAction decides whether focus matters").
- Have a flow-owned field route Enter and Esc to `Flows` itself, as a modal view does.

**F3 — Medium: the definition's edges are open.** "One intended outcome that needs the person's input" also fits:

- the Expression field (applies many commands per focus session);
- the Binding field and its picker (EXPERIENCE l.127, listed in the memlog event but never classified);
- Parameters' F2 rename;
- dialogs that finish with an **action**, not a command (a New design name, Copy design, Save as).

The spine's flow has exactly one `static command`, so an action-finishing dialog either can't be a flow or bends the type. Fix: one sentence in the glossary row, "a field that applies as you type (expression, binding, rename) is not a flow; a flow finishes with a command, never an action or a UiAction, because ...", or widen `command` to an invokable handle (it hits the open `entry` naming question).

**F4 — Medium: re-check and teardown triggers are missing.**

- "As the top's draft changes, `Flows` asks `available`" omits design changes. During a non-modal pick flow, undo, Delete, a child's commit or a load can make the draft refused (or allowed) without the draft changing. Say "as the draft or the design changes", one computed over both.
- Nothing cancels open flows when the open design is replaced (`replaceDesign`: load, version switch, Take over) or when the tab is demoted to read-only. AD-13 already lists what a demoted tab drops: "an open expression session or nudge burst". It should drop open flows too, and the timeline's cancel reasons gain one.

**F5 — Medium: the originating question is only half answered.** `services-classified.spec.ts` records every class `editorModule` registers except those with `kind === 'ui-action'`. `registerFlow` registers each flow class in the container, so the add flow class(es) will fail that spec unless each is classified or filtered. The spine settles `Flows` (shown, read-only) but not flow classes. Fix: "a flow class carries a static `kind: 'flow'` and is not an inspectable, since `Flows`' stack shows it", or classify each as not shown.

**F6 — Medium: views of non-dialog flows.**

- "`view` (its component, for a dialog or popover flow)" with one `FlowHost` in the shell rendering it: a popover must anchor to its field (Part picker "anchored beside the field", EXPERIENCE l.125), and the draft carries no anchor. The spine doesn't say how the shell host finds that anchor.
- The anchor picker is a pick flow that also has a view: the 3x3 attach-point grid, arrows and Enter (l.124). The memlog says "a pick flow has no view"; the spine leaves it ambiguous.
- Whether `choose` may finish (one click on an attach point, or Enter on a Part row) is unstated. Anchor picker and Part picker stories will settle it differently.

**F7 — Medium: the status-strip hint would hard-code keys.** The static `hint` is "the status strip's text". EXPERIENCE's text is `picking: anchor · Enter done · Esc ends`, and AD-26 requires every kbd hint to come from its formatter (handles' hotkeys). Say that the hint names the flow and the strip appends `FinishFlow`'s and `CancelFlow`'s formatted hotkeys. The add flow dialog's "Esc hint" in 13.25 needs the same rule.

**F8 — Low: "pure" includes `finished`.** Reword: "`candidates` and `choose` are pure; `finished(draft)` may use injected services".

**F9 — Low: enforceability labels.** Several rules have no check and are not marked as reviewer rules, unlike the rest of AD-26 and the Editor state row:

- "surfaces read what the top flow offers, never which flow it is";
- "a flow checks its input nowhere else";
- "only state no other surface reads stays in the view".

Mark each "a reviewer rule" and add them to the review-guidance file (Agents row). `registerFlow`'s compile check is enforceable, subject to F1.

**F10 — Low: Tab cycling candidates.** EXPERIENCE gives anchor picking "Tab/Shift+Tab through candidate targets", and pick modes "Tab through candidates". Tab is focus navigation, and no rule assigns candidate cycling to `Flows` or to the surfaces. Fold it into the pick-mode Open.

**F11 — Low: Esc order with a modal over a pick.** The palette (a modal, not a flow) opened during a pick mode takes Esc first through Reka. EXPERIENCE's order puts "(4) end a pick mode" before "(5) close an overlay (palette ...)". The amendment's innermost-layer rule is right; EXPERIENCE's numbering is what needs fixing.

## 3. Ticket 13.25 mismatches (owed to Sofia)

1. "G and S are UiActions that open the add flow" should read: they **start** it through `Flows.start(flow, draft)`, with the draft `{ arrangement: 'free', parent, id: <minted> }` / `{ parent, id: <minted> }`. Say whether that is two flow classes (`static command` is one each: AddGroup's and AddSlot's) or one class per command plus a shared view.
2. "As you type, the flow asks ... availability" should read: the field binds to the draft on `Flows`; `Flows` asks `available(command, draft)`; the view shows `rejectionText`.
3. "Esc closes it, adding nothing" should read: the dialog's dismiss calls `Flows.cancel`, which pops the flow and changes nothing (the timeline records a cancel).
4. "Confirm runs the command through the invoke path" should read: Add and Enter call `Flows.finish`, which runs `invoke(command, draft)`. Ok pops; a refusal keeps it open with its draft and reason.
5. "becomes the selection" should read: the add flow's `finished(draft)` selects `[draft.id]` through `Selection`.
6. Scope: `Flows`, `Flow<Input>`, `registerFlow` (with its types spec), `FlowHost` in the shell, `useOpenFlow()`, `CancelFlow`, `FinishFlow`, the devtools `Flows` inspectable and flows timeline layer, and the `services-classified.spec.ts` entries (`Flows` shown; flow classes per F5). Either in 13.25, or a foundation story that 13.25 goes `after`. Re-check `risk: medium` and `after: [24, 27]` against that choice.
7. "an Esc hint" in the dialog is a kbd hint, so it reads `CancelFlow`'s hotkey through the formatter (F7).
8. Verify additions:
   - after Esc, G opens a fresh flow with a newly minted id (the draft was discarded, not kept);
   - after a refused Add, the typed text and reason stay;
   - with the devtools overlay, the Flows inspectable shows the stack while the dialog is open and is empty after Add or Esc.
9. The draft's type depends on F1. The ticket's `{ id: '' }` example must type-check against whatever the spine settles.
10. The existing plan (`story-g-and-s-add-groups-and-slots-through-the-add-flow-plan.md`) kept the draft in the component. It needs a rewrite (bmad-build), not a patch.
11. Separate owed ticket (memlog): rename `LoadFlow` (`packages/commands/src/load/load-flow.ts`) to `DesignLoader`. The spine already says `DesignLoader`, so spine and code disagree until it lands.

## 4. EXPERIENCE.md contradictions (owed to Sally / bmad-ux)

| Row | Contradiction | Edit |
|---|---|---|
| Pick modes (l.234) | "Enter or Esc ends the mode keeping what was picked" (known) | "Enter finishes; Esc cancels, discarding the picks." `one pick session = one undo step [ASSUMPTION]` is now decided (one finish, one command), so drop the tag. |
| Status strip, pick mode active (l.211) | `Esc ends` (known); the keys are hard-coded | `picking: anchor · Enter finish · Esc cancel`, with the keys from the handles' formatter (F7). |
| Esc precedence (l.236) | (4) "end a pick mode" and (5) "close ... add flow" are now one step, "cancel the open flow". The order of (4) and (5) is wrong when a modal that is not a flow (palette, cheat sheet) is open over a pick mode: Esc closes the modal first. | Restate: innermost Reka layer first, then cancel the open flow, then non-modal overlays (violations panel), then clear the selection. Note that steps after the flow fold into the one Esc UiAction (spine: `CancelFlow` extended). |
| Add flow (l.126) | Wording only: "confirms" vs finish, "closes" vs cancel. No behavioural contradiction. | Optional: "Esc cancels, adding nothing". |
| Anchor picker (l.124) | Not contradicted, but open against the spine: the 3x3 grid has no home (view or not, F6); Tab cycling (F10); Enter inside the id field (F2); whether clicking an attach point finishes (F6). | Questions for the first pick-mode story, not edits now. |
| Part field (l.125) | Consistent. P = AddSlot (commit 1), then the Part picker flow started from outside (commit 2 on finish; cancel keeps the slot with its default part). Placement "anchored beside the field" vs `FlowHost` in the shell is a spine gap (F6). | None now. Optionally say "cancelling the Part picker keeps the new slot". |

## 5. AGENTS.md

☝️ AGENTS.md has **no Flows bullet**: `grep -i flow AGENTS.md` hits only the Policy line (`workflow`), the three-file line ("Types flow out"), and two test lines. So I checked the spine's AD-26 Flows bullet against AGENTS.md's rules instead.

- **One kind of thing per file:** no conflict. Each flow class gets its own file. `registerFlow` is a function over one concept, so it goes in its own file. `Flow`, `FlowHandle`, `FlowCheck` and the offers entry type go in the folder's `types.ts`. `CancelFlow` and `FinishFlow` are UiActions with no input, so they use `emptyInputSchema` and `EmptyInput`.
- **Three files per command or action:** this rule doesn't name flows. A flow has no schema of its own, since its draft is its command's input type. One line would stop a reader from inventing a `*-flow-input-schema.ts`: "a flow class is one file; its draft type is its command's input" (low).
- **Hold state in `di` services:** consistent (`Flows`). "Only state no other surface reads stays in the view" is component-local, not a module singleton, so it doesn't conflict.
- **Names checked against the glossary:** `flow` is now a glossary term. `Flows`, `FlowHost`, `CancelFlow`, `FinishFlow`, `offers` and `land` all name what they do. `finished(draft)` names when it runs, not what it does (it is an after-finish hook), so it is borderline under "name a thing for what it does" (low). `rejectionText` should be named in Data Schema's glossary-level sentence too.
- **Composables only from components:** the view must read the draft through `useOpenFlow()`, which only the memlog names. Put it in the spine so the Editor state row's composable rule visibly covers it (low).
- **`.ts` importing `.vue`:** precedent exists (`mount-editor.ts`, `create-editor-router.ts`), so there is no rule conflict. The memlog's accepted cost should still be recorded, and a view must not import its own flow class as a value (a .ts/.vue import cycle) (low).

## 6. Owed edits

- **Spine (Winston), before 13.25's plan:**
  - F1: draft type is `InferInput`, plus how a pick flow starts before its first pick.
  - F2: `FinishFlow`'s availability and focus scope, and Enter and Esc from a flow-owned field.
  - F3: scope of flow (fields; action-finishing dialogs).
  - F4: re-check on design change; cancel on `replaceDesign` and read-only demotion.
  - F5: classify flow classes in devtools.
  - F7: hint keys from the formatter.
  - F8: "pure" wording.
  - "13.25 builds" vs Sofia's split.
  - Optionally the missing rejected alternatives (D3, D4 B/D, D9, D12, D15, D16), `useOpenFlow`, and the accepted .ts->.vue cost.
  - Fold F6 and F10 into the pick-mode Open.
- **Ticket 13.25 (Sofia):** items 1 to 9 of section 3, plus the slicing decision (foundation story or not).
- **New ticket (Sofia):** `LoadFlow` -> `DesignLoader` refactor.
- **Plan (bmad-build):** rewrite 13.25's draft plan around `Flows`.
- **EXPERIENCE.md (Sally):** Pick modes l.234; status strip l.211; Esc precedence l.236; optional Add flow wording l.126.
- **AGENTS.md (optional):** one Code-layout line for flow classes.
