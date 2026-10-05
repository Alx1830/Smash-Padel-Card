/**
 * Los 100 logros del perfil, ordenados del más fácil (1) al más difícil (100).
 *
 * Cada uno se gana con un número real: los de la base salen de
 * `perfil_metricas()` y los de sets completos se calculan en el servidor con
 * SET_CARD_COUNT. Nada de intercambios: son privados.
 *
 * La insignia de cada logro es única: el marco lo da el nivel (bronce → leyenda),
 * el color del interior la categoría y el dibujo el icono.
 */
import type { LucideIcon } from "lucide-react";
import {
  Footprints, UserRoundCheck, Star, Heart, UserPlus, Eye, Tag, Gamepad2, MessageCircle, Vote,
  Layers, Compass, Swords, FolderHeart, Shuffle, Sparkle, CalendarDays, GalleryHorizontal, ListChecks, Hand,
  BadgeDollarSign, ShoppingBag, Users, Map, Languages,
  Package, Award, Store, Copy, CalendarCheck, MessagesSquare, ListTodo, Shield, Gauge, Boxes,
  Brain, Repeat, Fingerprint, UsersRound, Network, HandCoins, Gem, Palette, Library, Frame,
  FolderKanban, WandSparkles, Megaphone, Archive, BadgeCheck,
  Hourglass, Coins, Medal, Globe, Warehouse, BookOpen, Zap, Joystick, Radio, Sword,
  ShoppingCart, MessageSquareQuote, CircleCheckBig, ScanSearch, Flame, Container, CalendarRange, Mountain, Building2, Banknote,
  Target, Orbit, HeartHandshake, Share2, BadgePlus,
  ShieldCheck, Infinity as InfinityIcon, PartyPopper, Landmark, Castle, Rocket, Satellite, Diamond, Factory, Trophy,
  Newspaper, Ribbon, Pyramid, Telescope, Vault, History,
  Flag, Dna, Sun, Anchor, Earth, Atom, Milestone, Sparkles,
} from "lucide-react";

export type Metrica =
  | "cartas_total" | "cartas_unicas" | "sets_tocados" | "variantes" | "holos" | "idiomas" | "copias_max"
  | "wishlist" | "destacadas" | "decks" | "mis_sets" | "seguidores" | "siguiendo"
  | "publicaciones" | "en_venta" | "ventas" | "resenas_5" | "compras"
  | "juego_mejor" | "juego_partidas" | "comentarios" | "votos" | "dias_cuenta"
  | "sets_completos" | "sets_mitad" | "set_mejor_pct" | "perfil_completo";

export type Metricas = Record<Metrica, number>;

export type Categoria = "coleccion" | "mercado" | "social" | "juego" | "comunidad" | "antiguedad";

export type Nivel = "bronce" | "plata" | "oro" | "platino" | "leyenda";

export interface Logro {
  id: string;
  /** 1 = el más fácil, 100 = el más difícil */
  orden: number;
  nombre: string;
  descripcion: string;
  metrica: Metrica;
  umbral: number;
  categoria: Categoria;
  icono: LucideIcon;
}

export const CATEGORIA_COLOR: Record<Categoria, string> = {
  coleccion:  "#2ee6c1",
  mercado:    "#d6ff3d",
  social:     "#5cc8f0",
  juego:      "#a78bfa",
  comunidad:  "#ff4fd8",
  antiguedad: "#ffc94d",
};

export const CATEGORIA_NOMBRE: Record<Categoria, string> = {
  coleccion:  "Colección",
  mercado:    "Market",
  social:     "Social",
  juego:      "Minijuego",
  comunidad:  "Comunidad",
  antiguedad: "Antigüedad",
};

/** Colores del marco por nivel: [claro, oscuro] */
export const NIVEL_COLORES: Record<Nivel, [string, string]> = {
  bronce:  ["#e8a46a", "#8a4b1f"],
  plata:   ["#eef3f8", "#7d8a99"],
  oro:     ["#ffe27a", "#b8860b"],
  platino: ["#9ffcff", "#2ee6c1"],
  leyenda: ["#ff4fd8", "#a78bfa"],
};

export const NIVEL_NOMBRE: Record<Nivel, string> = {
  bronce: "Bronce", plata: "Plata", oro: "Oro", platino: "Platino", leyenda: "Leyenda",
};

export function nivelDe(orden: number): Nivel {
  if (orden <= 25) return "bronce";
  if (orden <= 50) return "plata";
  if (orden <= 75) return "oro";
  if (orden <= 92) return "platino";
  return "leyenda";
}

type Def = [id: string, nombre: string, descripcion: string, metrica: Metrica, umbral: number, categoria: Categoria, icono: LucideIcon];

const DEFS: Def[] = [
  // ── Bronce ──────────────────────────────────────────────────────
  ["primer-paso",        "Primer paso",          "Registra tu primera carta",                         "cartas_total",    1,     "coleccion",  Footprints],
  ["cara-visible",       "Cara visible",         "Completa foto, portada y ciudad en tu perfil",      "perfil_completo", 1,     "social",     UserRoundCheck],
  ["vitrina",            "Vitrina",              "Destaca tu primera carta",                          "destacadas",      1,     "coleccion",  Star],
  ["lo-quiero",          "Lo quiero",            "Agrega una carta a tu wishlist",                    "wishlist",        1,     "coleccion",  Heart],
  ["primer-seguidor",    "Primer seguidor",      "Consigue tu primer seguidor",                       "seguidores",      1,     "social",     UserPlus],
  ["curioso",            "Curioso",              "Sigue a otro coleccionista",                        "siguiendo",       1,     "social",     Eye],
  ["a-la-venta",         "A la venta",           "Publica tu primera carta en el market",             "publicaciones",   1,     "mercado",    Tag],
  ["jugador-novato",     "Jugador novato",       "Juega una partida de Higher or Lower",              "juego_partidas",  1,     "juego",      Gamepad2],
  ["opinion",            "Opinión",              "Escribe tu primer comentario",                      "comentarios",     1,     "comunidad",  MessageCircle],
  ["tu-voto-cuenta",     "Tu voto cuenta",       "Vota en una encuesta",                              "votos",           1,     "comunidad",  Vote],
  ["punado",             "Puñado",               "Reúne 10 cartas",                                   "cartas_total",    10,    "coleccion",  Layers],
  ["explorador",         "Explorador",           "Ten cartas de 2 sets distintos",                    "sets_tocados",    2,     "coleccion",  Compass],
  ["arquitecto",         "Arquitecto",           "Publica tu primer deck",                            "decks",           1,     "coleccion",  Swords],
  ["curador",            "Curador",              "Crea tu primer set propio",                         "mis_sets",        1,     "coleccion",  FolderHeart],
  ["variedad",           "Variedad",             "Ten cartas en 2 variantes distintas",               "variantes",       2,     "coleccion",  Shuffle],
  ["brillo",             "Brillo",               "Consigue tu primera carta holo",                    "holos",           1,     "coleccion",  Sparkle],
  ["una-semana",         "Una semana",           "Lleva 7 días en FaceBinder",                        "dias_cuenta",     7,     "antiguedad", CalendarDays],
  ["vitrina-llena",      "Vitrina llena",        "Destaca 5 cartas",                                  "destacadas",      5,     "coleccion",  GalleryHorizontal],
  ["lista-de-deseos",    "Lista de deseos",      "Ten 10 cartas en tu wishlist",                      "wishlist",        10,    "coleccion",  ListChecks],
  ["mano-llena",         "Mano llena",           "Reúne 25 cartas",                                   "cartas_total",    25,    "coleccion",  Hand],
  ["primera-venta",      "Primera venta",        "Vende una carta y que el comprador la confirme",    "ventas",          1,     "mercado",    BadgeDollarSign],
  ["comprador-confiable","Comprador confiable",  "Confirma una compra en el market",                  "compras",         1,     "mercado",    ShoppingBag],
  ["pequeno-club",       "Pequeño club",         "Llega a 5 seguidores",                              "seguidores",      5,     "social",     Users],
  ["mapa-abierto",       "Mapa abierto",         "Ten cartas de 5 sets distintos",                    "sets_tocados",    5,     "coleccion",  Map],
  ["poliglota",          "Políglota",            "Ten cartas en 2 idiomas",                           "idiomas",         2,     "coleccion",  Languages],

  // ── Plata ───────────────────────────────────────────────────────
  ["medio-centenar",     "Medio centenar",       "Reúne 50 cartas",                                   "cartas_total",    50,    "coleccion",  Package],
  ["cinco-estrellas",    "Cinco estrellas",      "Recibe tu primera reseña de 5 estrellas",           "resenas_5",       1,     "mercado",    Award],
  ["mercader",           "Mercader",             "Publica 5 cartas en el market",                     "publicaciones",   5,     "mercado",    Store],
  ["repetida",           "Repetida",             "Ten 3 copias de una misma carta",                   "copias_max",      3,     "coleccion",  Copy],
  ["un-mes",             "Un mes",               "Lleva 30 días en FaceBinder",                       "dias_cuenta",     30,    "antiguedad", CalendarCheck],
  ["conversador",        "Conversador",          "Escribe 10 comentarios",                            "comentarios",     10,    "comunidad",  MessagesSquare],
  ["votante",            "Votante",              "Vota en 5 encuestas",                               "votos",           5,     "comunidad",  ListTodo],
  ["estratega",          "Estratega",            "Publica 3 decks",                                   "decks",           3,     "coleccion",  Shield],
  ["mitad-del-camino",   "Mitad del camino",     "Completa la mitad de un set",                       "sets_mitad",      1,     "coleccion",  Gauge],
  ["centenario",         "Centenario",           "Reúne 100 cartas",                                  "cartas_total",    100,   "coleccion",  Boxes],
  ["mente-rapida",       "Mente rápida",         "Haz 10 puntos en Higher or Lower",                  "juego_mejor",     10,    "juego",      Brain],
  ["constante",          "Constante",            "Juega 10 partidas de Higher or Lower",              "juego_partidas",  10,    "juego",      Repeat],
  ["cien-unicas",        "Cien únicas",          "Ten 100 cartas distintas",                          "cartas_unicas",   100,   "coleccion",  Fingerprint],
  ["diez-seguidores",    "Diez seguidores",      "Llega a 10 seguidores",                             "seguidores",      10,    "social",     UsersRound],
  ["red-social",         "Red social",           "Sigue a 10 coleccionistas",                         "siguiendo",       10,    "social",     Network],
  ["tres-ventas",        "Tres ventas",          "Completa 3 ventas confirmadas",                     "ventas",          3,     "mercado",    HandCoins],
  ["coleccion-brillante","Colección brillante",  "Reúne 10 cartas holo",                              "holos",           10,    "coleccion",  Gem],
  ["paleta-completa",    "Paleta completa",      "Ten cartas en 4 variantes distintas",               "variantes",       4,     "coleccion",  Palette],
  ["biblioteca",         "Biblioteca",           "Ten cartas de 10 sets distintos",                   "sets_tocados",    10,    "coleccion",  Library],
  ["exhibidor",          "Exhibidor",            "Destaca 10 cartas",                                 "destacadas",      10,    "coleccion",  Frame],
  ["curador-experto",    "Curador experto",      "Crea 3 sets propios",                               "mis_sets",        3,     "coleccion",  FolderKanban],
  ["grandes-deseos",     "Grandes deseos",       "Ten 50 cartas en tu wishlist",                      "wishlist",        50,    "coleccion",  WandSparkles],
  ["vitrina-activa",     "Vitrina activa",       "Ten 10 cartas en venta a la vez",                   "en_venta",        10,    "mercado",    Megaphone],
  ["archivo",            "Archivo",              "Reúne 250 cartas",                                  "cartas_total",    250,   "coleccion",  Archive],
  ["set-completo",       "Set completo",         "Completa tu primer set al 100 %",                   "sets_completos",  1,     "coleccion",  BadgeCheck],

  // ── Oro ─────────────────────────────────────────────────────────
  ["cien-dias",          "Cien días",            "Lleva 100 días en FaceBinder",                      "dias_cuenta",     100,   "antiguedad", Hourglass],
  ["diez-ventas",        "Diez ventas",          "Completa 10 ventas confirmadas",                    "ventas",          10,    "mercado",    Coins],
  ["reputacion",         "Reputación",           "Recibe 5 reseñas de 5 estrellas",                   "resenas_5",       5,     "mercado",    Medal],
  ["trotamundos",        "Trotamundos",          "Ten cartas en 3 idiomas",                           "idiomas",         3,     "coleccion",  Globe],
  ["bodega",             "Bodega",               "Reúne 500 cartas",                                  "cartas_total",    500,   "coleccion",  Warehouse],
  ["enciclopedia",       "Enciclopedia",         "Ten cartas de 25 sets distintos",                   "sets_tocados",    25,    "coleccion",  BookOpen],
  ["reflejos",           "Reflejos",             "Haz 25 puntos en Higher or Lower",                  "juego_mejor",     25,    "juego",      Zap],
  ["veterano-del-juego", "Veterano del juego",   "Juega 50 partidas de Higher or Lower",              "juego_partidas",  50,    "juego",      Joystick],
  ["en-el-aire",         "En el aire",           "Llega a 25 seguidores",                             "seguidores",      25,    "social",     Radio],
  ["arsenal",            "Arsenal",              "Publica 5 decks",                                   "decks",           5,     "coleccion",  Sword],
  ["cliente-fiel",       "Cliente fiel",         "Confirma 5 compras en el market",                   "compras",         5,     "mercado",    ShoppingCart],
  ["columnista",         "Columnista",           "Escribe 50 comentarios",                            "comentarios",     50,    "comunidad",  MessageSquareQuote],
  ["triple-corona",      "Triple completo",      "Completa 3 sets al 100 %",                          "sets_completos",  3,     "coleccion",  CircleCheckBig],
  ["ojo-de-lince",       "Ojo de lince",         "Ten 400 cartas distintas",                          "cartas_unicas",   400,   "coleccion",  ScanSearch],
  ["fiebre-holo",        "Fiebre holo",          "Reúne 50 cartas holo",                              "holos",           50,    "coleccion",  Flame],
  ["acumulador",         "Acumulador",           "Ten 10 copias de una misma carta",                  "copias_max",      10,    "coleccion",  Container],
  ["medio-ano",          "Medio año",            "Lleva 180 días en FaceBinder",                      "dias_cuenta",     180,   "antiguedad", CalendarRange],
  ["montana",            "Montaña de cartas",    "Reúne 1.000 cartas",                                "cartas_total",    1000,  "coleccion",  Mountain],
  ["tienda-abierta",     "Tienda abierta",       "Publica 50 cartas en el market",                    "publicaciones",   50,    "mercado",    Building2],
  ["negocio-serio",      "Negocio serio",        "Completa 25 ventas confirmadas",                    "ventas",          25,    "mercado",    Banknote],
  ["casi-perfecto",      "Casi perfecto",        "Lleva un set al 90 %",                              "set_mejor_pct",   90,    "coleccion",  Target],
  ["orbita",             "En órbita",            "Ten cartas de 50 sets distintos",                   "sets_tocados",    50,    "coleccion",  Orbit],
  ["querido",            "Querido",              "Llega a 50 seguidores",                             "seguidores",      50,    "social",     HeartHandshake],
  ["comunidad",          "Comunidad",            "Sigue a 50 coleccionistas",                         "siguiendo",       50,    "social",     Share2],
  ["diez-estrellas",     "Diez estrellas",       "Recibe 10 reseñas de 5 estrellas",                  "resenas_5",       10,    "mercado",    BadgePlus],

  // ── Platino ─────────────────────────────────────────────────────
  ["cinco-completos",    "Cinco completos",      "Completa 5 sets al 100 %",                          "sets_completos",  5,     "coleccion",  ShieldCheck],
  ["sin-limite",         "Sin límite",           "Ten 1.000 cartas distintas",                        "cartas_unicas",   1000,  "coleccion",  InfinityIcon],
  ["aniversario",        "Aniversario",          "Lleva un año en FaceBinder",                        "dias_cuenta",     365,   "antiguedad", PartyPopper],
  ["mercader-veterano",  "Mercader veterano",    "Completa 50 ventas confirmadas",                    "ventas",          50,    "mercado",    Landmark],
  ["fortaleza",          "Fortaleza",            "Reúne 2.000 cartas",                                "cartas_total",    2000,  "coleccion",  Castle],
  ["leyenda-del-juego",  "Leyenda del juego",    "Haz 50 puntos en Higher or Lower",                  "juego_mejor",     50,    "juego",      Rocket],
  ["senal-fuerte",       "Señal fuerte",         "Llega a 100 seguidores",                            "seguidores",      100,   "social",     Satellite],
  ["maestro-holo",       "Maestro holo",         "Reúne 200 cartas holo",                             "holos",           200,   "coleccion",  Diamond],
  ["fabrica",            "Fábrica",              "Ten 25 copias de una misma carta",                  "copias_max",      25,    "coleccion",  Factory],
  ["diez-completos",     "Diez completos",       "Completa 10 sets al 100 %",                         "sets_completos",  10,    "coleccion",  Trophy],
  ["cronista",           "Cronista",             "Escribe 200 comentarios",                           "comentarios",     200,   "comunidad",  Newspaper],
  ["excelencia",         "Excelencia",           "Recibe 25 reseñas de 5 estrellas",                  "resenas_5",       25,    "mercado",    Ribbon],
  ["piramide",           "Pirámide",             "Reúne 5.000 cartas",                                "cartas_total",    5000,  "coleccion",  Pyramid],
  ["astronomo",          "Astrónomo",            "Ten cartas de 100 sets distintos",                  "sets_tocados",    100,   "coleccion",  Telescope],
  ["boveda",             "Bóveda",               "Completa 100 ventas confirmadas",                   "ventas",          100,   "mercado",    Vault],
  ["dos-anos",           "Dos años",             "Lleva dos años en FaceBinder",                      "dias_cuenta",     730,   "antiguedad", History],
  ["veinticinco-juegos", "Incansable",           "Juega 250 partidas de Higher or Lower",             "juego_partidas",  250,   "juego",      Gamepad2],

  // ── Leyenda ─────────────────────────────────────────────────────
  ["veinte-completos",   "Veinte completos",     "Completa 20 sets al 100 %",                         "sets_completos",  20,    "coleccion",  Flag],
  ["adn-coleccionista",  "ADN coleccionista",    "Ten 3.000 cartas distintas",                        "cartas_unicas",   3000,  "coleccion",  Dna],
  ["icono",              "Ícono",                "Llega a 250 seguidores",                            "seguidores",      250,   "social",     Sun],
  ["leyenda-del-market", "Leyenda del market",   "Completa 250 ventas confirmadas",                   "ventas",          250,   "mercado",    Anchor],
  ["planeta",            "Planeta Pokémon",      "Reúne 10.000 cartas",                               "cartas_total",    10000, "coleccion",  Earth],
  ["cincuenta-completos","Cincuenta completos",  "Completa 50 sets al 100 %",                         "sets_completos",  50,    "coleccion",  Atom],
  ["fundador",           "Fundador",             "Lleva tres años en FaceBinder",                     "dias_cuenta",     1095,  "antiguedad", Milestone],
  ["maestro-pokemon",    "Maestro Pokémon",      "Completa 100 sets al 100 %",                        "sets_completos",  100,   "coleccion",  Sparkles],
];

export const LOGROS: Logro[] = DEFS.map(([id, nombre, descripcion, metrica, umbral, categoria, icono], i) => ({
  id, orden: i + 1, nombre, descripcion, metrica, umbral, categoria, icono,
}));

export interface LogroEstado {
  logro: Logro;
  ganado: boolean;
  valor: number;
  /** 0–1 */
  progreso: number;
}

export function calcularLogros(m: Metricas): LogroEstado[] {
  return LOGROS.map(logro => {
    const valor = m[logro.metrica] ?? 0;
    return { logro, valor, ganado: valor >= logro.umbral, progreso: Math.min(1, valor / logro.umbral) };
  });
}
