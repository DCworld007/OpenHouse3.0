export function onRequest(context) {
  return new Response(JSON.stringify({
    success: true,
    message: "Direct API test working",
    timestamp: new Date().toISOString()
  }), {
    headers: { "Content-Type": "application/json" }
  });
} 