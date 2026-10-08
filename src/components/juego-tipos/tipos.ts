/**
 * Los 18 tipos de Pokémon: nombre en español y su color de siempre.
 * La clave es el nombre en inglés, que es como los guarda la base.
 */

export const TIPOS = [
  { id: "Normal",   nombre: "Normal",    color: "#A8A77A" },
  { id: "Fire",     nombre: "Fuego",     color: "#EE8130" },
  { id: "Water",    nombre: "Agua",      color: "#6390F0" },
  { id: "Grass",    nombre: "Planta",    color: "#7AC74C" },
  { id: "Electric", nombre: "Eléctrico", color: "#F7D02C" },
  { id: "Ice",      nombre: "Hielo",     color: "#96D9D6" },
  { id: "Fighting", nombre: "Lucha",     color: "#C22E28" },
  { id: "Poison",   nombre: "Veneno",    color: "#A33EA1" },
  { id: "Ground",   nombre: "Tierra",    color: "#E2BF65" },
  { id: "Flying",   nombre: "Volador",   color: "#A98FF3" },
  { id: "Psychic",  nombre: "Psíquico",  color: "#F95587" },
  { id: "Bug",      nombre: "Bicho",     color: "#A6B91A" },
  { id: "Rock",     nombre: "Roca",      color: "#B6A136" },
  { id: "Ghost",    nombre: "Fantasma",  color: "#735797" },
  { id: "Dragon",   nombre: "Dragón",    color: "#6F35FC" },
  { id: "Dark",     nombre: "Siniestro", color: "#705746" },
  { id: "Steel",    nombre: "Acero",     color: "#B7B7CE" },
  { id: "Fairy",    nombre: "Hada",      color: "#D685AD" },
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
