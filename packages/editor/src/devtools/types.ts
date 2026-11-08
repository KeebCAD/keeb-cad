import type { setupDevToolsPlugin } from '@vue/devtools-api'
import type * as v from 'valibot'

export interface ReadOnlyField {
  get(): unknown
}

// `set` is a method so a field over a narrower value still fits `InspectableField`.
export interface EditableField {
  get(): unknown
  readonly schema: v.GenericSchema
  set(value: unknown): void
}

export type InspectableField = ReadOnlyField | EditableField

export interface Inspectable {
  readonly id: string
  readonly label: string
  readonly fields: Readonly<Record<string, InspectableField>>
}

type PluginApi = Parameters<Parameters<typeof setupDevToolsPlugin>[1]>[0]

export type PluginHost = Pick<
  PluginApi,
  | 'addInspector'
  | 'addTimelineLayer'
  | 'addTimelineEvent'
  | 'sendInspectorState'
  | 'selectInspectorNode'
  | 'now'
> & {
  readonly on: Pick<
    PluginApi['on'],
    'getInspectorTree' | 'getInspectorState' | 'editInspectorState'
  >
}

export type EditPayload = Parameters<Parameters<PluginHost['on']['editInspectorState']>[0]>[0]
