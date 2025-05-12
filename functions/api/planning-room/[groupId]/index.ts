export const onRequestGet = async ({ env, params }: { env: any, params: { groupId: string } }) => {
  const db = env.DB;
  const { groupId } = params;
  if (!groupId) {
    return new Response(JSON.stringify({ error: 'Missing groupId' }), { status: 400 });
  }
  const room = await db.prepare('SELECT * FROM PlanningRoom WHERE id = ?').bind(groupId).first();
  if (!room) {
    return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404 });
  }
  return new Response(JSON.stringify(room), { status: 200 });
}; 