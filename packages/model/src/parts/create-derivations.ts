import { argumentHash, type LaneRunner } from '@keeb-cad/blueprint/worker'
import { computed } from '@keeb-cad/reactive'
import {
  type BlueprintInputs,
  type Design,
  type Frozen,
  type LayoutOutput,
  type LibraryData,
  type ReadonlyRef,
  type ResolvedParts,
  type Violation,
} from '@keeb-cad/schema'

import { borderMargin } from '../borders/border-margin'
import { groupBorders } from '../borders/group-borders'
import { checkAnchors } from '../dependencies/check-anchors'
import { dependencyGraph, resolvedDependencies } from '../dependencies/dependency-graph'
import { unplacedOf } from '../dependencies/unplaced-of'
import { evaluateExpressions } from '../evaluation/evaluate-expressions'
import { gapKey } from '../evaluation/value-key'
import { designFaults } from '../inputs/design-faults'
import { resolveInputs } from '../inputs/resolve-inputs'
import { resolvePartRef } from '../part-levels/resolve-part-ref'
import { slotPartRuns } from '../part-levels/slot-part-runs'
import type { FoundPart, SlotPartRun } from '../part-levels/types'
import { isSupportedForm } from '../form/is-supported-form'
import { placeLayout } from '../placement/place-layout'
import { removedSideIds } from '../overrides/removed-side-ids'
import { expressionViolations } from '../violations/expression-violations'
import { layoutViolations } from '../violations/layout-violations'
import { overrideViolations } from '../violations/override-violations'
import { unsupportedFormViolation } from '../violations/unsupported-form-violation'
import { firstPerOwner } from './first-per-owner'
import { inputInvalidViolation } from './input-invalid-violation'
import { laneFailureViolation } from './lane-failure-violation'
import { partsLaneCalls } from './parts-lane-calls'
import { partsOutputOf } from './parts-output-of'
import { rectangleOf } from './rectangle-of'
import { unresolvedViolation } from './unresolved-violation'
import { pinsOf } from './pins-of'
import type { Derivations, PartRun, Rectangle } from './types'

const STAGE_VERSION = 1
const STAND_IN_RUN = 'stand-in'
const STAND_IN_SIZE = 18

export function createDerivations(
  design: ReadonlyRef<Frozen<Design>>,
  library: LibraryData,
  runner: LaneRunner,
): Derivations {
  const defaultPart = computed(() => design.value.meta.defaultPart)
  const parameters = computed(() => design.value.parameters)
  const libraryVersions = computed(() => design.value.libraryVersions)
  const designParts = computed(() => design.value.parts)
  const layout = computed(() => design.value.layout)
  const overrides = computed(() => design.value.overrides)
  const gap = computed(() => design.value.meta.gap)
  const form = computed(() => design.value.meta.form)
  const designId = computed(() => design.value.meta.id)
  const slotRuns = computed(() => slotPartRuns(layout.value, defaultPart.value))
  const pins = computed(() => pinsOf(libraryVersions.value))

  const parts = computed((): ResolvedParts => {
    if (!isSupportedForm(form.value))
      return { output: { ids: [], rows: [] }, slots: {}, violations: [] }
    // Read for its dependency: a bump means a pause changed what a run answers.
    void runner.lanesReady.value
    const lookups = {
      parts: designParts.value,
      libraryVersions: libraryVersions.value,
      declarations: library.declarations,
    }
    const runs = new Map<string, PartRun>()
    const rectangles = new Map<string, Rectangle>()
    // Main's checkInputs reads the same list, so both threads name the same faults.
    const violations: Violation[] = firstPerOwner(designFaults(lookups, slotRuns.value)).map(
      inputInvalidViolation,
    )

    // The declared defaults under the part's inputs under the slot's.
    const inputsOf = (found: FoundPart, slot: SlotPartRun) =>
      resolveInputs(
        found.declaration,
        { scope: 'part', id: found.part.id },
        found.part.inputs,
      ).flatMap((partInputs) =>
        resolveInputs(found.declaration, { scope: 'slot', id: slot.slot }, slot.inputs, partInputs),
      )

    const runOf = (found: FoundPart, slot: SlotPartRun, inputs: Frozen<BlueprintInputs>) => {
      const id = `${found.part.id}@${argumentHash(inputs)}`
      let run = runs.get(id)
      if (run === undefined) {
        const result = runner.runLane(
          {
            id: found.pin.id,
            version: found.pin.version,
            stage: 'parts',
            stageVersion: STAGE_VERSION,
          },
          partsLaneCalls(found.declaration),
          { canonical: inputs, laneArgs: () => ({ inputs, pulls: {}, queries: {} }) },
        )
        run = { part: found.part.id, result, slots: [] }
        runs.set(id, run)
        const rectangle = rectangleOf(result, found)
        if (rectangle !== undefined) rectangles.set(id, rectangle)
      }
      run.slots.push(slot.slot)
      return { id, rectangle: rectangleOf(run.result, found) }
    }

    const slots: ResolvedParts['slots'] = {}
    let standInUsed = false
    for (const slot of slotRuns.value) {
      let reported = false
      let chosen: string | undefined
      let chosenIndex = -1
      for (const [index, level] of slot.levels.entries()) {
        const resolution = resolvePartRef(level, lookups)
        if (resolution.kind === 'unresolved') {
          if (!reported) {
            reported = true
            violations.push(unresolvedViolation(slot.slot, resolution.severity))
          }
          continue
        }
        const inputs = inputsOf(resolution, slot)
        // Like a found part with no output, a faulty part or slot reports only its input fault.
        if (inputs.isErr()) {
          reported = true
          continue
        }
        const { id, rectangle } = runOf(resolution, slot, inputs.value)
        if (rectangle !== undefined) {
          chosen = id
          chosenIndex = index
          break
        }
        // A found part with no output reports only its blueprint violation.
        reported = true
      }
      if (chosen === undefined) standInUsed = true
      slots[slot.slot] =
        chosen === undefined
          ? { run: STAND_IN_RUN, fit: 'stand-in' }
          : { run: chosen, fit: chosenIndex === 0 ? 'fitted' : 'stand-in' }
    }

    if (standInUsed) rectangles.set(STAND_IN_RUN, { w: STAND_IN_SIZE, h: STAND_IN_SIZE })
    for (const run of runs.values()) {
      const { result } = run
      if (result.isErr() && result.error.kind !== 'unavailable') {
        violations.push(laneFailureViolation(run, result.error))
      }
    }
    return { output: partsOutputOf(rectangles), slots, violations }
  })

  const anchors = computed(() => checkAnchors(layout.value))
  const expressions = computed(() =>
    evaluateExpressions({
      designId: designId.value,
      parameters: parameters.value,
      gap: gap.value,
      layout: layout.value,
    }),
  )
  // Only a chain step reads the gap, so a failed axis leaves its steps unplaced, not the layout.
  const unplaced = computed(() => {
    const graph = dependencyGraph(layout.value)
    const { failedGap, unplacedNodes } = expressions.value
    const failedSteps = [...graph]
      .filter(([, { dependency }]) => dependency?.kind === 'previous' && failedGap[dependency.axis])
      .map(([id]) => id)
    return unplacedOf(resolvedDependencies(graph), [
      ...anchors.value.unplaced,
      ...unplacedNodes,
      ...failedSteps,
    ])
  })
  const removed = computed(() => removedSideIds(overrides.value, layout.value))
  const placements = computed((): LayoutOutput => {
    if (!isSupportedForm(form.value)) return { ids: [], rows: [] }
    const { values } = expressions.value
    // A failed axis reads as 0, so the margin falls to its floor and borders still draw.
    const margin = borderMargin({
      x: values.get(gapKey('x')) ?? 0,
      y: values.get(gapKey('y')) ?? 0,
    })
    return groupBorders(
      layout.value,
      placeLayout(layout.value, values, parts.value, unplaced.value, removed.value),
      parts.value.output,
      margin,
    )
  })
  // The parts' violations keep their place, then the layout's, then the expressions', then the
  // overrides' in their list's order; an unsupported form reports only itself, since nothing is resolved or placed.
  const violations = computed((): Violation[] =>
    isSupportedForm(form.value)
      ? [
          ...parts.value.violations,
          ...layoutViolations(anchors.value),
          ...expressionViolations(expressions.value),
          ...overrideViolations(overrides.value, layout.value, form.value),
        ]
      : [unsupportedFormViolation(designId.value)],
  )

  return { parts, pins, placements, violations }
}
