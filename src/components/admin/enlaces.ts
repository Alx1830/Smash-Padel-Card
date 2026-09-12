import { UsersRound, Newspaper, ShieldCheck, Link2, BellRing } from "lucide-react";

/**
 * Las herramientas del panel de administración, en un solo lugar.
 *
 * Vivían repetidas dentro del menú del avatar. Ahora las usan la barra lateral
 * del computador y el cajón que se desliza en el celular, así que agregar una
 * herramienta nueva es agregar una línea acá y nada más.
 */
export const ENLACES_ADMIN = [
  { href: "/dashboard/users",                label: "Usuarios",          Icon: UsersRound },
  { href: "/dashboard/admin/feed",           label: "Feed post",         Icon: Newspaper },
  { href: "/dashboard/admin/aprobaciones",   label: "Cartas por aprobar", Icon: ShieldCheck },
  { href: "/dashboard/admin/mapeo",          label: "Mapeo TCG",         Icon: Link2 },
  { href: "/dashboard/admin/notificaciones", label: "Enviar aviso",      Icon: BellRing },
] as const;

/** El azul de las herramientas de admin, distinto del verde de la app. */
export const ADMIN_COLOR = "#4ff0ff";
