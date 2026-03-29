import DashboardClient from "@/components/dashboard/DashboardClient";
import { getSession } from "@/app/actions/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  // Se for Vendedor, redireciona direto para a parte de vendas
  if (user.role === "SELLER") {
    redirect("/dashboard/vendas");
  }

  // Admin vê o dashboard geral
  return <DashboardClient />;
}
