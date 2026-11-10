import * as v from 'valibot'

import { quantity } from './quantity'

export const lengthSchema = v.pipe(quantity('mm'), v.metadata({ quantity: 'length' }))
