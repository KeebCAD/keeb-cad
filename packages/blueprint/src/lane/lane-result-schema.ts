import * as v from 'valibot'

export const laneResultSchema = v.union([
  v.strictObject({ ok: v.unknown() }),
  v.strictObject({ failed: v.string() }),
  v.strictObject({ notJsonExact: v.strictObject({ path: v.string(), reason: v.string() }) }),
  v.strictObject({ outOfMemory: v.literal(true) }),
])

export const laneValueSchema = v.object({
  outputs: v.record(v.string(), v.unknown()),
  problems: v.array(v.object({ message: v.string(), severity: v.picklist(['error', 'warning']) })),
})
