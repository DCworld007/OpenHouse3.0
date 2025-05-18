export const onRequestPost = async (context: { request: Request, env: any, params: { groupId: string } }) => {
  const { request, env, params } = context;
  const { groupId } = params;

  if (!groupId) {
    return new Response(JSON.stringify({ error: 'Invalid or missing groupId' }), { status: 400 });
  }

  try {
    const { linkedGroupId } = await request.json();
    if (!linkedGroupId) {
      return new Response(JSON.stringify({ error: 'Missing linkedGroupId' }), { status: 400 });
    }

    const db = env.DB;
    if (!db) {
      console.error('[LinkAPI] D1 database (DB binding) not found');
      return new Response(JSON.stringify({ error: 'Database connection not available' }), { status: 500 });
    }

    // Check if table exists, create if not
    try {
      await db.prepare(`SELECT * FROM LinkedGroup LIMIT 1`).all();
    } catch (e) {
      console.log('[LinkAPI] Creating LinkedGroup table');
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS LinkedGroup (
          sourceGroupId TEXT NOT NULL,
          linkedGroupId TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          PRIMARY KEY (sourceGroupId, linkedGroupId)
        )
      `).run();
    }

    const now = new Date().toISOString();

    // Check if link already exists
    const existingLink = await db.prepare(`
      SELECT 1 FROM LinkedGroup 
      WHERE sourceGroupId = ? AND linkedGroupId = ?
    `).bind(groupId, linkedGroupId).first();

    if (existingLink) {
      return new Response(JSON.stringify({ error: 'Groups are already linked' }), { status: 400 });
    }

    // Create the link
    await db.prepare(`
      INSERT INTO LinkedGroup (sourceGroupId, linkedGroupId, createdAt)
      VALUES (?, ?, ?)
    `).bind(groupId, linkedGroupId, now).run();

    // Get the linked group details
    const linkedGroup = await db.prepare(`
      SELECT id, name, description, ownerId, createdAt, updatedAt
      FROM PlanningRoom
      WHERE id = ?
    `).bind(linkedGroupId).first();

    if (!linkedGroup) {
      return new Response(JSON.stringify({ error: 'Linked group not found' }), { status: 404 });
    }

    // Get cards from the linked group
    const cardsResult = await db.prepare(`
      SELECT c.*, u.name as userName, u.email as userEmail, u.image as userImage
      FROM Card c
      LEFT JOIN User u ON c.userId = u.id
      WHERE c.roomId = ?
      ORDER BY c.order ASC
    `).bind(linkedGroupId).all();

    const cards = (cardsResult.results || []).map((card: any) => ({
      id: card.id,
      roomId: card.roomId,
      cardId: card.id,
      content: card.content || '',
      notes: card.notes || '',
      cardType: card.cardType || 'what',
      order: card.order || 0,
      userId: card.userId || 'unknown',
      userName: card.userName,
      userEmail: card.userEmail,
      userImage: card.userImage,
      createdAt: card.createdAt || new Date().toISOString(),
      updatedAt: card.updatedAt || new Date().toISOString(),
      linkedFrom: linkedGroupId,
      linkedFromName: linkedGroup.name,
      isLinked: true,
      reactions: card.reactions || {}
    }));

    return new Response(JSON.stringify({
      group: {
        id: linkedGroup.id,
        name: linkedGroup.name || 'Unnamed Group',
        description: linkedGroup.description || '',
        ownerId: linkedGroup.ownerId || '',
        createdAt: linkedGroup.createdAt || now,
        updatedAt: linkedGroup.updatedAt || now,
        isLinked: true
      },
      cards
    }));
  } catch (e: any) {
    console.error('[LinkAPI] Error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), { status: 500 });
  }
}; 