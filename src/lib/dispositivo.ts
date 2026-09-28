/**
 * Qué equipo, sistema y navegador usa el visitante, leído del user agent.
 * Solo para el panel "En vivo": es orientativo, no sirve para decidir nada.
 */

export interface Dispositivo {
  dispositivo: "movil" | "tablet" | "escritorio";
  so: string;
  navegador: string;
}

export function leerDispositivo(): Dispositivo {
  const ua = navigator.userAgent;

  /* El iPad con iPadOS 13+ se presenta como un Mac: lo delata la pantalla táctil */
  const ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const iphone = /iPhone|iPod/.test(ua);
  const android = /Android/.test(ua);

  const dispositivo: Dispositivo["dispositivo"] =
    ipad || (android && !/Mobile/.test(ua)) || /Tablet/.test(ua) ? "tablet"
    : iphone || android || /Mobile/.test(ua) ? "movil"
    : "escritorio";

  let so = "Otro";
  const ios = ua.match(/OS (\d+)[_.](\d+)/);
  if (iphone || ipad) {
    so = `${ipad ? "iPadOS" : "iOS"}${ios ? ` ${ios[1]}` : ""}`;
    /* Safari en iPad no dice la versión del sistema; la de Safari la iguala */
    if (ipad && !ios) {
      const v = ua.match(/Version\/(\d+)/);
      if (v) so = `iPadOS ${v[1]}`;
    }
  } else if (android) {
    const v = ua.match(/Android (\d+)/);
    so = `Android${v ? ` ${v[1]}` : ""}`;
  } else if (/Windows NT/.test(ua)) so = "Windows";
  else if (/CrOS/.test(ua)) so = "ChromeOS";
  else if (/Macintosh/.test(ua)) so = "macOS";
  else if (/Linux/.test(ua)) so = "Linux";

  const version = (re: RegExp) => ua.match(re)?.[1];
  let navegador = "Otro";
  if (/Instagram/.test(ua)) navegador = "Instagram";
  else if (/FBAN|FBAV/.test(ua)) navegador = "Facebook";
  else if (/TikTok|musical_ly/.test(ua)) navegador = "TikTok";
  else if (/EdgA?\//.test(ua)) navegador = `Edge ${version(/EdgA?\/(\d+)/) ?? ""}`;
  else if (/OPR\/|Opera/.test(ua)) navegador = `Opera ${version(/OPR\/(\d+)/) ?? ""}`;
  else if (/SamsungBrowser/.test(ua)) navegador = `Samsung ${version(/SamsungBrowser\/(\d+)/) ?? ""}`;
  else if (/Firefox|FxiOS/.test(ua)) navegador = `Firefox ${version(/(?:Firefox|FxiOS)\/(\d+)/) ?? ""}`;
  else if (/CriOS/.test(ua)) navegador = `Chrome ${version(/CriOS\/(\d+)/) ?? ""}`;
  else if (/Chrome\//.test(ua)) navegador = `Chrome ${version(/Chrome\/(\d+)/) ?? ""}`;
  else if (/Safari\//.test(ua)) navegador = `Safari ${version(/Version\/(\d+)/) ?? ""}`;

  return { dispositivo, so, navegador: navegador.trim() };
}

/** Robots y navegadores automáticos: no cuentan como visita */
export function esRobot(): boolean {
  return navigator.webdriver === true
    || /bot|crawl|spider|slurp|lighthouse|headless|preview/i.test(navigator.userAgent);
}
