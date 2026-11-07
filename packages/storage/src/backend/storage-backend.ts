import { createToken } from '@keeb-cad/di'

import type { StorageBackend } from './types'

// Stryker disable next-line StringLiteral: the name only labels di's error messages
export const storageBackend = createToken<StorageBackend>('storageBackend')
