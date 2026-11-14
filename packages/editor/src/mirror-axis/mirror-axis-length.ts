// Each half of the axis, in model mm along center's y-axis: a fixed line rather than one clipped to
// the canvas, which computes no geometry; at the minimum zoom it still runs past the canvas edges.
export const mirrorAxisLengthMm = 10_000
