import * as v from 'valibot'

// Each variant is added by the story whose fix names its command.
export const fixSchema = v.variant('command', [])
