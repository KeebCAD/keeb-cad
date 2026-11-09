import type { Design } from '../types'
import { aBlueprintDesignPart } from './design-part'
import { aLayout } from './layout'
import { aLibraryVersion } from './library-version'
import { aMeta } from './meta'

export function aDesign({
  meta = aMeta(),
  libraryVersions = [aLibraryVersion()],
  parts = [aBlueprintDesignPart()],
  layout = aLayout(),
}: Partial<Design> = {}): Design {
  return { meta, libraryVersions, parts, layout }
}
