import * as v from 'valibot'

import { quantity } from './quantity'

export const deltaSchema = v.pipe(quantity('mm'), v.metadata({ quantity: 'delta' }))
