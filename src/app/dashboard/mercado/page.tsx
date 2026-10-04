import { redirect } from "next/navigation";

// Quedaba un "mercado de artículos de pádel" de otro proyecto. El market de
// cartas vive en /dashboard/market.
export default function DashboardMercado() {
  redirect("/dashboard/market");
}
