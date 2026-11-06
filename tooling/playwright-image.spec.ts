// CI's check job runs in Playwright's image, whose browsers match one Playwright version. A
// lockfile that moves to another version would look for browsers the image doesn't have.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const root = new URL('../', import.meta.url)
const read = (name: string) => readFileSync(new URL(name, root), 'utf8')

/** The versions in `mcr.microsoft.com/playwright:v<version>-<distro>` image lines. */
const imageVersions = (workflow: string) =>
  [...workflow.matchAll(/image: mcr\.microsoft\.com\/playwright:v([\d.]+)-/g)].map((m) => m[1])

/** Each distinct version of the `playwright` package the lockfile resolves. */
const lockedVersions = (lockfile: string) => [
  ...new Set([...lockfile.matchAll(/^ {2}playwright@([\d.]+):$/gm)].map((m) => m[1])),
]

describe("CI's Playwright image", () => {
  it('is the one Playwright version the lockfile resolves', () => {
    const images = imageVersions(read('.github/workflows/check.yml'))

    expect(lockedVersions(read('pnpm-lock.yaml'))).toEqual(images)
  })

  it('finds a version the lockfile resolves twice only once', () => {
    const lockfile = 'packages:\n\n  playwright@1.64.1:\n\nsnapshots:\n\n  playwright@1.64.1:\n'

    expect(lockedVersions(lockfile)).toEqual(['1.64.1'])
  })

  it('names both versions when the lockfile resolves two', () => {
    const lockfile = '  playwright@1.64.1:\n  playwright@1.65.0:\n'

    expect(lockedVersions(lockfile)).toEqual(['1.64.1', '1.65.0'])
  })
})
