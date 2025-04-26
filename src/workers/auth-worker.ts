import { createToken, verifyToken } from '@/lib/cloudflare-jwt';
import bcrypt from 'bcryptjs';
import { corsHeaders } from './cors-headers';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle OPTIONS request for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    // Route handling
    if (path === '/api/auth/login') {
      return handleLogin(request, env);
    } else if (path === '/api/auth/signup') {
      return handleSignup(request, env);
    } else if (path === '/api/auth/logout') {
      return handleLogout();
    } else if (path === '/api/auth/me') {
      return handleMe(request, env);
    }

    // Default response for unknown routes
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  },
};

async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ message: 'Email and password are required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Find user by email
    const userStmt = env.DB.prepare('SELECT * FROM User WHERE email = ?');
    const user = await userStmt.bind(email).first();

    if (!user || !(user as any).password) {
      return new Response(
        JSON.stringify({ message: 'Invalid email or password' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const userTyped = user as { id: string; email: string; name: string; password: string; image?: string | null };

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, userTyped.password);
    if (!isPasswordValid) {
      return new Response(
        JSON.stringify({ message: 'Invalid email or password' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Create JWT token
    const token = await createToken({
      sub: userTyped.id,
      email: userTyped.email,
      name: userTyped.name,
    }, env.JWT_SECRET);

    // Set cookie and return user data
    const response = new Response(
      JSON.stringify({
        user: {
          id: userTyped.id,
          name: userTyped.name ?? '',
          email: userTyped.email ?? '',
          image: userTyped.image ?? null,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

    // Set cookie
    response.headers.append(
      'Set-Cookie',
      `auth_token=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/`
    );

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ message: 'An error occurred during login' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}

async function handleSignup(request: Request, env: Env): Promise<Response> {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ message: 'Email, password, and name are required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Check if user already exists
    const existingUserStmt = env.DB.prepare('SELECT * FROM User WHERE email = ?');
    const existingUser = await existingUserStmt.bind(email).first();

    if (existingUser) {
      return new Response(
        JSON.stringify({ message: 'User with this email already exists' }),
        {
          status: 409,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const insertStmt = env.DB.prepare('INSERT INTO User (id, email, name, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)');
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    await insertStmt.bind(userId, email, name, hashedPassword, now, now).run();

    // Fetch the created user
    const user = { id: userId, email, name, image: null };

    // Create JWT token
    const token = await createToken({
      sub: user.id,
      email: user.email,
      name: user.name,
    }, env.JWT_SECRET);

    // Set cookie and return user data
    const response = new Response(
      JSON.stringify({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

    // Set cookie
    response.headers.append(
      'Set-Cookie',
      `auth_token=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/`
    );

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return new Response(
      JSON.stringify({ message: 'An error occurred during signup' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}

function handleLogout(): Response {
  const response = new Response(
    JSON.stringify({ message: 'Logged out successfully' }),
    {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  );

  // Clear the auth cookie
  response.headers.append(
    'Set-Cookie',
    `auth_token=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`
  );

  return response;
}

async function handleMe(request: Request, env: Env): Promise<Response> {
  try {
    // Get token from request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ message: 'No token provided' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token, env.JWT_SECRET);

    if (!payload || !payload.sub) {
      return new Response(
        JSON.stringify({ message: 'Invalid token' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Get user from database
    const userStmt = env.DB.prepare('SELECT id, name, email, image FROM User WHERE id = ?');
    const user = await userStmt.bind(payload.sub).first();

    if (!user) {
      return new Response(
        JSON.stringify({ message: 'User not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ user }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Me error:', error);
    return new Response(
      JSON.stringify({ message: 'An error occurred' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
} 