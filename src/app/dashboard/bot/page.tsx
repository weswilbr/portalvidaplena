import { getSession } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import BotConfigClient from "@/components/bot/BotConfigClient";

export default async function BotPage() {
  const user = await getSession();

  // Somente ADMIN pode configurar o bot
  if (!user || user.role !== "ADMIN") {
    redirect("/dashboard/vendas");
  }

  return <BotConfigClient />;
}
