// Pure vanilla JS - no imports
export async function onRequest(context) {
  const { request, env } = context;

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      status: 204,
    });
  }

  // Only handle POST requests
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // Parse request body
    let credential = null;
    try {
      const body = await request.json();
      credential = body.credential;
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!credential) {
      return new Response(JSON.stringify({ error: "Missing credential" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Verify with Google
    let googleData;
    try {
      const googleResponse = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
      );
      
      if (!googleResponse.ok) {
        return new Response(JSON.stringify({ error: "Invalid Google token" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      googleData = await googleResponse.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Error verifying token" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Create a very simple JWT without libraries
    // NOTE: This is NOT a secure JWT implementation - for DEMO PURPOSES ONLY
    const header = { alg: "none", typ: "JWT" };
    const payload = {
      sub: googleData.sub,
      email: googleData.email,
      name: googleData.name,
      picture: googleData.picture,
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };

    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = ""; // No signature for demo
    
    const token = `${encodedHeader}.${encodedPayload}.${signature}`;

    // Set cookie
    return new Response(JSON.stringify({ 
      success: true,
      user: {
        id: googleData.sub,
        email: googleData.email,
        name: googleData.name,
        picture: googleData.picture
      } 
    }), {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: "Server error", 
      message: error.message || "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
} 