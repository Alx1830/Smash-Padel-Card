import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { webpush } from '@/lib/web-push';
import webpushLib from 'web-push';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface WebhookPayload {
  record: {
    follower_id: string;
    following_id: string;
    created_at: string;
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

  const { follower_id, following_id } = payload.record;
  console.log('[Follow Webhook] follower:', follower_id, '→ following:', following_id);

  // Fetch follower's profile to get their username/name
  const { data: follower } = await supabaseAdmin
    .from('players')
    .select('username, first_name, last_name')
    .eq('user_id', follower_id)
    .single();

  if (!follower) {
    console.error('[Follow Webhook] Follower profile not found:', follower_id);
    return NextResponse.json({ error: 'Follower not found' }, { status: 404 });
  }

  const followerDisplay = follower.first_name
    ? `${follower.first_name}${follower.last_name ? ' ' + follower.last_name : ''}`
    : follower.username;

  const profileUrl = `/${follower.username}`;

  const { error: insertError } = await supabaseAdmin.from('notifications').insert({
    user_id: following_id,
    type: 'new_follower',
    title: '¡Tienes un nuevo seguidor!',
    body: `${followerDisplay} te está siguiendo`,
    data: { follower_id, follower_username: follower.username, url: profileUrl },
  });

  if (insertError) {
    console.error('[Follow Webhook] Insert notification error:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  console.log('[Follow Webhook] Notification inserted for user:', following_id);

  // Push notification
  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', following_id);

  if (!subscriptions?.length) {
    return NextResponse.json({ ok: true, pushed: 0 });
  }

  const pushPayload = JSON.stringify({
    title: '¡Tienes un nuevo seguidor!',
    body: `${followerDisplay} te está siguiendo`,
    icon: '/icon-512.webp',
    badge: '/favicon-32.png',
    data: { url: profileUrl },
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          pushPayload,
          { TTL: 86400, urgency: 'high' }
        );
      } catch (err: unknown) {
        const pushError = err as webpushLib.WebPushError;
        if (pushError?.statusCode === 410 || pushError?.statusCode === 404) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
        throw err;
      }
    })
  );

  const pushed = results.filter(r => r.status === 'fulfilled').length;
  console.log('[Follow Webhook] Push results:', pushed, '/', subscriptions.length, 'sent');

  return NextResponse.json({ ok: true, pushed });
}
