// design's main entry (AD-2, AD-10): the design state, the register and the module wiring them.
export { designModule } from './module'
export type { DesignPatch, Writable } from './immer'
export {
  actionsToken,
  CommandRegister,
  commandsToken,
  defineAction,
  defineCommand,
  DuplicateCommandIdError,
  type ActionDefinition,
  type CommandDefinition,
  type InputSchema,
  type RegisterEntry,
  type RegisterListing,
} from './register'
export { DesignState, type CommitEvent, type CommitListener } from './state'
