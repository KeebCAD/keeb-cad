/**
 * Not imported by the page: it exists so `tsc` proves the custom-router building blocks
 * (clipper2-ts, flatbush, makerjs) resolve and type under pnpm strict + TypeScript 6.
 */
import { EndType, JoinType, inflatePathsD, type PathsD } from 'clipper2-ts'
import Flatbush from 'flatbush'
import makerjs from 'makerjs'

export function depsSmoke(): { hits: number[]; inflated: PathsD; length: number } {
  const index = new Flatbush(1)
  index.add(0, 0, 1, 1)
  index.finish()
  const hits = index.search(0.5, 0.5, 0.5, 0.5)

  const square: PathsD = [
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
  ]
  const inflated = inflatePathsD(square, 0.2, JoinType.Round, EndType.Polygon)

  const line = new makerjs.paths.Line([0, 0], [3, 4])
  const length = makerjs.measure.pathLength(line)

  return { hits, inflated, length }
}
