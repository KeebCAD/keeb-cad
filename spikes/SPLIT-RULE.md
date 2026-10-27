# Connection split rule (AD-14, fixed by the routing spike)

Implemented by `splitNet` in `src/split-rule.ts`; ids are built in `src/routing-input.ts`.
Feeds AD-14 via story 13.

## The rule

For each net, take the ids of its pads, sort them in **natural order**, and connect each pad to
the next. A net of n pads gives n − 1 connections, and no pad is on more than two. A net with
fewer than two pads gives none.

The rule sees only the net id and the pad ids. `splitNet(net, padIds)` cannot receive positions,
so moving a key never changes the connection set.

A star from the lowest pad id was rejected: it would put all of GND's connections on one pad.

**Natural order** compares runs of digits as numbers (`D2` < `D10`) and every other run by
code unit, which is locale-free. Two digit runs that are equal in value but spelled differently
(`01`, `1`) are decided right there, by code unit (`"01"` < `"1"`). Later runs are not looked at,
so `a01b` < `a1a`.

## Id grammar

```
net-id        = <net name as written in the .kicad_pcb>
pad-id        = <Reference> "." <pin> "." <copper> [ "." <copy> ]
                                                        ; copper = "F" | "B" | "TH"
                                                        ; copy = 2, 3, … (repeats, file order)
connection-id = <net-id> ":" <padA> "~" <padB>          ; padA < padB in natural order
```

- `copper` is `TH` for `*.Cu` (through-hole) pads, otherwise the pad's one copper side.
- Reversible duplicates are distinct pads, for example `S1.2.F` and `S1.2.B`, or `MCU1.24.TH`,
  `MCU1.24.F` and `MCU1.24.B`. Their links are visible connections and are never assumed
  connected.
- Pads with no number or no net (NPTH holes, mounting tabs, unused pins) are obstacles, not pads.
- A repeated `<Reference>.<pin>.<copper>` keeps the plain id on its first pad in file order.
  Later pads get `.2`, `.3` and so on. For example, the wired board's reversible TRRS1 has two
  holes for each of pins 2, 3 and 4, which become `TRRS1.2.TH` and `TRRS1.2.TH.2`. Ergogen writes
  the file order, and a key move does not change it. Copies are never merged, so they sort next to
  each other and the chain links them with a connection on their net (`GND:TRRS1.2.TH~TRRS1.2.TH.2`).
- No id contains a position.

Every connection also carries `realisedBy`:

- `fixed-copper`: the pre-routed traces already join both pads, for example a jumper's F, B and TH
  copies (`C0:MCU1.120.B~MCU1.120.F`).
- `key-cell`: both pads are on one key's switch or diodes (AD-12: S_n, D_n, D_{n+21}).
- `routing`: anything else.

This tag is the only place positions are used, and they never affect an id or the split. A trace
end on a pad's copper, on the same layer, joins the trace to the pad; a through-hole pad counts on
both layers. A trace end on another trace of the same layer joins the two traces. A solder jumper
is not copper. All three kinds are emitted.

## Worked example: Corney wireless, row net `R2`

R2 joins the bottom-row diodes and the MCU's jumper pads for pin 110. Its pads in natural order
are `D1.1.B D4.1.B D7.1.B D10.1.B D13.1.B D16.1.B D22.1.F D25.1.F D28.1.F D31.1.F D34.1.F
D37.1.F MCU1.110.B MCU1.110.F MCU1.110.TH`. That is 15 pads, so the chain has 14 connections:

```
R2:D1.1.B~D4.1.B
R2:D4.1.B~D7.1.B
…
R2:D16.1.B~D22.1.F
…
R2:D37.1.F~MCU1.110.B
R2:MCU1.110.B~MCU1.110.F
R2:MCU1.110.F~MCU1.110.TH
```

The first 12 are `routing`, because no two adjacent pads share a key. The last two are
`fixed-copper`, because Ergogen's pre-routed jumper traces already join MCU1's B, F and TH copies
of pin 110. By contrast, column net `C0` gives `C0:S1.1.B~S1.1.F`, which is `key-cell`: both of
S1's pin-1 pads belong to key 1.

## Mapping to AD-14 ids

Corney has no keeb-cad slot ids yet, so the ids use KiCad references. When AD-14's
`<side>/<slot>.<component>.<pin>` ids exist, the mapping is:

| KiCad | AD-14 |
|---|---|
| `S_n` | key n's `switch` |
| `D_n`, `D_{n+21}` | key n's `diode` (its B and F placements) |
| `LED_n` (wired) | key n's `led` |

Key n is the nth point tagged `key` in `points.yaml`. The rule itself does not change: only the
pad-id spelling does, and natural order is defined on any string.
