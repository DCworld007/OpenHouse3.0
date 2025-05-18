// Edge-compatible, not cryptographically secure token generator
function generateSimpleToken(length = 32) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const onRequestPost = async (context: { request: Request, env: any, params: { groupId: string } }) => {
  const { request, env, params } = context;
  const { groupId } = params;

  if (!groupId) {
    return new Response(JSON.stringify({ error: 'Invalid or missing groupId' }), { status: 400 });
  }

  try {
    const db = env.DB;
    if (!db) {
      console.error('[API POST Invite] D1 database (DB binding) not found');
      return new Response(JSON.stringify({ error: 'Database connection not available' }), { status: 500 });
    }

    // Get user info from JWT token
    const cookie = request.headers.get('cookie');
    let userId = null;
    if (cookie) {
      const tokenCookie = cookie.split(';').find(c => c.trim().startsWith('auth_token='))?.split('=')[1];
      if (tokenCookie) {
        try {
          const parts = tokenCookie.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(atob(parts[1]));
            userId = payload.sub;
          }
        } catch (e) {
          console.error('[API POST Invite] Error parsing token:', e);
        }
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    // Check if user is room owner
    const room = await db.prepare(`
      SELECT ownerId FROM PlanningRoom WHERE id = ?
    `).bind(groupId).first();

    if (!room) {
      return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404 });
    }

    if (room.ownerId !== userId) {
      return new Response(JSON.stringify({ error: 'Not authorized to create invites' }), { status: 403 });
    }

    // For GET requests, return existing active invite if available
    if (request.method === 'GET') {
      const existingInvite = await db.prepare(`
        SELECT token, expiresAt, maxUses, usesCount
        FROM InviteTokens 
        WHERE planningRoomId = ? AND isActive = 1 
        AND (expiresAt IS NULL OR expiresAt > datetime('now'))
        AND (maxUses IS NULL OR usesCount < maxUses)
        ORDER BY createdAt DESC LIMIT 1
      `).bind(groupId).first();

      if (existingInvite) {
        // Get base URL from environment
        const requestHost = request.headers.get('host') || request.headers.get('x-forwarded-host');
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const baseUrl = requestHost ? `${protocol}://${requestHost}` : (env.NEXTAUTH_URL || env.VERCEL_URL || 'http://localhost:3000');
        const inviteUrl = new URL('/invite', baseUrl);
        inviteUrl.searchParams.set('token', existingInvite.token);

        return new Response(JSON.stringify({
          token: existingInvite.token,
          inviteUrl: inviteUrl.toString(),
          expiresAt: existingInvite.expiresAt,
          maxUses: existingInvite.maxUses
        }));
      }
    }

    // Generate new invite token
    const token = generateSimpleToken(32);
    const now = new Date().toISOString();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invite token
    await db.prepare(`
      INSERT INTO InviteTokens (token, planningRoomId, generatedByUserId, createdAt, expiresAt, maxUses, usesCount, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(token, groupId, userId, now, expiresAt.toISOString(), 10, 0, 1).run();

    // Get base URL from environment
    const requestHost = request.headers.get('host') || request.headers.get('x-forwarded-host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = requestHost ? `${protocol}://${requestHost}` : (env.NEXTAUTH_URL || env.VERCEL_URL || 'http://localhost:3000');
    const inviteUrl = new URL('/invite', baseUrl);
    inviteUrl.searchParams.set('token', token);

    return new Response(JSON.stringify({
      token,
      inviteUrl: inviteUrl.toString(),
      expiresAt: expiresAt.toISOString(),
      maxUses: 10
    }));
  } catch (e: any) {
    console.error('[API POST Invite] Error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), { status: 500 });
  }
}; 