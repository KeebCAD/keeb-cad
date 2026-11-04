import { createToken } from './token'

import type { Injector } from './types'

export const InjectorToken = createToken<Injector>('Injector')
