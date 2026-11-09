import * as v from 'valibot'

export const versionSchema = v.pipe(v.number(), v.integer(), v.minValue(1), v.brand('Version'))
