import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { username, profilePictureUrl } = await req.json();
    const trimmedUsername = typeof username === 'string' ? username.trim() : '';
    if (!trimmedUsername) return Response.json({ error: 'Username is required' }, { status: 400 });
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      return Response.json({ error: 'Username must be between 3 and 20 characters' }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      return Response.json({ error: 'Username can only contain letters, numbers, and underscores' }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.User.filter({ username: trimmedUsername });
    const taken = existing.find((u) => u.id !== user.id);
    if (taken) return Response.json({ error: 'That username is already taken' }, { status: 409 });

    const updateData = { username: trimmedUsername };
    if (typeof profilePictureUrl === 'string') updateData.profilePictureUrl = profilePictureUrl;

    await base44.asServiceRole.entities.User.update(user.id, updateData);

    return Response.json({ status: 'ok' });
  } catch (error) {
    console.error('updateProfile error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});