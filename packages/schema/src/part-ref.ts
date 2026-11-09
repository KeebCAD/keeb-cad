import * as v from 'valibot'

import { ref } from './ref'

export const partRefSchema = v.union([ref('library-part'), ref('design-part')])
