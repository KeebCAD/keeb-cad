import { useService } from '@keeb-cad/di/vue'
import { computed } from 'vue'

import { Landmarks } from '../landmarks/landmarks'
import { SlideOut } from './slide-out'
import type { UseSlideOutResult } from './types'

export function useSlideOut(): UseSlideOutResult {
  const slideOut = useService(SlideOut)
  const landmarks = useService(Landmarks)
  return {
    isOpen: computed(() => slideOut.isOpen),
    returnFocus: (root) => {
      // Focus the user already moved out of the slide-out stays where they put it.
      const focused = document.activeElement
      const holdsFocus =
        focused === null || focused === document.body || root?.contains(focused) === true
      if (!holdsFocus) return
      const invoker = slideOut.invoker.filter((element) => element.isConnected)
      const target = invoker.isSome() ? invoker : landmarks.root('canvas')
      target.getOrUndefined()?.focus()
    },
  }
}
