// Pure vanilla JS - no imports
export function onRequest(context) {
  return new Response(JSON.stringify({
    success: true,
    message: "Logged out successfully"
  }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  });
} 