import type { LaneFailure } from '@keeb-cad/blueprint'
import { argumentHash, type LaneRunner } from '@keeb-cad/blueprint/worker'
import { computed } from '@keeb-cad/reactive'
import {
  compareId,
  type Design,
  type Frozen,
  type Id,
  type ItemId,
  type LibraryData,
  type PartsOutput,
  type ReadonlyRef,
  type ResolvedParts,
  type Violation,
} from '@keeb-cad/schema'

import { placeLayout } from '../placement/place-layout'
import { partViolationMessage } from './part-violation-message'
import { partsLaneCalls, rectangleOutputOf } from './parts-lane-calls'
import { pinsOf } from './pins-of'
import { resolvePartRef } from './resolve-part-ref'
import { slotPartRuns } from './slot-part-runs'
import type { Derivations, PartResolution, PartRun, Rectangle, SlotPartRun } from './types'

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
  const slotRuns = computed(() => slotPartRuns(layout.value, defaultPart.value))
  const pins = computed(() => pinsOf(libraryVersions.value))

  const parts = computed((): ResolvedParts => {
    // Read for its dependency: a bump means a pause changed what a run answers.
    void runner.lanesReady.value
    const lookups = {
      parts: designParts.value,
      libraryVersions: libraryVersions.value,
      declarations: library.declarations,
    }
    const runs = new Map<string, PartRun>()
    const rectangles = new Map<string, Rectangle>()
    const violations: Violation[] = []

    const runOf = (found: Extract<PartResolution, { kind: 'found' }>, slot: SlotPartRun) => {
      const inputs = { ...found.part.inputs, ...slot.inputs }
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
        const { id, rectangle } = runOf(resolution, slot)
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

  const placements = computed(() => placeLayout(layout.value, gap.value, parts.value))

  return { parts, pins, placements }
}

function rectangleOf(
  result: PartRun['result'],
  found: Extract<PartResolution, { kind: 'found' }>,
): Rectangle | undefined {
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
