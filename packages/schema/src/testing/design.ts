import type { Design } from '../types'
import { aLayout } from './layout'
import { aMeta } from './meta'

export function aDesign({ meta = aMeta(), layout = aLayout() }: Partial<Design> = {}): Design {
  return { meta, layout }
}
