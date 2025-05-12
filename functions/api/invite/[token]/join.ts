export const onRequestPost = async (context: { request: Request, env: any, params: { token: string } }) => {
  const { request, env, params } = context;
  const { token } = params;

  if (!token) {
    return new Response(JSON.stringify({ error: 'Invalid or missing invite token' }), { status: 400 });
  }

  try {
    const db = env.DB;
    if (!db) {
      console.error('[API POST Join] D1 database (DB binding) not found');
      return new Response(JSON.stringify({ error: 'Database connection not available' }), { status: 500 });
    }

    // Get user info from JWT token
    const cookie = request.headers.get('cookie');
    let userId = null;
    let userName = null;
    let userEmail = null;
    let userImage = null;

    if (cookie) {
      const tokenCookie = cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
      if (tokenCookie) {
        try {
          const parts = tokenCookie.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(atob(parts[1]));
            userId = payload.sub;
            userName = payload.name;
            userEmail = payload.email;
            userImage = payload.picture;
          }
        } catch (e) {
          console.error('[API POST Join] Error parsing token:', e);
        }
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    // Get invite token details
    const inviteQuery = 'SELECT id, planningRoomId, expiresAt, maxUses, usesCount, isActive FROM InviteTokens WHERE token = ?';
    const invite = await db.prepare(inviteQuery).bind(token).first();

    if (!invite) {
      return new Response(JSON.stringify({ error: 'Invalid invite token' }), { status: 400 });
    }

    if (invite.isActive !== 1) {
      return new Response(JSON.stringify({ error: 'Invite token is not active' }), { status: 400 });
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return new Response(JSON.stringify({ error: 'Invite token has expired' }), { status: 400 });
    }

    if (invite.maxUses !== null && invite.usesCount >= invite.maxUses) {
      return new Response(JSON.stringify({ error: 'Invite token has reached maximum uses' }), { status: 400 });
    }

    // Check if user is already a member
    const existingMember = await db.prepare(`
      SELECT 1 FROM PlanningRoomMember 
      WHERE roomId = ? AND userId = ?
    `).bind(invite.planningRoomId, userId).first();

    if (existingMember) {
      return new Response(JSON.stringify({ error: 'Already a member of this room' }), { status: 400 });
    }

    // Add user as member
    await db.prepare(`
      INSERT INTO PlanningRoomMember (roomId, userId, role, joinedAt)
      VALUES (?, ?, 'member', ?)
    `).bind(invite.planningRoomId, userId, new Date().toISOString()).run();

    // Increment uses count
    await db.prepare(`
      UPDATE InviteTokens 
      SET usesCount = usesCount + 1
      WHERE id = ?
    `).bind(invite.id).run();

    // Get room details
    const room = await db.prepare(`
      SELECT id, name, description, ownerId, createdAt, updatedAt
      FROM PlanningRoom
      WHERE id = ?
    `).bind(invite.planningRoomId).first();

    return new Response(JSON.stringify({
      room: {
        id: room.id,
        name: room.name || 'Unnamed Room',
        description: room.description || '',
        ownerId: room.ownerId || '',
        createdAt: room.createdAt || new Date().toISOString(),
        updatedAt: room.updatedAt || new Date().toISOString()
      }
    }));
  } catch (e: any) {
    console.error('[API POST Join] Error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), { status: 500 });
  }
}; 