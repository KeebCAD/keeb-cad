import type * as v from 'valibot'

// A method rather than a function property, so a UiAction with a narrower input still fits the
// multi token's element type; registerUiAction checks the input itself.
export interface UiAction<Input> {
  available(): boolean
  apply(input: Input): void
}

export interface UiActionHandle {
  readonly kind: 'ui-action'
  readonly id: string
  readonly label: string
  readonly input: v.GenericSchema
  readonly hotkeys?: readonly string[]
  new (): UiAction<unknown>
}

export type UiActionInput<H extends UiActionHandle> = Parameters<InstanceType<H>['apply']>[0]
