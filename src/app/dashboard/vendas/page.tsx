import VendasClient from "@/components/vendas/VendasClient";
import { getSession } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vendas | Gestão de Tráfego Vida Plena",
  description: "Gerencie suas vendas de produtos Vida Plena em tempo real.",
};

export default async function VendasPage() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  return <VendasClient user={user} />;
}
