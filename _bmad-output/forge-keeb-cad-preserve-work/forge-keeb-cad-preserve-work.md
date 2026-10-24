---
idea: keeb-cad
status: hardened
date: 2026-10-24
evidence: _bmad-output/research-keyboard-design-toolchain-competitors/research-keyboard-design-toolchain-competitors.md
---

# keeb-cad: forged idea

**Pain:** builders stall, or handwire, because later changes look expensive. They're afraid to commit, rather than losing work they've already done. (Sergii's own experience: he got lost in the tools, then stalled once he saw what changes would cost.)

**Job:** remix. Combine geometry from several existing boards, swap switch type (MX → Choc), go wireless.

## Locked
- **Core experience:** layout changes show up live, all at once, in outline, PCB, case and firmware.
- **"Instant"** means simple changes update live. Complex routing (MCU, USB, add-ons) runs in the background with visible progress. Never pretend autorouting is solved.
- **Layout model:** relative and structured, inspired by Ergogen but not a copy of it.
- **Freedom:** geometry is free. Add-ons come from a curated set. Users can define key-cell templates (switch + diode + LED placement) that apply to every key.
- **Remix:** done through a library of parametric building blocks modelled on well-known boards, not by importing KiCad files.
- **Positioning:** one tool, two entry points.
  - "Remix any keyboard: Choc, wireless, your thumb cluster, and everything updates live."
  - "Ergogen's power with a visual editor, all the way to gerbers, case and firmware."
- **Milestone 1 has two checks; check 2 leads:**
  1. **Expressiveness:** rebuild an existing Ergogen board visually, with no config, and match its geometry.
  2. **Remix:** Sergii's own board, a known board made Choc + wireless with a new thumb cluster. Every output updates, and the PCB works.

## Rejected
- **KLE / kle-ng format and contributing to kle-ng.** Absolute positioning makes a single conceptual change cost many edits.
- **"Preserve hand edits" as the core wedge.** The evidenced user never got far enough to have hand edits to preserve. Generation inside constraints serves him better.
- **Importing existing KiCad boards for remixing.** Converting absolute positions into a relative model loses the designer's intent.
- **Startup-style usage kill metrics for now.** The project is personal-first, built with AI. Revisit at milestone 2.

## Open (design phase)
- What dragging a key means in a relative model: move the key, move its column, or change the rule?
- Pre-routed MCU zones as the way to keep routing waits short. Proposed, not yet accepted.
- Ergogen config import, as a follow-on.
- Demand from others is unproven: one evidenced user so far. Milestone 2 tests it.

## Build on
kbplacer (accepts Ergogen points, template routing) and Freerouting (CLI) as candidate engines.
