"use client";

import React, { useState } from "react";
import { 
  ShoppingBag, 
  CheckCircle2, 
  Loader2,
  MessageCircle,
  Zap,
  Package,
  Truck,
  ShieldCheck,
  ExternalLink
} from "lucide-react";
import { createLead } from "@/app/actions/leads";
import { openWhatsApp } from "@/lib/utils";

export default function VerProdutoClient() {
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const WHATSAPP_NUMBER = "5527996872622";
  const LOJA_LINK = "https://4l.media/L0LNJ";

  const handleLeadCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    
    const res = await createLead({
      name: formData.name || "Lead via Ver Produto",
      phone: formData.phone || "",
      source: "Landing Page - Ver Produto",
      status: "NEW", 
      interest: "Produto"
    });

    if (res.success) {
      setSubmitted(true);
      setTimeout(() => {
        const msg = `Olá! Sou ${formData.name}. Vi os produtos Vida Plena no site e gostaria de saber mais sobre preços e como comprar.`;
        openWhatsApp(WHATSAPP_NUMBER, msg);
      }, 1500);
    } else {
      const msg = `Olá! Vi os produtos Vida Plena no site e gostaria de saber mais sobre preços e como comprar.`;
      openWhatsApp(WHATSAPP_NUMBER, msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white text-slate-900 font-sans">
      {/* Header */}
      <header className="w-full bg-white border-b border-emerald-100 pt-16 pb-12">
        <div className="container mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
            <Zap size={14} className="fill-emerald-600" />
            Produtos Vida Plena
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">
            Transforme sua <span className="text-emerald-600">Saúde</span> com Ciência
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
            Conheça os produtos líderes mundiais em imunologia com Fatores de Transferência. Qualidade internacional, resultados comprovados.
          </p>
        </div>
      </header>

      {/* Benefits */}
      <main className="py-16 space-y-16">
        <section className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: ShieldCheck, title: "Qualidade Internacional", desc: "Produtos com patente mundial e certificação FDA" },
              { icon: Truck, title: "Entrega para todo Brasil", desc: "Envio rápido e rastreável para qualquer cidade" },
              { icon: Package, title: "Satisfação Garantida", desc: "90 dias de garantia ou seu dinheiro de volta" }
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-emerald-100 shadow-sm">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                  <item.icon size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Direct Store Link */}
        <section className="container mx-auto px-6">
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-emerald-100 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag size={32} className="text-emerald-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Comprar na Loja Oficial</h2>
            <p className="text-slate-500 mb-6">Acesse a loja oficial 4Life e compre diretamente</p>
            <a 
              href={LOJA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-lg hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <ShoppingBag size={24} />
              COMPRAR NA LOJA
              <ExternalLink size={18} />
            </a>
          </div>
        </section>

        {/* WhatsApp Option */}
        <section className="container mx-auto px-6">
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-emerald-100">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={32} className="text-indigo-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Fale com um Consultor</h2>
              <p className="text-slate-500 mt-2">Prefere receber atendimento personalizado?</p>
            </div>

            {submitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Redirecionando...</h3>
                <p className="text-slate-500">Estamos te levando para o WhatsApp</p>
                <Loader2 className="animate-spin text-emerald-300 mx-auto" size={32} />
              </div>
            ) : (
              <form onSubmit={handleLeadCapture} className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider ml-1">Seu Nome</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Maria Silva"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider ml-1">WhatsApp</label>
                  <input 
                    type="tel" 
                    required
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-lg hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={24} />
                  ) : (
                    <>
                      <MessageCircle size={24} />
                      ENVIAR PARA WHATSAPP
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-slate-400">
                  🔒 Seus dados estão seguros. Sem spam.
                </p>
              </form>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-emerald-100 py-8 mt-16">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm text-slate-400">© 2026 Vida Plena Brasil. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
