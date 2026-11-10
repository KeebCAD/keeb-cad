export function optionOfCode<O extends string>(codes: Record<O, number>, code: number): O {
  const option = (Object.keys(codes) as O[]).find((key) => codes[key] === code)
  if (option === undefined) throw new RangeError(`No option has the code ${code}.`)
  return option
}
