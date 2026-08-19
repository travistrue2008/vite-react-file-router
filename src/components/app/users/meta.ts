export const id = 'users'

/** Stands in for a real fetch, so the demo exercises a route-level loader. */
export async function loader () {
  return { count: 3 }
}
