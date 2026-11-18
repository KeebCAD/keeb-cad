import * as v from 'valibot'

import { slideOutTabSchema } from './slide-out-tab-schema'

export const toggleSlideOutTabInputSchema = v.strictObject({ tab: slideOutTabSchema })
