import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { getSession } from "@/app/actions/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Projeto Vida Plena",
  description: "Gerencie seu sucesso comercial e leads da Vida Plena com o Novo CRM VIP.",
  openGraph: {
    title: "Projeto Vida Plena",
    description: "Sistema de Gestão Comercial e CRM - Novo Portal Vida Plena",
    type: "website",
    locale: "pt_BR",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vida Plena",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4f46e5",
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
          <main className="flex-1 h-screen overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 pt-14 md:pt-0 pb-20 md:pb-0">
            {children}
          </main>
          {user && <BottomNav role={user.role} />}
        </div>
      </body>
    </html>
  );
}
