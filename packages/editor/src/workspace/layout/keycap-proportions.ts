// The solid keycap of key-rendering-1.html: a 56×56 body and a 44×42 top face, 4 from the back
// edge and 10 from the front. As fractions of the key's size, with the back at +y in model space.
// Corners stay square: the keycap radius is part geometry, which waits for an output to post it.
export const keycapProportions = {
  faceWidth: 44 / 56,
  faceHeight: 42 / 56,
  faceBottom: -(28 - 10) / 56,
} as const
