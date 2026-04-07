"use server";

import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const identifier = (formData.get("email") as string).toLowerCase().trim();
  const password = formData.get("password") as string;

  console.log("Prisma Available Models:", Object.getOwnPropertyNames(prisma).filter(k => !k.startsWith('_')));

  if (!(prisma as any).user) {
    return { success: false, error: "Tabela de usuários não encontrada no Prisma Client. Rode npx prisma generate." };
  }

  try {
    const user = await (prisma as any).user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier }
        ]
      },
    });

    if (!user) {
      return { success: false, error: "E-mail ou WhatsApp não cadastrado." };
    }

    const providedPassword = (password || "").trim();
    const storedPassword = (user.password || "").trim();

    if (storedPassword !== providedPassword) {
      return { success: false, error: "Senha incorreta. Tente novamente." };
    }

    // Define um cookie de sessão simples (sem maxAge, expira ao fechar o navegador)
    const cookieStore = await cookies();
    cookieStore.set("auth_token", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      // Removido maxAge para deslogar ao sair do navegador
    });

    // Inicia controle de carimbo de tempo para inatividade
    cookieStore.set("last_activity", Date.now().toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return { 
      success: true, 
      user: { id: user.id, name: user.name, role: user.role, mustChangePassword: user.mustChangePassword } 
    };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Erro interno no servidor ao tentar logar." };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  cookieStore.delete("last_activity");
  redirect("/login");
}

export async function getSession() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_token")?.value;

  if (!userId) return null;

  try {
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, mustChangePassword: true },
    });
    return user;
  } catch (e) {
    return null;
  }
}

export async function updateUserPassword(formData: FormData) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_token")?.value;

  if (!userId) return { success: false, error: "Usuário não autenticado." };

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;

  try {
    const user = await (prisma as any).user.findUnique({ where: { id: userId } });
    
    if (!user) return { success: false, error: "Usuário não encontrado." };

    const providedCurrent = (currentPassword || "").trim();
    const storedPassword = (user.password || "").trim();

    // Se o usuário já trocou a senha (mustChangePassword é false) e a senha atual não bate,
    // pode ser que ele tenha clicado duas vezes e na segunda a senha já tenha mudado na primeira.
    if (storedPassword !== providedCurrent) {
       if (!user.mustChangePassword) {
          return { success: true }; // Já atualizado anteriormente (clique duplo)
       }
       return { success: false, error: "Senha atual incorreta." };
    }

    await (prisma as any).user.update({
      where: { id: userId },
      data: { password: newPassword, mustChangePassword: false }
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: "Falha ao atualizar a senha." };
  }
}
