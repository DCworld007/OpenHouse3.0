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

  // JWT verification (simple, for demo)
  let userId = null;
  try {
    const cookie = getCookie('token');
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

  if (request.method === 'POST') {
    try {
      const data = await request.json();
      const { content, notes, cardType, imageUrl, groupId } = data;
      const cardId = generateUUID();
      const now = new Date().toISOString();
      const insertStmt = db.prepare(
        'INSERT INTO Card (id, content, notes, cardType, imageUrl, groupId, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      await insertStmt.bind(
        cardId,
        content,
        notes,
        cardType,
        imageUrl,
        groupId,
        userId,
        now,
        now
      ).run();
      const cardStmt = db.prepare('SELECT * FROM Card WHERE id = ?');
      const card = await cardStmt.bind(cardId).first();
      return new Response(JSON.stringify(card));
    } catch (error: any) {
      return new Response(JSON.stringify({ error: 'Failed to create card', details: error.message }), { status: 500 });
    }
  } else if (request.method === 'GET') {
    try {
      const cardsStmt = db.prepare('SELECT * FROM Card WHERE userId = ?');
      const cards = await cardsStmt.bind(userId).all();
      return new Response(JSON.stringify(cards));
    } catch (error: any) {
      return new Response(JSON.stringify({ error: 'Failed to fetch cards', details: error.message }), { status: 500 });
    }
  } else {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }
}; 