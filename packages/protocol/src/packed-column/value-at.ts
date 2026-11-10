// Main reaches a row only through an id it found, so a row outside the columns is a caller's bug.
export function valueAt(column: ArrayLike<number>, row: number): number {
  if (!Number.isInteger(row) || row < 0 || row >= column.length) {
    throw new RangeError(`Row ${row} is outside an output of ${column.length} rows.`)
  }
  return column[row] as number
}
