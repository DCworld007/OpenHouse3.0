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
  let jwtError = null;
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
    jwtError = err instanceof Error ? err.message : String(err);
  }

  const db = env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database connection not available' }), { status: 500 });
  }

  // Handle POST requests for creating rooms
  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
    }

    // Log the request body for debugging
    console.log('[POST /api/rooms] Body:', body);
    if (jwtError) {
      console.log('[POST /api/rooms] JWT error:', jwtError);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or missing token', details: jwtError }), { status: 401 });
    }

    // Validate required fields
    const { id, name } = body;
    if (!id || !name) {
      return new Response(JSON.stringify({ error: 'Room ID and name are required', received: { id, name } }), { status: 400 });
    }

    try {
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
      const insertRoomStmt = db.prepare(`
        INSERT INTO PlanningRoom (id, name, description, ownerId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      await insertRoomStmt.bind(
        id,
        name,
        body.description || '',
        userId,
        now,
        now
      ).run();

      // Add user as owner member (optional, only if RoomMember table exists)
      // const roomMemberId = generateUUID();
      // const insertMemberStmt = db.prepare(`
      //   INSERT INTO RoomMember (id, roomId, userId, role, createdAt, updatedAt)
      //   VALUES (?, ?, ?, ?, ?, ?)
      // `);
      // await insertMemberStmt.bind(
      //   roomMemberId,
      //   id,
      //   userId,
      //   'owner',
      //   now,
      //   now
      // ).run();

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Room created successfully',
        roomId: id
      }), { status: 201 });
    } catch (error: any) {
      return new Response(JSON.stringify({ 
        error: 'Failed to create room', 
        details: error.message 
      }), { status: 500 });
    }
  }

  // Handle GET requests for fetching rooms
  else if (request.method === 'GET') {
    try {
      // Get rooms where user is member
      const roomsQuery = `
        SELECT r.*, u.id as ownerId, u.name as ownerName, u.email as ownerEmail, u.image as ownerImage
        FROM PlanningRoom r
        LEFT JOIN User u ON r.ownerId = u.id
        INNER JOIN RoomMember rm ON r.id = rm.roomId
        WHERE rm.userId = ?
      `;
      const roomsResult = await db.prepare(roomsQuery).bind(userId).all();

      if (!roomsResult.results) {
        return new Response(JSON.stringify({ rooms: [] }), { status: 200 });
      }

      return new Response(JSON.stringify({ 
        rooms: roomsResult.results 
      }), { status: 200 });
    } catch (error: any) {
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch rooms', 
        details: error.message 
      }), { status: 500 });
    }
  }

  // Handle unsupported methods
  else {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }
};

// Helper: parse cookies
function getCookie(request: Request, name: string) {
  const value = `; ${request.headers.get('cookie') || ''}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
  return null;
}

export const onRequestPost = async ({ request, env }: { request: Request, env: any }) => {
  const db = env.DB;
  const requestData = await request.json();
  const { name, description, id: providedId } = requestData;
  
  // Extract ownerId from JWT if not provided
  let { ownerId } = requestData;
  
  // If ownerId is not provided, get it from JWT token
  if (!ownerId) {
    try {
      const cookie = getCookie(request, 'auth_token');
      if (!cookie) throw new Error('No token cookie');
      
      const secret = env.JWT_SECRET || "Zq83vN!@uXP4w$Kt9sLrB^AmE5cG1dYz"; // Use hardcoded secret as fallback
      if (!secret) throw new Error('No JWT_SECRET in env');
      
      const parts = cookie.split('.');
      if (parts.length < 2) throw new Error('Malformed JWT');
      
      const payload = JSON.parse(atob(parts[1]));
      ownerId = payload.sub;
      
      console.log('[POST /api/rooms] Extracted ownerId from JWT:', ownerId);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[POST /api/rooms] Failed to extract ownerId from JWT:', errorMsg);
      return new Response(JSON.stringify({ error: 'Missing ownerId and could not extract from JWT', details: errorMsg }), { status: 400 });
    }
  }
  
  if (!name || !ownerId) {
    return new Response(JSON.stringify({ error: 'Missing name or ownerId', received: { name, ownerId } }), { status: 400 });
  }
  
  const id = providedId || generateUUID();
  const now = new Date().toISOString();

  // Check if room already exists
  const existing = await db.prepare('SELECT id FROM PlanningRoom WHERE id = ?').bind(id).first();
  if (existing) {
    return new Response(JSON.stringify({ error: 'Room already exists', id }), { status: 409 });
  }

  await db.prepare(`
    INSERT INTO PlanningRoom (id, name, description, ownerId, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, name, description || '', ownerId, now, now).run();

  return new Response(JSON.stringify({ id, name, description, ownerId, createdAt: now, updatedAt: now }), { status: 201 });
};

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
} 