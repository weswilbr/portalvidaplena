import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { getSession } from "@/app/actions/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vida Plena - Projeto Vida Plena",
  description: "Sistema de gestão para empreendedor Vida Plena",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSession();

  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased`}>
        <div className="flex bg-background">
          {user && <Sidebar role={user.role} userId={user.id} userName={user.name} />}
          <main className="flex-1 h-screen overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
