export const id = 'photos'

/** Throws on purpose, so /photos demonstrates the root Error boundary. */
export async function loader () {
  throw new Error('photos are unavailable')
}
