import { useService } from '@keeb-cad/di/vue'
import { InvariantError } from '@keeb-cad/result'
import { onBeforeUnmount, onMounted, type ShallowRef } from 'vue'

import { Landmarks } from './landmarks'
import type { LandmarkPlace } from './types'

export function useLandmark(
  place: LandmarkPlace,
  root: Readonly<ShallowRef<HTMLElement | null>>,
): void {
  const landmarks = useService(Landmarks)
  let registered: HTMLElement | undefined
  onMounted(() => {
    if (root.value === null) throw new InvariantError(`The ${place} rendered no root element.`)
    registered = root.value
    landmarks.register(place, registered)
  })
  onBeforeUnmount(() => {
    if (registered !== undefined) landmarks.unregister(place, registered)
  })
}
