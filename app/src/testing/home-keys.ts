// The home key of each column in Corney's x chain, in chain order.
export const HOME_KEYS = ['outer', 'pinky', 'ring', 'middle', 'index', 'inner'].map(
  (column) => `left/matrix-${column}-home`,
)
