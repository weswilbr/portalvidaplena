import LeadsClient from "@/components/leads/LeadsClient";
import { getSession } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leads (Negócio) | Gestão Vida Plena",
  description: "Gerencie prospectos para formação de equipe 4Life.",
};

export default async function LeadsPage() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  // Se for Vendedor, ele NÃO pode ver os leads de negócio (recrutamento)
  // Redireciona para onde ele tem permissão
  if (user.role === "SELLER") {
    redirect("/dashboard/vendas");
  }

  return <LeadsClient />;
}
