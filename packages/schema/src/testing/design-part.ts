import type { BlueprintDesignPart, DesignPart } from '../types'
import { aBlueprintId } from './blueprint-id'
import { anId } from './id'

export function aBlueprintDesignPart({
  id = anId('key'),
  blueprint = aBlueprintId('lib:blueprint/choc-key'),
  inputs = {},
}: Partial<Omit<BlueprintDesignPart, 'type'>> = {}): BlueprintDesignPart {
  return { type: 'blueprint', id, blueprint, inputs }
}

function anAuthoredDesignPart(): Extract<DesignPart, { type: 'authored' }> {
  return { type: 'authored', id: anId('authored') }
}

// A record, not ts-pattern's match: indexing a mapped type with T keeps the branch's return type without a cast.
const designPartBuilders: { [T in DesignPart['type']]: () => Extract<DesignPart, { type: T }> } = {
  blueprint: aBlueprintDesignPart,
  authored: anAuthoredDesignPart,
}

export function aDesignPart<T extends DesignPart['type']>(
  type: T,
): Extract<DesignPart, { type: T }> {
  return designPartBuilders[type]()
}
