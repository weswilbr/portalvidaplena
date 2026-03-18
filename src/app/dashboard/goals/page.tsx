"use client";

import { 
  Target, 
  TrendingUp, 
  Award, 
  Users, 
  ChevronRight,
  ShieldCheck,
  Star
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getDashboardData } from "@/app/actions/dashboard";

export default function GoalsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const result = await getDashboardData();
      if (result) {
        setData(result);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const goalData = {
    rank: data?.mainGoal?.title || "Ouro Elite",
    progress: Math.round(data?.stats?.goalProgress || 0),
    metrics: [
      { label: "Life Points (LP) Diretos", current: data?.mainGoal?.currentLP || 0, target: data?.mainGoal?.targetLP || 5000, icon: Star, color: "text-amber-500" },
      { label: "Cadastros Novos (Mês)", current: data?.mainGoal?.currentSignups || 0, target: data?.mainGoal?.targetSignups || 20, icon: Users, color: "text-blue-500" },
      { label: "LP da Organização", current: data?.stats?.organizationLP || 0, target: 20000, icon: TrendingUp, color: "text-green-500" },
      { label: "Líderes Qualificados", current: data?.stats?.qualifiedLeaders || 0, target: 5, icon: ShieldCheck, color: "text-indigo-500" },
    ]
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Caminho para o {goalData.rank}</h1>
          <p className="text-muted-foreground mt-1">Acompanhe seu progresso e os marcos necessários para o próximo nível.</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-xl font-bold text-sm">
          <Award size={18} />
          Nível Atual: Diamante Elite
        </div>
      </header>

      {/* Main Progress Card */}
      <div className="p-10 bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-[3rem] text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden">
        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold">Rumo ao {goalData.rank}</h2>
            <p className="text-indigo-200 mt-2 text-lg">Você está mais próximo do que imagina, Líder!</p>
            <div className="mt-10 space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span>Progresso Total</span>
                <span>{goalData.progress}%</span>
              </div>
              <div className="h-4 bg-white/20 rounded-full overflow-hidden border border-white/10 p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-200 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.5)] transition-all duration-1000"
                  style={{ width: `${goalData.progress}%` }}
                ></div>
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-56 h-56 rounded-full border-8 border-white/10 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-6xl font-bold">{goalData.progress}%</span>
                  <p className="text-indigo-200 text-sm mt-1 uppercase tracking-widest">Concluído</p>
                </div>
              </div>
              <Award size={64} className="absolute -top-4 -right-4 text-amber-400 drop-shadow-lg" />
            </div>
          </div>
        </div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Detailed Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goalData.metrics.map((metric) => (
          <div key={metric.label} className="p-6 bg-card rounded-3xl border border-border/50 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-4">
              <div className={cn("p-4 rounded-2xl bg-secondary", metric.color)}>
                <metric.icon size={28} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-lg text-slate-800 dark:text-slate-100">{metric.label}</span>
                  <span className="text-sm font-bold text-muted-foreground">{metric.current} / {metric.target}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden mt-2">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-700", metric.color.replace('text', 'bg'))}
                    style={{ width: `${Math.min((metric.current / metric.target) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              <ChevronRight size={20} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>

      {/* Reward/Motivation section */}
      <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-border/60">
        <h3 className="font-bold text-xl mb-4">O que te espera no {goalData.rank}?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            "Reconhecimento Internacional",
            "Bônus de Liderança Expandido",
            "Viagens de Incentivo Exclusivas",
            "Acesso ao Programa Vida Plena VIP",
            "Mentoria com Platinums",
            "Liberdade Geográfica e Financeira"
          ].map((benefit, i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-card rounded-2xl border border-border/40 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              <span className="text-sm font-medium">{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
