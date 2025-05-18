export const onRequest = async (context: { request: Request, env: any, params: { groupId: string } }) => {
  const { request, env, params } = context;
  const { groupId } = params;

  if (!groupId) {
    return new Response(JSON.stringify({ error: 'Invalid groupId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const db = env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database connection not available' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // Ensure YjsDoc table exists
  try {
    await db.prepare(`SELECT 1 FROM YjsDoc LIMIT 1`).first();
  } catch (e) {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS YjsDoc (
        groupId TEXT PRIMARY KEY,
        doc TEXT
      )
    `).run();
  }

  if (request.method === 'GET') {
    const result = await db.prepare(`SELECT doc FROM YjsDoc WHERE groupId = ?`).bind(groupId).first();
    const doc = result?.doc || null;
    return new Response(JSON.stringify({ doc }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const doc = body.doc;
    if (typeof doc !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing doc' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    await db.prepare(`INSERT OR REPLACE INTO YjsDoc (groupId, doc) VALUES (?, ?)`).bind(groupId, doc).run();
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
}; 