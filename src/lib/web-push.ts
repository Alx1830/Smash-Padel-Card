import webpush from 'web-push';

const vapidEmail = process.env.VAPID_EMAIL!;
webpush.setVapidDetails(
  vapidEmail.startsWith('mailto:') ? vapidEmail : `mailto:${vapidEmail}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export { webpush };
