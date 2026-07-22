/** Convierte el nombre de un set en un slug para la URL pública [usuario]/[slug]. */
export function slugifySetName(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // quita acentos
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "set"
  );
}
