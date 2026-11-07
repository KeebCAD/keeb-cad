import { workspaceSchema } from '@keeb-cad/schema'
import * as v from 'valibot'
import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

export function resolveWorkspace(to: RouteLocationNormalized): RouteLocationRaw | undefined {
  return to.name === 'design' && !v.is(workspaceSchema, to.params.workspace)
    ? { name: 'design', params: { id: to.params.id, workspace: 'layout' }, replace: true }
    : undefined
}
