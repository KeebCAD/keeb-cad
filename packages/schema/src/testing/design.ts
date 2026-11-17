import type { Design } from '../types'
import { aBlueprintDesignPart } from './design-part'
import { aLayout } from './layout'
import { aLibraryVersion } from './library-version'
import { aMeta } from './meta'

export function aDesign({
  meta = aMeta(),
  parameters = [],
  libraryVersions = [aLibraryVersion()],
  parts = [aBlueprintDesignPart()],
  layout = aLayout(),
  overrides = [],
}: Partial<Design> = {}): Design {
  return { meta, parameters, libraryVersions, parts, layout, overrides }
}
