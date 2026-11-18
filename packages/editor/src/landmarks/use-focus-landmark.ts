import { useService } from '@keeb-cad/di/vue'

import { Landmarks } from './landmarks'
import type { LandmarkName } from './types'

// Moves focus to a landmark's root; a landmark not mounted takes nothing.
export function useFocusLandmark(): (name: LandmarkName) => void {
  const landmarks = useService(Landmarks)
  return (name) => {
    landmarks.root(name).getOrUndefined()?.focus()
  }
}
