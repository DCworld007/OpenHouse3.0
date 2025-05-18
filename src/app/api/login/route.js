// Next.js API route for /api/login
export const runtime = 'edge';

export async function POST(request) {
  // Handle POST requests
  try {
    // Parse request body
    let credential = null;
    try {
      const body = await request.json();
      credential = body.credential;
    } catch (e) {
      return Response.json({ error: "Invalid request body" }, {
        status: 400
      });
    }

    if (!credential) {
      return Response.json({ error: "Missing credential" }, {
        status: 400
      });
    }

    // Verify with Google
    let googleData;
    try {
      const googleResponse = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
      );
      
      if (!googleResponse.ok) {
        return Response.json({ error: "Invalid Google token" }, {
          status: 401
        });
      }
      
      googleData = await googleResponse.json();
    } catch (e) {
      return Response.json({ error: "Error verifying token" }, {
        status: 500
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
    return Response.json({ 
      success: true,
      user: {
        id: googleData.sub,
        email: googleData.email,
        name: googleData.name,
        picture: googleData.picture
      } 
    }, {
      headers: {
        "Set-Cookie": `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
      }
    });
  } catch (error) {
    return Response.json({ 
      error: "Server error", 
      message: error.message || "Unknown error"
    }, {
      status: 500
    });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    status: 204,
  });
} 