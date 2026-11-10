import { createMultiToken } from '@keeb-cad/di'

import type { DevSeed } from './types'

// Filled only by the dev seed module, which a production build never loads, so it resolves to [].
export const devSeeds = createMultiToken<DevSeed>('devSeeds')
