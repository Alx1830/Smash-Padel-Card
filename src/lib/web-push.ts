import webpushLib from 'web-push';

let configurado = false;

function configurar(): typeof webpushLib {
  if (!configurado) {
    const vapidEmail = process.env.VAPID_EMAIL!;
    webpushLib.setVapidDetails(
      vapidEmail.startsWith('mailto:') ? vapidEmail : `mailto:${vapidEmail}`,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    configurado = true;
  }
  return webpushLib;
}

// Las credenciales se cargan en el primer uso, no al importar este archivo:
// durante el build las variables del Worker todavía no existen y hacerlo aquí
// arriba rompía la compilación en Cloudflare.
export const webpush = new Proxy(webpushLib, {
  get(_target, prop, receiver) {
    return Reflect.get(configurar(), prop, receiver);
  },
});
