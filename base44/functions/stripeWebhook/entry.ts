import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET'));
    } catch (err) {
      console.error('Webhook signature verification failed', err);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const coins = parseInt(session.metadata?.coins || '0', 10);
      if (userId && coins > 0) {
        const targetUser = await base44.asServiceRole.entities.User.get(userId);
        await base44.asServiceRole.entities.User.update(userId, { coins: (targetUser.coins || 0) + coins });
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('stripeWebhook error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});