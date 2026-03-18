import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vida Plena - 4Life Ouro Elite",
  description: "Sistema de gestão para empreendedor 4Life",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased`}>
        <div className="flex bg-background">
          <Sidebar />
          <main className="flex-1 h-screen overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
