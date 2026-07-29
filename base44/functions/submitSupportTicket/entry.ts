import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, description } = await req.json();
    if (!title || !description) {
      return Response.json({ error: 'Title and description are required' }, { status: 400 });
    }
    if (description.length > 500) {
      return Response.json({ error: 'Description must be under 500 characters' }, { status: 400 });
    }

    const body = `User Account Information:
Name: ${user.full_name || user.username || 'N/A'}
Email: ${user.email}
User ID: ${user.id}

Issue Description:
${description}`;

    await base44.integrations.Core.SendEmail({
      to: 'evo.clash1916@gmail.com',
      subject: `EvoClash Support ${title}`,
      body,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('submitSupportTicket error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}