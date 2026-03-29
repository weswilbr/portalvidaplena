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

    if (user.password !== password) {
      return { success: false, error: "Senha incorreta. Tente novamente." };
    }

    // Define um cookie de sessão simples
    const cookieStore = await cookies();
    cookieStore.set("auth_token", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 semana
      path: "/",
    });

    return { success: true, user: { id: user.id, name: user.name, role: user.role } };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Erro interno no servidor ao tentar logar." };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  redirect("/login");
}

export async function getSession() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_token")?.value;

  if (!userId) return null;

  try {
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });
    return user;
  } catch (e) {
    return null;
  }
}
