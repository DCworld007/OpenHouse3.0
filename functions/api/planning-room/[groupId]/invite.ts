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

    console.log('[Invite API] Checking room existence and membership for:', { groupId, userId });

    // First check if the room exists
    const room = await db.prepare('SELECT * FROM PlanningRoom WHERE id = ?').bind(groupId).first();
    if (!room) {
      console.error(`[Invite API] Room not found: ${groupId}`);
      return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404 });
    }

    // Then check if user is a member
    const member = await db.prepare('SELECT * FROM RoomMember WHERE roomId = ? AND userId = ?')
      .bind(groupId, userId)
      .first();

    if (!member) {
      console.error(`[Invite API] User ${userId} is not a member of room ${groupId}`);
      return new Response(JSON.stringify({ error: 'Not authorized to create invites' }), { status: 403 });
    }

    // Generate a random token
    const token = 'inv_' + Math.random().toString(36).substring(2, 15);
    const now = new Date().toISOString();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invite token
    await db.prepare(`
      INSERT INTO InviteTokens (token, planningRoomId, generatedByUserId, createdAt, expiresAt, maxUses, usesCount, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      token,
      groupId,
      userId,
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