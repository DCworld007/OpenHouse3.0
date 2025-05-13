import { jwtVerify, SignJWT } from 'jose';

// Generate a secret key - in production, this should be an environment variable
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-min-32-chars-long-here!!!!'
);

// Set token expiration time - 7 days in seconds
const TOKEN_EXPIRATION = 7 * 24 * 60 * 60;

export async function POST(request) {
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

    // Create JWT using jose
    const now = Math.floor(Date.now() / 1000);
    const jwt = await new SignJWT({
      sub: googleData.sub,
      email: googleData.email,
      name: googleData.name,
      picture: googleData.picture,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(now + TOKEN_EXPIRATION)
      .sign(JWT_SECRET);

    // Set cookie with JWT
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
        "Set-Cookie": `token=${jwt}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TOKEN_EXPIRATION}; Secure`
      }
    });
  } catch (error) {
    console.error("Auth error:", error);
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