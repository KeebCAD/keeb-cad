import type { Result } from '@keeb-cad/result'
import {
  type Design,
  type DesignInvalid,
  designSchema,
  type MigratedBundle,
} from '@keeb-cad/schema'

import { parse } from '../parsing/parse'

// The design-schema check replaceDesign runs on a bundle's design: parseDesign hands it the parsed
// design, and checkDesign lets a caller ask before replaceDesign runs.
export function checkDesign(bundle: MigratedBundle): Result<void, DesignInvalid> {
  return parseDesign(bundle).map(() => {})
}

export function parseDesign(bundle: MigratedBundle): Result<Design, DesignInvalid> {
  return parse(designSchema, bundle.design).mapErr((issues): DesignInvalid => ({
    kind: 'design-invalid',
    issues,
  }))
}
