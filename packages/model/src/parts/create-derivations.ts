import type { LaneFailure } from '@keeb-cad/blueprint'
import { argumentHash, type LaneRunner } from '@keeb-cad/blueprint/worker'
import { computed } from '@keeb-cad/reactive'
import {
  compareId,
  type BlueprintInputs,
  type Design,
  type Frozen,
  type Id,
  type ItemId,
  type LayoutOutput,
  type LibraryData,
  type PartsOutput,
  type ReadonlyRef,
  type ResolvedParts,
  type Violation,
} from '@keeb-cad/schema'

import { borderMargin } from '../borders/border-margin'
import { groupBorders } from '../borders/group-borders'
import { checkAnchors } from '../dependencies/check-anchors'
import { designFaults } from '../inputs/design-faults'
import { resolveInputs } from '../inputs/resolve-inputs'
import type { BlueprintInputInvalid } from '../inputs/types'
import { resolvePartRef } from '../part-levels/resolve-part-ref'
import { slotPartRuns } from '../part-levels/slot-part-runs'
import type { FoundPart, SlotPartRun } from '../part-levels/types'
import { isSupportedForm } from '../form/is-supported-form'
import { literalValue } from '../placement/literal-value'
import { placeLayout } from '../placement/place-layout'
import { layoutViolations } from '../violations/layout-violations'
import { unsupportedFormViolation } from '../violations/unsupported-form-violation'
import { partViolationMessage } from './part-violation-message'
import { partsLaneCalls, rectangleOutputOf } from './parts-lane-calls'
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
  const libraryVersions = computed(() => design.value.libraryVersions)
  const designParts = computed(() => design.value.parts)
  const layout = computed(() => design.value.layout)
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
      inputInvalid,
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
            violations.push(unresolved(slot.slot, resolution.severity))
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
        violations.push(failure(run, result.error))
      }
    }
    return { output: partsOutputOf(rectangles), slots, violations }
  })

  const anchors = computed(() => checkAnchors(layout.value))

  const placements = computed((): LayoutOutput =>
    isSupportedForm(form.value)
      ? groupBorders(
          layout.value,
          placeLayout(layout.value, gap.value, parts.value, anchors.value.unplaced),
          parts.value.output,
          borderMargin({ x: literalValue(gap.value.x), y: literalValue(gap.value.y) }),
        )
      : { ids: [], rows: [] },
  )

  // The parts' violations keep their place; an unsupported form reports only itself, since
  // nothing is resolved or placed.
  const violations = computed((): Violation[] =>
    isSupportedForm(form.value)
      ? [...parts.value.violations, ...layoutViolations(anchors.value)]
      : [unsupportedFormViolation(designId.value)],
  )

  return { parts, pins, placements, violations }
}

function rectangleOf(result: PartRun['result'], found: FoundPart): Rectangle | undefined {
  if (result.isErr()) return undefined
  const name = rectangleOutputOf(found.declaration)
  return name === undefined ? undefined : (result.value.outputs[name] as Rectangle)
}

function partsOutputOf(rectangles: ReadonlyMap<string, Rectangle>): PartsOutput {
  const ids = [...rectangles.keys()].toSorted(compareId)
  return { ids, rows: ids.map((id) => rectangles.get(id) as Rectangle) }
}

function unresolved(slot: Id, severity: 'warning' | 'error'): Violation {
  const ids = [slot]
  return {
    kind: 'unresolvable-reference',
    severity,
    ids,
    message: partViolationMessage({ kind: 'unresolvable-reference' }, ids),
    fixes: [],
  }
}

// Each owner's fault on its input lowest by compareId; the list is in that order per owner.
function firstPerOwner(faults: readonly BlueprintInputInvalid[]): BlueprintInputInvalid[] {
  const seen = new Set<string>()
  return faults.filter(({ owner }) => {
    const key = `${owner.scope} ${owner.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function inputInvalid(invalid: BlueprintInputInvalid): Violation {
  return {
    kind: 'blueprint-input-invalid',
    severity: 'error',
    ids: [invalid.owner.id],
    message: partViolationMessage({ kind: 'blueprint-input-invalid', invalid }, [invalid.owner.id]),
    fixes: [],
  }
}

function failure(run: PartRun, error: Exclude<LaneFailure, { kind: 'unavailable' }>): Violation {
  const ids: ItemId[] = [run.part, ...run.slots.toSorted(compareId)]
  return {
    kind: error.kind,
    severity: 'error',
    ids,
    message: partViolationMessage(error, ids),
    fixes: [],
  }
}
