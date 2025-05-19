export const onRequestPost = async (context: { request: Request, env: any, params: { groupId: string } }) => {
  const { request, env, params } = context;
  const { groupId } = params;

  if (!groupId) {
    return new Response(JSON.stringify({ error: 'Invalid or missing groupId' }), { status: 400 });
  }

  try {
    const db = env.DB;
    if (!db) {
      console.error('[Invite API] D1 database (DB binding) not found');
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
          console.error('[Invite API] Error parsing token:', e);
        }
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    // Check if user is a member of the room
    const memberQuery = 'SELECT role FROM PlanningRoomMember WHERE roomId = ? AND userId = ?';
    const member = await db.prepare(memberQuery).bind(groupId, userId).first();

    if (!member) {
      return new Response(JSON.stringify({ error: 'Not a member of this room' }), { status: 403 });
    }

    // Generate a random token
    const token = 'inv_' + Math.random().toString(36).substring(2, 15);
    const now = new Date().toISOString();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token expires in 7 days

    // Create invite token
    await db.prepare(`
      INSERT INTO InviteTokens (token, planningRoomId, createdAt, expiresAt, maxUses, usesCount, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      token,
      groupId,
      now,
      expiresAt.toISOString(),
      10, // Max 10 uses
      0,  // No uses yet
      1   // Active
    ).run();

    const baseUrl = env.NEXTAUTH_URL || env.VERCEL_URL || 'http://localhost:3000';
    const inviteUrl = new URL('/invite', baseUrl);
    inviteUrl.searchParams.set('token', token);

    return new Response(JSON.stringify({
      token,
      inviteUrl: inviteUrl.toString(),
      expiresAt: expiresAt.toISOString(),
      maxUses: 10
    }), { status: 201 });
  } catch (e: any) {
    console.error('[Invite API] Error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), { status: 500 });
  }
}; 