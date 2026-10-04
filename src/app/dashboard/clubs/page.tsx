import { redirect } from "next/navigation";

// Era una copia vieja del inventario con otro encabezado.
export default function DashboardClubs() {
  redirect("/dashboard/inventario");
}
