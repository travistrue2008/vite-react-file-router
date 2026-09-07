export async function loader () {
  throw new Response('gone', {
    status: 404,
    statusText: 'Not Found',
  })
}
