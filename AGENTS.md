<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Patrón de página

Toda página nueva se parece a las que ya existen. Antes de inventar un layout,
copiar el de `src/app/dashboard/admin/aprobaciones/page.tsx` o el de
`src/app/dashboard/market/page.tsx`, que son la referencia.

## Estructura

```
<div className="xx-page">      fondo #05070d, padding 40px 24px (28px 16px en móvil)
  <div className="xx-wrap">    max-width 1400px, margin 0 auto
    cabecera                   antetítulo + h1 + bajada
    filtros / pestañas         píldoras redondas
    grilla                     .xx-grid
```

La cabecera lleva siempre las tres piezas, en este orden:

1. **Antetítulo**: `MONO`, 11px, `letter-spacing: 0.22em`, mayúsculas, color
   `#2ee6c1`, precedido de una rayita de 22×1px del mismo color.
2. **Título**: `DISP`, `clamp(22px, 4vw, 32px)` para que baje solo en móvil.
3. **Bajada**: `MONO`, 11px, color `#7a8298`.

## Grilla de cartas

Seis columnas en pantalla grande y **siempre dos en el celular** — nunca una.
Los saltos son estos, y se escriben con clases, no con estilos en línea:

```css
.xx-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 1500px) { .xx-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
@media (max-width: 1240px) { .xx-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 1023px) { .xx-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width:  767px) { .xx-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } }
```

`minmax(0, 1fr)` y nunca `1fr` a secas: con `1fr` la columna no baja del ancho de
su contenido y la grilla desborda el celular.

## Tarjeta de carta

- Imagen con `aspectRatio: "5 / 7"`, `objectFit: cover`, `loading="lazy"` y
  `decoding="async"`.
- Radio 12px, borde `1px solid rgba(255,255,255,0.07)`, fondo
  `rgba(255,255,255,0.02)`.
- Texto compacto: nombre 11px, set 9px, variante 8px, todo en `MONO` y con
  `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` — en dos
  columnas no hay lugar para que un nombre largo rompa la tarjeta.
- Acciones abajo, empujadas con `margin-top: auto` para que todas las tarjetas
  terminen alineadas. La acción principal lleva texto; la secundaria, solo icono.

## Detalles que se repiten

- Iconos: `lucide-react`, nunca emojis.
- Tipografías por variable: `var(--font-jetbrains)` (`MONO`) para todo lo que sea
  dato o etiqueta, `var(--font-archivo)` (`DISP`) para títulos.
- Paleta: fondo `#05070d`, superficie `rgba(255,255,255,0.02)`, acento `#2ee6c1`,
  acento secundario `#d6ff3d`, error `#ff5d5d`, textos `#f5f7fb` / `#c9cfdd` /
  `#7a8298`.
- Estado vacío: caja con borde punteado, icono de lucide y una línea explicando
  qué hacer.
