export const onRequestGet = async () => {
  return new Response(
    JSON.stringify({
      message: 'Edge API route is working',
      timestamp: new Date().toISOString(),
      // Cloudflare Functions do not expose NODE_ENV, so omit or set manually if needed
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}; 