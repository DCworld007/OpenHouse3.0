export async function onRequest(context) {
  const { request, env, params } = context;
  const { groupId } = params;

  if (!groupId) {
    return new Response(JSON.stringify({ error: 'Invalid or missing groupId' }), { status: 400 });
  }

  try {
    const db = env.DB;
    if (!db) {
      console.error('[Activity API] D1 database (DB binding) not found');
      return new Response(JSON.stringify({ error: 'Database connection not available' }), { status: 500 });
    }

    // Ensure Activity table exists
    try {
      await db.prepare(`SELECT 1 FROM Activity LIMIT 1`).first();
    } catch (e) {
      console.log('[Activity API] Activity table not found, creating it.');
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS Activity (
          id TEXT PRIMARY KEY,
          groupId TEXT NOT NULL,
          userId TEXT NOT NULL,
          type TEXT NOT NULL,
          context TEXT,
          timestamp INTEGER NOT NULL
        )
      `).run();
      console.log('[Activity API] Activity table created.');
    }

    if (request.method === 'POST') {
      const { type, context } = await request.json();
      if (!type) {
        return new Response(JSON.stringify({ error: 'Missing activity type' }), { status: 400 });
      }

      // Generate a simple ID
      const id = 'act_' + Math.random().toString(36).substring(2, 15);
      const timestamp = Date.now();

      // Get user ID from JWT token
      const cookie = request.headers.get('cookie');
      let userId = 'unknown';
      if (cookie) {
        const token = cookie.split(';').find(c => c.trim().startsWith('auth_token='))?.split('=')[1];
        if (token) {
          try {
            const parts = token.split('.');
            if (parts.length >= 2) {
              const payload = JSON.parse(atob(parts[1]));
              userId = payload.sub || 'unknown';
            }
          } catch (e) {
            console.error('[Activity API] Error parsing token:', e);
          }
        }
      }

      await db.prepare(`
        INSERT INTO Activity (id, groupId, userId, type, context, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(id, groupId, userId, type, JSON.stringify(context || {}), timestamp).run();

      return new Response(JSON.stringify({ id, timestamp }), { status: 201 });
    } else if (request.method === 'GET') {
      const result = await db.prepare(
        `SELECT a.id, 
                a.type as type, 
                a.timestamp as timestamp, 
                a.userId, 
                a.context as context, 
                u.name as userName, 
                u.email as userEmail, 
                u.image as userImage 
         FROM Activity a
         LEFT JOIN User u ON a.userId = u.id
         WHERE a.groupId = ?
         ORDER BY a.timestamp DESC
         LIMIT 50`
      ).bind(groupId).all();

      const activities = (result.results || []).map((act) => ({
        ...act,
        details: typeof act.context === 'string' ? JSON.parse(act.context) : act.context,
        timestamp: new Date(act.timestamp).getTime()
      }));

      return new Response(JSON.stringify({ activities }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ error: `Method ${request.method} Not Allowed` }), { status: 405 });
    }
  } catch (e) {
    console.error(`[Activity API ${request.method}] Error:`, e);
    return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), { status: 500 });
  }
} 