import type { Obstacle, SimpleRouteJson } from '@tscircuit/capacity-autorouter'

/** A 1.5 mm square top-layer pad that belongs to one connection. */
function pad(x: number, y: number, connection: string): Obstacle {
  return {
    type: 'rect',
    layers: ['top'],
    center: { x, y },
    width: 1.5,
    height: 1.5,
    connectedTo: [connection],
  }
}

/**
 * Two connections on a 40 × 20 mm, 2-layer board whose straight lines cross at the centre,
 * so the router must either go around or change layer. All pads are on the top layer.
 */
export const testBoard: SimpleRouteJson = {
  layerCount: 2,
  minTraceWidth: 0.25,
  bounds: { minX: -20, maxX: 20, minY: -10, maxY: 10 },
  obstacles: [pad(-15, -6, 'A'), pad(15, 6, 'A'), pad(-15, 6, 'B'), pad(15, -6, 'B')],
  connections: [
    {
      name: 'A',
      pointsToConnect: [
        { x: -15, y: -6, layer: 'top' },
        { x: 15, y: 6, layer: 'top' },
      ],
    },
    {
      name: 'B',
      pointsToConnect: [
        { x: -15, y: 6, layer: 'top' },
        { x: 15, y: -6, layer: 'top' },
      ],
    },
  ],
}

export const connectionNames = testBoard.connections.map((c) => c.name)

/**
 * Negative control for the failure path: no `connections` array, so tscircuit throws while
 * setting up. The page must then report `failed` with the error instead of hanging.
 */
export const brokenBoard = { ...testBoard, connections: null } as unknown as SimpleRouteJson
