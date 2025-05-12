export const onRequestPost = async (context: { request: Request, env: any }) => {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Set-Cookie': 'token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
  });

  return new Response(JSON.stringify({ ok: true }), { headers });
}; 