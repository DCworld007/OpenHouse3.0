export const onRequestPost = async (context: { request: Request, params: { token: string }, env: any }) => {
  const { request, params, env } = context;
  const tokenValue = params.token;

  // Helper: parse cookies
  function getCookie(name: string) {
    const value = `; ${request.headers.get('cookie') || ''}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
    return null;
  }

  // Helper: generate UUID (not cryptographically secure)
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // JWT verification (simple, for demo)
  let currentUserId = null;
  try {
    const cookie = getCookie('token');
    if (!cookie) throw new Error('No token cookie');
    const secret = env.JWT_SECRET;
    if (!secret) throw new Error('No JWT_SECRET in env');
    const parts = cookie.split('.');
    if (parts.length < 2) throw new Error('Malformed JWT');
    const payload = JSON.parse(atob(parts[1]));
    currentUserId = payload.sub;
    if (!currentUserId) throw new Error('No sub in JWT');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or missing user token', details: message }), { status: 401 });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
  }

  const db = env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database connection not available' }), { status: 500 });
  }

  try {
    // 1. Fetch and Re-validate Invite Token
    const inviteQuery = 'SELECT id, planningRoomId, expiresAt, maxUses, usesCount, isActive FROM InviteTokens WHERE token = ?';
    const invite = await db.prepare(inviteQuery).bind(tokenValue).first();

    if (!invite) {
      return new Response(JSON.stringify({ error: 'Invite token not found' }), { status: 404 });
    }
    if (invite.isActive !== 1) {
      return new Response(JSON.stringify({ error: 'Invite token is no longer active' }), { status: 410 });
    }
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return new Response(JSON.stringify({ error: 'Invite token has expired' }), { status: 410 });
    }
    if (invite.maxUses !== null && invite.usesCount >= invite.maxUses) {
      return new Response(JSON.stringify({ error: 'Invite token has reached its maximum number of uses' }), { status: 410 });
    }

    // 2. Check if user is already a member
    const memberCheckQuery = 'SELECT id FROM RoomMember WHERE userId = ? AND roomId = ?';
    const existingMember = await db.prepare(memberCheckQuery).bind(currentUserId, invite.planningRoomId).first();

    if (existingMember) {
      return new Response(JSON.stringify({ success: true, message: 'User is already a member of this room', planningRoomId: invite.planningRoomId }));
    }

    // 3. Add user to RoomMember table
    const newMemberId = generateUUID();
    const defaultRole = 'member';
    const currentTime = new Date().toISOString();

    const addMemberQuery = `
      INSERT INTO RoomMember (id, userId, roomId, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await db.prepare(addMemberQuery).bind(
      newMemberId,
      currentUserId,
      invite.planningRoomId,
      defaultRole,
      currentTime,
      currentTime
    ).run();

    // 4. Increment usesCount and potentially deactivate token
    const newUsesCount = invite.usesCount + 1;
    let deactivateToken = false;
    if (invite.maxUses !== null && newUsesCount >= invite.maxUses) {
      deactivateToken = true;
    }

    const updateTokenQuery = deactivateToken
      ? 'UPDATE InviteTokens SET usesCount = ?, isActive = 0 WHERE id = ?'
      : 'UPDATE InviteTokens SET usesCount = ? WHERE id = ?';
    await db.prepare(updateTokenQuery).bind(newUsesCount, invite.id).run();

    return new Response(JSON.stringify({ success: true, message: 'Successfully joined the room', planningRoomId: invite.planningRoomId }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Failed to process join request', details: error.message, stack: error.stack }), { status: 500 });
  }
}; 