import { Option } from '@keeb-cad/result'
import {
  ClipperD,
  ClipType,
  EndType,
  FillRule,
  inflatePathsD,
  JoinType,
  type PathD,
  type PolyPathD,
  PolyTreeD,
} from 'clipper2-ts'

import { FLATTEN_TOL } from './flatten-tolerance'
import { normalisePolygonRegions } from './normalise-polygon-regions'
import type { GrownEnvelope, Point, PolygonRegion } from './types'

const PRECISION = 6
// Clipper's default; round joins never read it.
const MITER_LIMIT = 2

// Clipper throws on a coordinate it can't scale to an integer, so a failure of either kind is none.
export function growAndUnite(envelopes: readonly GrownEnvelope[]): Option<PolygonRegion[]> {
  try {
    const clipper = new ClipperD(PRECISION)
    for (const { envelope, distance } of envelopes) {
      clipper.addSubjectPaths(
        inflatePathsD(
          [envelope.map(({ x, y }) => ({ x, y }))],
          distance,
          JoinType.Round,
          EndType.Polygon,
          MITER_LIMIT,
          PRECISION,
          FLATTEN_TOL,
        ),
      )
    }
    const tree = new PolyTreeD()
    return clipper.execute(ClipType.Union, FillRule.NonZero, tree)
      ? Option.some(normalisePolygonRegions(regionsUnder(tree)))
      : Option.none()
  } catch {
    return Option.none()
  }
}

// A tree's children are outer loops, theirs are holes, and a hole's are outer loops again.
function regionsUnder(parent: PolyPathD): PolygonRegion[] {
  const regions: PolygonRegion[] = []
  for (const outer of childrenOf(parent)) {
    const holes = childrenOf(outer)
    regions.push(
      { outer: pointsOf(outer.poly), holes: holes.map((hole) => pointsOf(hole.poly)) },
      ...holes.flatMap(regionsUnder),
    )
  }
  return regions
}

function childrenOf(path: PolyPathD): PolyPathD[] {
  return Array.from({ length: path.count }, (_, index) => path.child(index))
}

function pointsOf(path: PathD | null): Point[] {
  return (path ?? []).map(({ x, y }) => ({ x, y }))
}
