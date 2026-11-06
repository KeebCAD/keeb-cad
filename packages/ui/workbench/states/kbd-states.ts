import type { KbdProps } from '../../src/kbd/types'
import type { WidgetState } from './types'

export const kbdStates: readonly WidgetState<KbdProps>[] = [
  { name: 'a letter chord', props: { hotkey: 'mod+K' } },
  { name: 'two modifiers', props: { hotkey: 'mod+shift+S' } },
  { name: 'a function key', props: { hotkey: 'F1' } },
]
