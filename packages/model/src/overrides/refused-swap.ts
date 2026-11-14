import type { Form, Frozen, Override } from '@keeb-cad/schema'

// A reversible board carries both sides' footprints, so its halves may only differ by removal.
export function isRefusedSwap(override: Frozen<Override>, form: Frozen<Form>): boolean {
  return (
    override.type === 'side-part' &&
    override.part !== null &&
    form.type === 'split' &&
    form.board === 'reversible'
  )
}
