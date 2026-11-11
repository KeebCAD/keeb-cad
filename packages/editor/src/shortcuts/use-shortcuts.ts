import { useService } from '@keeb-cad/di/vue'
import { onBeforeUnmount, onMounted } from 'vue'

import { ShortcutRegistry } from './shortcut-registry'

export function useShortcuts(root: Element): void {
  const registry = useService(ShortcutRegistry)
  onMounted(() => registry.listen(document, root))
  onBeforeUnmount(() => registry.stop())
}
