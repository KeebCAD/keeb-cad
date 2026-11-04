import type { CannotOverrideReason } from './types'

export const OVERRIDE_MESSAGES: Record<CannotOverrideReason, (name: string) => string> = {
  unregistered: (name) => `Token "${name}" has no registration to override. Register it first.`,
  multi: (name) =>
    `Token "${name}" is a multi-token; its bindings are additive and cannot be overridden.`,
  resolved: (name) =>
    `Token "${name}" was already resolved, so an override would leave the existing instance in place. Override before the first resolve.`,
  scoped: (name) =>
    `Token "${name}" is Scoped, and its instances live in each Scope rather than on the container, so an override could not reach the ones already created.`,
}
