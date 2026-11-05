export function camelCase(name: string): string {
  return name.replaceAll(/-([a-z0-9])/g, (_match, letter: string) => letter.toUpperCase())
}
