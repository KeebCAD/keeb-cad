---
id: 3
type: story
title: "Canvas keys, borders and anchor links are tested in the light theme"
parent: none
covers: []
after: []
assignee: ""
refined: false
hitl: false
risk: low
---

# Canvas keys, borders and anchor links are tested in the light theme

## Description

Epic see-corneys-keys R6 draws the Layout canvas in both themes, but keycaps, group borders and anchor links are tested in the dark theme only; this adds their light-theme rows, taking the expected colours from DESIGN.md's tokens.

## Requirements

Verify: in Vitest browser mode, Chromium and Firefox, a keycap, a selected key, a group border and an anchor link each draw with their light-theme token colours, beside the existing dark rows.

## References

- parent — none
- epic — _bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/epic-see-corneys-keys.md, Requirements R6
- design — _bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md, Components
- retrospective — _bmad-output/initiative-keeb-cad-m1/tickets/epic-see-corneys-keys/epic-see-corneys-keys-retrospective.md, Spec reconciliation (A7)

## Notes

- The behaviour check of 2026-11-16 saw light-theme keys with low contrast on a near-white canvas; that look is a question for bmad-ux (retrospective A15), not this story.
