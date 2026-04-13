"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard,
  Users, 
  UserPlus,
  ShoppingBag,
  Menu,
  X,
  Plus,
  MessageCircle,
  BarChart3,
  Calendar
} from "lucide-react";
import { useState } from "react";

const MOBILE_MENU_ITEMS = [
  { icon: MessageCircle, label: "Atendimento", href: "/dashboard/atendimento", roles: ["ADMIN", "SELLER"] },
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", roles: ["ADMIN"] },
  { icon: Calendar, label: "Agenda", href: "/dashboard/agenda", roles: ["ADMIN", "SELLER"] },
];

export function BottomNav({ role }: { role?: string }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = MOBILE_MENU_ITEMS.filter(item => 
    !item.roles || (role && item.roles.includes(role))
  );

  if (pathname === "/login" || pathname === "/nova-senha" || pathname === "/") {
    return null;
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-lg border-b border-slate-100/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Vida Plena
            </span>
          </div>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2.5 rounded-xl bg-slate-50 text-indigo-600 active:scale-95 transition-all"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-xl animate-in slide-in-from-top duration-300">
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl transition-all font-bold",
                    isActive 
                      ? "bg-indigo-600 text-white" 
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <Link
              href="/dashboard/goals"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-4 rounded-2xl transition-all font-bold bg-slate-50 text-slate-600 hover:bg-slate-100"
            >
              <BarChart3 size={20} />
              <span>Metas</span>
            </Link>
            <Link
              href="/dashboard/agenda"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-4 rounded-2xl transition-all font-bold bg-slate-50 text-slate-600 hover:bg-slate-100"
            >
              <Calendar size={20} />
              <span>Agenda</span>
            </Link>
          </nav>
        </div>
      )}

      {/* Bottom Tab Bar - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-area-bottom">
        <div className="flex items-center justify-around py-2 px-2">
          {menuItems.slice(0, 4).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-2xl min-w-[64px] transition-all",
                  isActive 
                    ? "text-indigo-600 bg-indigo-50" 
                    : "text-slate-400"
                )}
              >
                <item.icon size={22} className={isActive ? "scale-110" : ""} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer for mobile bottom nav */}
      <div className="md:hidden h-20"></div>
    </>
  );
}
