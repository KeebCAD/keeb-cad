import { createToken } from '@keeb-cad/di'

import type { StorageBackend } from './types'

export const storageBackend = createToken<StorageBackend>('storageBackend')
