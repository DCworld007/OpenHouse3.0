export function onRequest(context) {
  // Set a cookie with a past expiration date to clear it
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Set-Cookie': 'token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  });

  return new Response(JSON.stringify({ 
    success: true,
    message: 'Logged out successfully' 
  }), { 
    headers 
  });
} 