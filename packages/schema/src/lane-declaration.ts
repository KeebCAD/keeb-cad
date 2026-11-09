import * as v from 'valibot'

const targetSchema = v.picklist(['plate', 'pcb', 'case'])

const pullSchema = v.strictObject({
  role: v.string(),
  target: v.optional(targetSchema),
  count: v.picklist(['exactly-one', 'at-least-one', 'any']),
})

const outputSchema = v.strictObject({
  name: v.string(),
  role: v.string(),
  target: v.optional(targetSchema),
  kind: v.picklist(['shape', 'solid', 'footprint', 'part-placement', 'config', 'envelope']),
  purpose: v.optional(v.unknown()),
  count: v.picklist(['one', 'any']),
})

export const laneDeclarationSchema = v.strictObject({
  pulls: v.array(pullSchema),
  queries: v.array(v.string()),
  outputs: v.pipe(
    v.array(outputSchema),
    v.check(
      (outputs) => new Set(outputs.map(({ name }) => name)).size === outputs.length,
      'Two outputs share a name.',
    ),
  ),
})
