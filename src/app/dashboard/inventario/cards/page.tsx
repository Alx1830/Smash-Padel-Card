import { redirect } from "next/navigation";

// Página huérfana que al entrar cargaba los 194 sets enteros (riesgo de quedarse
// sin memoria en iOS). Nada enlazaba aquí; el inventario es /dashboard/inventario.
export default function InventarioCards() {
  redirect("/dashboard/inventario");
}
