export const onRequestPost = async (context: { request: Request, params: { groupId: string }, env: any }) => {
  const { request, params, env } = context;
  const groupId = params.groupId;
  console.log(`[CF Function] Invite POST for groupId:`, groupId);

  // Helper: parse cookies
  function getCookie(name: string) {
    const value = `; ${request.headers.get('cookie') || ''}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
    return null;
  }

  // Helper: generate random token
  function generateSecureToken(length = 32) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Helper: generate UUID
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
    const jwt = getCookie('token');
    if (!jwt) throw new Error('No token cookie');
    const secret = env.JWT_SECRET;
    if (!secret) throw new Error('No JWT_SECRET in env');
    // Use jose or a minimal JWT lib if available, else skip verification for now
    // For demo, just decode base64 and extract sub
    const parts = jwt.split('.');
    if (parts.length < 2) throw new Error('Malformed JWT');
    const payload = JSON.parse(atob(parts[1]));
    currentUserId = payload.sub;
    if (!currentUserId) throw new Error('No sub in JWT');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log('[CF Function] JWT error:', message);
    return new Response(JSON.stringify({ error: 'Unauthorized', details: message }), { status: 401 });
  }

  // DB logic
  const db = env.DB;
  if (!db) {
    console.log('[CF Function] No DB binding');
    return new Response(JSON.stringify({ error: 'No DB binding' }), { status: 500 });
  }

  try {
    // Check room exists and ownership
    const room = await db.prepare('SELECT ownerId FROM PlanningRoom WHERE id = ?').bind(groupId).first();
    if (!room) {
      console.log('[CF Function] Planning room not found:', groupId);
      return new Response(JSON.stringify({ error: 'Planning room not found', groupId }), { status: 404 });
    }
    if (room.ownerId !== currentUserId) {
      return new Response(JSON.stringify({ error: 'Forbidden: Only the room owner can create invites' }), { status: 403 });
    }
    // Create invite
    const tokenString = generateSecureToken();
    const newInviteId = generateUUID();
    await db.prepare(
      `INSERT INTO InviteTokens (id, token, planningRoomId, generatedByUserId) VALUES (?, ?, ?, ?)`
    ).bind(newInviteId, tokenString, groupId, currentUserId).run();
    const inviteLink = `${env.NEXTAUTH_URL || env.VERCEL_URL || 'http://localhost:3000'}/invite/${tokenString}`;
    return new Response(JSON.stringify({ success: true, inviteToken: tokenString, inviteLink, inviteId: newInviteId }), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.log('[CF Function] Error creating invite:', message);
    return new Response(JSON.stringify({ error: 'Failed to create invite', details: message, stack }), { status: 500 });
  }
}; 