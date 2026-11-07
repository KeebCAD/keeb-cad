import type { VNodeChild } from 'vue'

export type WidgetState<Props extends object = object> = {
  name: string
  props: Readonly<Props>
  slots?: Readonly<Record<string, () => VNodeChild>>
}
