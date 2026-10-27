// `pnpm kicad-drc`: KiCad's own DRC as an independent cross-check of keeb-cad's `drc`.
// Writes every case board with its .kicad_pro and .kicad_dru to spikes/out/<case>/, runs
// `kicad-cli pcb drc` on each, and exits non-zero when the two disagree on any case.
// Node only (fs, child_process): never imported by the browser bundle or the unit tests.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFootprintEdgeCuts, readKicadPcb } from '../../fixtures/src/kicad-pcb'
import { drc } from '../src/drc'
import { addedViolations, drcCases } from '../src/drc-cases'
import { EMPTY_ROUTES } from '../src/route-set'
import { toRoutingInput, type RoutingInput } from '../src/routing-input'
import { writeProject, writeRoutes, writeRules } from '../src/write-back'
import {
  bag,
  CLEARANCE_FAMILY,
  count,
  drcSignatures,
  atLimit,
  KICAD_LIMIT,
  kicadSignature,
  kicadVersion,
  runKicad,
  takeEach,
} from './kicad'

const here = dirname(fileURLToPath(import.meta.url))
const spikes = join(here, '..')
const out = join(spikes, 'out')
const pcbs = join(spikes, '../fixtures/corney-island/ergogen/pcbs')
type Design = 'wired' | 'wireless'
const SOURCES = { wired: 'corney_island.kicad_pcb', wireless: 'corney_island_wireless.kicad_pcb' } as const

const typeOf = (sig: string) => sig.slice(0, sig.indexOf('|'))
const list = (m: Record<string, number>) =>
  Object.entries(m)
    .map(([t, n]) => `${t} ${n}`)
    .join(', ') || 'none'

function main(): number {
  const version = kicadVersion()
  const texts = {
    wired: readFileSync(join(pcbs, SOURCES.wired), 'utf8'),
    wireless: readFileSync(join(pcbs, SOURCES.wireless), 'utf8'),
  }
  const inputs: Record<Design, RoutingInput> = {
    wired: toRoutingInput(texts.wired),
    wireless: toRoutingInput(texts.wireless),
  }
  // Which footprint owns each outline graphic (undefined: the board's own outline).
  const owners = Object.fromEntries(
    (['wired', 'wireless'] as const).map((d) => [
      d,
      [
        ...readKicadPcb(texts[d]).edgeCuts.map(() => undefined),
        ...readFootprintEdgeCuts(texts[d]).map((c) => c.reference),
      ],
    ]),
  ) as Record<Design, Array<string | undefined>>
  const baselines = { wired: drc(inputs.wired, EMPTY_ROUTES), wireless: drc(inputs.wireless, EMPTY_ROUTES) }
  rmSync(out, { recursive: true, force: true })

  const family = new Set<string>(CLEARANCE_FAMILY)
  const results = []
  let failed = false
  console.log(`kicad-cli ${version}; KiCad stops some types at ${KICAD_LIMIT} violations`)
  console.log('case            drc base+added  kicad base+added  verdict')
  for (const c of drcCases(inputs)) {
    const input = inputs[c.design]
    const dir = join(out, c.name)
    mkdirSync(dir, { recursive: true })
    const board = join(dir, `${c.name}.kicad_pcb`)
    writeFileSync(board, writeRoutes(texts[c.design], input, c.routes))
    writeFileSync(join(dir, `${c.name}.kicad_pro`), writeProject(input, c.name))
    writeFileSync(join(dir, `${c.name}.kicad_dru`), writeRules(input))

    const problems: string[] = []
    const ours = drc(input, c.routes)
    const baseline = baselines[c.design]
    const added = addedViolations(baseline, ours)
    if (added.length !== c.expect.total) problems.push(`drc added ${added.length}, expected ${c.expect.total}`)
    for (const [kind, n] of Object.entries(c.expect.byKind)) {
      const got = added.filter((v) => v.kind === kind).length
      if (got !== n) problems.push(`drc added ${got} ${kind}, expected ${n}`)
    }
    // The baseline may only be LED pads against their own footprint's cutout.
    const padRef = new Map(input.pads.map((p) => [p.id, p.reference]))
    for (const v of baseline.violations) {
      const ref = padRef.get(v.items[0]!)
      const k = Number(v.items[1]?.replace(/^edge:/, ''))
      const own = v.kind === 'edge-clearance' && ref !== undefined && /^LED\d+$/.test(ref) && owners[c.design][k] === ref
      if (!own) problems.push(`baseline violation is not an LED pad against its own cutout: ${v.items.join(' / ')}`)
    }

    const kicad = runKicad(board, join(dir, 'kicad-drc.json'))
    const kicadFamily = kicad.violations.filter((v) => family.has(v.type))
    const types = [...kicad.violations.map((v) => v.type), ...(kicad.unconnected_items ?? []).map((v) => v.type)]
    const clearanceFamily = count(types.filter((t) => family.has(t)))
    const other = count(types.filter((t) => !family.has(t)))
    const capped = Object.entries(clearanceFamily)
      .filter(([, n]) => atLimit(n))
      .map(([t]) => t)

    // Match KiCad's errors one by one to what drc predicts for KiCad.
    const sigOf = drcSignatures(input, c.routes)
    const blind = c.kicadBlindSpot ? added : []
    const blindSet = new Set(blind)
    const predictedBase = baseline.violations.map(sigOf)
    const predictedAdded = added.filter((v) => !blindSet.has(v)).map(sigOf)
    const remaining = bag(kicadFamily.map(kicadSignature))
    const addedMatch = takeEach(remaining, predictedAdded)
    const baseMatch = takeEach(remaining, predictedBase)
    const unexplained = [...remaining].flatMap(([s, n]) => Array.from({ length: n }, () => s))
    if (unexplained.length > 0) problems.push(`KiCad errors drc does not report: ${unexplained.join('; ')}`)
    // An added error KiCad does not report always fails. A baseline error it does not report fails
    // too, unless KiCad hit its limit for that type (then it is listed as unreportedAtLimit).
    for (const s of addedMatch.missing) problems.push(`added drc error KiCad does not report: ${s}`)
    for (const s of baseMatch.missing) {
      if (!capped.includes(typeOf(s))) problems.push(`drc error KiCad does not report: ${s}`)
    }
    const unreported = baseMatch.missing.filter((s) => capped.includes(typeOf(s)))

    const ok = problems.length === 0
    if (!ok) failed = true
    results.push({
      case: c.name,
      design: c.design,
      ok,
      problems,
      drc: {
        baseline: baseline.violations.length,
        added: added.length,
        byKind: ours.byKind,
        byClass: ours.byClass,
        addedViolations: added,
      },
      kicad: {
        errors: kicadFamily.length,
        baselineMatched: baseMatch.found.length,
        addedMatched: addedMatch.found.length,
        clearanceFamily,
        other,
        capped,
        unreportedAtLimit: unreported,
        blindSpot: c.kicadBlindSpot ? { reason: c.kicadBlindSpot, drcOnly: blind } : undefined,
        clearanceViolations: kicadFamily.map((v) => ({
          type: v.type,
          description: v.description,
          items: v.items.map((i) => i.description),
        })),
      },
    })
    const notes = [
      capped.length > 0 ? `capped ${capped.join(',')} (${unreported.length} drc errors unreported by KiCad)` : '',
      c.kicadBlindSpot ? `blind spot: ${blind.length} drc-only` : '',
      `other: ${list(other)}`,
    ].filter(Boolean)
    console.log(
      `${c.name.padEnd(15)} ${`${baseline.violations.length}+${added.length}`.padEnd(15)} ` +
        `${`${baseMatch.found.length}+${addedMatch.found.length}`.padEnd(17)} ${ok ? 'ok' : 'FAIL'}  ${notes.join('; ')}`,
    )
    for (const p of problems) console.log(`    ${p}`)
  }
  writeFileSync(
    join(out, 'kicad-drc.json'),
    JSON.stringify({ kicadVersion: version, kicadLimit: KICAD_LIMIT, date: new Date().toISOString(), results }, null, 2) +
      '\n',
  )
  if (failed) console.error(`kicad-drc: drc and KiCad disagree (see ${join(out, 'kicad-drc.json')})`)
  return failed ? 1 : 0
}

try {
  process.exitCode = main()
} catch (error) {
  console.error(`kicad-drc: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
