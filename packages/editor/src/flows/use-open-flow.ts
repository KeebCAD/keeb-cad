import { useService } from '@keeb-cad/di/vue'
import { InvariantError } from '@keeb-cad/result'
import { computed } from 'vue'

import { rejectionText } from '../rejection/rejection-text'
import { Flows } from './flows'
import type { FlowDraft, FlowEntry, FlowHandle, UseOpenFlowResult } from './types'

export function useOpenFlow<H extends FlowHandle>(entry: FlowEntry<H>): UseOpenFlowResult<H> {
  const flows = useService(Flows)
  const open = computed(() => flows.stack.find((held) => held.entry.id === entry.id))
  return {
    // The host unmounts a view in the flush that pops its entry, so a late read keeps the last draft.
    draft: computed((previous?: FlowDraft<H>) => {
      const held = open.value
      if (held !== undefined) return held.draft as FlowDraft<H>
      if (previous === undefined) {
        throw new InvariantError(`Flow entry ${String(entry.id)} was read before it opened.`)
      }
      return previous
    }),
    reason: computed(() => {
      const availability = open.value?.availability
      return availability?.isErr() === true ? rejectionText(availability.error) : undefined
    }),
    update: (draft) => {
      flows.update(entry, draft)
    },
    finish: () => flows.finish(entry),
    cancel: () => {
      flows.cancel(entry)
    },
  }
}
