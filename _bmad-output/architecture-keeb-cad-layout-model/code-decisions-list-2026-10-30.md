---
name: 'keeb-cad: open code decisions, agenda'
type: decision-agenda
status: open
created: '2026-10-30'
origin: 'built with Sergii after the 2026-10-30 party session; Sergii kept every room candidate'
companions:
  - _bmad-output/architecture-keeb-cad-layout-model/directions-2026-10-30.md
next: 'the code-decisions session starts from this list, before epic-design-document starts'
---

# Open code decisions

This is the agenda for the code-decisions session. Nothing on it is decided. Sergii's own items come first. The room's candidates follow in two parts: the items Sergii kept, and the items he struck (none). Each room item names where it came up.

## Sergii's

- **A. Code organisation.** For example, whether to adopt dependency injection: how modules receive what they depend on (who creates what, how a stage or the recipe interpreter gets its collaborators), and how code is laid out inside a package. It touches 9 and 11 but is distinct from both: it's about wiring.

## Room's candidates (all kept)

### How the design lives in memory
1. **What the "one world" is.** "Two worlds with a boundary" was rejected. One option raised: Vue's reactivity engine in the core, which would need an AD-10 amendment. *(ex-D1 in the directions record)*
2. **The doors.** Where plain data crosses: workers, the file, undo. Are there exactly these three, and how does data cross them? *(Winston)*
3. **Enforcing "only commands write".** A lint or dependency-cruiser rule, or convention only. *(Smithy, Amelia)*
4. **Debugging recomputation.** How a person or an agent answers "why did this recompute, or not?" *(Amelia)*

### Change and history
5. **The undo mechanism.** Record what changed, or record what it was before. *(Winston's first round, Mary's style map)*
6. **Invalid states.** "Structure always valid, meaning flagged" and "refuse and show dependants" were proposed, not accepted. *(Open in the directions record)*
7. **Search vs index** for "who points at X". *(Open in the directions record)*

### Derivation
8. **How finely derived values are divided.** One big resolve, or many small derivations (per key, per piece, per layer). The question grew now that whole case layers are live. *(Winston's first round)*
9. **Where behaviour lives.** Plain data plus functions, or objects with methods. *(Mary's style map)*
10. **The recipe interpreter as code.** Its operation set, how chaining works, how it runs in a worker. *(Follows from D8 and D9)*

### Structure
11. **Package boundaries.** Twelve package folders exist with almost no code. Are they the right cut, or should they wait until the code demands them? *(Mary, Amelia)*

### How we build
12. **Order.** A walking skeleton end to end, or layer by layer as the epics are sliced now. *(Amelia; the current epic order is layered)*
13. **Truth.** What says the code is right: golden fixtures from the outside in, test-first unit tests, or both, and where each applies. *(Mary vs Amelia)*
14. **Teaching agents.** One polished exemplar per pattern, or written conventions (AGENTS.md, the spine). *(Smithy, Sally)*

## Notes
- **The order of the session is Sergii's call.** The room's view, for what it's worth: 1 to 4 and 8 depend on each other heavily, while 12 to 14 barely depend on anything else.
- **Where evidence is needed, use it.** A question that turns on fact rather than preference (for example, does 1 hold at 60 fps on a Corney-sized design) becomes a short, time-boxed spike, decided in the session.
