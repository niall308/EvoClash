import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query } = await req.json();
    const q = (query || '').trim();
    if (!q) return Response.json({ error: 'Missing query' }, { status: 400 });

    let match = null;

    // Username lookup is case-insensitive since entity filters do exact matching.
    const allUsers = await base44.asServiceRole.entities.User.list(undefined, 1000);
    match = allUsers.find((u) => (u.username || '').toLowerCase() === q.toLowerCase());

    if (!match) {
      for (const field of ['friendCode', 'email']) {
        const results = await base44.asServiceRole.entities.User.filter({ [field]: q }, undefined, 1);
        if (results.length > 0) {
          match = results[0];
          break;
        }
      }
    }

    if (!match) return Response.json({ found: false });
    if (match.id === user.id) return Response.json({ error: 'You cannot add yourself' }, { status: 400 });

    return Response.json({
      found: true,
      id: match.id,
      username: match.username || match.full_name,
      rankPoints: match.rankPoints || 0,
    });
  } catch (error) {
    console.error('searchUser error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});