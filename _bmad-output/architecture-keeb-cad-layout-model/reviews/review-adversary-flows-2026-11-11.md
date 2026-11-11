# Adversary review: Flows amendment (AD-26 "Flows.", glossary flow/add flow, Editor state timeline, design loader rename)

Date: 2026-11-11. Scope: the uncommitted diff of `architecture-keeb-cad-layout-model.md` plus the flows decisions at the end of `.memlog.md`. Method: build two units one level down that each obey every sentence to the letter, and show where they still build incompatibly or hit undefined behaviour. Each finding names the rule that would close it.

**Verdict: not ready to freeze as written.** The concept (one `Flows` stack, the draft is the command's input, surfaces read the top's capabilities) holds. But the bullet leaves four things a second story must invent: the type of an incomplete draft, the verb that changes a draft, where a child's first draft comes from, and what happens to open flows when the design under them changes. Two stories would invent them differently. One case writes into the wrong design: the person goes Back in the browser while the add dialog is open.

Severity counts: 2 critical, 5 high, 8 medium, 4 low.

---

## Critical

### C1. A flow survives replacement of its design, so finish writes into another design

Units: 13.25 (add flow, modal) and the story that loads a design from the route, Open, version switch or Take over (the design loader, AD-13).

Spine:
- "A start from outside the stack (G's UiAction, an Anchor field) cancels every open flow and pushes the new one; ... `cancel` pops the top only and changes nothing." These are the only ways a flow closes.
- Editor state: "**vue-router is the one owner of the open design and workspace** (`/#/design/<design-id>/<workspace>`, hash history ...)".
- AD-13: "Every path that opens a stored or saved bundle (launch, the Start screen's recent list, Open, version switch) calls one `di` service in `commands`, `DesignLoader`".
- AD-13 (tabs): "the demoted tab flushes its pending commit, stops autosave and drops an open expression session or nudge burst." Flows are not in that list.
- Editor state (Selection): "After each commit it drops every id the design no longer holds". Drafts get no such rule.

Construction: the add dialog is open with draft `{ parent: 'root', id: 'g3' }`. The person presses browser Back, a `hashchange` that no modal traps. The router opens another design through the design loader, and `replaceDesign` commits. Nothing cancels the stack. The dialog still shows "Add group in root". Enter runs `invoke(AddGroup, draft)`. Every design has a `root`, so the group lands silently in the wrong design, and its `finished` selects it there. A pick-mode story has the same hole with any route change, Ctrl+O or version switch. Its open question lists "a workspace switch" but not a design switch. In a demoted read-only tab the open flow stays live too.

Close with: "`Flows` cancels the whole stack (reason `design replaced`) on the design store's commit event from `replaceDesign`, and when the tab is demoted to read-only. Add flows to the demotion list beside the expression session and nudge burst."

### C2. The draft type cannot hold an unfinished pick, so stories disagree on what an incomplete draft is

Units: 13.25 (add flow, whose draft is complete from start) and the first pick-mode story (anchor picker: target, then attach point).

Spine:
- "each with its **draft**: the command's input as the person has filled it so far (`start<H>(flow: H, draft: CommandInput<H['command']>)`), never a request type mapped to input by the flow."
- "As the top's draft changes, `Flows` asks `available(command, draft)` (the draft is the caller's input, so a parse failure is `input-invalid`); a refusal disables finish and the view shows its `rejectionText`".

Construction: `SetAnchor`'s input needs the target and the point. When the anchor picker opens, the person has picked neither. `CommandInput<SetAnchor>` will not compile without them, so the story either:
- (a) seeds placeholders (`target: ''`), or
- (b) widens the draft to `Partial<...>`, which breaks `start`'s signature and `registerFlow`'s compile check.

With (a), the strip shows the schema's "id must not be empty" before the person has done anything, because a parse failure of the caller's input is shown as a refusal. The Part picker story, facing the same problem, picks the other option. That leaves two incompatible draft conventions under one `Flows`. A multi-pick (Pick vertices, LED order) has its own boundary: an empty list may parse, so finish is enabled with zero picks.

Close with: "A draft is the command's `v.InferInput` with the fields picks fill made optional (`FlowDraft<H>`), and `Flows` tells *incomplete* (a required key absent: finish disabled, no reason shown) from *refused* (`available` returns a rejection: finish disabled, reason shown). A pick flow's `start` may omit those keys." This keeps the memlog decision "no request type, no mapping": the draft is still the input, only partially present. An alternative is a static `complete(draft): boolean`, rejected because it is a second check beside `available`.

---

## High

### H1. No verb changes a draft, so two owners can write it

Units: 13.25 (the id field) and the pick-mode story (`choose`).

Spine: "Its verbs: start, finish, cancel" (memlog). The bullet lists only `start`, `finish` and `cancel`. Elsewhere it says "`choose(draft, target)` (what a pick does to the draft)", and "A flow's state lives on `Flows`, not in its view".

Construction: 13.25 binds the id field with `v-model` to a deep-reactive draft from `useOpenFlow()`, mutating it in place. The pick story adds `Flows.pick(target)`, which replaces the draft with `choose`'s return. Whether "as the top's draft changes" means a deep watch or a replaced value now depends on which story came first. In-place mutation also lets a view write a draft that is not the top's, while only the top is checked.

Close with: "`Flows.update(draft)` replaces the top's draft as a whole frozen value, and `Flows.pick(target)` calls the top's `choose` and then `update`. Nothing else writes a draft, and a view never mutates one." `update` and `pick` act on the top only.

### H2. A child flow has no source for its first draft, and a root flow's first draft is built outside its class

Units: the anchor-picker story offering "+ Add key here", and 13.25's add flow reused as that child.

Spine:
- "`offers` (the child flows it offers, each `{ flow, label, land }`)".
- "a child starts only through its parent's `offers` entry and is pushed on top."
- `start` requires a `draft`.
- "Capabilities (pick, hint, offers) are part of the definition, never passed at start; only the draft is per start" (memlog).

Construction: 13.25's G UiAction mints the id and resolves the parent from selection, then calls `start(AddFlow, draft)`. The anchor-picker story offers `{ flow: AddFlow, label, land }`, but nothing in the entry builds AddFlow's draft from the parent's draft. That story either adds a `draft` field to `offers` or copies G's builder. Either way the add flow's first draft now has two builders, and they can disagree (for example on which parent a new key goes into).

Close with: "An `offers` entry is `{ flow, label, draft(parentDraft, design), land }`." Also choose one home for a flow's first draft: a flow-class static `initial(context)`, not each caller.

### H3. What runs beside an open non-modal flow is undecided for the dangerous cases, and the only mechanism left is the rejected per-UiAction check

Units: the first pick-mode story and 14.1 (undo), or 13.24's Delete and Duplicate.

Spine:
- "A flow's own input never starts anything else ... and zoom, pan and fit run beside an open flow."
- "Open for the first pick-mode story: which actions besides zoom, pan and fit run beside an open flow (a workspace switch, F6, T, a selection in the Tree)."
- Shortcuts: "not each UiAction checking for an open modal, because every present and future UiAction would have to remember".

Construction: during an anchor pick, the canvas still has focus, so Delete runs `DeleteSelection` on the node whose anchor is being set. Ctrl+Z undoes the child's committed key that the parent's draft just landed. Arrows nudge, R rotates and Ctrl+D duplicates. The open-question list omits undo, redo, Delete, Duplicate, nudge, rotate and palette entries. Whatever the pick story decides, the obvious way to apply it is `if (flows.isOpen) return false` in each UiAction, which is exactly the pattern the spine rejected for modals.

The draft is also checked only "as the top's draft changes". A commit (undo, a child's finish, an action) that invalidates the draft leaves finish enabled until invoke refuses it.

Close with:
- "While a flow is open, the shortcut registry runs only handles that declare `besideFlow` (zoom, pan, fit, `CancelFlow`, `FinishFlow`). Every other hotkey is unavailable, decided in the registry, not per UiAction."
- "`Flows` re-asks `available(command, draft)` as a computed over the design store's `Committed` and the top's draft."

### H4. Cancel and finish carry no identity, so two paths can pop two flows

Units: 13.25 (modal view: "the view's dismiss and confirm call `Flows` themselves") and the first child-flow story.

Spine:
- "`cancel` pops the top only".
- "one `FlowHost` in the shell renders the top's `view`".
- "under a modal flow the hotkey layer runs nothing, so the view's dismiss and confirm call `Flows` themselves".

Construction: the add view wires Reka's `@update:open="o => !o && flows.cancel()"`. A modal child finishes and `Flows` pops it. `FlowHost` swaps views, the child's dialog closes, `update:open(false)` fires, and `cancel()` pops the parent as well. A non-modal case does the same: a pick child shows a popover; Esc runs `CancelFlow`, and the popover's own dismiss also calls `cancel()`, so two pops happen. Each unit obeys "cancel pops the top".

Close with: "`start` returns the stack entry. `cancel(entry)` and `finish(entry)` act only when that entry is the top, and are otherwise no-ops. A view's open state is bound to 'my entry is the top', and closing it because `Flows` popped it never calls `cancel`."

### H5. FinishFlow is available while finish is disabled, and claims Enter from every focused control

Units: 13.25 and the pick-mode story.

Spine:
- "`CancelFlow` (Escape) and `FinishFlow` (Enter) are UiActions on `Flows`, available whenever a flow is open".
- "a refusal disables finish".
- Shortcuts: "the shortcut registry claims a key only when `available(handle)` is ok", and "`ui`'s hotkey layer calls `preventDefault` only when the registry ... says it ran the entry".
- Glossary UiAction: "`available()` over UI state".

Construction: in a pick mode with a refused draft (a cycle), the status strip shows finish disabled, but Enter is claimed and runs `invoke(command, draft)`. The command's rejection "reaches the caller", so with a generic rejection reporter the person gets a toast on top of the reason already shown, which is a second report. Separately, with focus on a slide-out button, a Tree item or a top-bar button, Enter is a form tag only for input, textarea and select. So `FinishFlow` claims it and `preventDefault` swallows the button's own activation for as long as a pick mode is open.

Close with: "`FinishFlow` is available when a flow is open **and** `available(top.command, top.draft)` is ok." Also: "`CancelFlow` and `FinishFlow` read the focused place (`Landmarks`) and act only with focus on the canvas, the Tree tab or `body`, never on a focused button or menu item."

---

## Medium

### M1. Esc runs CancelFlow and a non-modal Reka layer at once, breaking "one Esc does the innermost step"

Spine: "outside a modal the hotkey layer is global". EXPERIENCE.md Esc precedence: "(2) close an open dropdown or menu; ... (4) end a pick mode". Memlog: "a modal Reka menu hides the page" (so only modal menus are covered).

Construction: during a pick, a non-modal popover or dropdown is open (the anchor picker's 3×3 grid, a non-modal context menu as EXPERIENCE.md l.237 has it, a select). Reka's DismissableLayer and zag both listen for Esc on the document. One Esc closes the layer and cancels the flow, discarding the picks.

Close with: "The hotkey layer skips a key whose event is already `defaultPrevented`, and the Esc UiAction is unavailable while a non-modal dismissable layer is open." Alternatively, state the precedence as the one Esc UiAction's ordered branches.

### M2. The view's direct calls contradict "every invocation goes through the invoke path"

Spine: Shortcuts, "Every invocation from the UI (hotkey, click, gesture, menu, palette) goes through one `editor` invoke path"; Flows, "the view's dismiss and confirm call `Flows` themselves".

Effect: an Add click on the dialog is a UI invocation that skips `invoke(FinishFlow)`. The devtools invocations layer then shows `FinishFlow` for Enter in a pick mode but nothing for an Add click or a modal Esc; only the command shows. Two stories log the same user act differently.

Close with: "A flow view's confirm and dismiss run `invoke(FinishFlow)` and `invoke(CancelFlow)`." Alternatively, name the exception explicitly in the Shortcuts sentence.

### M3. FlowHost renders only the top's view, so a parent's view-held state and focus are lost under a child

Spine: "one `FlowHost` in the shell renders the top's `view`"; "only state no other surface reads (a picker's search query) stays in the view".

Construction: the Part picker (modal, per EXPERIENCE.md "modal overlays (palette, cheat sheet, Part picker, add flow) trap focus") offers "+ New part". The child is pushed, so the Part picker view unmounts and its search query, which the rule keeps in the view, is gone when the child pops. Reka returns focus to the trigger on unmount, not to the remounted parent's search field.

Close with one of:
- "`FlowHost` renders every stacked view, with the ones below the top `inert`."
- "View-only state lives on the stack entry beside the draft (not in the inspectable)."

Also define where focus goes after a child pops.

### M4. A pick target is a node only, but most pick modes pick something else

Spine: "one `editor` function takes a press on a node from the canvas and the Tree, a pick when the top flow has `choose`"; "`choose(draft, target)`". EXPERIENCE.md: the anchor picker picks an attach point from the 3×3 grid; "Pick vertices", "Pick LED order" and "pin reassignment" pick points and pins.

Construction: the anchor story types `target` as a node id plus an attach point; the vertex story types it as a point. The one press function cannot route both. A press on a dimmed node ("`candidates` ... those it dims with a reason") is also undefined: it might be ignored, selected or shown as a toast.

Close with: "`choose`'s target is a `PickTarget` union defined in the spine (node, attach point, pin). A press on a dimmed or non-candidate target changes nothing and announces its reason."

### M5. Only commands can finish a flow, but actions with input fit the definition

Spine: glossary, "ending in **finish** (its one command runs through the invoke path)"; "a static `command` (the one command it finishes with)"; `CommandInput<H['command']>`.

Construction: a Copy design name prompt, or a Save to file name prompt, is "one intended outcome that needs the person's input", but it ends in an action (`AsyncResult`). That story either builds a non-flow modal or widens `command`. If it widens it, finish becomes truly async: Esc or a second Enter during a pending finish pops, and the settle then pops the wrong entry (see H4).

Close with: "A flow finishes with a command, or an action whose finish shows a pending state (finish and cancel unavailable until it settles)." Alternatively, restrict the glossary definition to commands and name where action prompts go.

### M6. A flow started from a modal non-flow races that modal's focus return

Spine: "the palette and the cheat sheet are modals that are not flows"; EXPERIENCE.md, "closing returns focus to the invoker".

Construction: the palette lists G's UiAction. Choosing it calls `invoke` and starts the add flow, and `FlowHost` mounts the dialog. Then the palette closes and returns focus to its invoker, outside the add dialog. Reka's nested FocusScope may or may not pull focus back. The palette story and 13.25 each behave correctly alone.

Close with: "A modal closes and restores focus before the entry it chose is invoked." Alternatively: "`FlowHost` focuses the new view's first item after the current modal has closed."

### M7. A field inside a flow view commits on its own debounce

Spine: AD-2, "An expression field runs its command after a typing pause (debounce) and on Enter or blur"; glossary flow, "**cancel** (nothing changes)".

Construction: a later flow with a length (for example "add key with offset") reuses the expression field. Its debounce runs a command mid-flow, so cancel no longer changes nothing.

Close with: "A field inside a flow's view writes the draft through `Flows.update`, never runs a command."

### M8. The glossary's "cancel (nothing changes)" contradicts the Flows bullet

Spine: glossary flow, "or **cancel** (nothing changes)"; Flows, "Each finish is its own commit and undo step, so cancelling a parent keeps what a child committed."

Close with this glossary wording: "cancel (the flow's own draft is dropped; what a finished child committed stays)".

---

## Low

### L1. Timeline cancel reasons include one that cannot happen and miss real ones; flows have no id

Spine: "cancelled with its reason: Esc, replaced by another flow or its parent cancelled"; "`cancel` pops the top only".

A parent can never be cancelled under a child, because only the top pops and an outside start counts as "replaced". So "parent cancelled" is unreachable. A pointer-outside dismiss, a close button, a design replacement (C1) and a demotion have no reason. The inspectable shows "each flow, its command id", but two flows may share a command (the anchor picker and Re-anchor both finish with `SetAnchor`), and a flow class has no static `id` or `label` for "replaced by <flow>".

Close with: a reason enum `{ esc, dismissed, replaced, design-replaced, demoted }` and a static `id` on a flow, namespaced like a command id.

### L2. "Each finish is its own commit" does not hold for a no-op

Spine: AD-2, "A command whose apply step produces no patches returns ok without committing"; Flows, "Each finish is its own commit and undo step".

Picking the same Part is ok but makes no commit. That is harmless; change the wording to "at most one commit".

### L3. Reka Tree's own selection state is a second owner during a pick

Spine: "one `editor` function takes a press on a node from the canvas and the Tree, a pick when the top flow has `choose`".

Reka's Tree toggles its own selected state on a click or Enter unless it is fully controlled. During a pick the Tree would mark the node selected while `Selection` does not.

Close with: "The Tree's selected state is controlled from `Selection` only."

### L4. The palette can run a flow's command, or the flow keys, directly

The palette lists UiActions and commands, so it would list `CancelFlow`, `FinishFlow` and `SetAnchor`, and running `SetAnchor` there bypasses an open anchor flow. Leave this to the palette story, but name it in its open question.

---

## Contradiction check against the rest of the spine

- **AD-2 "Nothing in progress reaches the design"**: consistent; a draft never commits. The exceptions are a child's finish (by design) and M7.
- **AD-2 "There are no gestures: no begin, update or commit"**: consistent; a flow is not a store transaction.
- **Shortcuts, "Every invocation from the UI ... goes through one `editor` invoke path"**: contradicted by the view calling `Flows` directly (M2).
- **Shortcuts, "claims a key only when `available(handle)` is ok"**: interacts badly with `FinishFlow` being "available whenever a flow is open" (H5).
- **Shortcuts, "not each UiAction checking for an open modal"**: the open "beside a flow" question invites exactly that pattern (H3).
- **Editor state, "Selection ... drops every id the design no longer holds"**: there is no counterpart for drafts (C1, H3).
- **AD-13 demotion list**: omits flows (C1).
- **Editor state, "only `editor`'s UI-state services have a field with `set`"**: `Flows` being read-only is consistent.
- **Glossary "modal" row ("the add flow, later the command palette ...")** and the new "flow" row agree; the glossary flow row conflicts with the bullet on cancel (M8).
- **Rename "load flow" -> "design loader"**: complete in the spine text I checked. No remaining "load flow"; "stage-to-stage reads" and "live read" read correctly.
