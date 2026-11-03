---
review: adversary
target: _bmad-output/architecture-keeb-cad-layout-model/architecture-keeb-cad-layout-model.md
change: git diff HEAD (2026-11-03, 23.2 gate items 1, 2, 2b, 3a, 3b, 3c, 4; .memlog.md lines 371-377)
date: 2026-11-03
lens: construct two units that each obey every AD and still build incompatibly because of this change
---

# Adversary review: 23.2 gate (Rejection, Meta tags, format-version 1, Quantity, first-reader kinds, tagged quantity input, hashing)

**Verdict:** not ready to build 23.2 as written. The direction is sound, but two signatures contradict AD-10 and AD-24 at compile time (H1, H2), and three shared shapes leave room for two stories to build different things (H3 to H5). Every fix below is a wording change to the spine. None needs a new decision, except where a finding says "decide".

Line numbers refer to the working-tree spine.

---

## High

### H1. `hashing` cannot return `Hash` or `AssetHash` (line 325; seed line 1024)

**The clash.** AD-10 (line 322) says `hashing` is a kernel that imports no workspace package. The new text gives it `hash(value): Hash` and `hashBytes(bytes): Promise<AssetHash>`, but both brands are defined in `schema` (lines 707-709). AD-24 (line 643) adds that "a brand comes from its schema, never from a particular caller".

- **Unit A (23.2, `hashing`)** obeys AD-10: no imports, so it returns `string`.
- **Unit B (23.2, `design`)** obeys the new AD-10 text: it types the call as returning `Hash` and passes that to the `Revision` schema. The memlog (line 377) says "design parses the result with the Revision schema", which only makes sense if the result is unbranded.

The spine names a type that the kernel cannot produce.

**Fix wording (line 325).** "**`hash(value): string`** … **`hashBytes(bytes): Promise<string>`** … Callers parse the result with the brand's schema: `design` with `Revision`, `pipeline` and `blueprint/worker` with `Hash`, the asset caller with `AssetHash`." Also update the seed comment at line 1024: "…the content hashes: `hash` (sync, canonical value) and `hashBytes` (async SHA-256, assets)", replacing "the one content hash".

### H2. `Fix.input: unknown` breaks AD-24's two rules (line 740 against line 642 and line 644)

**The clash.** AD-24 says every type is inferred from a Valibot schema, with a closed list of hand-declared exceptions, and bans `unknown` as a pass-through kind for object values. `Violation`, `Fix`, `Rejection`, `SchemaIssue` and `DesignInvalid` are not on the exception list, so each needs a schema. That forces `Fix`'s schema to be `v.unknown()`, which is banned.

- **Unit A (13.3)** writes `FixSchema = v.object({ command, input: v.unknown() })` to keep inference, and breaks the ban.
- **Unit B (a later reviewer)** applies AD-24 to the letter and rejects it, so 13.3 hand-declares `Fix`, which breaks the inference rule.

Either way one AD is broken. There is also a second-order gap: the fix producer (`model/worker`) cannot import `commands`, where the input schemas live. A fix whose input does not match its command (say `{ gap: { x } }` against `setGap`'s `{ x, y }`) is therefore caught only when a user clicks it, as an `input-invalid` rejection.

**Fix wording (line 642, AD-24 first bullet).** Add to the exception list: "…and the refusal and violation types (`SchemaIssue`, `Rejection`, `DesignInvalid`, `Violation`, `Fix`), which are built in code, never parsed from outside, so they have no schema." Add to the `Fix` comment (line 740): "a test over every fix a stage emits in the Corney scenarios parses its `input` with its command's schema (verification layer 3)."

### H3. `ItemId` is too narrow for the ids that violations and rejections name (line 723)

**The clash.** `ItemId = Id | SideId | LibraryId`, but the existing kinds name other ids:

- pads (`<side>/<slot-id>.<component>.<pin>.<copper>`), from `drc` and `pin-role-unmatched`;
- nets and connections, from `unrouted` and AD-14;
- part-run ids (`'<part id>@<hash>'`, `'stand-in'`, line 919);
- block nodes (`<instance-id>/<block-node-id>`);
- **parameter names.** A parameter's id is its name (glossary), and `unit-mismatch` and a parameter cycle name it. Line 301 makes every minted `Id` kebab-case, but in AD-17's grammar `wall-gap` parses as subtraction. So a parameter name either is not an `Id` or cannot contain `-`.

Pad ids also type-check as `SideId` (`left/${string}`), and the who-points-at walk resolves a `SideId` to a slot. A pad id passed through `ItemId` would be read as a side placement.

- **Unit A (`routing`, `unrouted`)** casts connection ids to `Id` to fit `Violation`.
- **Unit B (`editor`, selection from a violation)** looks the id up as a slot and selects nothing, or the wrong thing.

**Fix wording (line 723).** "`type ItemId = Id | SideId | LibraryId | ParameterName | ResolvedId` (decide: one `ResolvedId` brand for pads, nets, connections and part runs, or a tagged `{ kind, id }`). `ParameterName` is its own kind, matching AD-17's identifier grammar (no `-`), coded by the first parameters story." Also state on line 301 that parameter names are not minted `Id`s.

### H4. Load failures are typed two ways (lines 113 and 293 against Consistency Conventions line 964)

**The clash.** `design-invalid` is now a `Result` error (`DesignInvalid`), but `format-too-new` and `migration-failed` are still listed as `design-file` **violation kinds**. A `Violation` needs `severity`, `ids` and `fixes`, and those two are not design problems: the file never opens. `migrateBundle`'s error type is undefined.

- **Unit A (23.6, reopen)** handles `Result<void, DesignInvalid>` from `replaceDesign`.
- **Unit B (the `design-file` migration story)** emits `format-too-new` as a `Violation` through the `issues` path, which no load caller reads.

The derived files are also left out. The new AD-8 bullet speaks only of the design, so when the routing or fingerprints file no longer parses, it is open whether `replaceDesign` refuses the whole bundle or empties that file. 23.2 and the first routing story can choose differently.

**Fix wording.** Data Schema, beside `DesignInvalid`: "`type LoadError = { kind: 'format-too-new'; found: number; known: number } | { kind: 'migration-failed'; step: number; message: string } | DesignInvalid` — `migrateBundle` returns `Result<Bundle, LoadError>`. A derived file that fails its schema is replaced with `emptyDerivedFiles`' value and never refuses the design." Remove "`design-file`: `format-too-new`, `migration-failed`" from the Violations row (line 964).

### H5. A blueprint input that fails its range check has no `Rejection` kind (line 327 against lines 726-730 and line 799)

**The clash.** `checkInputs` is a `model/main` query returning `Rejection | void`, so it must use `model`'s `reject(kind, ids, message)` with a `ModelRejectionKind`. No story is tagged to add one, and line 730 names only 13.3's cycle. The register's own kind `input-invalid` carries a `command` and `SchemaIssue[]`, which `model` does not have. Meanwhile, `BlueprintInputs` (line 799) and the declaration checks (lines 846-850) say a bad value is `blueprint-input-invalid`, a **violation**, meaning the edit goes through.

- **Unit A (the first blueprint-input command)** refuses with a new model kind, `input-out-of-range`.
- **Unit B (the same register path, read from line 799)** lets the edit through and reports `blueprint-input-invalid`.

**Fix wording (line 730).** "…each member added by the story that rejects with it (13.3: the cycle; the first `setEntryInputs` story: `input-out-of-range`, from `checkInputs`)." On line 799: "A command that sets a bad value is refused (`checkInputs`); `blueprint-input-invalid` reports values that arrive by load, upgrade or a library version change."

---

## Medium

### M1. The phantom unit never reaches an inferred type, and `Delta` and `Length` are the same type (lines 697-705 and line 790)

- `quantity(unit)` is the `Expression` schema piped with `v.metadata({ unit })`. `v.InferOutput` of that is `Brand<string,'Expression'>`, so every inferred field (`Gap.x`, `Offset.rotation`, …) is a bare `Expression`, not `Quantity<'mm'>`. Because `[unit]` is optional, a bare `Expression` and a `Quantity<'deg'>`-shaped value are both assignable wherever a hand-declared parameter says `Length`. The unit guard holds only between two hand-annotated values.
- `Delta` and `Length` are both `Quantity<'mm'>`, with the same metadata. The walk cannot tell a `Length` field from a `Delta` field, yet `negative-length` must check only `Length`s. 13.2 codes both; the `negative-length` story finds nothing to tell them apart.
- `InputValue` (line 790) uses a bare `Quantity`. `Quantity<U extends Unit>` has no default, so that is a compile error.

**Fix wording.** On line 698: "`quantity(unit)` is typed by a hand-declared signature, `quantity<U extends Unit>(unit: U): v.GenericSchema<string, Quantity<U>>`, so inferred fields carry the unit." Then: "`length()` and `delta()` differ in metadata (`{ unit: 'mm', check: 'non-negative' }` for `Length`), and `negative-length` reads that metadata." On line 790: "`value: Quantity<Unit>` (the declared input's `unit` picks which)."

### M2. 23.2's first-reader kinds are listed as "Id only", but 23.2 reads more (line 750; memlog line 375)

The rule "a shared kind is coded by its first reader" makes 23.2 the first reader of `Revision` (design parses the hash with it, line 377), `CommandId` (`input-invalid`), and `ItemId`, so also `SideId`, `PartId`, `BlueprintId` and `LibraryId` (the model variant of `Rejection`), plus `Result`. Line 750 tags only `Id` with 23.2, and the memlog says "23.2 codes Id only".

- **Unit A (23.2)** codes `PartId`/`LibraryId` minimally to satisfy `ItemId`.
- **Unit B (13.18)** believes it owns `PartId` with `ref('library-part')` and codes its own `v.custom` check.

Two definitions, or a merge conflict over who owns the `lib:` prefix check.

**Fix wording (line 750).** "Coded by 23.2: `Id`, `Revision`, `CommandId` (empty union until the first command), `SideId`, `PartId`, `BlueprintId`, `LibraryId`, `ItemId`, `Result`, `SchemaIssue`, `Rejection`, `DesignInvalid`; `ModelRejectionKind` starts as `never`. `ref(kind)`: 13.18." Tag `Revision`, `SideId` and `LibraryId` on their own lines too.

### M3. `hashBytes` "on `storage`'s save path" is too late for the asset input (line 325 against lines 793 and 470)

An asset input (`{ type: 'asset'; hash: AssetHash }`) is set by a command, and commands are synchronous. The hash must exist **before** the command runs, when the user picks the file, not when `storage` saves.

- **Unit A (`storage`)** hashes the bytes in `save`, as written.
- **Unit B (the first asset-input story)** needs the hash first. It hashes in `editor` and must keep the bytes somewhere until save, but `design`'s bundle (AD-1) has no asset slot in memory.

Two hash call sites, and an unowned in-memory asset store.

**Fix wording (line 325).** "…for assets only: called where an asset enters the app (import), before the command that references it; the bytes wait in `design`'s bundle, keyed by that hash, until `storage` saves them (the first asset story types that slot)."

### M4. Swapping the `hash` function silently changes saved fingerprints (line 325 against AD-11, lines 433-434)

The memlog accepts that "revision values may change" when the spike lands, because dev saves are disposable. But `FingerprintsFile` stores `Hash`es too. A swapped function makes every fingerprint differ, so AD-11 shows every build entry as "output changed" and asks for **Accept output change**. After the first public preview that would be a mass false alarm, and there is no migration for it, since format-version only covers the schema.

**Fix wording (line 325, after "revision values may change then").** "The `hash` function freezes with `format-version` 1 at the first public preview. The mirror-hash spike lands before it, or a function change after it is a bundle migration (AD-8) that recomputes fingerprints."

### M5. Nothing triggers the "first public preview" freeze (line 293)

The format-version freeze is pinned to an event that no ticket owns. Deferred has "Before the first public preview" rows for hosting and offline, but none for freezing the format. An autosave that still parses but has changed meaning (a field reinterpreted, not added) also loads without any error, because no version marks the change.

**Fix wording.** Add a Deferred row: "Freeze `format-version` 1 and the `hash` function; add the first migration test (a v1 bundle loads unchanged) | Nothing public reads v1 yet | Before the first public preview." On line 293, add: "a change that keeps a field's shape but changes its meaning is not allowed before then either; rename the field instead."

### M6. Two different `stale` rejections (line 417 against line 728)

`messaging` (a kernel with no imports) sends "a typed `stale` rejection reply to a request dropped as stale", and `design`'s register returns `Rejection { kind: 'stale'; seq; latest }`. Same word, two types, two owners. `editor`'s exhaustive match covers only one, and a reviewer reading "typed `stale` rejection" cannot tell which is meant.

**Fix wording (line 417).** "a typed `request-stale` reply (`messaging`'s own type, not `schema`'s `Rejection`)…"

---

## Low

- **L1. Line 536 (AD-17).** "holds a literal or an expression" sits in front of the new sentence and keeps the two-form reading. Replace the pair with: "Any length or angle property in any authored section holds a quantity: an expression string, in the file and in memory; a literal (`"19mm"`) is the smallest expression (Data Schema `Quantity`)."
- **L2. Line 963 (Units in files).** "Quoted with an explicit unit or as an expression" is two-form. Replace with: "Every quantity is a quoted expression string; a literal is the smallest: `"19mm"`, `"-15deg"`, `"wall + gap"`."
- **L3. Line 204 (AD-2).** "(the hash's form stays open: Open Questions)" is stale now that `hash` is defined. Replace with: "(`hashing`'s `hash`, provisional until the mirror-hash spike, AD-10)".
- **L4. Line 295 (AD-8).** "A schema change in any file of the bundle bumps it" is unqualified, and the new bullet above it suspends that rule. Add "(from the first public preview, above)".
- **L5. Line 724 and line 690.** "no Valibot type leaves schema" is wrong: `design` (register, `replaceDesign`), `commands` and `blueprint` all import Valibot (line 349) and receive Valibot issues. Schema also may hold no function besides `ref` and `compareId`, so the issue-to-`SchemaIssue` copier has no home. Two parsers (`design`'s register and `blueprint`'s boundary check) will each write one. Reword as: "no Valibot type crosses a package's exported API; `design` owns the one `toSchemaIssues` copy (the register and `replaceDesign`)."
- **L6. Line 752 (`provenance`, 22.1) against `licence` (no story yet).** 22.1 copies `meta.licence`, a field that has no story, so `provenance.licence` is always unset and 22.1 is the first reader of `Licence`. Either tag `licence` 22.1 or say 22.1 codes `Licence` and `meta.licence`.
- **L7. `newDesign` (23.3) and fields added later.** 13.18 adds the required `defaultPart` and 13.2 the required `gap`, but `newDesign` belongs to 23.3. Say on line 149 or 150: "the story that adds a required `meta` field also extends `newDesign`'s default."
- **L8. Line 730.** `ModelRejectionKind` and `ViolationKind` may share a string (the cycle refusal vs `anchor-cycle` on load). Say whether 13.3's rejection kind is `anchor-cycle` (same name, two types) or a distinct name such as `would-cycle`.
- **L9. Quantities with no unit.** `Unit = 'mm' | 'deg'` has no dimensionless member, yet AD-17's `*` and `/` need plain numbers, and blueprint inputs such as a count may be unitless. Decide whether `Quantity` needs a `'1'` unit or a count input is `option`/`text`. This is not caused by the change, but the change makes `Quantity` the only numeric input form.

---

## Checked and holding

- The `Rejection` union discriminates cleanly on `kind`, as long as `ModelRejectionKind` stays disjoint from `'input-invalid' | 'unavailable' | 'stale'`. Say so in the line 730 comment.
- The `stale` rejection agrees with AD-2's "Commands from snapshots" (line 208) and with design's seq being main's latest.
- The tagged `{ type: 'quantity' }` input agrees with AD-24's "an input value that holds a reference is a tagged object" (line 645). `Expression` is reference-carrying, so this closes a real gap: a bare string input was indistinguishable from text.
- The Open Questions row for Violation/Fix/Rejection is correctly removed, and the mirror-hash spike row is updated consistently.
- `replaceDesign: Result<void, DesignInvalid>` agrees with AD-2's "every function that can fail in an expected way returns a Result".
