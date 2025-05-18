export const onRequestGet = async (context: { request: Request, env: any, params: { token: string } }) => {
  const { request, env, params } = context;
  const { token } = params;

  if (!token) {
    return new Response(JSON.stringify({ error: 'Invalid or missing invite token' }), { status: 400 });
  }

  const baseUrl = env.NEXTAUTH_URL || env.VERCEL_URL || 'http://localhost:3000';

  try {
    const db = env.DB;
    if (!db) {
      console.error('[API GET Invite Token] D1 database (DB binding) not found');
      return new Response(JSON.stringify({ error: 'Database connection not available' }), { status: 500 });
    }

    const inviteQuery = 'SELECT id, planningRoomId, expiresAt, maxUses, usesCount, isActive FROM InviteTokens WHERE token = ?';
    const invite = await db.prepare(inviteQuery).bind(token).first();

    if (!invite) {
      console.log(`[API GET Invite Token] Token not found: ${token}`);
      return Response.redirect(new URL('/invite-invalid?error=not_found', baseUrl), 302);
    }

    if (invite.isActive !== 1) {
      console.log(`[API GET Invite Token] Token not active: ${token}`);
      return Response.redirect(new URL('/invite-invalid?error=not_active', baseUrl), 302);
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      console.log(`[API GET Invite Token] Token expired: ${token}`);
      return Response.redirect(new URL('/invite-invalid?error=expired', baseUrl), 302);
    }

    if (invite.maxUses !== null && invite.usesCount >= invite.maxUses) {
      console.log(`[API GET Invite Token] Token max uses reached: ${token}`);
      return Response.redirect(new URL('/invite-invalid?error=max_uses_reached', baseUrl), 302);
    }

    // Token is valid, redirect to join confirmation page
    const joinUrl = new URL('/join', baseUrl);
    joinUrl.searchParams.set('token', token);
    return Response.redirect(joinUrl.toString(), 302);

  } catch (error: any) {
    console.error('[API GET Invite Token] Error validating invite token:', error);
    return Response.redirect(new URL('/invite-invalid?error=server_error', baseUrl), 302);
  }
}; 