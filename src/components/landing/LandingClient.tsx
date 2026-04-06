"use client";

import React, { useState } from "react";
import { 
  MessageCircle, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  CheckCircle2, 
  Globe, 
  ChevronRight,
  Loader2,
  ExternalLink,
  ShoppingBag,
  UserPlus
} from "lucide-react";
import { createLead } from "@/app/actions/leads";
import { openWhatsApp } from "@/lib/utils";

export default function LandingClient() {
  const [formData, setFormData] = useState({ name: "", phone: "", interest: "Negócio" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Constants
  const WHATSAPP_NUMBER = "5527996872622"; // Número Oficial do CRM / Bot
  const AFFILIATE_LINK = "https://brazil.Vida Plena.com/12866267/signup/PC";

  // Actions
  const handleLeadCapture = async (e?: React.FormEvent, type: "Form" | "WhatsApp" = "Form", interest_override?: string) => {
    if (e) e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    
    const interest = interest_override || formData.interest;
    
    // Capture in DB
    const res = await createLead({
      name: formData.name || (type === "WhatsApp" ? "Lead via WhatsApp Direto" : "Visitante Interessado"),
      phone: formData.phone || "",
      source: type === "WhatsApp" ? "Landing Page - WhatsApp Direto" : "Landing Page - Form",
      status: "NEW", 
      interest: interest === "Negócio" ? "Negócio" : "Produto"
    });

    if (res.success) {
      if (type === "Form") {
        setSubmitted(true);
        setTimeout(() => {
          const msg = interest === "Negócio" 
            ? `Olá! Sou ${formData.name}. Acabei de me cadastrar no Projeto Vida Plena e quero saber mais sobre o negócio.`
            : `Olá! Sou ${formData.name}. Gostaria de saber mais sobre os produtos Vida Plena para minha saúde.`;
          openWhatsApp(WHATSAPP_NUMBER, msg);
        }, 1500);
      } else {
        const msg = interest === "Negócio"
          ? "Olá! Vim da sua Landing Page e gostaria de saber mais sobre a oportunidade de negócio Vida Plena."
          : "Olá! Vim da sua Landing Page e gostaria de saber mais sobre os produtos Vida Plena.";
        openWhatsApp(WHATSAPP_NUMBER, msg);
        setLoading(false);
      }
    } else {
      alert("Houve um erro ao processar seu pedido. Mas você pode clicar em WhatsApp direto!");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-600 overflow-x-hidden">
      {/* Hero Section */}
      <header className="relative w-full bg-white pt-16 pb-24 md:pt-24 md:pb-32 border-b border-slate-100">
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest animate-pulse border border-indigo-100">
              <Zap size={14} className="fill-indigo-600" />
              Oportunidade Ouro Elite Vida Plena 2026
            </div>
            
            <h1 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Deixe a <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500">Ciência e os Resultados</span> falarem por você.
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-600 max-w-3xl leading-relaxed">
              Descubra o <strong className="text-slate-900">Projeto Vida Plena</strong>: O caminho definitivo para construir sua liberdade financeira como Afiliado Independente da líder mundial em imunologia.
            </p>

            {/* Quick CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center pt-8">
              <a 
                href="#capturar" 
                onClick={() => setFormData({...formData, interest: "Negócio"})}
                className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 hover:scale-105 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95"
              >
                QUERO SER PARCEIRO
                <ChevronRight size={20} />
              </a>
              <a 
                href="#capturar" 
                onClick={() => setFormData({...formData, interest: "Produto"})}
                className="w-full sm:w-auto px-10 py-5 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl font-bold text-lg hover:border-indigo-600 hover:text-indigo-600 hover:scale-105 transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95"
              >
                QUERO COMPRAR PRODUTOS
                <ShoppingBag size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.05)_0%,_transparent_70%)] pointer-events-none -z-10"></div>
      </header>

      {/* Benefits Content */}
      <main className="py-24 space-y-32">
        <section className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            {[
              { 
                icon: ShieldCheck, 
                title: "Ciência Imunológica", 
                desc: "Produtos exclusivos com patente mundial (Fatores de Transferência) que educam e fortalecem o sistema de defesa natural do corpo.",
                color: "indigo"
              },
              { 
                icon: TrendingUp, 
                title: "Renda Vitalícia", 
                desc: "Um plano de compensação premiado que paga até 64% de comissões, possibilitando ganhos imediatos e escaláveis.",
                color: "blue"
              },
              { 
                icon: Globe, 
                title: "Expansão Global", 
                desc: "Presente em mais de 50 países, permitindo que você construa um negócio internacional sem sair de casa.",
                color: "purple"
              }
            ].map((pillar, i) => (
              <div key={i} className={`p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 space-y-4 hover:border-indigo-200 hover:-translate-y-2 transition-all group overflow-hidden relative`}>
                <div className={`w-16 h-16 bg-${pillar.color}-50 border border-${pillar.color}-100 rounded-2xl flex items-center justify-center text-${pillar.color}-600 group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-6`}>
                  <pillar.icon size={32} />
                </div>
                <h3 className="text-2xl font-bold">{pillar.title}</h3>
                <p className="text-slate-500 leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The Capture Section */}
        <section id="capturar" className="container mx-auto px-6 scroll-mt-24">
          <div className="max-w-6xl mx-auto bg-slate-900 rounded-[3.5rem] overflow-hidden shadow-2xl relative">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-10 md:p-20 flex flex-col justify-center space-y-8 text-white relative z-10">
                <h2 className="text-3xl md:text-5xl font-black leading-tight">
                  Pronto para dar o <span className="text-indigo-400 italic underline decoration-indigo-400/30 underline-offset-8">próximo passo</span>?
                </h2>
                <div className="space-y-6">
                  {[
                    "Acesso exclusivo à mentoria Ouro Elite.",
                    "Grupo VIP de treinamento e suporte.",
                    "Ferramentas de prospecção digital.",
                    "Guia 'Início Rápido' em PDF grátis."
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-4 animate-in slide-in-from-left duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="p-1 bg-indigo-500/20 text-indigo-400 rounded-lg mt-1 shrink-0">
                        <CheckCircle2 size={20} />
                      </div>
                      <p className="text-slate-300 font-medium">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-10 md:p-20 bg-white m-4 md:m-8 rounded-[2.5rem] shadow-inner relative z-10">
                {submitted ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-500 py-12">
                    <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-bounce">
                      <CheckCircle2 size={48} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-slate-900">Quase lá!</h3>
                      <p className="text-slate-500 text-lg">Estamos te levando para o WhatsApp para completar seu pedido...</p>
                    </div>
                    <Loader2 className="animate-spin text-slate-300" size={32} />
                  </div>
                ) : (
                  <form onSubmit={handleLeadCapture} className="space-y-6">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, interest: "Negócio"})}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${formData.interest === "Negócio" ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        <UserPlus size={18} />
                        Ser Parceiro
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, interest: "Produto"})}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${formData.interest === "Produto" ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        <ShoppingBag size={18} />
                        Comprar Produto
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 uppercase tracking-widest ml-1">Seu Nome Completo</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: João Silva"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 uppercase tracking-widest ml-1">WhatsApp com DDD</label>
                      <input 
                        type="tel" 
                        required
                        placeholder="Ex: (11) 99999-9999"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin" size={24} />
                      ) : (
                        <>
                          QUERO MINHA VAGA AGORA
                          <ArrowRight size={24} />
                        </>
                      )}
                    </button>
                    <p className="text-center text-xs text-slate-400 font-medium">
                      🔒 Seus dados estão seguros e serão usados para contato consultivo.
                    </p>
                  </form>
                )}
              </div>
            </div>
            
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
          </div>
        </section>

        {/* Direct Affiliate Signup */}
        <section className="container mx-auto px-6 py-10">
          <div className="max-w-4xl mx-auto p-12 bg-indigo-600 rounded-[3rem] text-center text-white space-y-8 shadow-2xl shadow-indigo-200 relative overflow-hidden group">
            <div className="relative z-10 space-y-6">
              <h2 className="text-3xl md:text-4xl font-black">Já conhece a Vida Plena e quer se cadastrar direto?</h2>
              <p className="text-indigo-100 text-lg font-medium">
                Pule a consultoria e abra sua conta de afiliado independente agora mesmo no portal oficial.
              </p>
              <a 
                href={AFFILIATE_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-10 py-5 bg-white text-indigo-600 rounded-2xl font-bold text-lg hover:scale-110 active:scale-95 transition-all shadow-xl"
              >
                CADASTRAR-SE DIRETAMENTE
                <ExternalLink size={20} />
              </a>
            </div>
            {/* Shimmer effect */}
            <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_2s_infinite] transition-all"></div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-100 pt-24 pb-12">
        <div className="container mx-auto px-6 space-y-12">
          <div className="flex flex-col md:flex-row items-center justify-center gap-12 grayscale opacity-40 hover:opacity-100 transition-opacity">
             <div className="flex items-center gap-2 font-black text-2xl tracking-tighter text-slate-900 italic">Vida Plena <span className="font-light not-italic text-sm tracking-widest ml-1 border-l pl-2 border-slate-300">BRASIL</span></div>
             <div className="h-10 w-[1px] bg-slate-200 hidden md:block"></div>
             <div className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-widest text-sm">Prêmio Ciência Imunológica</div>
             <div className="h-10 w-[1px] bg-slate-200 hidden md:block"></div>
             <div className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-widest text-sm">Distribuidor Independente</div>
          </div>

          <div className="text-center space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-[0.3em]">Projeto Vida Plena</h2>
            <p className="text-slate-400 text-sm font-medium">© 2026 Todos os direitos reservados. Projeto operado por Distribuidor Independente Vida Plena.</p>
            <div className="flex justify-center flex-wrap gap-4 sm:gap-8 text-xs text-slate-400 underline underline-offset-4">
               <a href="#" className="hover:text-indigo-600 transition-colors">Política de Privacidade</a>
               <a href="#" className="hover:text-indigo-600 transition-colors">Termos de Uso</a>
               <a href="#" className="hover:text-indigo-600 transition-colors">Aviso Legal</a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(0); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
