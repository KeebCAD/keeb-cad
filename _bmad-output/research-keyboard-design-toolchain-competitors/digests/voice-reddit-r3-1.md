# Voice digest: Reddit round 3, batch 1 (builder voice)

Accessed 2026-10-24 through Chrome DevTools in the isolated context "reddit-r3", read-only. The first page load hit Reddit's "Prove your humanity" page. After a JS challenge cleared on its own, same-origin fetches of thread HTML and of the `/svc/shreddit/comments/...` partial worked. The `.json` endpoints returned 403. I read 12 threads in depth and also scanned search listings and comment-search snippets, which I count only as weak signal.

**Main caveat:** I found almost no direct first-person testimony of the exact pain "moving a key breaks routing/case/firmware". The evidence below is mostly *adjacent*: iteration cost, the gap between Ergogen and KiCad, and abandoning toward handwiring. Read the counts with that in mind.

## Findings

| # | Claim | Thread URL | Sub | Post date | Accessed | Confidence | Class / sentiment | Segment | # indep. voices |
|---|---|---|---|---|---|---|---|---|---|
| F1 | A repeat designer built a one-command pipeline (Ergogen config to plates, cases, post-processed KiCad PCBs, gerbers, JLC assembly files, STL) specifically to make layout iteration cheap. Signal traces on the main board are **still routed by hand**. | https://www.reddit.com/r/ErgoMechKeyboards/comments/1u8ywq5/temporal_a_wireless_3642_key_split_with_a_fully/ | ErgoMechKeyboards | 2026-06-18 | 2026-10-24 | High (first-person, 328 upvotes) | Workaround: iteration pain is implied by the motive. Routing is the residual manual step. | Repeat designer (open-source) | 1 (OP) + 1 commenter: "automating it would be more fun" |
| F2 | First-timer: Ergogen produces separate pieces. They "haven't been able to figure out" how to route in KiCad and how to connect the thumb keys to the main PCB. | https://www.reddit.com/r/ErgoMechKeyboards/comments/1s6pso1/help_with_ergogen_and_pcb_routing/ | ErgoMechKeyboards | 2026-03-29 | 2026-10-24 | High (first-person) | Stall at the Ergogen to KiCad routing step | First-timer | 1 |
| F3 | First-timer is "very inexperienced with ergogen and can't figure out how to get things looking the way I want". They have a KLE mock-up but cannot reproduce it in Ergogen. A commenter also gets "lost" in Ergogen and uses KLE, then the AIO3 plate generator, then Fusion360 instead. The kle-ng author promotes kle-ng. | https://www.reddit.com/r/ErgoMechKeyboards/comments/1sjs779/absolutly_lost_on_ergogen/ | ErgoMechKeyboards | 2026-04-12 | 2026-10-24 | High | Stall at the Ergogen learning curve. Workaround: a KLE-based chain. | First-timer (OP). The commenter's segment is unclear. The tool author counts as vendor/tool-maker. | 2 builders + 1 tool author |
| F4 | Ergogen documentation "hasn't been updated for years". Even a returning user found it "super hard to recall" after a year away and had AI regenerate the docs and build an agent skill. A community member confirms that most Ergogen knowledge isn't public (it lives in Discord). | https://www.reddit.com/r/ErgoMechKeyboards/comments/1uq45nl/ergogen_docs_updated_with_claude/ | ErgoMechKeyboards | 2026-07-07 | 2026-10-24 | High | Pain: Ergogen discoverability and docs. Workaround: AI agents. | Repeat designer (OP) and an experienced Ergogen user | 2 |
| F5 | A builder who has made two Ergogen boards says that without rotation or splay "you really don't benefit from it". Ergogen's value is its colstag/splay handling plus the footprint library. kle-ng now generates KiCad 9 projects, but only the key matrix: the MCU, controller circuit and stabilizer holes stay manual. One commenter asks for the MCU and a common parts library in the export. | https://www.reddit.com/r/ErgoMechKeyboards/comments/1qfmztc/kleng_can_now_generate_kicad_9_projects/ | ErgoMechKeyboards | 2026-01-17 | 2026-10-24 | Medium-High | Wish: a fuller generated KiCad project (MCU and parts) | Repeat designer (2 boards). Tool author is the OP. | 2 builders (+ author) |
| F6 | A first-timer's first version had components too close to the edge, so they "had almost to start from scratch". A commenter says to expect to get it wrong first time ("Iteration is pa[rt]...") and recommends feeding the KiCad files to LLMs for review. | https://www.reddit.com/r/ErgoMechKeyboards/comments/1uo2elg/help_with_pcb_design/ | ErgoMechKeyboards | 2026-07-05 | 2026-10-24 | High (first-person rework) | Pain: rework after a placement or constraint error. Workaround: DRC, AI review. | First-timer (OP) and a recent first-timer (commenter) | 2 |
| F7 | A handwirer was overwhelmed by the PCB, firmware and MCU choices ("makes me want to just close the curtains again and go back to handwiring"). A seventh-time handwirer prefers handwiring. Another builder uses a hot-swap "wiring harness" so that failed ergonomic designs ("failed on about 4 or 5 designs") cost only a reprint: "No ruined pcb". | https://www.reddit.com/r/ErgoMechKeyboards/comments/1ollcop/handwire_vs_pcb/ | ErgoMechKeyboards | 2025-11-01 (~12 mo, borderline) | 2026-10-24 | High | **Most direct iteration-cost evidence.** Workaround: avoid the PCB until the layout is final. | First-timer (OP), repeat handwirer, repeat iterator | 3 |
| F8 | ScottoKeebs (vendor/educator, about 40 designs and about 200 client projects) handwires "pretty much every board", with few PCB designs. Two commenters started PCB design from his KiCad tutorial and library or module, so reusable base modules lower the barrier. | https://www.reddit.com/r/olkb/comments/1sbsvq9/all_the_keyboards_ive_designed_and_built_over_the/ | olkb | 2026-04-03 | 2026-10-24 | Medium (only indirect evidence on pain) | Workaround: handwire, reuse modules and tutorials | Vendor/educator. The commenters are repeat or first designers. | 3 |
| F9 | Cosmos generator: a user hit non-manifold STL errors over "30 iteration[s]" and couldn't fix them in Blender, online tools or ChatGPT. Others printed it fine. The dev says Cosmos is "still beta" and breaks after updates. Moving a joystick near an encoder throws errors. | https://www.reddit.com/r/ErgoMechKeyboards/comments/1v08bs1/cosmos_keyboard_generator/ | ErgoMechKeyboards | 2026-07-18 | 2026-10-24 | Medium | Pain: case-generator output quality. Stalled user. | First-timer (OP); repeat Cosmos users | 3-4 |
| F10 | A first-timer's split PCB (Pi Pico, OLED, encoder) has its review feedback focused on electrical issues (no ground pour, TX/RX noise, boot button), advised to "re-do your wiring". | https://www.reddit.com/r/ErgoMechKeyboards/comments/1w0egen/first_ever_keyboard_pcb/ | ErgoMechKeyboards | 2026-08-28 | 2026-10-24 | Medium | Pain: electrical design knowledge (MCU/high-speed) causes rework | First-timer | 1 + 1 reviewer |
| F11 | A modular split with swappable thumb modules ran out of Pro Micro pins, so one module requires a firmware reflash. The designer is exploring resistor-ID auto-detection. A second builder did the same thing. | https://www.reddit.com/r/ErgoMechKeyboards/comments/1vymygj/my_first_pcb_design_since_i_graduated_11_years_ago/ | ErgoMechKeyboards | 2026-08-26 | 2026-10-24 | Medium | Constraint coupling between hardware (pins) and firmware | Returning or occasional designer | 2 |
| F12 | Comment-search snippet: a TOTEM modder says cutting out a battery spot means "I need to reroute all the diode wiring elsewhere, but there isn't enough space". | https://www.reddit.com/r/ErgoMechKeyboards/comments/1l2yqx9/next_totem_plan/ | ErgoMechKeyboards | 2025-06-04 (OLD >12 mo) | 2026-10-24 | Low-Medium (snippet only, not read in depth) | **Direct "change forces reroute" pain** | Modder of an existing design | 1 |
| F13 | Snippet: a builder recommends a KLOR fork "if you want ... a usable PCB from JLC without having to reroute". This implies people avoid modifying base PCBs because of the reroute cost. | https://www.reddit.com/r/ErgoMechKeyboards/comments/1nma89v/looking_for_totem_but_bigger/ | ErgoMechKeyboards | 2025-09-20 (borderline-old) | 2026-10-24 | Low (snippet) | Reroute avoidance | Repeat builder | 1 |
| F14 | Snippet (older): "Ergogen doesn't give you a completed keyboard, or PCB": it gives plates and outlines, and the rest is manual. | https://www.reddit.com/r/ErgoMechKeyboards/comments/16jdbc9/help_using_ergogen/ | ErgoMechKeyboards | 2023-09-15 (OLD) | 2026-10-24 | Low (snippet, old) | Expectation gap | Experienced helper | 1 |
| F15 | First-timer (older) following Ben Vallack and flatfootfox guides: "I dont understand Kicad / Ergogen". (Date verified.) | https://www.reddit.com/r/ErgoMechKeyboards/comments/1gq8m4q/i_need_help_with_ergogen_and_kicad/ | ErgoMechKeyboards | 2024-11-13 (OLD) | 2026-10-24 | Medium (post only) | Stall at Ergogen and KiCad | First-timer | 1 |

The thread 1eq6jyq ("Ergogen/Kicad expecting too many routes") is dated 2024-08-12 from the search listing. It is OLD and I did not read it.

## Pattern tally (distinct usernames, this run)

| Pattern | Distinct voices | Refs |
|---|---|---|
| Ergogen learning curve, syntax or docs stall | 5 (plus 1 old) | F2, F3 (x2), F4 (x2); F15 old |
| KiCad routing after Ergogen is the stall or the residual manual step | 3 | F1 (OP, who still hand-routes), F2, F14 (old) |
| Iteration cost: a layout or ergonomic change forces rework (PCB or reprint) | 5 | F1 (motive), F6 (OP), F7 (harness builder: "failed on 4 or 5 designs"), F12 (old snippet), F13 (snippet) |
| Avoid the PCB or handwire to dodge PCB complexity or iteration cost | 4 | F7 (x3), F8 (vendor) |
| Wish or workaround: an automated end-to-end pipeline | 2 | F1 OP, F1 commenter |
| Wish: generators that emit a fuller KiCad project (MCU, parts library) | 1 | F5 |
| Workaround: KLE, kle-ng or AIO3, then Fusion instead of Ergogen | 2 (+1 tool author) | F3 |
| Workaround: LLMs or agents for Ergogen config or PCB review | 3 | F4 OP, F6 (OP and commenter) |
| Case-generator output breakage (Cosmos) | 1 stalled (+ a dev note relayed second-hand) | F9 |
| Electrical or MCU knowledge forces a redesign | 1-2 | F10, F11 |
| Hardware-to-firmware coupling (pins, module detection) | 2 | F11 |

## Notable quotes

- "The only thing I still route by hand is the signal traces on the main board. Changing the layout and getting a new package back is very low-cost now, which made iterating on the ergonomics a lot less painful." (https://www.reddit.com/r/ErgoMechKeyboards/comments/1u8ywq5/temporal_a_wireless_3642_key_split_with_a_fully/)
- "how do you route the connections in Kicad, since I haven't been able to figure it out?" (https://www.reddit.com/r/ErgoMechKeyboards/comments/1s6pso1/help_with_ergogen_and_pcb_routing/)
- "I also know people praise it, but I get lost af in it as well." (https://www.reddit.com/r/ErgoMechKeyboards/comments/1sjs779/absolutly_lost_on_ergogen/)
- "I've failed on about 4 or 5 designs I thought would be comfy but didn't work. No ruined pcb, no soldering for new design." (https://www.reddit.com/r/ErgoMechKeyboards/comments/1ollcop/handwire_vs_pcb/)
- "It's all making me want to just close the curtains again and go back to handwiring" (same thread)
- "I had almost to start from scratch and learned a lesson there." (https://www.reddit.com/r/ErgoMechKeyboards/comments/1uo2elg/help_with_pcb_design/)
- "if you aren't doing rotations and splay, you really don't benefit from it." (https://www.reddit.com/r/ErgoMechKeyboards/comments/1qfmztc/kleng_can_now_generate_kicad_9_projects/)
- "most of the knowledge about how ergogen works (unfortunately) isn't public knowledge" (https://www.reddit.com/r/ErgoMechKeyboards/comments/1uq45nl/ergogen_docs_updated_with_claude/)
- "I need to reroute all the diode wiring elsewhere, but there isn't enough space." (https://www.reddit.com/r/ErgoMechKeyboards/comments/1l2yqx9/next_totem_plan/, 2025-06, old, snippet)

## Leads worth chasing

- **https://www.reddit.com/r/ErgoMechKeyboards/comments/1xar6rh/beginner_whats_your_workflow_from_idea_to_finished_board/** (2026-10-20). A beginner asks the exact workflow question, and the snippet asks "what made it difficult? The pcb or the firmware?". This is the highest-value unread thread, skipped only because the budget ran out.
- The Temporal repo (github.com/curbol/temporal): check whether the hand-routed traces survive regeneration. In other words, how does the pipeline preserve manual routing when the layout changes? That is the crux of the "moving a key breaks routing" hypothesis.
- https://www.reddit.com/r/ErgoMechKeyboards/comments/1eq6jyq/ergogenkicad_expecting_too_many_routes/ (2024-08, old) and https://www.reddit.com/r/ErgoMechKeyboards/comments/161meqr/any_skills_to_route_trace_in_kicad/ (2023-08, old): routing pain, but dated.
- PCB review-request threads (1oam0uz and 1oec1ch, V1 then V2 on 2025-10-19/23; 1shn9zx; 1s788gs). Comparing V1 with V2 could show what got reworked between revisions.
- The Absolem Club Discord, where Ergogen knowledge reportedly lives. That is a non-Reddit voice source.
- kbplacer: search returned only a 2023 announcement (18p1nhf). It has no recent builder voice.

## Looked for, not found

- **No recent (≤12 mo), first-person, in-depth testimony of "I moved or respaced keys and had to re-route the whole PCB".** The closest are F12 and F13 (snippets, 2025, borderline or old) and F7, which is iteration cost avoided by handwiring rather than reroute pain experienced. Comment searches for "reroute", "redo the routing", "start over pcb" and "moved the keys pcb" mostly returned unrelated hits.
- No explicit "case doesn't fit the PCB after a change" complaint. Case-search hits were about manufacturing shrinkage (JLC) or old threads.
- No builder asking for an autorouter. The search "autorouter" returned nothing relevant in r/ErgoMechKeyboards.
- No recent builder voice on kbplacer.
- I did not deep-read r/KiCad, r/PrintedCircuitBoard or r/MechanicalKeyboards keyboard threads beyond listings, so those subs are under-sampled here. Their listings do show a steady flow of first-time keyboard PCB review requests through 2026.
- Method limits: the `.json` API was blocked (403), and post metadata came from the HTML. Comment scores are as of access.
