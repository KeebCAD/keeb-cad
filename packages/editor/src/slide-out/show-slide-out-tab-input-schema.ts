import * as v from 'valibot'

import { slideOutTabSchema } from './slide-out-tab-schema'

export const showSlideOutTabInputSchema = v.strictObject({ tab: slideOutTabSchema })
