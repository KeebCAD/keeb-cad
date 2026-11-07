import * as v from 'valibot'

import type { Workspace } from '../types'
import { workspaceSchema } from '../workspace'

export function aWorkspace(text: string = 'layout'): Workspace {
  return v.parse(workspaceSchema, text)
}
