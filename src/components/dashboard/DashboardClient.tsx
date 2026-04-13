"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  Users, 
  Target, 
  TrendingUp, 
  Calendar as CalendarIcon,
  Plus,
  ArrowUpRight,
  Sparkles,
  Zap,
  Info,
  X,
  ChevronRight,
  Trophy,
  Palette,
  Sun,
  Moon,
  Sparkle
} from "lucide-react";
import { getDashboardData } from "@/app/actions/dashboard";
import { createLead } from "@/app/actions/leads";

const quotes = [
  "A mente positiva me ajuda a ver a vida da melhor maneira.",
  "O sucesso são as ações diárias implementadas.",
  "Março com M de Momentum: hora de acelerar.",
  "Cada resposta negativa é uma chance de avaliar e crescer.",
  "Multiplique os resultados multiplicando as ações positivas.",
];

export default function DashboardClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [randomQuote, setRandomQuote] = useState("");

  useEffect(() => {
    setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    refreshData();
  }, []);
  const refreshData = async () => {
    setLoading(true);
    const result = await getDashboardData();
    if (result) {
      setData(result);
    }
    setLoading(false);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const leadData = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      source: "Dashboard",
      status: "NEW",
    };

    const res = await createLead(leadData);
    if (res.success) {
      setIsModalOpen(false);
      refreshData();
    } else {
      alert(res.error);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-transparent">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const stats = [
    { label: "Leads Novos (Mês)", value: data?.stats?.newLeadsMonthly || 0, icon: Users, color: "bg-blue-500" },
    { label: "Life Points (LP)", value: data?.stats?.totalLP.toLocaleString("pt-BR") || 0, icon: TrendingUp, color: "bg-green-500" },
    { label: `Meta ${data?.mainGoal?.title}`, value: `${Math.round(data?.stats?.goalProgress || 0)}%`, icon: Target, color: "bg-indigo-600" },
    { label: "Taxa de Conversão", value: `${data?.conversionRate || 0}%`, icon: Zap, color: "bg-emerald-500" },
    { label: "Bônus Construtor", value: data?.stats?.bonusPhase || "Fase 1", icon: Sparkles, color: "bg-amber-500" },
  ];

  return (
    <div className="p-3 md:p-4 space-y-3 md:space-y-5 max-w-full overflow-hidden animate-in fade-in duration-700">
      {/* Hero Banner - Mobile Optimizado */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 rounded-2xl md:rounded-3xl p-4 md:p-8 text-white shadow-xl shadow-indigo-200/50">
        {/* Glow effects */}
        <div className="absolute -top-10 -right-10 w-32 md:w-48 h-32 md:h-48 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 md:w-64 h-40 md:h-64 bg-pink-400/20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
          <div className="space-y-2 md:space-y-3 text-center md:text-left w-full">
            <div className="inline-flex items-center gap-1.5 bg-white/20 w-fit px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black backdrop-blur-sm border border-white/10 uppercase tracking-wider">
              <Zap size={12} className="fill-white" />
              Março com Momentum
            </div>
            <h1 className="text-base md:text-2xl lg:text-4xl font-black tracking-tight leading-tight">
              Ativando o Potencial para <span className="text-amber-300">Multiplicar Resultados</span>
            </h1>
          </div>
          <div className="flex -space-x-2 md:-space-x-3">
             {data?.recentLeads?.slice(0, 3).map((lead: any) => (
               <div key={lead.id} className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white/30 overflow-hidden bg-white/10 flex items-center justify-center shadow-md" title={lead.name}>
                  {lead.profilePic ? (
                    <img src={lead.profilePic} alt={lead.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-black text-xs">{lead.name?.charAt(0) || 'L'}</span>
                  )}
               </div>
             ))}
             <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white/50 bg-indigo-500 flex items-center justify-center text-[9px] md:text-[10px] font-black shadow-md">
                +{Math.max((data?.stats?.totalLeads || 0) - 3, 0)}
             </div>
          </div>
        </div>
      </div>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base md:text-xl font-black tracking-tight text-slate-900 leading-none">Fala, Líder! 🚀</h2>
          <p className="text-slate-500 font-medium mt-1 text-xs md:text-sm hidden md:block">Evolução em tempo real da sua estrutura Vida Plena.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="hidden md:flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all"
          >
            <Plus size={16} />
            Novo Lead
          </button>
        </div>
      </header>

      {/* FAB for Mobile - Above Bottom Nav */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-4 z-40 md:hidden h-14 w-14 bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
      >
        <Plus size={24} />
      </button>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="p-3 md:p-4 bg-white rounded-xl md:rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className={cn("p-2 md:p-3 rounded-xl text-white w-fit mb-2 md:mb-3", stat.color)}>
              <stat.icon size={16} />
            </div>
            <div>
              <span className="text-slate-400 text-[8px] md:text-[9px] font-black uppercase tracking-wider">{stat.label}</span>
              <h3 className="text-lg md:text-2xl font-black mt-0.5 md:mt-1 tracking-tight text-slate-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        <div className="lg:col-span-2 space-y-3 md:space-y-4">
          <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm p-4 md:p-6 min-h-[300px] relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-sm md:text-lg font-black tracking-tight flex items-center gap-2">
                <TrendingUp className="text-indigo-600" size={18} />
                Tendência de Evolução
              </h3>
            </div>
            
            <div className="w-full aspect-[16/7] flex items-end justify-between gap-6 px-4">
              {data?.evolutionData?.map((item: any, i: number) => (
                <div key={i} className="flex-1 group relative">
                  <div 
                    className="w-full bg-indigo-600 rounded-2xl transition-all duration-700 hover:bg-indigo-700 cursor-pointer shadow-lg shadow-indigo-100"
                    style={{ height: `${Math.max((item.value / (data?.stats?.newLeadsMonthly || 1)) * 100, 15)}%` }}
                  ></div>
                  <div className="text-[10px] font-black text-slate-400 mt-6 text-center uppercase tracking-widest">D{item.day}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 relative overflow-hidden">
            <h3 className="text-2xl font-black tracking-tight flex items-center gap-3 mb-8">
              <Trophy className="text-amber-500" size={28} />
              Performance por Atendente
            </h3>
            
            <div className="space-y-10">
              {data?.sellerPerformance?.map((seller: any, i: number) => (
                <div key={i} className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-slate-400">#0{i+1}</span>
                      <span className="font-bold text-slate-800 text-lg">{seller.name}</span>
                    </div>
                    <span className="text-sm font-black text-indigo-600 uppercase tracking-widest">{seller.rate}% Conversão</span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-1 border border-slate-50 shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 rounded-full transition-all duration-1000"
                      style={{ width: `${seller.rate}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    <span>{seller.leads} Leads Atendidos</span>
                    <span className="text-emerald-500">{seller.converted} Vendas Fechadas</span>
                  </div>
                </div>
              ))}
              {(!data?.sellerPerformance || data.sellerPerformance.length === 0) && (
                <p className="text-center text-slate-400 font-bold py-10 uppercase tracking-widest text-xs">Aguardando primeiras conversões...</p>
              )}
            </div>
          </div>

          <div className="p-10 bg-indigo-600 rounded-[3rem] text-white shadow-2xl shadow-indigo-100 relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-4">
                <h4 className="font-black text-indigo-200 flex items-center gap-2 italic text-sm uppercase tracking-widest">
                   <Sparkles size={18} />
                   Dica de Momentum
                </h4>
                <p className="text-xl font-bold max-w-md leading-relaxed">
                  "Foque na solidificação do <span className="text-amber-300 underline decoration-amber-300/30 underline-offset-8">Bônus Construtor</span> para criar uma base sólida de LP."
                </p>
              </div>
              <Zap size={80} className="text-white/10 rotate-12" />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="p-10 bg-slate-900 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">Próxima Meta Profissional</h4>
              <p className="text-4xl font-black mt-4 text-amber-400 tracking-tight leading-none">{data?.mainGoal?.title}</p>
              
              <div className="mt-12 space-y-8 text-white">
                 <div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
                      <span className="text-slate-500">Progresso LP</span>
                      <span className="text-white">{data?.mainGoal?.currentLP} / {data?.mainGoal?.targetLP}</span>
                    </div>
                    <div className="h-4 bg-slate-800 rounded-full overflow-hidden p-1 border border-slate-700 shadow-inner">
                      <div 
                         className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full" 
                         style={{ width: `${Math.min((data?.mainGoal?.currentLP / data?.mainGoal?.targetLP) * 100, 100)}%` }}
                      ></div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all">
                      <Users size={24} className="text-blue-400 mb-3" />
                      <p className="text-3xl font-black">{data?.mainGoal?.currentSignups || 0}</p>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Recrutas</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all">
                      <Target size={24} className="text-indigo-400 mb-3" />
                      <p className="text-3xl font-black">0</p>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Qualificados</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          <div className="p-10 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
            <h4 className="font-black text-xl mb-8 tracking-tight flex items-center justify-between">
              Agenda Prioritária
              <CalendarIcon size={20} className="text-slate-300" />
            </h4>
            <div className="space-y-6">
              {data?.upcomingActions?.map((action: any, i: number) => (
                <div key={i} className="flex items-center gap-5 group cursor-pointer">
                  <div className={cn("w-2 h-12 rounded-full", i === 0 ? "bg-indigo-600" : i === 1 ? "bg-amber-400" : "bg-emerald-500")}></div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{action.title}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{action.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link 
              href="/dashboard/agenda"
              className="w-full mt-10 py-5 rounded-3xl bg-slate-50 text-slate-900 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all text-center block shadow-sm"
            >
              VISUALIZAR AGENDA
            </Link>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8 text-slate-900">
              <h2 className="text-3xl font-black tracking-tight">Novo Prospecto</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                <X size={24} />
              </button>
            </div>
            
            <form className="space-y-6" onSubmit={handleSaveLead}>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
                <input 
                  name="name"
                  type="text" 
                  placeholder="Ex: João Silva" 
                  className="w-full p-5 rounded-2xl bg-slate-50 border-none focus:ring-4 focus:ring-indigo-100 outline-none font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">WhatsApp</label>
                <input 
                  name="phone"
                  type="text" 
                  placeholder="11999999999" 
                  className="w-full p-5 rounded-2xl bg-slate-50 border-none focus:ring-4 focus:ring-indigo-100 outline-none font-bold"
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white py-6 rounded-3xl font-black text-xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all mt-4"
              >
                CADASTRAR LÍDER
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
