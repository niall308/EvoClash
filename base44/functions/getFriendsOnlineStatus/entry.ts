import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

// Returns online/offline status for a list of friend user ids, based on lastSeenAt.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { userIds } = await req.json();
    if (!Array.isArray(userIds) || userIds.length === 0) return Response.json({ statuses: [] });

    const now = Date.now();
    const users = await Promise.all(
      userIds.map((id) => base44.asServiceRole.entities.User.filter({ id }, undefined, 1))
    );

    const statuses = userIds.map((id, i) => {
      const u = users[i]?.[0];
      const online = u?.lastSeenAt ? now - new Date(u.lastSeenAt).getTime() < ONLINE_WINDOW_MS : false;
      return { id, online };
    });

    return Response.json({ statuses });
  } catch (error) {
    console.error('getFriendsOnlineStatus error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});