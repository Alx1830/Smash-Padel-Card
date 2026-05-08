import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { webpush } from '@/lib/web-push';
import webpushLib from 'web-push';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[Webhook] SUPABASE_SERVICE_ROLE_KEY is not set — notifications will fail RLS');
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface WebhookPayload {
  record: {
    card_id: string | number;
    set_id: string;
    version?: string;
    user_id: string;
    card_name?: string;
  };
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret');
  if (secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let payload: WebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[Webhook] Payload received:', JSON.stringify(payload.record));

  const { card_id, set_id, user_id: sellerId, card_name } = payload.record;

  const cardLabel = card_name ?? 'Una carta de tu wishlist';

  // market_listings.card_id = número (ej: 12)
  // card_wishlist.card_id   = "012:Decidueye ex:Holofoil" (número con ceros + nombre + versión)
  // Buscamos todas las filas del set cuyo card_id empiece con el número formateado
  const cardNumPadded = String(card_id).padStart(3, '0');
  const cardIdPrefix = `${cardNumPadded}:`;

  console.log('[Webhook] Looking for wishlist matches:', { cardIdPrefix, set_id, sellerId });

  const { data: wishlistRows, error: wishlistError } = await supabaseAdmin
    .from('card_wishlist')
    .select('user_id, card_id')
    .eq('set_id', set_id)
    .like('card_id', `${cardIdPrefix}%`)
    .neq('user_id', sellerId);

  if (wishlistError) {
    console.error('[Webhook] Wishlist query error:', wishlistError);
    return NextResponse.json({ error: wishlistError.message }, { status: 500 });
  }

  console.log('[Webhook] Wishlist users found:', wishlistRows?.length ?? 0);

  if (!wishlistRows?.length) {
    return NextResponse.json({ ok: true, notified: 0, reason: 'no_wishlist_matches' });
  }

  // Extraer nombre de carta del card_id de wishlist: "012:Decidueye ex:Holofoil" → "Decidueye ex"
  const parsedCardName = wishlistRows[0].card_id.split(':')[1] ?? card_name ?? 'Una carta de tu wishlist';
  const marketUrl = `/market?card=${encodeURIComponent(parsedCardName)}`;

  const userIds = wishlistRows.map((r: { user_id: string }) => r.user_id);

  const notificationRows = userIds.map((uid: string) => ({
    user_id: uid,
    type: 'wishlist_available',
    title: '¡Carta disponible!',
    body: `${parsedCardName} está disponible en el market`,
    data: { card_id: String(card_id), set_id, card_name: parsedCardName, url: marketUrl },
  }));

  const { error: insertError } = await supabaseAdmin
    .from('notifications')
    .insert(notificationRows);

  if (insertError) {
    console.error('[Webhook] Insert notifications error:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  console.log('[Webhook] Notifications inserted for', userIds.length, 'users');

  // Push notifications — fire and forget to avoid webhook timeout
  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', userIds);

  if (!subscriptions?.length) {
    return NextResponse.json({ ok: true, notified: userIds.length, pushed: 0 });
  }

  const pushPayload = JSON.stringify({
    title: '¡Carta disponible!',
    body: `${cardLabel} está en el market`,
    icon: '/icon-512.webp',
    badge: '/favicon-32.png',
    data: { url: marketUrl },
  });

  // No awaiting — respond fast, push runs in background
  Promise.allSettled(
    subscriptions.map(async (sub: { user_id: string; endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          pushPayload
        );
      } catch (err: unknown) {
        const pushError = err as webpushLib.WebPushError;
        if (pushError?.statusCode === 410) {
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
        }
      }
    })
  ).catch((err) => console.error('[Webhook] Push error:', err));

  return NextResponse.json({ ok: true, notified: userIds.length, pushed: subscriptions.length });
}
