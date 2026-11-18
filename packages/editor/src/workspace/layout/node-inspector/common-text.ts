// The one text every entry shows, or none when they differ or there are none.
export function commonText(texts: readonly string[]): string | undefined {
  const [first] = texts
  return texts.every((text) => text === first) ? first : undefined
}
