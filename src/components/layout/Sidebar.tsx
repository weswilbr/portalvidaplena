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
  Menu,
  X,
  Sun,
  Palette,
  Sparkles,
  Bot,
  Zap,
  Briefcase,
  Crown
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";

const ALL_MENU_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", roles: ["ADMIN"] },
  { icon: Users, label: "Equipe", href: "/dashboard/equipe", roles: ["ADMIN"] },
  { icon: UserPlus, label: "Leads (Negócio)", href: "/dashboard/leads", roles: ["ADMIN", "SELLER"] },
  { icon: ShoppingBag, label: "Vendas (Produtos)", href: "/dashboard/vendas", roles: ["ADMIN", "SELLER"] },
  { icon: Bot, label: "Bot WhatsApp", href: "/dashboard/bot", roles: ["ADMIN"] },
  { icon: BarChart3, label: "Metas Ouro Elite", href: "/dashboard/goals", roles: ["ADMIN"] },
  { icon: Calendar, label: "Agenda", href: "/dashboard/agenda", roles: ["ADMIN", "SELLER"] },
];

export function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [theme, setTheme] = useState<string>("default");

  // Load and Apply Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("portal-theme") || "default";
    setTheme(savedTheme);
    document.body.className = savedTheme === "default" ? "" : savedTheme;
  }, []);

  const changeTheme = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("portal-theme", newTheme);
    document.body.className = newTheme === "default" ? "" : newTheme;
  };

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const menuItems = ALL_MENU_ITEMS.filter(item => 
    !item.roles || (role && item.roles.includes(role))
  );

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* Botão Sanduíche Flutuante (Apenas Mobile) */}
      <button 
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-6 right-6 z-40 p-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100/50 text-indigo-600 hover:scale-105 active:scale-95 transition-all"
      >
        <Menu size={24} />
      </button>

      {/* Fundo Escuro Mobile */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 animate-in fade-in"
          onClick={() => setIsMobileOpen(false)}
        ></div>
      )}

      <aside 
        className={cn(
          "fixed md:relative flex flex-col h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 shadow-2xl md:shadow-sm z-50 overflow-y-auto custom-scrollbar",
          isCollapsed && !isMobileOpen ? "md:w-20" : "w-72",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-6 pt-8 flex items-center justify-between">
          {(!isCollapsed || isMobileOpen) && (
            <span className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent italic tracking-tight">
              Vida Plena
            </span>
          )}
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-2 rounded-xl bg-slate-50 text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent"
            >
              <X size={18} />
            </button>
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:block p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-all border border-slate-100 dark:border-slate-700"
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  "flex items-center gap-3 p-4 md:p-3.5 rounded-2xl transition-all duration-300 group font-bold relative overflow-hidden",
                  isActive 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                    : "hover:bg-indigo-50 dark:hover:bg-indigo-900/10 text-slate-500 hover:text-indigo-600"
                )}
              >
                <item.icon size={isActive ? 22 : 20} className={cn("shrink-0", isActive ? "scale-110" : "group-hover:scale-110 transition-transform")} />
                {(!isCollapsed || isMobileOpen) && <span className="text-[15px] md:text-sm tracking-tight">{item.label}</span>}
                
                {isActive && (
                   <div className="absolute right-0 top-0 h-full w-1.5 bg-white/20"></div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 md:px-4 py-2 space-y-3">
          {(!isCollapsed || isMobileOpen) && (
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 px-1">Visual do Portal</p>
          )}
          <div className={cn(
             "grid gap-2",
             (isCollapsed && !isMobileOpen) ? "grid-cols-1" : "grid-cols-4"
          )}>
            <button 
              onClick={() => changeTheme("default")}
              className={cn(
                "flex items-center justify-center p-3 rounded-2xl transition-all border",
                theme === "default" ? "bg-indigo-600 text-white border-indigo-600 shadow-lg" : "bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-800 hover:bg-slate-50"
              )}
              title="Clássico Moderno"
            >
              <Sun size={18} />
            </button>
            <button 
              onClick={() => changeTheme("theme-navy")}
              className={cn(
                "flex items-center justify-center p-3 rounded-2xl transition-all border",
                theme === "theme-navy" ? "bg-blue-800 text-white border-blue-700 shadow-lg shadow-blue-900/50" : "bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-800 hover:bg-slate-50"
              )}
              title="Marinho Executivo"
            >
              <Briefcase size={18} />
            </button>
            <button 
              onClick={() => changeTheme("theme-gold")}
              className={cn(
                "flex items-center justify-center p-3 rounded-2xl transition-all border",
                theme === "theme-gold" ? "bg-amber-600 text-black border-amber-500 shadow-lg shadow-amber-600/30" : "bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-800 hover:bg-slate-50"
              )}
              title="Ouro Royal"
            >
              <Crown size={18} />
            </button>
            <button 
              onClick={() => changeTheme("theme-neon")}
              className={cn(
                "flex items-center justify-center p-3 rounded-2xl transition-all border",
                theme === "theme-neon" ? "bg-fuchsia-600 text-white border-fuchsia-500 shadow-lg shadow-fuchsia-500/40" : "bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-800 hover:bg-slate-50"
              )}
              title="Neon Cyber"
            >
              <Zap size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 md:p-4">
          <div className={cn(
            "bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-5 md:p-4 flex items-center gap-3 border border-slate-100 dark:border-slate-800 shadow-inner",
            (isCollapsed && !isMobileOpen) ? "justify-center" : "justify-between"
          )}>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col truncate">
                <span className="text-[10px] md:text-xs font-black text-indigo-400 uppercase tracking-[0.2em] leading-none mb-1.5">{role === "ADMIN" ? "Administrador" : "Equipe"}</span>
                <span className="text-sm md:text-sm font-black text-slate-900 dark:text-white truncate tracking-tight">Modo Mobile</span>
              </div>
            )}
            <button 
              onClick={handleLogout}
              className="p-3 md:p-2.5 rounded-2xl hover:bg-white dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 hover:shadow-sm hover:border-slate-200 transition-all border border-transparent"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
