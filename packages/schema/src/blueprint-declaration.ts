import * as v from 'valibot'

import { blueprintIdSchema } from './blueprint-id'
import { declaredInputSchema } from './declared-input'
import { laneDeclarationSchema } from './lane-declaration'
import { upgradeMappingSchema } from './upgrade-mapping'
import { versionSchema } from './version'

const licenceSchema = v.strictObject({
  spdx: v.string(),
  author: v.string(),
  source: v.optional(v.string()),
})

const lanesSchema = v.strictObject({
  parts: v.optional(laneDeclarationSchema),
  shapes: v.optional(laneDeclarationSchema),
  extras: v.optional(laneDeclarationSchema),
  plates: v.optional(laneDeclarationSchema),
  pcb: v.optional(laneDeclarationSchema),
  firmware: v.optional(laneDeclarationSchema),
  case: v.optional(laneDeclarationSchema),
})

export const blueprintDeclarationSchema = v.strictObject({
  id: blueprintIdSchema,
  version: versionSchema,
  apiVersion: v.pipe(v.number(), v.integer()),
  licence: licenceSchema,
  inputs: v.record(v.string(), declaredInputSchema),
  lanes: lanesSchema,
  upgrade: v.optional(upgradeMappingSchema),
  uses: v.array(v.strictObject({ id: blueprintIdSchema, minVersion: versionSchema })),
  nets: v.optional(v.unknown()),
})
