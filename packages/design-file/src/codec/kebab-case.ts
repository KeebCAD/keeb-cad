export function kebabCase(key: string): string {
  return key.replaceAll(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}
