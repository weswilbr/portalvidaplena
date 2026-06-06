import { getSession } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import KnowledgeClient from "@/components/knowledge/KnowledgeClient";
import { listKnowledge } from "@/app/actions/knowledge";

export default async function ConhecimentoPage() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") {
    redirect("/dashboard/atendimento");
  }
  const items = await listKnowledge();
  return <KnowledgeClient initialItems={items} />;
}
