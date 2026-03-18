"use client";

import { 
  MessageCircle, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  TrendingUp,
  ArrowRight,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SolicitarPage() {
  const whatsappNumber = "5511999999999"; // Substituir pelo número real
  const message = encodeURIComponent("Olá! Gostaria de saber mais sobre o Projeto Vida Plena e como me tornar um empreendedor 4Life.");
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full max-w-5xl px-6 py-20 flex flex-col items-center text-center space-y-10">
        <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest animate-bounce">
          <Zap size={14} className="fill-indigo-600" />
          Oportunidade 4Life Brasil
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight max-w-3xl">
          Transforme sua Vida e sua Saúde com o <span className="text-indigo-600">Projeto Vida Plena</span>
        </h1>
        
        <p className="text-xl text-slate-600 max-w-2xl font-medium">
          Descubra como construir um negócio sólido como afiliado independente 4Life e alcance sua liberdade financeira com produtos de ciência avançada.
        </p>

        {/* Floating Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-10">
          {[
            { icon: CheckCircle2, title: "Saúde Superior", desc: "Produtos baseados na ciência do sistema imunológico." },
            { icon: TrendingUp, title: "Renda Crescente", desc: "Plano de compensação premiado e sustentável." },
            { icon: ShieldCheck, title: "Suporte Total", desc: "Treinamentos exclusivos com a liderança Ouro Elite." }
          ].map((item, i) => (
            <div key={i} className="p-8 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center text-center group hover:-translate-y-2 transition-transform duration-300">
              <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                <item.icon size={28} />
              </div>
              <h3 className="font-bold text-lg text-slate-900">{item.title}</h3>
              <p className="text-slate-500 text-sm mt-2">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Main CTA Card */}
        <div className="w-full bg-indigo-600 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl shadow-indigo-600/30">
          <div className="relative z-10 space-y-8 flex flex-col items-center">
            <h2 className="text-3xl font-black italic">"O momento de acelerar é agora!"</h2>
            <p className="text-indigo-100 text-lg font-medium max-w-xl">
              Clique no botão abaixo e fale diretamente comigo no WhatsApp para receber seu guia de início e tirar todas as suas dúvidas sobre o negócio.
            </p>
            
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 bg-white text-indigo-600 px-10 py-6 rounded-2xl font-black text-xl hover:scale-105 transition-all shadow-xl hover:shadow-2xl"
            >
              <MessageCircle size={28} className="fill-indigo-600" />
              QUERO MEU ACESSO NO WHATSAPP
              <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
            </a>
            
            <div className="flex items-center gap-2 text-indigo-300 text-sm font-bold uppercase tracking-widest">
              <Target size={16} />
              Atendimento Personalizado Ouro Elite
            </div>
          </div>
          
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl"></div>
        </div>
      </section>

      <section className="w-full bg-white border-t border-slate-100 py-20 flex flex-col items-center text-center">
        <div className="max-w-2xl px-6 space-y-6">
          <blockquote className="text-2xl font-bold italic text-slate-800">
            "Ativando o potencial para multiplicar resultados. Através da prospecção correta e uma mente positiva, a vitória é garantida."
          </blockquote>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-10 text-center text-slate-400 text-sm font-medium">
        © 2026 Projeto Vida Plena • Distribuidor Independente 4Life
      </footer>
    </div>
  );
}
