import type { EditPayload } from '../devtools/types'

// What the devtools kit's StateEditor does with a panel edit (devtools-kit 8.2.1, `StateEditor.set`
// with `createDefaultSetCallback`, dist/index.js:494-541), for the plain objects and arrays
// inspectables hold. Like the kit, it consumes `path` in place.
export function applyPanelEdit(
  target: Record<string, unknown>,
  path: string[],
  state: EditPayload['state'],
): void {
  let object: unknown = target
  while (path.length > 1) object = (object as Record<string, unknown>)[path.shift() ?? '']
  const field = path[0] ?? ''
  const parent = object as Record<string, unknown>
  // The kit tests both flags for truthiness, so an empty `newKey` counts as none.
  const newKey = state.newKey || undefined
  if (state.remove || newKey !== undefined) {
    if (Array.isArray(parent)) parent.splice(Number(field), 1)
    else Reflect.deleteProperty(parent, field)
  }
  if (!state.remove) parent[newKey ?? field] = state.value
}
