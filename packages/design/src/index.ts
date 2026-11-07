export { DesignStore } from './store/design-store'
export { DuplicateCommandIdError } from './store/duplicate-command-id-error'
export { emptyDerivedFiles } from './store/empty-derived-files'
export type {
  Committed,
  CommitEvent,
  DerivedFiles,
  DesignStoreEvents,
  Subscribable,
  TypedEmitter,
} from './store/types'

export { DesignPatcher } from './patching/design-patcher'
export type { Changed, Edit, Writable } from './patching/types'

export { registerCommand } from './entries/register-command'
export { registerAction } from './entries/register-action'
export { actions, commands } from './entries/tokens'
export type { Action, ActionHandle, Command, CommandHandle } from './entries/types'

export { designModule } from './design-module'
