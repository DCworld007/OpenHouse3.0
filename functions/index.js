export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  console.log(`[functions/index.js] Handling request for: ${path}`);

  // Return a simple response for diagnostic purposes
  if (path === '/api/cloudflare-test') {
    return new Response(
      JSON.stringify({
        success: true,
        message: "Cloudflare Functions are working!",
        path: path,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // For all other requests, let them pass through to Next.js
  return new Response(null, { status: 200 });
} 