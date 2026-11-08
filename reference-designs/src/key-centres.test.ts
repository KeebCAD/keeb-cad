import { describe, expect, it } from 'vitest'
import { compareKeyPoses, formatKeyComparison, loadKeyPoses, type KeyPose } from './key-centres'

const SHIFTED = 'matrix_middle_home'
const WIDE = 'thumbfan_far_home'

const withKey = (keys: readonly KeyPose[], name: string, change: (k: KeyPose) => KeyPose) =>
  keys.map((k) => (k.name === name ? change(k) : { ...k }))

describe.each(['wired', 'wireless'] as const)('Corney Island %s key poses', (design) => {
  const reference = loadKeyPoses(design)

  it('holds the 21 keys, helpers excluded, with keycap sizes from the config', () => {
    expect(reference).toHaveLength(21)
    expect(reference.filter((k) => k.name.startsWith('matrix_'))).toHaveLength(18)
    const far = reference.find((k) => k.name === WIDE)
    expect(far).toMatchObject({ r: 60, width: 27, height: 18 })
    expect(
      reference.filter((k) => k.name !== WIDE).every((k) => k.width === 18 && k.height === 18),
    ).toBe(true)
  })

  it('passes the fixture against itself', () => {
    const result = compareKeyPoses(reference, reference)
    expect(result.pass, formatKeyComparison(result)).toBe(true)
    expect(result.keys).toHaveLength(21)
  })

  it('fails a key shifted 0.06 mm, naming it and its deviation', () => {
    const result = compareKeyPoses(
      reference,
      withKey(reference, SHIFTED, (k) => ({ ...k, x: k.x + 0.06 })),
    )
    expect(result.pass).toBe(false)
    expect(result.keys.filter((k) => !k.pass).map((k) => k.name)).toEqual([SHIFTED])
    const message = formatKeyComparison(result)
    expect(message).toContain(`FAIL ${SHIFTED}: position 0.0600 mm`)
    expect(message).toContain(`failing: ${SHIFTED}`)
  })

  it('passes a key shifted exactly 0.05 mm', () => {
    const result = compareKeyPoses(
      reference,
      withKey(reference, SHIFTED, (k) => ({ ...k, x: k.x + 0.03, y: k.y - 0.04 })),
    )
    expect(result.pass, formatKeyComparison(result)).toBe(true)
  })

  it('fails a key rotated beyond tolerance, naming it', () => {
    // 0.5° on an 18 × 18 keycap moves a corner ~0.11 mm.
    const result = compareKeyPoses(
      reference,
      withKey(reference, SHIFTED, (k) => ({ ...k, r: k.r + 0.5 })),
    )
    expect(result.pass).toBe(false)
    expect(formatKeyComparison(result)).toContain(`failing: ${SHIFTED}`)
  })

  it('scales the rotation tolerance with each key’s own keycap', () => {
    // 0.2°: 0.044 mm on a 1u keycap, 0.057 mm on the 1.5u one.
    const turn = (name: string) =>
      compareKeyPoses(
        reference,
        withKey(reference, name, (k) => ({ ...k, r: k.r + 0.2 })),
      )
    expect(turn(SHIFTED).pass).toBe(true)
    const wide = turn(WIDE)
    expect(wide.pass).toBe(false)
    expect(formatKeyComparison(wide)).toContain(`failing: ${WIDE}`)
  })

  it('compares rotation modulo 360', () => {
    const result = compareKeyPoses(
      reference,
      withKey(reference, WIDE, (k) => ({ ...k, r: k.r - 360 })),
    )
    expect(result.pass, formatKeyComparison(result)).toBe(true)
  })

  it('fails missing and extra keys, naming each', () => {
    const candidate = [
      ...reference.filter((k) => k.name !== SHIFTED),
      { name: 'matrix_extra_home', x: 0, y: 0, r: 0 },
    ]
    const result = compareKeyPoses(reference, candidate)
    expect(result.pass).toBe(false)
    expect(result.missing).toEqual([SHIFTED])
    expect(result.extra).toEqual(['matrix_extra_home'])
    const message = formatKeyComparison(result)
    expect(message).toContain(`missing: ${SHIFTED}`)
    expect(message).toContain('extra: matrix_extra_home')
  })
})
