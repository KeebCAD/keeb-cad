// The solid keycap of key-rendering-1.html: a 56×56 body and a 44×42 top face, 4 from the back
// edge and 10 from the front, so the face's centre sits 3 toward the back. As fractions of the
// key's size, with the back at +y in model space.
// Corners stay square: the keycap radius is part geometry, which waits for an output to post it.
export const keycapProportions = {
  faceWidth: 44 / 56,
  faceHeight: 42 / 56,
  faceShift: 3 / 56,
} as const
