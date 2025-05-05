export const runtime = 'edge';

// In-memory store as a stub for D1
const yjsDocStore: Record<string, string> = {};

export default async function handler(req: Request) {
  // Extract groupId from the URL (works for /api/planning-room/[groupId]/cards)
  const url = new URL(req.url);
  // Assumes the URL ends with /planning-room/{groupId}/cards
  const pathParts = url.pathname.split('/');
  const groupId = pathParts[pathParts.length - 2];

  if (!groupId) {
    return new Response(JSON.stringify({ error: 'Invalid groupId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (req.method === 'GET') {
    const doc = yjsDocStore[groupId] || null;
    return new Response(JSON.stringify({ doc }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const doc = body.doc;
    if (typeof doc !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing doc' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    yjsDocStore[groupId] = doc;
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
}

// TODO: Replace in-memory store with D1 database logic for production. 