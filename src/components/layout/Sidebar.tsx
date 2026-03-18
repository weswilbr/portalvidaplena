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
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Leads", href: "/dashboard/leads" },
  { icon: Target, label: "Metas Ouro Elite", href: "/dashboard/goals" },
  { icon: Calendar, label: "Agenda Dinâmica", href: "/dashboard/agenda" },
  { icon: BarChart3, label: "Métricas", href: "/dashboard/metrics" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside 
      className={cn(
        "flex flex-col h-screen bg-card border-r border-border transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
            Vida Plena
          </span>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon size={20} className={cn(isActive ? "text-white" : "group-hover:scale-110 transition-transform")} />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <div className={cn(
          "bg-secondary rounded-2xl p-4 flex items-center gap-3",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-sm font-semibold truncate">Empreendedor 4Life</span>
              <span className="text-xs text-muted-foreground">Ouro Elite</span>
            </div>
          )}
          <button className="p-2 rounded-lg hover:bg-background text-muted-foreground hover:text-destructive transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
