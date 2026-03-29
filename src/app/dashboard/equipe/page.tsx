import { getSession } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import EquipeClient from "@/components/equipe/EquipeClient";

export default async function EquipePage() {
  const user = await getSession();

  // Somente ADMIN pode acessar a gestão de equipe
  if (!user || user.role !== "ADMIN") {
    redirect("/dashboard/vendas");
  }

  return <EquipeClient user={user} />;
}
