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
  TrendingDown,
  Sparkles,
  Zap,
  Info,
  X
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

export default function DashboardPage() {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = [
    { 
      label: "Leads Novos (Mês)", 
      value: data?.stats?.newLeadsMonthly || 0, 
      change: "+0%", 
      trend: "neutral", 
      icon: Users,
      color: "bg-blue-500"
    },
    { 
      label: "Life Points (LP)", 
      value: data?.stats?.totalLP.toLocaleString("pt-BR") || 0, 
      change: "+0%", 
      trend: "neutral", 
      icon: TrendingUp,
      color: "bg-green-500"
    },
    { 
      label: `Meta ${data?.mainGoal?.title}`, 
      value: `${Math.round(data?.stats?.goalProgress || 0)}%`, 
      change: "+0%", 
      trend: "neutral", 
      icon: Target,
      color: "bg-indigo-600"
    },
    { 
      label: "Bônus Construtor", 
      value: data?.stats?.bonusPhase || "Fase 1", 
      change: "Pendente", 
      trend: "neutral", 
      icon: Zap,
      color: "bg-amber-500"
    },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Momentum Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-purple-500/20 group">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-white/20 w-fit px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border border-white/10 uppercase tracking-widest">
              <Zap size={14} className="fill-white" />
              Março com Momentum
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              Ativando o Potencial para <br /> <span className="text-amber-300">Multiplicar Resultados</span>
            </h1>
            <p className="text-indigo-100 font-medium max-w-md italic opacity-90 transition-opacity group-hover:opacity-100">
              "{randomQuote}"
            </p>
          </div>
          <div className="flex -space-x-4">
             {/* Small visual of active team/leads etc - using data if possible */}
             {[1,2,3,4].map(i => (
               <div key={i} className="w-12 h-12 rounded-full border-4 border-white inline-block overflow-hidden bg-slate-200">
                 <div className="w-full h-full bg-slate-400"></div>
               </div>
             ))}
             <div className="w-12 h-12 rounded-full border-4 border-white bg-indigo-500 flex items-center justify-center text-xs font-bold">
               +{data?.stats?.newLeadsMonthly > 4 ? data.stats.newLeadsMonthly - 4 : 0}
             </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
        <Sparkles className="absolute bottom-4 right-8 text-white/20 w-24 h-24 rotate-12" />
      </div>

      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fala, Líder! 🚀</h2>
          <p className="text-muted-foreground mt-1">Veja como sua estrutura está crescendo neste mês.</p>
        </div>
        <div className="flex gap-3">
          <Link 
            href="/dashboard/goals"
            className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-xl font-medium hover:bg-secondary/80 transition-all border border-border/10"
          >
            <Info size={18} />
            Estratégia 4Life
          </Link>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={20} />
            Novo Lead
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="p-6 bg-card rounded-[2rem] border border-border/50 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between">
              <div className={cn("p-4 rounded-2xl text-white transition-transform group-hover:scale-110", stat.color)}>
                <stat.icon size={24} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full",
                stat.trend === "up" ? "bg-green-100/80 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-slate-100 text-slate-700"
              )}>
                {stat.change}
                {stat.trend === "up" ? <ArrowUpRight size={14} /> : null}
              </div>
            </div>
            <div className="mt-6">
              <span className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">{stat.label}</span>
              <h3 className="text-3xl font-black mt-1 tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Two Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Growth Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-[2.5rem] border border-border/50 shadow-sm p-8 overflow-hidden relative min-h-[400px]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="text-green-500" />
                Tendência de Evolução
              </h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest cursor-pointer">Semana</span>
              </div>
            </div>
            
            <div className="w-full aspect-[16/8] flex items-end justify-between gap-4 px-4">
              {data?.evolutionData?.map((item: any, i: number) => (
                <div key={i} className="flex-1 group relative">
                  <div 
                    className="w-full bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-xl transition-all duration-500 hover:from-indigo-400 hover:to-purple-400 cursor-pointer"
                    style={{ height: `${Math.max((item.value / (data?.stats?.newLeadsMonthly || 1)) * 100, 10)}%` }}
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.value} Leads
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground mt-4 text-center uppercase tracking-widest">Dia {item.day}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-[2.5rem] dark:bg-indigo-950/20 dark:border-indigo-900/50">
            <h4 className="font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2 italic">
               <Sparkles size={18} />
               Dica para Crescimento
            </h4>
            <p className="text-indigo-700/80 dark:text-indigo-300 text-sm mt-2 leading-relaxed font-medium">
              "Enfoque-se na solidificação do <strong>Bônus Construtor</strong>. Isso dará uma base sólida para seus rangos com bom volume de Life Points (LP). Verifique os canais oficiais para mais orientações."
            </p>
          </div>
        </div>

        {/* Sidebar Info Area */}
        <div className="space-y-6">
          <div className="p-8 bg-black dark:bg-slate-950 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Próxima Meta</h4>
              <p className="text-3xl font-black mt-2 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">{data?.mainGoal?.title}</p>
              
              <div className="mt-10 space-y-6">
                 <div>
                   <div className="flex justify-between text-xs font-bold mb-2">
                     <span className="text-slate-400">Total LP Necessário</span>
                     <span className="text-amber-400">{data?.mainGoal?.currentLP} / {data?.mainGoal?.targetLP}</span>
                   </div>
                   <div className="h-2 bg-slate-800 rounded-full overflow-hidden p-0.5">
                     <div 
                        className="h-full bg-amber-400 rounded-full" 
                        style={{ width: `${Math.min((data?.mainGoal?.currentLP / data?.mainGoal?.targetLP) * 100, 100)}%` }}
                     ></div>
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-slate-900 rounded-3xl border border-slate-800">
                     <Users size={20} className="text-blue-400 mb-2" />
                     <p className="text-lg font-bold">{data?.mainGoal?.currentSignups || 0}/{data?.mainGoal?.targetSignups || 0}</p>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cadastros</p>
                   </div>
                   <div className="p-4 bg-slate-900 rounded-3xl border border-slate-800">
                     <Target size={20} className="text-indigo-400 mb-2" />
                     <p className="text-lg font-bold">0</p>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Líderes Q.</p>
                   </div>
                 </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-card rounded-[2.5rem] border border-border/50 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-bold text-lg">Próximas Ações</h4>
              <CalendarIcon size={18} className="text-muted-foreground" />
            </div>
            <div className="space-y-4">
              {data?.upcomingActions?.length > 0 ? (
                data.upcomingActions.map((action: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-accent/50 transition-all cursor-pointer group border border-transparent hover:border-border/50">
                    <div className={cn("w-1.5 h-10 rounded-full", i === 0 ? "bg-indigo-500" : i === 1 ? "bg-orange-500" : "bg-emerald-500")}></div>
                    <div className="flex-1">
                      <p className="font-bold text-sm leading-tight transition-colors group-hover:text-primary">{action.title}</p>
                      <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-tight">{action.time}</p>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma ação pendente</p>
              )}
            </div>
            <Link 
              href="/dashboard/agenda"
              className="w-full mt-6 py-4 rounded-2xl bg-secondary text-secondary-foreground font-bold text-xs uppercase tracking-widest hover:bg-accent transition-colors flex items-center justify-center"
            >
              Ver Agenda Completa
            </Link>
          </div>
        </div>
      </div>

      {/* Modal Novo Lead */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-[2.5rem] border border-border shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Cadastrar Novo Lead</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-accent rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form className="space-y-4" onSubmit={handleSaveLead}>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Nome</label>
                <input 
                  name="name"
                  type="text" 
                  placeholder="Ex: João Silva" 
                  className="w-full mt-1.5 p-3 rounded-2xl bg-secondary border-none focus:ring-2 focus:ring-primary outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">WhatsApp</label>
                <input 
                  name="phone"
                  type="text" 
                  placeholder="11999999999" 
                  className="w-full mt-1.5 p-3 rounded-2xl bg-secondary border-none focus:ring-2 focus:ring-primary outline-none transition-all"
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:opacity-90 transition-all mt-4"
              >
                Salvar Lead
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronRight({ size, className }: { size: number, className: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
