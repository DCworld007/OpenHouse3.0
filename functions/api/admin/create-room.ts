export const onRequestPost = async (context: { request: Request, env: any }) => {
  const { request, env } = context;

  // Helper: generate UUID (not cryptographically secure)
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
    }

    // Get required fields
    const { id, name, userId } = body;
    if (!id || !name || !userId) {
      return new Response(JSON.stringify({ 
        error: 'Required fields missing', 
        requiredFields: ['id', 'name', 'userId'] 
      }), { status: 400 });
    }

    // Get D1 database connection
    const db = env.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database connection not available' }), { status: 500 });
    }

    // Check if room already exists
    const existingRoom = await db.prepare('SELECT id FROM PlanningRoom WHERE id = ?').bind(id).first();
    if (existingRoom) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Room already exists',
        roomId: id
      }), { status: 200 });
    }

    // Create room
    const now = new Date().toISOString();
    const description = body.description || '';
    // 1. Insert into PlanningRoom
    const insertRoomStmt = db.prepare(`
      INSERT INTO PlanningRoom (id, name, description, ownerId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    await insertRoomStmt.bind(
      id,
      name,
      description,
      userId,
      now,
      now
    ).run();

    // 2. Insert into RoomMember
    const roomMemberId = generateUUID();
    const insertMemberStmt = db.prepare(`
      INSERT INTO RoomMember (id, roomId, userId, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    await insertMemberStmt.bind(
      roomMemberId,
      id,
      userId,
      'owner',
      now,
      now
    ).run();

    // 3. Verify room was created
    const verifyRoomStmt = db.prepare('SELECT id, name FROM PlanningRoom WHERE id = ?');
    const verifiedRoom = await verifyRoomStmt.bind(id).first();

    return new Response(JSON.stringify({
      success: true,
      message: 'Room created successfully',
      roomId: id,
      verifiedRoom
    }), { status: 201 });
  } catch (error: any) {
    return new Response(JSON.stringify({
      error: 'Failed to create room',
      details: error.message,
      stack: error.stack
    }), { status: 500 });
  }
}; 