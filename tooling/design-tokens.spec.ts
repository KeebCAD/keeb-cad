// ui's @theme carries DESIGN.md's tokens by hand; this keeps the two from drifting apart.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const root = new URL('../', import.meta.url)
const read = (name: string) => readFileSync(new URL(name, root), 'utf8')

const design = read(
  '_bmad-output/initiative-keeb-cad-m1/tickets/epic-platform-baseline/ux-editor/DESIGN.md',
)
const css = read('packages/ui/src/theme/theme.css')

type Entry = { name: string; value: string }

const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(design)?.[1] ?? ''

/** The lines of one top-level frontmatter group, up to the next top-level key. */
function groupLines(group: string): string[] {
  const lines = frontmatter.split('\n')
  const start = lines.indexOf(`${group}:`)
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => /^\S/.test(line))
  return start === -1 ? [] : rest.slice(0, end === -1 ? undefined : end)
}

/** `key: value` at one indent, a quoted value read whole and a trailing comment dropped. */
function entriesAt(lines: string[], indent: number): Entry[] {
  const pattern = new RegExp(String.raw`^ {${indent}}('?[\w-]+'?):\s*('[^']*'|[^#\s]+)`)
  return lines.flatMap((line) => {
    const match = pattern.exec(line)
    if (match === null) return []
    const [, name = '', value = ''] = match
    return [{ name: name.replaceAll("'", ''), value: value.replaceAll("'", '') }]
  })
}

const colors = entriesAt(groupLines('colors'), 2)
const darkColors = colors.filter(({ name }) => !name.endsWith('-light'))
const lightColors = colors
  .filter(({ name }) => name.endsWith('-light'))
  .map(({ name, value }) => ({ name: name.slice(0, -'-light'.length), value }))
const namedSpacing = entriesAt(groupLines('spacing'), 2).filter(({ name }) => !/^\d+$/.test(name))
const rounded = entriesAt(groupLines('rounded'), 2)

type Typography = { name: string; props: Record<string, string> }

/** Each type style with its 4-space props, read in order under its 2-space name. */
function typographyEntries(): Typography[] {
  const styles: Typography[] = []
  for (const line of groupLines('typography')) {
    const name = /^ {2}([\w-]+):$/.exec(line)?.[1]
    if (name !== undefined) styles.push({ name, props: {} })
    const [prop] = entriesAt([line], 4)
    const current = styles.at(-1)
    if (prop !== undefined && current !== undefined) current.props[prop.name] = prop.value
  }
  return styles
}

const typography = typographyEntries()

/** The custom properties declared directly in the block that `opener` starts. */
function declarations(opener: string): Map<string, string> {
  const start = css.indexOf(opener)
  let depth = 0
  let end = start
  for (let at = css.indexOf('{', start); at < css.length; at++) {
    if (css[at] === '{') depth++
    if (css[at] === '}') depth--
    if (depth === 0) {
      end = at
      break
    }
  }
  const body = start === -1 ? '' : css.slice(start, end)
  return new Map(
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m): [string, string] => [
      m[1] ?? '',
      m[2] ?? '',
    ]),
  )
}

const theme = declarations('@theme static {')
const dark = declarations("[data-theme='dark'] {")
const light = declarations("[data-theme='light'] {")
const lightBeforeMount = declarations(':root:not([data-theme]) {')

describe("ui's tokens against DESIGN.md", () => {
  it('parses every group DESIGN.md lists', () => {
    expect({
      darkColors: darkColors.length,
      lightColors: lightColors.length,
      namedSpacing: namedSpacing.length,
      rounded: rounded.length,
      typography: typography.length,
    }).toEqual({ darkColors: 53, lightColors: 53, namedSpacing: 12, rounded: 4, typography: 6 })
  })

  it.each(darkColors)('carries the dark colour $name in @theme and the dark theme', (entry) => {
    const property = `--color-${entry.name}`
    expect([theme.get(property), dark.get(property)]).toEqual([entry.value, entry.value])
  })

  it.each(lightColors)('carries the light colour $name in both light blocks', (entry) => {
    const property = `--color-${entry.name}`
    expect([light.get(property), lightBeforeMount.get(property)]).toEqual([
      entry.value,
      entry.value,
    ])
  })

  it.each(namedSpacing)('aliases the spacing $name', (entry) => {
    expect(theme.get(`--spacing-${entry.name}`)).toBe(entry.value)
  })

  it.each(rounded)('carries the radius $name', (entry) => {
    expect(theme.get(`--radius-${entry.name}`)).toBe(entry.value)
  })

  it.each(typography)('carries the type style $name', ({ name, props }) => {
    expect({
      size: theme.get(`--text-${name}`),
      lineHeight: theme.get(`--text-${name}--line-height`),
      weight: theme.get(`--text-${name}--font-weight`),
      letterSpacing: theme.get(`--text-${name}--letter-spacing`),
    }).toEqual({
      size: props.fontSize,
      lineHeight: props.lineHeight,
      weight: props.fontWeight,
      letterSpacing: props.letterSpacing,
    })
  })
})
