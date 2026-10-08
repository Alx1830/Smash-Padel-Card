/**
 * Los 18 tipos de Pokémon: nombre en español y su color (sacado de los carteles de tipo de los juegos).
 * La clave es el nombre en inglés, que es como los guarda la base.
 */

export const TIPOS = [
  { id: "Normal",   nombre: "Normal",    color: "#C4C2BA" },
  { id: "Fire",     nombre: "Fuego",     color: "#E04010" },
  { id: "Water",    nombre: "Agua",      color: "#3890E8" },
  { id: "Grass",    nombre: "Planta",    color: "#60B040" },
  { id: "Electric", nombre: "Eléctrico", color: "#F0B828" },
  { id: "Ice",      nombre: "Hielo",     color: "#68D0F0" },
  { id: "Fighting", nombre: "Lucha",     color: "#7A3222" },
  { id: "Poison",   nombre: "Veneno",    color: "#904890" },
  { id: "Ground",   nombre: "Tierra",    color: "#C8A858" },
  { id: "Flying",   nombre: "Volador",   color: "#90A0E8" },
  { id: "Psychic",  nombre: "Psíquico",  color: "#E04880" },
  { id: "Bug",      nombre: "Bicho",     color: "#A8B828" },
  { id: "Rock",     nombre: "Roca",      color: "#B09858" },
  { id: "Ghost",    nombre: "Fantasma",  color: "#6060A8" },
  { id: "Dragon",   nombre: "Dragón",    color: "#7060D0" },
  { id: "Dark",     nombre: "Siniestro", color: "#4A3A32" },
  { id: "Steel",    nombre: "Acero",     color: "#B0B0C0" },
  { id: "Fairy",    nombre: "Hada",      color: "#F0B0F0" },
] as const;

export type TipoId = (typeof TIPOS)[number]["id"];
export const tipoDe = (id: string) => TIPOS.find(t => t.id === id);

/** Un Pokémon como lo entrega la base durante la partida: sin sus tipos */
export interface PokemonPublico {
  id: string;        // archivo de la ilustración, sin extensión ("charizard-mega-x")
  n: number;         // número de la Pokédex nacional
  nombre: string;
  forma: string | null;
  cantidad: 1 | 2;   // cuántos tipos tiene
}

/** Al terminar, el repaso de los que falló sí trae los tipos */
export interface PokemonRepaso extends Omit<PokemonPublico, "cantidad"> { tipos: TipoId[] }

/** Las ilustraciones viven en R2 (las sube scripts/pokedex/subir-ilustraciones-r2.mjs) */
export const ILUSTRACIONES = "https://pub-01b8e296fe944e688fd2100376d4af4a.r2.dev/pokedex";
export const urlIlustracion = (p: { id: string }) => `${ILUSTRACIONES}/${p.id}.webp`;
