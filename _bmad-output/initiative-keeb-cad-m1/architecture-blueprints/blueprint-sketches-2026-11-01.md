# Blueprint sketches: description vs calls

Working material for the blueprints architecture run (coaching, 2026-11-01). Not a decision. Four
blueprints the milestone plausibly needs, each written two ways, with every point where the code
needs a geometric result back marked **⟲**.

- **D, description:** the lane returns an operation tree as plain data; the host evaluates it
  (one crossing per lane run). The data form of the design's own work is already this shape.
- **C, calls with handles:** operations run on the host as they are called and return opaque
  handles; measuring calls (`length(h)`, `bounds(h)`) bring numbers back (one crossing per call).

API names are invented for the sketch. Inputs arrive as evaluated plain values (AD-10).

## 1. Key (`parts` lane, live)

```ts
// D
export const parts = ({ size, pitch, hotswap }) => ({
  rectangle: rect(units(size) * pitch, pitch),                 // the keycap, the slot's one rectangle
  cutout: { role: 'cutout', target: 'plate', purpose: 'switch', shape: rect(14, 14) },
  footprint: choc(hotswap),                                     // pads at fixed coordinates
  envelope: rect(units(size) * pitch, pitch),
})

// C
export function parts({ size, pitch, hotswap }, op) {
  return { rectangle: op.rect(units(size) * pitch, pitch), cutout: op.cutout('switch', op.rect(14, 14)), … }
}
```

Numbers in, geometry out. **No ⟲.** D: 1 crossing. C: ~4–6 crossings per slot.

## 2. Tray style (`case` lane, background worker)

```ts
// D
export const reads = ['outline', query('tallest-part'), pull('cutout', 'case', 'any'), pull('mount', 'case', 'any')]
export const case_ = ({ wall, floor, clearance }, { outline, tallestPart, cutouts, mounts }) => {
  const inner = offset(outline, -wall)                          // a node, not a value
  return {
    'case-body': subtract(
      extrude(outline, floor + tallestPart + clearance),
      extrude(inner, tallestPart + clearance, { from: floor }),
      ...cutouts, ...mounts),
    spots: { floor: at(inner, 'bottom'), 'usb-side': edgeFacing(inner, '+y') },   // host-resolved selectors
  }
}
```

Bosses: where do screw bosses go? Two readings:

- inputs name them (anchors picked by the user, AD-3): **no ⟲**;
- "four bosses wherever they fit inside the inner wall, clear of keys": the code must look at
  `inner` and the key envelopes, **⟲** (C: `op.bounds(inner)`, `op.contains(…)`; D: a host
  operation `fitPoints(inner, avoid, n)` that the API has to grow).

Edge fillets ("round the top edges") are a host selector in D (`edges(body, 'top')`, CadQuery's
`faces('>Z').edges()` style), **no ⟲**. Runs in the case worker: no frame budget.

## 3. Magnet pocket (addition, `case` lane)

```ts
// D (C is the same with op.*)
export const case_ = ({ diameter, depth, at }) => ({
  pocket: { role: 'cutout', target: 'case', shape: cylinder(diameter / 2, depth),
            place: { ref: 'bottom of the body', anchor: at } },
})
```

**No ⟲**: AD-18 already rules that a producer never reads the body it contributes to; the tray
reports "pocket deeper than the floor" as a violation.

## 4. Underglow (`extras` lane, live; plus a `firmware` lane)

```ts
// C
export function extras({ inset, spacing }, { outline }, op) {
  const path = op.offset(outline, -inset)
  const n = Math.floor(op.length(path) / spacing)                // ⟲ measure own result
  const leds = op.pointsAlong(path, n).map((p, i) => op.place('sk6812-mini', p, { chain: i }))   // ⟲ read points back
  return { parts: leds, firmware: { ledCount: n } }
}

// D
export const extras = ({ inset, spacing }, { outline }) => {
  const path = offset(outline, -inset)
  const points = pointsEvery(path, spacing)                     // host evaluates; count follows
  return { parts: pattern(points, (p, i) => part('sk6812-mini', p, { chain: i })),
           firmware: { ledCount: count(points) } }              // a node; the firmware lane reads it resolved
}
```

**⟲ in C, not in D**, but only because D grew `pointsEvery`, `pattern` and `count`: the
description language becomes a small dataflow language. A request like "skip LEDs under the
thumb cluster" adds a filter node, or a ⟲.

## What the sketches show

| Blueprint | Lane | Live? | ⟲ in C | D needs |
|---|---|---|---|---|
| Key | parts | yes | none | nothing beyond primitives |
| Tray | case | no (worker) | only for auto-placed bosses | host selectors; maybe `fitPoints` |
| Magnet pocket | case | no | none (AD-18 forbids it) | nothing |
| Underglow | extras | yes | measure + read points | `pointsEvery`, `pattern`, `count`, filters |

- The live lanes (`parts`, `extras`) are where crossings cost frame time; the `case` lane runs in
  a worker with no frame budget.
- Only one sketch needs ⟲ for sure (underglow), and it is a live lane.
- D trades ⟲ for a growing set of dataflow operations; C trades a fixed API for crossings.
- A third shape the table suggests: **D for live lanes, C allowed in background lanes.**
- A fourth: 2D geometry available inside the sandbox as a pure library over plain data, so ⟲
  never crosses (cost: interpreted speed, and a second copy of the kernel).

## Prior art (checked on the web 2026-11-01)

- OpenSCAD: no built-in way to measure an object's bounding box; a long-running complaint on its
  mailing list ([lists.openscad.org](https://lists.openscad.org/empathy/thread/YT4G3WNJDFX5MQFKWYFDX3F4ZLNFKZMQ?page=3)).
- CadQuery: selectors such as `faces('>Z').edges().fillet(…)` pick evaluated faces and edges by
  direction ([selectors reference](https://cadquerytest.readthedocs.io/en/readthedocs/selectors.html)).
- Onshape FeatureScript: features query evaluated geometry (`evaluateQuery`, `evBox3d`)
  ([Evaluating FeatureScript](https://onshape-public.github.io/docs/api-adv/fs/)).
- Ergogen: a footprint is a JS `body(params)` that returns the KiCad footprint as a string; numbers
  in, text out ([docs.ergogen.xyz/pcbs](https://docs.ergogen.xyz/pcbs)).
