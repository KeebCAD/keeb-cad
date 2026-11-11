// Reka's hideOthers marks the siblings on the path from a modal up to body, so a root inside a
// wrapper is hidden through an ancestor rather than on itself.
export function isBehindModal(root: Element): boolean {
  return root.closest('[aria-hidden="true"]') !== null
}
