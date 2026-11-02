# Adversarial review: spine gate update 2026-11-02

- **Reviewed:** the 2026-11-02 update to `architecture-keeb-cad-layout-model.md` (AD-1 empty derived files, AD-8 one bundle format-version, AD-10 output list, AD-11 lifecycle after a switch and posted ids, AD-22 transform-is-drawing, Data Schema `PartsOutput` / `LayoutOutput` / `RoutingFile`, Switch grace convention, closed Open Questions), against the last seven `.memlog.md` lines and stories 13.14, 13.20, 13.18, 13.2, 13.7, 13.8 (plus 13.1 and 13.6 where they touch the update).
- **Method:** for each updated rule, build two units one level down that both obey every AD to the letter and still fail to fit together. Each pair is a hole; each hole names the rule that closes it.
- **Verdict:** **not ready to gate 13.2 / 13.7 / 13.8 as written.** The posted-output types are close, but four holes let two compliant stories ship incompatible code: the parts-to-layout row link can dangle across messages, the right side's frame has no handedness, "stand-in" sits on the wrong row, and nobody on main owns the empty derived files. 13.14's format-version gate holds once the migration entry point is named.

Severity: **High** = two compliant stories ship code that breaks at integration. **Medium** = breaks in an edge case, or forces a rework one story later. **Low** = wording that will likely be read one way, but nothing forces it.

---

## H1 (High): `LayoutOutput.part` can point into a `PartsOutput` from another seq

**Pair.** 13.2's worker posts each stage's whole output as soon as it is computed: AD-11, "the worker posts each stage's whole output at its seq". Only the *visible set* has to travel as one message. 13.7's main side keeps one `shallowRef` per output, which AD-11 also asks for ("each output replaces the previous one whole in a `shallowRef`").

**Breaks when** the focus is PCB, whose visible set holds neither parts nor layout. Then parts and layout run in the hidden phase. At seq 6 the worker posts `PartsOutput@6`. Seq 7 arrives, layout@6 is "never computed" (AD-11, Newer seqs), and main now holds `PartsOutput@6` beside `LayoutOutput@5`. Layout's `part` row numbers index the wrong run table: ids are re-sorted per post, so a new part run shifts every row. After a switch to Layout, AD-11's new rule says "draw the set's last posted snapshot as it is". The canvas draws wrong rectangles with no error. The rule "a row number in the output posted in the same message" says what a writer must do, but does not stop two outputs from arriving in separate messages.

**Also:** "the focused set at main's latest seq has not arrived" is undefined when a set is stored per output. Is it every output at that seq, or the last set-message? And does the worker re-post a set on `focus` when it was already posted piecemeal as hidden stages? If not, a set that was never posted *as a set* stays grayed forever.

**Closing rule.** In AD-11: *an output that holds row numbers into another output is always posted in the same message as that output, in the hidden phase too (parts and layout are one posting unit); main stores and swaps them together, and a set has arrived when every output of the set holds main's latest seq.* Add a crossing test that preempts between parts and layout.

## H2 (High): the right side's frame has no handedness, so a part's rectangle can't be drawn at it without the canvas mirroring

**Pair.** 13.6 writes right rows as the reflection across `center`'s y-axis (AD-6) and encodes the reflected frame as `{x, y, rot}`, the only form `LayoutOutput.frame` has. A reflection is not a rotation, so it must pick some `rot` (for example `180 − rot`, or `−rot` relative to the axis). 13.7 and 13.8 place the one per-run `PartsOutput.rect` (authored side only, since parts lanes "run once, on the authored side", AD-6) with `transform="translate(x,y) rotate(rot)"`, as the AD-22 sentence allows.

**Breaks when** a rectangle has `cx ≠ 0` or `cy ≠ 0` (allowed by the new type), or once outlines or footprints are drawn the same way. The right half then shows the part rotated instead of mirrored. To fix that, 13.8 would have to add `scale(-1,1)` from its own knowledge of which rows are right-side. That is mirroring outside `model`, which AD-6 bans ("no stage mirrors") and AD-22 doesn't count as drawing. A second compliant reading sees the same problem from the other side: 13.6 posts right-side rows with `rot` measured clockwise, and 13.8 reads every `rot` counter-clockwise (AD-7).

**Closing rule.** In Data Schema: *`LayoutOutput.frame` gains `mirrored: boolean` (true on derived right-side rows): the frame is the transform `translate(x,y) · rotate(rot) · scale(mirrored ? -1 : 1, 1)`, `rot` counter-clockwise per AD-7 in both cases; AD-22's "placing at a frame" includes that scale.* The other option is to state that every `rectangle` is centred (`cx = cy = 0`) and symmetric. That only defers the problem to footprints.

## H3 (High): "stand-in" is a property of a slot's resolution, but the type puts it on a part-run row

**Pair.** 13.18 resolves an unresolvable `slot.part` to "the default part's" rectangle (AD-5). That is the same run as every healthy slot on the default part, so it reuses that row, whose `state` is `'ok'`. 13.7 and 13.8 draw "a placeholder" (AD-5) wherever `PartsOutput.state == 'stand-in'`, and never see one. A second compliant 13.18 instead mints a separate stand-in row per unresolved reference. Its id then has no defined format, and "one row per resolved part run (design part + its inputs)" excludes it anyway: an unresolved reference *has* no run.

**Same family:**
- A slot whose `part` is a bare `lib:part/…` reference (allowed by `PartRef`) is not a "design part + its inputs" run, so no row is defined for it.
- The run key (design part id + which inputs?) and its id string are unspecified. Two units hashing the inputs differently give different sort orders.
- No one is named as owner of the slot → run mapping (own part → nearest ancestor group `defaultPart` → `meta.defaultPart`, plus per-slot `inputs`). The 13.18 ticket says "its own, else meta.defaultPart" and skips the group step that 13.2's groups bring. 13.2 needs the run to step by, so it would write a second resolver.

**Closing rule.** In Data Schema:
- *Stand-in is per slot: move it to `LayoutOutput` (`fit: 'fitted' | 'empty' | 'stand-in'`). `part` then points at the run whose rectangle the slot steps by: the default part's run, or one app-defined stand-in row with a fixed id.*
- *A `PartsOutput` id is `<part ref>` or `<part ref>?<canonical per-slot inputs>`, defined once in the codec.*
- *A slot's run is resolved by one `model` computed in the parts concept, which layout's placement and the codec both read.*

## H4 (High): no unit on main is allowed to create the empty derived files the bundle must always hold

**Pair.**
- **13.1 `newDesign`** is a registered command. AD-2 says commands write `Design`, the authored sections only, and "the routing and fingerprints files are outside commands". So it can't create them.
- **13.20** sends "the derived files it holds, none yet" (its ticket). AD-11 says "main never computes a derived file".
- **13.14** storage saves "the latest accepted routing and fingerprints files". There are none until a pipeline post arrives, and AD-1 now says the bundle *always* holds all three.

Each unit can correctly say "not mine". The result is a first autosave with no derived files, which the new AD-1 forbids. Or else three places each create a slightly different empty file.

**Next to it:** AD-13 says pipeline posts both files at every seq. 13.14 autosaves "after every applied command". One compliant autosave waits for the echo at that seq, which stalls under a nudge burst and may never come if the echo is preempted. Another saves at once with whatever main holds. These two disagree on what the saved derived files are at any moment.

**Closing rule.**
- In AD-1 / AD-13: *main's derived-files holder (one service, named: e.g. in `storage`) starts both files with `model`'s `emptyDerivedFiles(revision)` whenever `replaceDesign` or `newDesign`'s flow reaches a design with none. That is the only main-side creation, and it is not "computing" in AD-11's sense.*
- *Autosave writes the derived files main holds at that moment and never waits for an echo. An echo only replaces the held copy.*
- Fix 13.20's "none yet" to "the empty ones".

## H5 (Medium): one bundle migration chain, but `replaceDesign` migrates a design only

**Pair.** 13.1 and 13.10's `replaceDesign` "takes `unknown`, migrates, parses with the design schema" (AD-2). Its input is the design file alone, because derived files are "not part of it". 13.14's `storage.load` follows the new AD-8: "one migration chain migrates the whole bundle (a step may touch any of its files)". That gives two migration entry points. A step that rewrites the routing file has no place in `replaceDesign`, and storage either migrates twice or bypasses `replaceDesign`'s migration.

**Also unspecified:**
- Whether a migration step re-tags the derived files. Migration changes the canonical serialisation, and therefore the revision.
- Whether "a load of a bundle missing a derived file" fills the gap before or after migration. That decides which revision the empty file is tagged with.

**Closing rule.** In AD-8 / AD-2:
- *`model` exports one `migrateBundle(raw) → Result<Bundle>`, called by `storage.load` and file open before `replaceDesign`. `replaceDesign` takes an already-current design and only parses, freezes and writes.*
- *A step leaves derived-file revision tags unchanged (AD-13 allows older).*
- *Missing derived files are filled after migration, tagged with the migrated design's revision.*

## H6 (Medium): `anchorAt`, `part` and `fit` have no defined value where they don't apply

Typed-array columns have no `undefined`, so each writer picks a value:
- **`part` and `fit` on group rows.** 13.2 writes `part = 0` (a valid row) and `fit = fitted`. 13.7 treats `part >= 0` as "draw a rectangle", and draws a keycap on every group.
- **`anchorAt` for a default anchor.** One 13.2 posts the stepped point (child *n−1*'s frame advanced by the step), so with zero offset `anchorAt == frame` and 13.7 draws a zero-length link. Another posts child *n−1*'s centre, as "the anchor link's far end". Both readings fit the comment. Free children use the parent origin, and the root group has no anchor at all.
- **Rows with `placed = false`.** `frame` and `anchorAt` could be 0, NaN or last good. A canvas that draws 0 puts cycle members at the world origin.

**Closing rule.** In Data Schema:
- *Group rows: `part = -1`, `fit = 'fitted'` (ignored).*
- *`anchorAt` is the origin of the anchor frame before the offset: the stepped point for a chain child's default anchor, the parent origin for free, the attach point's world position for a slot anchor. The root group's `anchorAt` is its own frame.*
- *`placed = false` rows carry NaN frames and are not drawn.*
- *Whether 13.7 draws links for default anchors is a 13.7 UX decision. It is not inferred from the data.*

## H7 (Medium): "sorted by the worker" names no comparator

**Pair.** The worker sorts with `localeCompare` or `Intl.Collator`, the habitual JavaScript choice. Main binary-searches with `<` (UTF-16 code-unit order). The two differ on `-`, `/` and digits, which are exactly the characters in kebab-case ids and `left/…`. Lookups then miss intermittently, on some ids only.

**Closing rule.** In AD-11: *ids are sorted in UTF-16 code-unit order (`a < b`, no locale); the sort and the binary search live together in `model`'s codec module and both sides call them.*

## H8 (Medium): hit-testing, handles and anchor picking need world points that neither side is allowed to compute

The decision rejected world rectangles partly because "attach points would need world positions too". After this update they still need them. AD-22 positions handles "through the viewport transform but drawn in screen space". AD-11 puts hit-testing and snapping on the posted snapshots, and 13.3 and 13.7 pick slot + attach-point anchors.

**Pair.** One 13.7 computes `frame ∘ rect corner` in JavaScript for a handle or snap target, which AD-22 reads as computing geometry. Another 13.7 uses only DOM hit-testing and can't snap. Then 13.3 asks for a one-off request kind for world attach points, which is a fourth path.

**Closing rule.** In AD-22: *composing a posted frame with a posted local point (`geometry`'s one `applyFrame`, H2's `mirrored` flag included) is drawing, not geometry, and is the only way main gets a world point of a part.*

## H9 (Low): `rect.cx` / `cy` and AD-4's step disagree once a rectangle is off-centre

AD-4 steps by `(rect(n−1) + rect(n)) / 2 + gap`, using extents only, and assumes rectangles centred on the slot. The new type allows `cx` and `cy`. A 13.2 that steps by `w` alone and a 13.7 that draws at `cx` show keys overlapping or with uneven gaps for any off-centre rectangle.

**Closing rule.** Either *a part's `rectangle` is centred on the slot frame (drop `cx`, `cy`)*, or *AD-4's step is edge to edge: from child n−1's far edge to child n's near edge, using `cx ± w/2`*.

## H10 (Low): `LayoutOutput` ids "are SideIds", but `SideId` admits only `left|right`

Unibody's side is `whole` (glossary, AD-6). M1 posts no unibody outputs (`unsupported-form`), so nothing breaks yet. Still, a 13.6 that types the ids column as `SideId[]` locks the codec against `whole/`.

**Closing rule.** *`SideId` admits `whole/…`*, or *the column is typed as plain `string` validated by the codec*.

---

## Checked and holding

- **Codec writer vs main reader:** one codec module beside the type in `model`, with a round-trip test. Enum encodings can't diverge.
- **Empty `RoutingFile` form:** `{ revision }` only, written by one canonical writer in `model`. Byte-identical round-trip holds.
- **Switch grace on hit-testing:** commands from a grayed snapshot carry its seq and are rejected (AD-2). This is sound, once H1 defines "arrived".
- **Units:** mm and degrees, counter-clockwise by AD-7. They are consistent as long as rotation is applied inside the viewport's single y-flip (AD-22). H2 is the only rotation hole.
