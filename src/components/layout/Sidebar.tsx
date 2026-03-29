"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BarChart3, 
  Users, 
  Target, 
  Calendar, 
  Settings, 
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  UserPlus,
  Bot
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";

const ALL_MENU_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", roles: ["ADMIN"] },
  { icon: Users, label: "Equipe", href: "/dashboard/equipe", roles: ["ADMIN"] },
  { icon: UserPlus, label: "Leads (Negócio)", href: "/dashboard/leads", roles: ["ADMIN"] },
  { icon: ShoppingBag, label: "Vendas (Produtos)", href: "/dashboard/vendas", roles: ["ADMIN", "SELLER"] },
  { icon: Bot, label: "Bot WhatsApp", href: "/dashboard/bot", roles: ["ADMIN"] },
  { icon: BarChart3, label: "Metas Ouro Elite", href: "/dashboard/goals", roles: ["ADMIN"] },
  { icon: Calendar, label: "Agenda", href: "/dashboard/agenda", roles: ["ADMIN", "SELLER"] },
];

export function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filtra itens baseados no role (vendedor vê apenas Vendas e Agenda)
  const menuItems = ALL_MENU_ITEMS.filter(item => 
    !item.roles || (role && item.roles.includes(role))
  );

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside 
      className={cn(
        "flex flex-col h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 shadow-sm",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <span className="text-xl font-black bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent italic">
            Vida Plena
          </span>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-all border border-slate-100 dark:border-slate-700"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 group font-bold relative overflow-hidden",
                isActive 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                  : "hover:bg-indigo-50 dark:hover:bg-indigo-900/10 text-slate-500 hover:text-indigo-600"
              )}
            >
              <item.icon size={20} className={cn("shrink-0", isActive ? "scale-110" : "group-hover:scale-110 transition-transform")} />
              {!isCollapsed && <span className="text-sm tracking-tight">{item.label}</span>}
              
              {isActive && (
                 <div className="absolute right-0 top-0 h-full w-1 bg-white/20"></div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <div className={cn(
          "bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-4 flex items-center gap-3 border border-slate-100 dark:border-slate-800",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{role === "ADMIN" ? "Administrador" : "Vendedor"}</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate">4Life Brasil</span>
            </div>
          )}
          <button 
            onClick={handleLogout}
            className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-all shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </aside>
  );
}
