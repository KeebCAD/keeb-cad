// The element's box corners through its own transforms, then by `toTarget` out of the svg's space.
export function cornersIn(element: SVGGraphicsElement, toTarget: DOMMatrix): DOMPoint[] {
  const own = element.getCTM()
  if (own === null) return []
  const matrix = toTarget.multiply(own)
  const { x, y, width, height } = element.getBBox()
  return [
    new DOMPoint(x, y),
    new DOMPoint(x + width, y),
    new DOMPoint(x, y + height),
    new DOMPoint(x + width, y + height),
  ].map((corner) => corner.matrixTransform(matrix))
}
