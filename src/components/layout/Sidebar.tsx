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
  Crown,
  Bell,
  Save,
  MessageCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";
import { getUserSettings, updateUserNotificationSettings } from "@/app/actions/users";

const ALL_MENU_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", roles: ["ADMIN"] },
  { icon: MessageCircle, label: "Atendimento", href: "/dashboard/atendimento", roles: ["ADMIN", "SELLER"] },
  { icon: Users, label: "Equipe", href: "/dashboard/equipe", roles: ["ADMIN"] },
  { icon: UserPlus, label: "Leads (Negócio)", href: "/dashboard/leads", roles: ["ADMIN", "SELLER"] },
  { icon: Bot, label: "Bot WhatsApp", href: "/dashboard/bot", roles: ["ADMIN"] },
  { icon: BarChart3, label: "Metas Vida Plena", href: "/dashboard/goals", roles: ["ADMIN"] },
  { icon: Calendar, label: "Agenda", href: "/dashboard/agenda", roles: ["ADMIN", "SELLER"] },
];

export function Sidebar({ role, userId, userName }: { role?: string, userId?: string, userName?: string }) {
  const pathname = usePathname();
  
  // Não mostra o menu em páginas de autenticação ou na home pública
  if (["/login", "/nova-senha", "/", "/contato"].includes(pathname)) {
    return null;
  }

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [theme, setTheme] = useState<string>("default");

  // Estados de Notificação
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [notifPhone, setNotifPhone] = useState("");
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifyNewMessages, setNotifyNewMessages] = useState(true);
  const [notifInterval, setNotifInterval] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Load and Apply Theme & Settings
  useEffect(() => {
    const savedTheme = localStorage.getItem("portal-theme") || "default";
    setTheme(savedTheme);
    document.body.className = savedTheme === "default" ? "" : savedTheme;

    // Puxa configs do usuário
    const loadSettings = async () => {
       if (userId) {
         try {
           const settings = await getUserSettings(userId);
           if (settings) {
              setNotifPhone(settings.notificationPhone || "");
              setNotifEnabled(settings.notificationsEnabled ?? true);
              setNotifyNewMessages(settings.notifyNewMessages ?? true);
              setNotifInterval(settings.notificationInterval ?? 0);
           }
         } catch(e) {}
       }
    };
    loadSettings();
  }, [userId]);

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
      <button 
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-6 right-6 z-40 p-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100/50 text-indigo-600 hover:scale-105 active:scale-95 transition-all"
      >
        <Menu size={24} />
      </button>

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
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent italic tracking-tight">
                Vida Plena
              </span>
              <img 
                src="https://flagcdn.com/br.svg" 
                alt="Operação Brasil" 
                title="Operação Brasil" 
                className="w-5 h-[14px] object-cover rounded-[2px] shadow-sm shadow-black/20" 
              />
            </div>
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

        <div className="px-4 py-2 mt-2">
            <button 
              onClick={() => {
                setIsAlertModalOpen(true);
              }}
              className={cn(
                "w-full flex items-center p-3.5 rounded-2xl border transition-all group overflow-hidden shadow-sm",
                notifEnabled 
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100" 
                  : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100",
                (isCollapsed && !isMobileOpen) ? "justify-center" : "justify-between"
              )}
              title="Alertas WhatsApp"
            >
              <div className="flex items-center gap-3">
                 <div className={cn(
                   "p-2 rounded-[1rem] shadow-sm flex items-center justify-center shrink-0", 
                   notifEnabled ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                 )}>
                   <Bell size={18} className={notifEnabled ? "animate-bounce" : ""} />
                 </div>
                 {(!isCollapsed || isMobileOpen) && (
                   <div className="flex flex-col items-start min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">WhatsApp</span>
                      <span className="text-xs font-bold truncate">{notifEnabled ? "Plantão Ativo" : "Alertas Off"}</span>
                   </div>
                 )}
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className={cn("w-2 h-2 rounded-full", notifEnabled ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300")}></div>
              )}
            </button>
        </div>

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
                <span className="text-[10px] md:text-xs font-black text-indigo-400 uppercase tracking-[0.2em] leading-none mb-1.5 font-bold">{role === "ADMIN" ? "Administrador" : "Equipe"}</span>
                <span className="text-sm md:text-sm font-black text-slate-900 dark:text-white truncate tracking-tight">{userName || "Vendedor"}</span>
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

      {/* Modal de Configuração de Alertas */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsAlertModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                       <Bell size={24} />
                    </div>
                    <div>
                       <h2 className="text-xl font-black text-slate-900">Configurar Alertas</h2>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Controle de notificações no WhatsApp</p>
                    </div>
                 </div>
                 <button onClick={() => setIsAlertModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-500 transition-all"><X size={24}/></button>
              </div>

              <div className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Número do Whatsapp</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 5527999881122" 
                      className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-emerald-100 transition-all font-bold text-slate-900"
                      value={notifPhone}
                      onChange={(e) => setNotifPhone(e.target.value)}
                    />
                    <p className="text-[9px] text-slate-400 italic px-1 font-medium">Use o formato 55 + DDD + Numero (Só números)</p>
                 </div>

                 {/* NOVOS LEADS */}
                 <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                       <p className="text-sm font-black text-slate-800">Novos Leads</p>
                       <p className="text-[10px] font-bold text-emerald-600 uppercase">Alertar quando entrar lead</p>
                    </div>
                    <button 
                      onClick={() => setNotifEnabled(!notifEnabled)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        notifEnabled ? "bg-emerald-500" : "bg-slate-300"
                      )}
                    >
                       <div className={cn(
                         "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md",
                         notifEnabled ? "right-1" : "left-1"
                       )}></div>
                    </button>
                 </div>

                 {/* NOVAS MENSAGENS */}
                 <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                       <p className="text-sm font-black text-slate-800">Mensagens</p>
                       <p className="text-[10px] font-bold text-indigo-600 uppercase">Alertar novas msgs de leads</p>
                    </div>
                    <button 
                      onClick={() => setNotifyNewMessages(!notifyNewMessages)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        notifyNewMessages ? "bg-indigo-500" : "bg-slate-300"
                      )}
                    >
                       <div className={cn(
                         "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md",
                         notifyNewMessages ? "right-1" : "left-1"
                       )}></div>
                    </button>
                 </div>

                 {/* INTERVALO / RESFRIAMENTO */}
                 <div className="space-y-3">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Aguardar (minutos)</label>
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{notifInterval === 0 ? "Imediato" : `${notifInterval}m`}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="60" 
                      step="5"
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      value={notifInterval}
                      onChange={(e) => setNotifInterval(parseInt(e.target.value))}
                    />
                    <p className="text-[9px] text-slate-400 italic px-1 font-medium">Tempo de espera para enviar o próximo alerta e não poluir seu WhatsApp.</p>
                 </div>

                 <button 
                   disabled={isSaving}
                   onClick={async () => {
                      if (!notifPhone) {
                         alert("Por favor, digite o número para receber os alertas.");
                         return;
                      }
                      
                      if (!userId) {
                         alert("Erro de autenticação: Usuário não identificado.");
                         return;
                      }

                      setIsSaving(true);
                      const res = await updateUserNotificationSettings(userId, { 
                        phone: notifPhone, 
                        enabled: notifEnabled, 
                        notifyNewMessages,
                        interval: notifInterval 
                      });
                      
                      if (res.success) {
                         alert("🎉 Configurações Salvas!\n\nSeus alertas de WhatsApp foram atualizados com sucesso.");
                         setIsAlertModalOpen(false);
                      } else {
                         alert(res.error || "Houve uma falha ao salvar suas configurações.");
                      }
                      setIsSaving(false);
                   }}
                   className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 tracking-widest text-xs"
                 >
                   {isSaving ? "SALVANDO..." : "SALVAR CONFIGURAÇÃO"}
                   <Save size={18} />
                 </button>
              </div>
           </div>
        </div>
      )}
    </>
  );
}
