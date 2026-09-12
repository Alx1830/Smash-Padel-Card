"use client";

/**
 * La música del juego: una pista para jugar y otra para cuando se pierde.
 *
 * Las dos son elementos `<audio>` de verdad, puestos en la página por el
 * componente. La primera versión los creaba con `new Audio()` y no sonaba
 * nunca: el navegador solo deja reproducir audio en el instante mismo en que la
 * persona toca algo, y con un elemento que no está en el documento esa excepción
 * es más frágil. Un `<audio>` en la página, arrancado dentro del clic, es el
 * camino que todos los navegadores respetan.
 *
 * Los archivos se sirven desde el propio sitio (`/juego/`) y no desde el bucket:
 * el mismo origen evita cualquier discusión de permisos y el navegador los
 * guarda junto con la página.
 */

const LLAVE = "facebinder-juego-sonido";

let batalla: HTMLAudioElement | null = null;
let derrota: HTMLAudioElement | null = null;

/** El componente entrega sus dos elementos apenas se dibujan. */
export function registrarPistas(
  laBatalla: HTMLAudioElement | null,
  laDerrota: HTMLAudioElement | null,
) {
  batalla = laBatalla;
  derrota = laDerrota;
  if (batalla) { batalla.loop = true; batalla.volume = 0.38; }
  if (derrota) { derrota.volume = 0.24; }
}

/**
 * Intenta reproducir y responde si el navegador dejó.
 *
 * Un rechazo no es un error del juego: pasa con la pestaña silenciada o sin
 * permiso. Lo que no puede pasar es que falle sin que nadie se entere, que fue
 * justamente el problema.
 */
function intentar(a: HTMLAudioElement | null): Promise<boolean> {
  if (!a) return Promise.resolve(false);
  const intento = a.play();
  if (intento === undefined) return Promise.resolve(true);
  return intento.then(() => true).catch(() => false);
}

export const musica = {
  leerPreferencia(): boolean {
    try {
      return localStorage.getItem(LLAVE) !== "off";
    } catch {
      /* Ventana privada o almacenamiento bloqueado: se asume con sonido. */
      return true;
    }
  },

  guardarPreferencia(encendido: boolean) {
    try { localStorage.setItem(LLAVE, encendido ? "on" : "off"); } catch {}
  },

  /**
   * Se llama desde el clic mismo, antes de cualquier espera.
   *
   * El permiso del navegador dura apenas unos segundos desde que la persona
   * toca algo. Si la música arrancara al terminar de bajar las cartas, ese
   * permiso ya habría vencido. Acá también se despierta la pista de derrota
   * —suena en mudo y se pausa en el acto— para que después pueda sonar sola.
   *
   * Responde si el navegador dejó sonar la música.
   */
  async despertar(encendido: boolean): Promise<boolean> {
    if (derrota) {
      derrota.muted = true;
      await intentar(derrota);
      derrota.pause();
      derrota.currentTime = 0;
      derrota.muted = false;
    }
    if (!encendido || !batalla) return true;
    batalla.currentTime = 0;
    return intentar(batalla);
  },

  batalla(encendido: boolean) {
    if (derrota) { derrota.pause(); derrota.currentTime = 0; }
    if (!encendido || !batalla) return;
    intentar(batalla);
  },

  derrota(encendido: boolean) {
    batalla?.pause();
    if (!encendido || !derrota) return;
    derrota.currentTime = 0;
    intentar(derrota);
  },

  silencio() {
    batalla?.pause();
    if (derrota) { derrota.pause(); derrota.currentTime = 0; }
  },
};

/* ── El interruptor, como algo a lo que React se puede suscribir ─────────── */

/**
 * Guardar la preferencia en el estado obligaría a leerla desde un efecto, y en
 * este proyecto eso es un error de lint con razón: el valor no nace del render.
 * Con esto React se suscribe a un dato externo, que es lo que realmente es.
 *
 * En el servidor siempre responde "con sonido": no hay `localStorage` allá, y
 * las dos primeras pinturas tienen que coincidir.
 */
const oyentes = new Set<() => void>();
let encendido: boolean | null = null;

export const interruptor = {
  subscribe(avisar: () => void) {
    oyentes.add(avisar);
    return () => { oyentes.delete(avisar); };
  },
  leer(): boolean {
    if (encendido === null) encendido = musica.leerPreferencia();
    return encendido;
  },
  leerEnServidor(): boolean {
    return true;
  },
  cambiar(valor: boolean) {
    encendido = valor;
    musica.guardarPreferencia(valor);
    oyentes.forEach((avisar) => avisar());
  },
};
