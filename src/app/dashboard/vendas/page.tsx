import VendasClient from "@/components/vendas/VendasClient";
import { getSession } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vendas | Projeto Vida Plena",
  description: "Gerencie suas vendas exclusivas no Projeto Vida Plena.",
  openGraph: {
     title: "Projeto Vida Plena",
     description: "Seu dashboard comercial oficial Vida Plena.",
  }
};

export default async function VendasPage() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  return <VendasClient user={user} />;
}
