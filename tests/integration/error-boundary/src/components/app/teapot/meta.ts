export async function loader () {
  throw new Response(JSON.stringify({ why: 'no coffee' }), {
    status: 418,
    headers: { 'Content-Type': 'application/json' },
  })
}
