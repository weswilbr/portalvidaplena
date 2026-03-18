"use client";

import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  Zap,
  ArrowUpRight,
  Calendar,
  Plus,
  ArrowRight,
  X,
  History
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getMetrics, upsertMetric } from "@/app/actions/dashboard";

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const data = await getMetrics(7);
    setMetrics(data);
    setLoading(false);
  }

  const handleUpdateMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.target as HTMLFormElement);
    
    const data = {
      date: new Date(),
      leadsCaught: Number(formData.get("leadsCaught")) || 0,
      presentations: Number(formData.get("presentations")) || 0,
      signups: Number(formData.get("signups")) || 0,
      lpGenerated: Number(formData.get("lpGenerated")) || 0,
    };

    const res = await upsertMetric(data);
    if (res.success) {
      setIsUpdateModalOpen(false);
      loadData();
    } else {
      alert(res.error);
    }
    setIsSubmitting(false);
  };

  if (loading && metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totals = metrics.reduce((acc, m) => ({
    leads: acc.leads + m.leadsCaught,
    presentations: acc.presentations + m.presentations,
    signups: acc.signups + m.signups,
    lp: acc.lp + m.lpGenerated,
  }), { leads: 0, presentations: 0, signups: 0, lp: 0 });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Métricas de Performance</h1>
          <p className="text-muted-foreground mt-1 text-lg">Análise detalhada do seu funil e crescimento.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-secondary p-1 rounded-2xl border border-border/10">
             <button className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm font-bold text-xs uppercase tracking-widest">7 Dias</button>
             <button className="px-4 py-2 rounded-xl text-muted-foreground font-bold text-xs uppercase tracking-widest hover:text-foreground transition-all">30 Dias</button>
          </div>
          <button 
            onClick={() => setIsUpdateModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={20} />
            Lançar Progresso
          </button>
        </div>
      </header>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Leads Captados", value: totals.leads, icon: Users, color: "bg-blue-500", trend: "+12%" },
          { label: "Apresentações", value: totals.presentations, icon: Target, color: "bg-indigo-500", trend: "+8%" },
          { label: "Novos Parceiros", value: totals.signups, icon: Zap, color: "bg-amber-500", trend: "+15%" },
          { label: "LP Gerado", value: totals.lp.toLocaleString("pt-BR"), icon: TrendingUp, color: "bg-green-500", trend: "+20%" },
        ].map((stat, i) => (
          <div key={i} className="p-8 bg-card rounded-[2.5rem] border border-border/50 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
            <div className={cn("p-3 rounded-2xl text-white w-fit mb-6", stat.color)}>
              <stat.icon size={24} />
            </div>
            <span className="text-muted-foreground text-xs font-black uppercase tracking-[0.2em]">{stat.label}</span>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-4xl font-black tracking-tighter">{stat.value}</h3>
              <span className="text-xs font-bold text-green-500 flex items-center gap-0.5">
                {stat.trend} <ArrowUpRight size={12} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card rounded-[3rem] border border-border/50 shadow-sm p-10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-12">
            <h3 className="text-xl font-bold flex items-center gap-2 italic">
               <History className="text-primary" />
               Histórico de Atividade
            </h3>
            <div className="flex gap-4">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                 <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Leads</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                 <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cadastros</span>
               </div>
            </div>
          </div>

          <div className="w-full aspect-[16/7] flex items-end justify-between gap-6 px-4">
            {metrics.length > 0 ? metrics.map((m: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                 <div className="w-full flex items-end justify-center gap-2 h-full">
                    <div 
                      className="w-1/3 bg-indigo-500 rounded-lg transition-all duration-500 cursor-pointer relative"
                      style={{ height: `${Math.max((m.leadsCaught / (Math.max(...metrics.map(x => x.leadsCaught)) || 1)) * 100, 5)}%` }}
                    >
                       <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">{m.leadsCaught}</div>
                    </div>
                    <div 
                      className="w-1/3 bg-amber-500 rounded-lg transition-all duration-700 cursor-pointer relative"
                      style={{ height: `${Math.max((m.signups / (Math.max(...metrics.map(x => x.signups)) || 1)) * 100, 5)}%` }}
                    >
                       <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">{m.signups}</div>
                    </div>
                 </div>
                 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Dia {new Date(m.date).getDate()}</span>
              </div>
            )) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground italic">
                 Nenhum dado disponível. Lance seu progresso!
              </div>
            )}
          </div>
        </div>

        {/* Conversion & Goals Sidebar */}
        <div className="space-y-6">
           <div className="p-8 bg-indigo-600 rounded-[2.5rem] text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
             <div className="relative z-10">
               <h4 className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Poder de Duplicação</h4>
               <p className="text-3xl font-black mb-6">Taxa de Conversão</p>
               <div className="text-6xl font-black text-white/90 mb-4 transition-transform group-hover:scale-110">
                 {totals.leads > 0 ? Math.round((totals.signups / totals.leads) * 100) : 0}%
               </div>
               <p className="text-indigo-100 text-sm font-medium italic opacity-80">
                 "Cada lead é uma vida a ser transformada. Foque na conexão!"
               </p>
             </div>
             <Zap size={100} className="absolute -right-8 -bottom-8 text-white/10 rotate-12 transition-transform group-hover:rotate-45" />
           </div>

           <div className="p-8 bg-card rounded-[2.5rem] border border-border/50 shadow-sm">
              <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
                 <Calendar size={18} className="text-primary" />
                 Status do Funil
              </h4>
              <div className="space-y-6">
                 {[
                   { label: "Apresentações/Leads", current: totals.presentations, target: totals.leads, color: "bg-blue-500" },
                   { label: "Cadastros/Apresentações", current: totals.signups, target: totals.presentations, color: "bg-amber-500" },
                 ].map((goal, i) => (
                   <div key={i} className="space-y-2">
                     <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <span>{goal.label}</span>
                        <span>{goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0}%</span>
                     </div>
                     <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000", goal.color)} 
                          style={{ width: `${Math.min((goal.current / (goal.target || 1)) * 100, 100)}%` }}
                        ></div>
                     </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* Modal Lançar Progresso */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-[3rem] border border-border shadow-2xl p-10 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                 <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                    <Plus size={24} />
                 </div>
                 <h2 className="text-2xl font-black tracking-tight">Lançar Progresso de Hoje</h2>
              </div>
              <button onClick={() => setIsUpdateModalOpen(false)} className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground">
                <X size={24} />
              </button>
            </div>
            
            <form className="space-y-6" onSubmit={handleUpdateMetric}>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Leads Captados (+)</label>
                  <input 
                    name="leadsCaught"
                    type="number" 
                    placeholder="0" 
                    className="w-full p-4 rounded-[1.5rem] bg-secondary border-none focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Apresentações (+)</label>
                  <input 
                    name="presentations"
                    type="number" 
                    placeholder="0" 
                    className="w-full p-4 rounded-[1.5rem] bg-secondary border-none focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Cadastros (+)</label>
                  <input 
                    name="signups"
                    type="number" 
                    placeholder="0" 
                    className="w-full p-4 rounded-[1.5rem] bg-secondary border-none focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">LP Gerado (+)</label>
                  <input 
                    name="lpGenerated"
                    type="number" 
                    placeholder="0" 
                    className="w-full p-4 rounded-[1.5rem] bg-secondary border-none focus:ring-2 focus:ring-primary outline-none transition-all font-bold text-lg"
                  />
                </div>
              </div>
              
              <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-2xl flex items-center gap-3 border border-indigo-100 dark:border-indigo-900/50">
                 <Zap size={18} className="text-indigo-600 shrink-0" />
                 <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Os valores inseridos serão <strong>somados</strong> aos dados já existentes de hoje.</p>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-primary-foreground py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? "Registrando..." : "Registrar Resultados"}
                {!isSubmitting && <ArrowRight size={20} />}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
