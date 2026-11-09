import { REPLACE_PAST_BYTES } from '../sandbox/budgets'

export function vmHasOutgrown(linearMemoryBytes: number): boolean {
  return linearMemoryBytes > REPLACE_PAST_BYTES
}
