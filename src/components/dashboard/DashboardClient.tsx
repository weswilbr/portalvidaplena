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
  ChevronRight
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
    { label: "Bônus Construtor", value: data?.stats?.bonusPhase || "Fase 1", icon: Zap, color: "bg-amber-500" },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-200 group">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-white/20 w-fit px-4 py-1.5 rounded-full text-[10px] font-black backdrop-blur-md border border-white/10 uppercase tracking-[0.2em]">
              <Zap size={14} className="fill-white" />
              Março com Momentum
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none">
              Ativando o Potencial para <br /> <span className="text-amber-300">Multiplicar Resultados</span>
            </h1>
            <p className="text-indigo-100 font-medium max-w-md italic opacity-90 block pt-2">
              "{randomQuote}"
            </p>
          </div>
          <div className="flex -space-x-4">
             {[1,2,3,4].map(i => (
               <div key={i} className="w-14 h-14 rounded-full border-4 border-white/30 overflow-hidden bg-white/10 flex items-center justify-center">
                  <Users size={20} className="text-white/50" />
               </div>
             ))}
             <div className="w-14 h-14 rounded-full border-4 border-white bg-indigo-500 flex items-center justify-center text-sm font-bold shadow-lg">
               +{data?.stats?.newLeadsMonthly > 4 ? data.stats.newLeadsMonthly - 4 : 0}
             </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-white/10 rounded-full blur-[100px] pointer-events-none"></div>
      </div>

      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 leading-none">Fala, Líder! 🚀</h2>
          <p className="text-slate-500 font-medium mt-2 tracking-tight">Evolução em tempo real da sua estrutura 4Life.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus size={20} />
            Novo Lead
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className={cn("p-4 rounded-2xl text-white w-fit mb-6", stat.color)}>
              <stat.icon size={28} />
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</span>
              <h3 className="text-4xl font-black mt-2 tracking-tight text-slate-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 min-h-[450px] relative overflow-hidden">
            <div className="flex items-center justify-between mb-12">
              <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                <TrendingUp className="text-indigo-600" size={28} />
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
