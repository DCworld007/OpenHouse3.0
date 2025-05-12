// Next.js API route for /api/logout
export async function GET() {
  return Response.json({
    success: true,
    message: "Logged out successfully"
  }, {
    headers: {
      "Set-Cookie": "token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  });
} 