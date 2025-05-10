export const onRequestGet = async (context: { request: Request, env: any }) => {
  const { request, env } = context;

  // Helper: parse cookies
  function getCookie(name: string) {
    const value = `; ${request.headers.get('cookie') || ''}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
    return null;
  }

  try {
    const token = getCookie('token');
    if (!token) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    const secret = env.JWT_SECRET;
    if (!secret) return new Response(JSON.stringify({ error: 'No JWT_SECRET in env' }), { status: 500 });
    const parts = token.split('.');
    if (parts.length < 2) throw new Error('Malformed JWT');
    const payload = JSON.parse(atob(parts[1]));
    // Only return safe user info
    const { sub, email, name, picture } = payload;
    return new Response(JSON.stringify({ sub, email, name, picture }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Not authenticated' }), { status: 401 });
  }
}; 