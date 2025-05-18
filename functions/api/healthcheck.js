export function onRequest(context) {
  const { request, env } = context;
  
  // Get all cookies
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split('; ')
      .filter(Boolean)
      .map(pair => pair.split('=').map(decodeURIComponent))
  );

  // Build response with useful debug info
  const response = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    cloudflareEnv: {
      // Include non-sensitive env variables
      jwtSecretExists: !!env.JWT_SECRET,
      googleClientIdExists: !!env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      availableBindings: Object.keys(env),
    },
    cookiesPresent: Object.keys(cookies),
    headers: Object.fromEntries(
      [...request.headers.entries()].filter(([key]) => !key.toLowerCase().includes('authorization'))
    ),
    url: request.url,
  };

  return new Response(JSON.stringify(response, null, 2), {
    headers: {
      "Content-Type": "application/json"
    }
  });
} 