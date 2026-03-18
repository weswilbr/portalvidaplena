"use client";

import { Wallet, TrendingUp, TrendingDown, DollarSign, Calendar, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const transactions = [
  { id: 1, type: "income", category: "Comissão 4Life", amount: 1250.00, date: "2026-03-14", status: "RECEIVED" },
  { id: 2, type: "outcome", category: "Marketing (Ads)", amount: 350.00, date: "2026-03-12", status: "PAID" },
  { id: 3, type: "income", category: "Venda Direta", amount: 480.00, date: "2026-03-10", status: "RECEIVED" },
];

export default function FinancialPage() {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Controle Financeiro</h1>
        <p className="text-muted-foreground mt-1">Gerecie suas comissões, vendas e despesas de marketing.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-card rounded-[2rem] border border-border/50 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-2xl bg-green-100 text-green-600">
              <TrendingUp size={24} />
            </div>
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Entradas</span>
          </div>
          <h3 className="text-3xl font-black">R$ 1.730,00</h3>
        </div>
        
        <div className="p-6 bg-card rounded-[2rem] border border-border/50 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-2xl bg-red-100 text-red-600">
              <TrendingDown size={24} />
            </div>
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Saídas</span>
          </div>
          <h3 className="text-3xl font-black">R$ 350,00</h3>
        </div>

        <div className="p-6 bg-indigo-600 text-white rounded-[2rem] shadow-xl shadow-indigo-500/20">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-2xl bg-white/20">
              <Wallet size={24} />
            </div>
            <span className="text-sm font-bold opacity-80 uppercase tracking-wider">Saldo Líquido</span>
          </div>
          <h3 className="text-3xl font-black">R$ 1.380,00</h3>
        </div>
      </div>

      <div className="bg-card rounded-[2.5rem] border border-border/50 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-bold text-lg">Últimas Movimentações</h3>
          <button className="text-sm font-bold text-primary hover:underline">Ver tudo</button>
        </div>
        <div className="divide-y divide-border/50">
          {transactions.map((t) => (
            <div key={t.id} className="p-6 flex items-center justify-between hover:bg-accent/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-xl", t.type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                  {t.type === "income" ? <Plus size={20} /> : <div className="w-5 h-0.5 bg-current" />}
                </div>
                <div>
                  <p className="font-bold">{t.category}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar size={12} /> {t.date}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn("font-black text-lg", t.type === "income" ? "text-green-600" : "text-red-600")}>
                  {t.type === "income" ? "+" : "-"} R$ {t.amount.toFixed(2)}
                </p>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-secondary rounded-md uppercase">
                  {t.status === "RECEIVED" ? "Recebido" : "Pago"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
