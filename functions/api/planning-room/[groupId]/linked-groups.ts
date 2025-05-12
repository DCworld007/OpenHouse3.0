export const onRequestGet = async (context: { request: Request, env: any, params: { groupId: string } }) => {
  const { request, env, params } = context;
  const { groupId } = params;

  if (!groupId) {
    return new Response(JSON.stringify({ error: 'Invalid or missing groupId' }), { status: 400 });
  }

  try {
    const db = env.DB;
    if (!db) {
      console.error('[LinkedGroups API] D1 database (DB binding) not found');
      return new Response(JSON.stringify({ error: 'Database connection not available' }), { status: 500 });
    }

    // Check if table exists, create if not
    try {
      await db.prepare(`SELECT * FROM LinkedGroup LIMIT 1`).all();
    } catch (e) {
      console.log('[LinkedGroups API] Creating LinkedGroup table');
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS LinkedGroup (
          sourceGroupId TEXT NOT NULL,
          linkedGroupId TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          PRIMARY KEY (sourceGroupId, linkedGroupId)
        )
      `).run();
      return new Response(JSON.stringify({ linkedGroups: [] }));
    }

    // Get all linked groups
    const linkedGroupsResult = await db.prepare(`
      SELECT lg.linkedGroupId, g.name, g.description, g.ownerId, g.createdAt, g.updatedAt
      FROM LinkedGroup lg
      JOIN PlanningRoom g ON lg.linkedGroupId = g.id
      WHERE lg.sourceGroupId = ?
    `).bind(groupId).all();

    const linkedGroups = linkedGroupsResult.results || [];

    // Get cards for each linked group
    const formattedGroups = await Promise.all(linkedGroups.map(async (group: any) => {
      const cardsResult = await db.prepare(`
        SELECT c.*, u.name as userName, u.email as userEmail, u.image as userImage
        FROM Card c
        LEFT JOIN User u ON c.userId = u.id
        WHERE c.roomId = ?
        ORDER BY c.order ASC
      `).bind(group.linkedGroupId).all();

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
        linkedFrom: group.linkedGroupId,
        linkedFromName: group.name,
        isLinked: true,
        reactions: card.reactions || {}
      }));

      return {
        group: {
          id: group.linkedGroupId,
          name: group.name || 'Unnamed Group',
          description: group.description || '',
          ownerId: group.ownerId || '',
          createdAt: group.createdAt || new Date().toISOString(),
          updatedAt: group.updatedAt || new Date().toISOString(),
          isLinked: true
        },
        cards
      };
    }));

    return new Response(JSON.stringify({ linkedGroups: formattedGroups }));
  } catch (e: any) {
    console.error('[LinkedGroups API] Error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), { status: 500 });
  }
}; 