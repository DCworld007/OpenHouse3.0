export const onRequest = async (context: { request: Request, env: any }) => {
  const { request, env } = context;

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

  // JWT verification
  let userId = null;
  try {
    const cookie = getCookie('auth_token');
    if (!cookie) throw new Error('No token cookie');
    const secret = env.JWT_SECRET;
    if (!secret) throw new Error('No JWT_SECRET in env');
    const parts = cookie.split('.');
    if (parts.length < 2) throw new Error('Malformed JWT');
    const payload = JSON.parse(atob(parts[1]));
    userId = payload.sub;
    if (!userId) throw new Error('No sub in JWT');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: 'Unauthorized', details: message }), { status: 401 });
  }

  const db = env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database connection not available' }), { status: 500 });
  }

  try {
    if (request.method === 'GET') {
      // Get all planning rooms
      const rooms = await db.prepare(`
        SELECT pr.*, 
               COUNT(DISTINCT prm.userId) as memberCount,
               COUNT(DISTINCT c.id) as cardCount
        FROM PlanningRoom pr
        LEFT JOIN PlanningRoomMember prm ON pr.id = prm.roomId
        LEFT JOIN Card c ON pr.id = c.roomId
        GROUP BY pr.id
        ORDER BY pr.createdAt DESC
      `).all();

      return new Response(JSON.stringify({ rooms: rooms.results || [] }));
    } else if (request.method === 'POST') {
      const { name, description } = await request.json();
      if (!name) {
        return new Response(JSON.stringify({ error: 'Missing room name' }), { status: 400 });
      }

      const id = generateUUID();
      const now = new Date().toISOString();

      // Create planning room
      await db.prepare(`
        INSERT INTO PlanningRoom (id, name, description, ownerId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(id, name, description || '', userId, now, now).run();

      // Add creator as owner
      await db.prepare(`
        INSERT INTO PlanningRoomMember (roomId, userId, role, joinedAt)
        VALUES (?, ?, 'owner', ?)
      `).bind(id, userId, now).run();

      return new Response(JSON.stringify({
        id,
        name,
        description: description || '',
        ownerId: userId,
        createdAt: now,
        updatedAt: now
      }), { status: 201 });
    } else {
      return new Response(JSON.stringify({ error: `Method ${request.method} Not Allowed` }), { status: 405 });
    }
  } catch (e: any) {
    console.error('[Admin Planning Rooms API] Error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), { status: 500 });
  }
}; 