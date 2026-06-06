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
  Server,
  Film,
  Upload,
  Trash2,
  Loader2,
  Plus
} from "lucide-react";
import { getBotConfig, updateBotConfig, restartBotCommand, requestPhotoScan } from "@/app/actions/bot";
import { Camera } from "lucide-react";

export default function BotConfigClient() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [video, setVideo] = useState<any>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("nova");
  const [previewing, setPreviewing] = useState(false);

  const playPreview = () => {
    setPreviewing(true);
    const audio = new Audio(`/api/voz/preview?voice=${selectedVoice}&t=${Date.now()}`);
    audio.onended = () => setPreviewing(false);
    audio.onerror = () => { setPreviewing(false); alert("Não consegui gerar a amostra dessa voz agora."); };
    audio.play().catch(() => { setPreviewing(false); alert("Não consegui tocar a amostra."); });
  };

  useEffect(() => {
    refreshConfig();
    loadVideo();
  }, []);

  const loadVideo = async () => {
    try {
      const r = await fetch("/api/apresentacao");
      setVideo(await r.json());
    } catch { setVideo({ exists: false }); }
  };

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/apresentacao/upload", { method: "POST", body: fd });
      const res = await r.json();
      if (res.success) {
        if (res.aviso) alert("✅ Vídeo salvo!\n\n⚠️ " + res.aviso);
        else alert("✅ Vídeo de apresentação salvo! O bot já vai enviar ele aos convidados.");
        await loadVideo();
      } else {
        alert(res.error || "Falha ao subir o vídeo.");
      }
    } catch {
      alert("Falha de conexão ao subir o vídeo.");
    }
    setUploadingVideo(false);
    e.target.value = "";
  };

  const handleRemoveVideo = async () => {
    if (!confirm("Remover o vídeo de apresentação? O bot deixará de enviá-lo.")) return;
    try {
      await fetch("/api/apresentacao", { method: "DELETE" });
      await loadVideo();
    } catch {}
  };

  const refreshConfig = async () => {
    setLoading(true);
    const data = await getBotConfig();
    setConfig(data);
    if (data?.voiceName) setSelectedVoice(data.voiceName);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.target as HTMLFormElement);
    
    const res = await updateBotConfig(config.id, {
      welcomeMessage: formData.get("welcomeMessage") as string,
      transferMessage: formData.get("transferMessage") as string,
      isRoundRobin: formData.get("isRoundRobin") === "true",
      aiModel: formData.get("aiModel") as string,
      voiceMode: formData.get("voiceMode") as string,
      voiceName: selectedVoice
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

  const handleRequestScan = async () => {
    setIsScanning(true);
    const res = await requestPhotoScan();
    alert(res.message);
    setIsScanning(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4 bg-slate-50/50">
        <RefreshCw className="animate-spin text-blue-700" size={48} />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando Instância do Bot...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 bg-slate-50/50 min-h-screen animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-700 font-black text-xs uppercase tracking-[0.2em] mb-1">
            <Server size={14} />
            Hospedagem VPS Ativa
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Robô de Atendimento 24/7</h1>
          <p className="text-slate-500 font-medium mt-2">
            Controle o robô de WhatsApp (whatsapp-web.js) hospedado na sua VPS, direto pelo Portal.
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
          {(() => {
            const st = config?.status || "DESCONHECIDO";
            const conectado = st === "CONNECTED";
            const S: Record<string, any> = {
              CONNECTED:    { bar: "from-emerald-400 to-emerald-500", icon: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500", ping: "bg-emerald-400", txt: "text-emerald-600", label: "Conectado (Online)" },
              QR_READY:     { bar: "from-amber-400 to-amber-500",     icon: "bg-amber-50 text-amber-600",     dot: "bg-amber-500",   ping: "bg-amber-400",   txt: "text-amber-600",   label: "Aguardando leitura do QR" },
              DISCONNECTED: { bar: "from-red-400 to-red-500",         icon: "bg-red-50 text-red-600",         dot: "bg-red-500",     ping: "bg-red-400",     txt: "text-red-600",     label: "Desconectado" },
              DESCONHECIDO: { bar: "from-slate-300 to-slate-400",     icon: "bg-slate-100 text-slate-500",    dot: "bg-slate-400",   ping: "bg-slate-300",   txt: "text-slate-500",   label: "Verificando..." }
            };
            const c = S[st] || S.DESCONHECIDO;
            return (
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-blue-100 transition-all">
            <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${c.bar}`}></div>
            <div className="flex items-center gap-4 mb-6">
              <div className={`p-4 rounded-2xl ${c.icon}`}>
                <Bot size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Status do WhatsApp</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="relative flex h-3 w-3">
                    {conectado && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${c.ping}`}></span>}
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${c.dot}`}></span>
                  </span>
                  <span className={`text-sm font-bold uppercase tracking-widest ${c.txt}`}>{c.label}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3 text-slate-600 font-medium">
                  <Smartphone size={18} /> Número Conectado
                </div>
                <span className="font-bold text-slate-900">{config?.connectedNumber ? "+" + config.connectedNumber : "—"}</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3 text-slate-600 font-medium">
                  <ShieldCheck size={18} /> Engine
                </div>
                <span className="font-bold text-slate-700">whatsapp-web.js</span>
              </div>

              <button 
                onClick={handleRequestScan}
                disabled={isScanning}
                className="w-full mt-4 p-4 border-2 border-dashed border-blue-100 rounded-2xl flex items-center justify-center gap-3 text-blue-700 font-black text-xs uppercase tracking-widest hover:bg-blue-50 hover:border-blue-200 transition-all active:scale-95 disabled:opacity-50"
              >
                {isScanning ? <RefreshCw size={18} className="animate-spin" /> : <Camera size={18} />}
                {isScanning ? "Sincronizando..." : "Sincronizar Fotos"}
              </button>
            </div>

            {config?.status === "QR_READY" && config?.qrCode && (
              <div className="mt-6 text-center animate-in zoom-in">
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Escaneie o QR Code</p>
                 <img src={config.qrCode} alt="WhatsApp QR Code" className="w-48 h-48 mx-auto border-4 border-slate-100 rounded-2xl shadow-sm" />
              </div>
            )}
          </div>
            );
          })()}
        </div>

        <div className="md:col-span-2 space-y-6">
          {/* 🎥 Vídeo de Apresentação */}
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl"><Film size={22} /></div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900">Vídeo de Apresentação</h2>
                <p className="text-slate-500 font-medium text-sm">O bot envia este vídeo direto no WhatsApp do convidado, na hora da apresentação.</p>
              </div>
            </div>

            {video?.exists ? (
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-black">
                  <video src={video.url} controls className="w-full max-h-72 object-contain bg-black" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-black text-xs flex items-center gap-1">
                      ✅ Ativo
                    </span>
                    <span className="text-slate-500 font-medium">{video.name} · {video.sizeMB} MB</span>
                  </div>
                  <div className="flex gap-2">
                    <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-blue-700 text-white rounded-xl font-bold text-sm hover:bg-blue-800 transition-all">
                      {uploadingVideo ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                      {uploadingVideo ? "Enviando..." : "Trocar vídeo"}
                      <input type="file" accept="video/*" className="hidden" onChange={handleUploadVideo} disabled={uploadingVideo} />
                    </label>
                    <button onClick={handleRemoveVideo} className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-all">
                      <Trash2 size={16} /> Remover
                    </button>
                  </div>
                </div>
                {video.sizeMB > 16 && (
                  <p className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    ⚠️ Vídeo acima de 16MB pode demorar ou falhar no WhatsApp. Se der problema, comprima.
                  </p>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 p-10 border-2 border-dashed border-blue-200 rounded-2xl cursor-pointer hover:bg-blue-50/50 transition-all">
                {uploadingVideo ? <Loader2 size={32} className="text-blue-500 animate-spin" /> : <Upload size={32} className="text-blue-400" />}
                <span className="font-black text-slate-700">{uploadingVideo ? "Enviando vídeo..." : "Clique para subir o vídeo (MP4, MOV...)"}</span>
                <span className="text-xs text-slate-400">Recomendado até ~16MB para enviar liso no WhatsApp</span>
                <input type="file" accept="video/*" className="hidden" onChange={handleUploadVideo} disabled={uploadingVideo} />
              </label>
            )}
          </div>

          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <Settings className="text-blue-700" size={24} />
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
                  className="w-full p-5 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-blue-100 font-medium leading-relaxed resize-none"
                  placeholder="Olá! Sou o assistente virtual..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                  Mensagem de Aviso de Transferência P/ Parceiro
                </label>
                <textarea 
                  name="transferMessage"
                  defaultValue={config?.transferMessage || ""}
                  rows={2}
                  className="w-full p-5 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-blue-100 font-medium resize-none"
                  placeholder="Vou transferir seu atendimento..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                  🤖 Modelo de IA que conversa com o cliente
                </label>
                <select
                  name="aiModel"
                  defaultValue={config?.aiModel || "google/gemini-2.5-flash"}
                  className="w-full p-5 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-blue-100 font-bold text-slate-700"
                >
                  <option value="google/gemini-2.5-flash">⭐ Gemini 2.5 Flash — natural e barato (recomendado)</option>
                  <option value="openai/gpt-4o-mini">GPT-4o-mini — confiável e consistente</option>
                  <option value="anthropic/claude-3.5-haiku">Claude 3.5 Haiku — o mais caloroso/humano</option>
                  <option value="deepseek/deepseek-chat">DeepSeek — econômico</option>
                  <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B — alternativa</option>
                </select>
                <p className="text-[11px] text-slate-400 font-medium ml-1">
                  Troca aplicada na hora, sem reiniciar nada. Se o modelo falhar, o bot usa o fallback automático e nunca fica mudo.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                  🎙️ Respostas em áudio de voz
                </label>
                <select
                  name="voiceMode"
                  defaultValue={config?.voiceMode || "OFF"}
                  className="w-full p-5 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-blue-100 font-bold text-slate-900"
                >
                  <option value="OFF">Desligado — só texto</option>
                  <option value="SOMETIMES">⭐ Às vezes — ~1 a cada 3 respostas vira voz (recomendado)</option>
                  <option value="ALWAYS">Sempre — quase toda resposta em voz</option>
                </select>
                <p className="text-[11px] text-slate-400 font-medium ml-1">
                  O bot manda mensagens de voz humanizadas. As vozes 🆓 grátis (Microsoft) não custam nada; as 💎 premium gastam "pólen".
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                  🗣️ Voz do bot
                </label>
                <div className="flex gap-2">
                  <select
                    name="voiceName"
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="flex-1 p-5 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-blue-100 font-bold text-slate-900"
                  >
                    <optgroup label="🏠 Grátis e Offline — Piper (roda 100% na VPS)">
                      <option value="piper:faber">Faber 👨 — local, offline, custo zero (BR)</option>
                    </optgroup>
                    <optgroup label="🆓 Grátis — Português BR (Microsoft Edge)">
                      <option value="pt-BR-FranciscaNeural">Francisca 👩 — suave e simpática (BR)</option>
                      <option value="pt-BR-ThalitaNeural">Thalita 👩 — jovem e natural (BR)</option>
                      <option value="pt-BR-BrendaNeural">Brenda 👩 — calorosa (BR)</option>
                      <option value="pt-BR-AntonioNeural">Antônio 👨 — firme e claro (BR)</option>
                      <option value="pt-BR-DonatoNeural">Donato 👨 — natural (BR)</option>
                      <option value="pt-BR-FabioNeural">Fábio 👨 — jovem (BR)</option>
                    </optgroup>
                    <optgroup label="💎 Premium (gasta pólen) — ElevenLabs">
                      <option value="nova">Nova 👩 — suave</option>
                      <option value="sarah">Sarah 👩 — calorosa</option>
                      <option value="bella">Bella 👩 — jovem</option>
                      <option value="onyx">Onyx 👨 — grave</option>
                      <option value="daniel">Daniel 👨 — natural</option>
                      <option value="george">George 👨 — maduro</option>
                    </optgroup>
                  </select>
                  <button
                    type="button"
                    onClick={playPreview}
                    disabled={previewing}
                    className="shrink-0 flex items-center gap-2 px-5 rounded-2xl bg-blue-700 text-white font-black hover:bg-blue-800 transition-all disabled:opacity-60"
                  >
                    {previewing ? <RefreshCw size={18} className="animate-spin" /> : <span className="text-lg">▶️</span>}
                    {previewing ? "..." : "Ouvir"}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 font-medium ml-1">
                  Clique em "Ouvir" para testar a voz antes de salvar. Depois clique em "Salvar" embaixo para aplicar.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                  Distribuição de Atendimentos da VPS
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-start gap-4 p-5 border border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-blue-50/50 transition-all">
                    <input 
                      type="radio" 
                      name="isRoundRobin" 
                      value="true" 
                      defaultChecked={config?.isRoundRobin} 
                      className="mt-1 w-4 h-4 text-blue-700" 
                    />
                    <div>
                      <p className="font-bold text-slate-900">Round Robin (Roleta)</p>
                      <p className="text-sm font-medium text-slate-500 mt-1">O bot escolhe o parceiro da equipe que tem menos leads automaticamente.</p>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-4 p-5 border border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-blue-50/50 transition-all">
                    <input 
                      type="radio" 
                      name="isRoundRobin" 
                      value="false" 
                      defaultChecked={!config?.isRoundRobin} 
                      className="mt-1 w-4 h-4 text-blue-700" 
                    />
                    <div>
                      <p className="font-bold text-slate-900">Fila Geral (Pool)</p>
                      <p className="text-sm font-medium text-slate-500 mt-1">O bot cadastra na Fila Geral e os parceiros clicam no botão "Puxar" para atender.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <button 
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-10 py-5 bg-blue-700 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-blue-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
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
