// The key `values` holds a field's number under: its path from the design root.
export function valueKey(path: readonly (string | number)[]): string {
  return path.join('/')
}

export function gapKey(axis: 'x' | 'y'): string {
  return valueKey(['meta', 'gap', axis])
}
