import type { Form } from '@keeb-cad/schema'

// Milestone 1 builds only this form; the others load but produce no outputs.
export function isSupportedForm(form: Form): boolean {
  return form.type === 'split' && form.board === 'reversible'
}
