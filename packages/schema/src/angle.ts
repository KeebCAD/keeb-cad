import * as v from 'valibot'

import { quantity } from './quantity'

export const angleSchema = v.pipe(quantity('deg'), v.metadata({ quantity: 'angle' }))
