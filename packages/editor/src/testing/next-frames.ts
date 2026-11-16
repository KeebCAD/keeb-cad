// A frame's resize observations come after its animation frame callbacks, so two frames see the
// remounted canvas measured and any fit it would run.
export async function nextFrames(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => requestAnimationFrame(resolve))
}
