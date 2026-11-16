import type { FoundPart } from '../part-levels/types'
import { rectangleOutputOf } from './parts-lane-calls'
import type { PartRun, Rectangle } from './types'

export function rectangleOf(result: PartRun['result'], found: FoundPart): Rectangle | undefined {
  if (result.isErr()) return undefined
  const name = rectangleOutputOf(found.declaration)
  return name === undefined ? undefined : (result.value.outputs[name] as Rectangle)
}
