import LeadsClient from "@/components/leads/LeadsClient";
import { getSession } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leads (Negócio) | Gestão Vida Plena",
  description: "Gerencie prospectos para formação de equipe Vida Plena.",
};

export default async function LeadsPage() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  return <LeadsClient user={user} />;
}
