"use client";

import React, { useState, useEffect } from "react";
import { 
  Bot, 
  Wifi, 
  WifiOff, 
  Save, 
  RefreshCw, 
  Smartphone,
  MessageCircle,
  Settings,
  ShieldCheck,
  Server
} from "lucide-react";
import { getBotConfig, updateBotConfig, restartBotCommand } from "@/app/actions/bot";

export default function BotConfigClient() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refreshConfig();
  }, []);

  const refreshConfig = async () => {
    setLoading(true);
    const data = await getBotConfig();
    setConfig(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.target as HTMLFormElement);
    
    const res = await updateBotConfig(config.id, {
      welcomeMessage: formData.get("welcomeMessage") as string,
      transferMessage: formData.get("transferMessage") as string,
      isRoundRobin: formData.get("isRoundRobin") === "true"
    });

    if (res.success) {
      alert("Configurações do Bot salvas com sucesso!");
      refreshConfig();
    } else {
      alert(res.error);
    }
    setSaving(false);
  };

  const handleRestartBot = async () => {
    if (confirm("Isto enviará um comando para a sua VPS reiniciar a instância do WhatsApp. Deseja prosseguir?")) {
      const res = await restartBotCommand();
      alert(res.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4 bg-slate-50/50">
        <RefreshCw className="animate-spin text-indigo-600" size={48} />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando Instância do Bot...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 bg-slate-50/50 min-h-screen animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-[0.2em] mb-1">
            <Server size={14} />
            Hospedagem VPS Ativa
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Robô de Atendimento 24/7</h1>
          <p className="text-slate-500 font-medium mt-2">
            Controle as configurações da Evolution API / Baileys hospedada na sua VPS diretamente pelo Portal.
          </p>
        </div>
        
        <button 
          onClick={handleRestartBot}
          className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-2xl font-bold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          <RefreshCw size={18} />
          Reiniciar Instância VPS
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-indigo-100 transition-all">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-emerald-500"></div>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Bot size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Status do WhatsApp</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Conectado (Online)</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3 text-slate-600 font-medium">
                  <Smartphone size={18} /> Número Conectado
                </div>
                <span className="font-bold text-slate-900">+55 27 9999-9999</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3 text-slate-600 font-medium">
                  <ShieldCheck size={18} /> Conexão Segura API
                </div>
                <span className="font-bold text-emerald-500">OK</span>
              </div>
            </div>

            {config?.status === "QR_READY" && config?.qrCode && (
              <div className="mt-6 text-center animate-in zoom-in">
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Escaneie o QR Code</p>
                 <img src={config.qrCode} alt="WhatsApp QR Code" className="w-48 h-48 mx-auto border-4 border-slate-100 rounded-2xl shadow-sm" />
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <Settings className="text-indigo-600" size={24} />
              <h2 className="text-2xl font-black text-slate-900">Comportamento do Robô</h2>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                  Mensagem Automática de Primeiro Contato (Boas Vindas)
                </label>
                <textarea 
                  name="welcomeMessage"
                  defaultValue={config?.welcomeMessage || ""}
                  rows={3}
                  className="w-full p-5 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-indigo-100 font-medium leading-relaxed resize-none"
                  placeholder="Olá! Sou o assistente virtual..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                  Mensagem de Aviso de Transferência P/ Vendedor
                </label>
                <textarea 
                  name="transferMessage"
                  defaultValue={config?.transferMessage || ""}
                  rows={2}
                  className="w-full p-5 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-indigo-100 font-medium resize-none"
                  placeholder="Vou transferir seu atendimento..."
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                  Distribuição de Atendimentos da VPS
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-start gap-4 p-5 border border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all">
                    <input 
                      type="radio" 
                      name="isRoundRobin" 
                      value="true" 
                      defaultChecked={config?.isRoundRobin} 
                      className="mt-1 w-4 h-4 text-indigo-600" 
                    />
                    <div>
                      <p className="font-bold text-slate-900">Round Robin (Roleta)</p>
                      <p className="text-sm font-medium text-slate-500 mt-1">O bot escolhe o vendedor da equipe que tem menos leads automaticamente.</p>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-4 p-5 border border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all">
                    <input 
                      type="radio" 
                      name="isRoundRobin" 
                      value="false" 
                      defaultChecked={!config?.isRoundRobin} 
                      className="mt-1 w-4 h-4 text-indigo-600" 
                    />
                    <div>
                      <p className="font-bold text-slate-900">Fila Geral (Pool)</p>
                      <p className="text-sm font-medium text-slate-500 mt-1">O bot cadastra na Fila Geral e os vendedores clicam no botão "Puxar" para atender.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <button 
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                  Salvar Parâmetros do Bot na VPS
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
