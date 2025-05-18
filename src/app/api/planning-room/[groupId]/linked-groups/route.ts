import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest
) {
  try {
    // Extract groupId from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const groupId = pathParts[pathParts.indexOf('planning-room') + 1];
    
    // Get the search params from URL
    const searchParams = request.nextUrl.searchParams;
    const groupsParam = searchParams.get('groups');
    
    console.log(`[API] Fetching linked groups for ${groupId}`);
    
    // Respond with empty linked groups array
    // In a production application, you would query a database here
    return NextResponse.json({ linkedGroups: [] }, {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    });
    
  } catch (error) {
    console.error('[API] Error in linked-groups endpoint:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 