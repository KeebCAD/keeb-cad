// Golden board geometry for Corney Island v0.3, read from the committed Ergogen PCBs: the
// design's outline (Edge.Cuts), the plate's cutouts and the design's footprints. Data to data:
// compare with `compareSegments`, `compareCutouts` and `compareFootprints`.
//
// Frame: KiCad's (mm, y down, rotation in degrees as written). Ergogen points map as `(x, −y)`.
import { readFixture, readYaml } from './fixture-files'
import { readKicadPcb, type Footprint, type KicadPcb, type Point, type Segment } from './kicad-pcb'
import { DESIGN_PCB, type Design } from './key-centres'
import { boundsOf, centreOf, chainLoops, type Cutout } from './pcb-geometry'

/** The front plate; wired and wireless share it. */
export const PLATE_PCB = 'pcbs/frontplate.kicad_pcb'

/** A cutout takes the name of the Ergogen point within this distance of its centre, mm. */
const NAME_RADIUS = 0.5

const readPcb = (relative: string): KicadPcb => readKicadPcb(readFixture(relative))

/** The design's board outline: its top-level Edge.Cuts segments, in file order. */
export function loadOutline(design: Design): Segment[] {
  return readPcb(DESIGN_PCB[design]).edgeCuts
}

/** Every footprint on the design's PCB, in file order. */
export function loadFootprints(design: Design): Footprint[] {
  return readPcb(DESIGN_PCB[design]).footprints
}

/** Ergogen points in KiCad's frame. */
function loadPointsKicad(): { name: string; at: Point }[] {
  const points = readYaml('points/points.yaml') as Record<string, { x: number; y: number }>
  return Object.entries(points).map(([name, p]) => ({ name, at: { x: p.x, y: -p.y } }))
}

/**
 * The front plate's cutouts: every closed Edge.Cuts loop except the plate edge (the loop with
 * the largest bounding box), each named after the nearest Ergogen point to its centre, else by
 * its centre.
 */
export function loadPlateCutouts(): Cutout[] {
  const loops = chainLoops(readPcb(PLATE_PCB).edgeCuts)
  const area = (loop: Segment[]) => {
    const b = boundsOf(loop)
    return (b.maxX - b.minX) * (b.maxY - b.minY)
  }
  const edge = loops.reduce((best, loop) => (area(loop) > area(best) ? loop : best))
  const points = loadPointsKicad()
  const used = new Set<string>()

  return loops
    .filter((loop) => loop !== edge)
    .map((segments) => {
      const centre = centreOf(segments)
      const nearest = points
        .map((p) => ({ name: p.name, d: Math.hypot(p.at.x - centre.x, p.at.y - centre.y) }))
        .filter((p) => p.d <= NAME_RADIUS && !used.has(p.name))
        .toSorted((a, b) => a.d - b.d)[0]
      const name = nearest?.name ?? `cutout at (${centre.x.toFixed(3)}, ${centre.y.toFixed(3)})`
      used.add(name)
      return { name, centre, segments }
    })
}
