import * as v from 'valibot'

export const childIndexSchema = v.pipe(v.number(), v.integer(), v.minValue(0))
