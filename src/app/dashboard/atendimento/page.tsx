import { getSession } from "@/app/actions/auth";
import ChatAtendimento from "@/components/chat/ChatAtendimento";
import { redirect } from "next/navigation";

export default async function AtendimentoPage() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  return <ChatAtendimento currentUser={user} />;
}
