import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

export default async function handler(req: NextRequest) {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  const groupId = pathSegments[pathSegments.length - 2];

  if (!groupId || typeof groupId !== 'string') {
    return NextResponse.json({ error: 'Invalid or missing groupId' }, { status: 400 });
  }
  
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    
    if (!db) {
      console.error('[Activity API] D1 database (DB binding) not found');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Ensure Activity table exists (idempotent check)
    // This could be moved to a separate initialization step outside the request handler
    // for minor optimization, but is fine here for correctness.
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

    if (req.method === 'POST') {
      const activity = await req.json();
      
      // Log the received payload for debugging
      console.log('[API Activity POST] Received payload:', JSON.stringify(activity, null, 2));

      // Validate required fields from the incoming client payload
      if (!activity || !activity.id || !activity.type || !activity.userId || !activity.timestamp || !activity.context) {
        console.error('[API Activity POST] Invalid activity payload detected. Failing fields:',
          {
            hasId: !!activity?.id,
            hasType: !!activity?.type,
            hasUserId: !!activity?.userId,
            hasTimestamp: !!activity?.timestamp,
            hasContext: !!activity?.context
          });
        return NextResponse.json({ error: 'Invalid activity payload' }, { status: 400 });
      }
      
      const contextString = activity.context ? JSON.stringify(activity.context) : null;
      // Convert timestamp number to ISO string for createdAt TEXT column
      const createdAtString = new Date(activity.timestamp).toISOString(); 

      // Use actual column names: action, details, createdAt
      const insertQuery = `
        INSERT INTO Activity (id, groupId, userId, action, details, createdAt) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      await db.prepare(insertQuery).bind(
        activity.id,
        groupId, 
        activity.userId,
        activity.type,     // Frontend 'type' maps to DB 'action'
        contextString,     // Frontend 'context' maps to DB 'details'
        createdAtString    // Frontend 'timestamp' (number) maps to DB 'createdAt' (TEXT ISO string)
      ).run();
      
      return NextResponse.json({ success: true, activityId: activity.id }, { status: 201 });

    } else if (req.method === 'GET') {
      // Select using actual column names (action, details, createdAt) and alias them
      const result = await db.prepare(
        `SELECT a.id, 
                a.action as type, 
                a.createdAt as timestamp, 
                a.userId, 
                a.details as context, 
                u.name as userName, 
                u.email as userEmail, 
                u.image as userImage 
         FROM Activity a
         LEFT JOIN User u ON a.userId = u.id
         WHERE a.groupId = ?
         ORDER BY a.createdAt DESC -- Order by the actual timestamp column
         LIMIT 50`
      ).bind(groupId).all();
      
      // Process results (context parsing, timestamp potentially needs parsing if needed as Date object later)
      const activities = (result.results || []).map((act: any) => ({
        ...act,
        // Context is already aliased as context, parse if string
        details: typeof act.context === 'string' ? JSON.parse(act.context) : act.context,
        // Timestamp is aliased as timestamp, but original value is ISO string from createdAt
        // Convert to number (milliseconds since epoch) for consistency with frontend expectations
        timestamp: new Date(act.timestamp).getTime(), 
      }));
      
      return NextResponse.json({ activities });

    } else {
      return NextResponse.json({ error: `Method ${req.method} Not Allowed` }, { status: 405 });
    }
  } catch (e: any) {
    // Ensure detailed logging for both GET/POST errors
    console.error(`[Activity API ${req.method}] Error:`, e, e.cause);
    return NextResponse.json({ error: e.message || 'Internal Server Error', cause: e.cause ? String(e.cause) : undefined }, { status: 500 });
  }
} 