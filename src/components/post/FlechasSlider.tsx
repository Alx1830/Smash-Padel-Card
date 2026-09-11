"use client";

import { useEffect } from "react";

/**
 * Les pone flechas a los carruseles de una noticia.
 *
 * El carrusel en sí es HTML y CSS: una fila que se desliza con enganche. Anda
 * sin esto, y en el celular es incluso mejor sin flechas, porque se arrastra
 * con el dedo. Pero en el computador no siempre se nota que la fila sigue, así
 * que acá se le agregan dos botones.
 *
 * Se agregan desde el navegador y no en el HTML guardado a propósito: el cuerpo
 * de la nota es texto que escribió un admin, y meterle botones en la base
 * significaría guardar algo que no se puede editar desde el editor.
 */
export function FlechasSlider() {
  useEffect(() => {
    const sliders = document.querySelectorAll<HTMLElement>(".post-slider");
    const limpiezas: (() => void)[] = [];

    sliders.forEach((slider) => {
      const fila = slider.querySelector<HTMLElement>(".post-slider-fila");
      if (!fila || slider.querySelector(".post-slider-flecha")) return;

      const hacer = (clase: string, texto: string, signo: number) => {
        const b = document.createElement("button");
        b.className = `post-slider-flecha ${clase}`;
        b.type = "button";
        b.textContent = texto;
        b.setAttribute("aria-label", signo < 0 ? "Ver fotos anteriores" : "Ver más fotos");
        b.addEventListener("click", () => {
          fila.scrollBy({ left: signo * Math.round(fila.clientWidth * 0.85), behavior: "smooth" });
        });
        slider.appendChild(b);
        return b;
      };

      const izq = hacer("izq", "‹", -1);
      const der = hacer("der", "›", 1);

      /* Una flecha que no lleva a ningún lado confunde: se esconden en los
         extremos. El margen de 4px es para que el redondeo del navegador no
         deje la flecha derecha encendida cuando ya no queda nada. */
      const repintar = () => {
        izq.hidden = fila.scrollLeft <= 4;
        der.hidden = fila.scrollLeft + fila.clientWidth >= fila.scrollWidth - 4;
      };

      repintar();
      fila.addEventListener("scroll", repintar, { passive: true });
      window.addEventListener("resize", repintar);

      limpiezas.push(() => {
        fila.removeEventListener("scroll", repintar);
        window.removeEventListener("resize", repintar);
        izq.remove();
        der.remove();
      });
    });

    return () => limpiezas.forEach((f) => f());
  }, []);

  return null;
}
