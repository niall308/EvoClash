import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.5.0';
import { COIN_PACKS } from '../../shared/coinPacks.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { packId, successUrl, cancelUrl } = await req.json();
    const pack = COIN_PACKS.find((p) => p.id === packId);
    if (!pack) return Response.json({ error: 'Invalid pack' }, { status: 400 });

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: pack.priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_id: user.id,
        coins: String(pack.coins),
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createCoinCheckout error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});