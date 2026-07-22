import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, full_name } = await req.json();
    if (!email) return Response.json({ error: 'Missing email' }, { status: 400 });

    const name = full_name || 'Champion';
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: 'Welcome to EvoClash!',
      body: `Hi ${name},\n\nWelcome to EvoClash! Your legendary creature collection journey starts now.\n\nBuild your deck, evolve your creatures, and battle your way up the ranks.\n\nSee you on the battlefield!\n\n— The EvoClash Team`,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});