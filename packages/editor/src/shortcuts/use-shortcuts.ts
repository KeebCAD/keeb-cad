import { useService } from '@keeb-cad/di/vue'
import { onBeforeUnmount, onMounted } from 'vue'

import { ShortcutRegistry } from './shortcut-registry'

export function useShortcuts(): void {
  const registry = useService(ShortcutRegistry)
  onMounted(() => registry.listen(document))
  onBeforeUnmount(() => registry.stop())
}
