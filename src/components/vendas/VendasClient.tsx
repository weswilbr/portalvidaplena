"use client";

import { 
  Search, 
  Plus, 
  MessageSquare,
  X,
  List,
  LayoutGrid,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  UserCheck,
  Loader2,
  Send,
  UserPlus,
  ArrowRightLeft,
  CheckCircle2,
  User,
  Paperclip,
  Smile,
  ImageIcon,
  FileText,
  Square,
  Volume2,
  Play,
  Pause,
  Pencil,
  Trash2,
  ChevronLeft,
  CalendarCheck,
  Mic,
  Zap,
  Tag,
  History,
  Info,
  Edit2
} from "lucide-react";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { cn, openWhatsApp, getWhatsAppHref } from "@/lib/utils";
import { getLeads, createLead, updateLead, deleteLead, addMessage, transferLead, pullLead, sendWhatsAppMessage, addInternalNote, uploadMedia, deleteMessage, updateMessage, getQuickReplies, createQuickReply, deleteQuickReply, updateQuickReply } from "@/app/actions/leads";
import { getSellers } from "@/app/actions/users";
import KanbanView from "@/components/leads/KanbanView";

// Helper para formatar celular do Brasil
function formatPhoneNumber(phone: string) {
  if (!phone) return "";
  const basePhone = phone.split(':')[0];
  const cleaned = basePhone.replace(/\D/g, "");
  
  if (cleaned.length >= 12 && cleaned.startsWith("55")) {
    if (cleaned.length === 13) { // +55 27 99999-9999
      return `+55 (${cleaned.substring(2, 4)}) ${cleaned.substring(4, 9)}-${cleaned.substring(9)}`;
    }
    if (cleaned.length === 12) { // +55 27 9999-9999
      return `+55 (${cleaned.substring(2, 4)}) ${cleaned.substring(4, 8)}-${cleaned.substring(8)}`;
    }
  }

  // Se não começar com 55 ou tiver tamanho diferente, apenas garante o + na frente
  return basePhone.startsWith("+") ? basePhone : `+${cleaned || phone}`;
}

const statusStyles = {
  NEW: "bg-emerald-100 text-emerald-700",
  CONTACTED: "bg-blue-100 text-blue-700",
  PRESENTED: "bg-indigo-100 text-indigo-700",
  CLOSED: "bg-green-600 text-white",
  LOST: "bg-red-100 text-red-600",
};

const statusLabels: Record<string, string> = {
  NEW: "Novo Lead",
  CONTACTED: "Em Atendimento",
  PRESENTED: "Carrinho Aberto",
  CLOSED: "Venda Concluída",
  LOST: "Venda Perdida",
};

export default function VendasClient({ user }: { user: any }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  
  const [newMessage, setNewMessage] = useState("");
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [transferUserId, setTransferUserId] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [quickReplies, setQuickReplies] = useState<any[]>([]);
  const [isGatilhoOpen, setIsGatilhoOpen] = useState(false);
  const [isGatilhoManagerOpen, setIsGatilhoManagerOpen] = useState(false);
  const [editingQR, setEditingQR] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (isDetailsOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [selectedLead?.messages, isDetailsOpen]);

  // Auto-refresh quando o chat está aberto (mensagens em tempo real)
  useEffect(() => {
    if (!isDetailsOpen) return;
    const interval = setInterval(() => refreshData(), 4000);
    return () => clearInterval(interval);
  }, [isDetailsOpen, selectedLead?.id]);

  const refreshData = async () => {
    setLoading(true);
    const [fetchedLeads, fetchedSellers, fetchedQR] = await Promise.all([
      getLeads(),
      getSellers(),
      getQuickReplies(user.id)
    ]);
    
    // Lista os de produto, mas também puxa os leads virgens (sem interesse listado do bot)
    const filtered = fetchedLeads.filter((l: any) => l.interest === "Produto" || !l.interest);
    setLeads(filtered);
    setSellers(fetchedSellers);
    setQuickReplies(fetchedQR);
    
    // Atualiza o lead selecionado se o modal de detalhes estiver aberto
    if (selectedLead) {
      const updatedLead = fetchedLeads.find((l: any) => l.id === selectedLead.id);
      if (updatedLead) setSelectedLead(updatedLead);
    }
    
    setLoading(false);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        (lead.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.phone || "").includes(searchTerm);
      const matchesStatus = statusFilter === "" || lead.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, leads]);

  const handleSendMessageWhatsApp = (phone: string) => {
    if (!phone) return;
    openWhatsApp(phone, "Olá! Sou consultor 4Life, vi seu interesse em nossos produtos. Como posso te auxiliar?");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedLead || isSending) return;

    setIsSending(true);
    let res;
    let mediaUrl = undefined;
    let mediaType = undefined;
    let fileName = undefined;

    if (selectedFile) {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const uploadRes = await uploadMedia(formData);
      if (uploadRes.success) {
        mediaUrl = uploadRes.url;
        mediaType = uploadRes.type;
        fileName = uploadRes.name;
      } else {
        alert(uploadRes.error || "Erro ao subir arquivo");
        setIsSending(false);
        return;
      }
    }

    if (isNoteMode) {
      res = await addInternalNote({ leadId: selectedLead.id, content: newMessage, authorId: user.id });
    } else {
      res = await sendWhatsAppMessage({ 
        leadId: selectedLead.id, 
        content: newMessage, 
        authorId: user.id,
        mediaUrl,
        mediaType,
        fileName
      });
    }

    try {
      if (res.success) {
        setNewMessage("");
        setSelectedFile(null);
        setFilePreview(null);
        setIsEmojiOpen(false);
        refreshData();
      } else {
        // Trata erro de limite do Vercel (4.5MB) especificamente se possível, ou exibe o erro retornado
        const errorMsg = res.error || "Ocorreu um erro ao enviar.";
        if (errorMsg.includes("413") || errorMsg.includes("Large")) {
          alert("⚠️ Limite do Vercel atingido (4.5MB). \n\nPara enviar arquivos maiores (até 32MB), você deve acessar o sistema pelo endereço da sua VPS ou usar um serviço de armazenamento externo (S3/Cloudinary).");
        } else {
          alert(errorMsg);
        }
      }
    } catch (err) {
      console.error("Error in send response logic:", err);
      // Fallback para o usuário se o Vercel retornar erro de body size (413) que quebra a ação
      alert("⚠️ Erro de limite de tamanho! O Vercel suporta no máximo 4.5MB. Para arquivos maiores, use o endereço da sua VPS.");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setFilePreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setIsEmojiOpen(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/ogg; codecs=opus') 
        ? 'audio/ogg; codecs=opus' 
        : 'audio/webm; codecs=opus';
        
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const extension = mimeType.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([audioBlob], `voice_message.${extension}`, { type: mimeType });
        setSelectedFile(file);
        setFilePreview(null);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      alert("Permissão de áudio negada ou erro no gravador.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Tem certeza que deseja apagar esta mensagem?")) return;
    const res = await deleteMessage(messageId);
    if (res.success) {
      refreshData();
    } else {
      alert(res.error);
    }
  };

  const handleStartEdit = (message: any) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editContent.trim()) return;
    const res = await updateMessage(editingMessageId, editContent);
    if (res.success) {
      setEditingMessageId(null);
      refreshData();
    } else {
      alert(res.error);
    }
  };

  const [newQRTitle, setNewQRTitle] = useState("");
  const [newQRContent, setNewQRContent] = useState("");

  const handleAddGatilho = async () => {
    if (!newQRTitle || !newQRContent) return;
    
    if (editingQR) {
      const res = await updateQuickReply(editingQR.id, { title: newQRTitle, content: newQRContent });
      if (res.success) {
        setNewQRTitle("");
        setNewQRContent("");
        setEditingQR(null);
        refreshData();
      }
    } else {
      const res = await createQuickReply({ title: newQRTitle, content: newQRContent, userId: user.id });
      if (res.success) {
        setNewQRTitle("");
        setNewQRContent("");
        refreshData();
      }
    }
  };

  const handleEditQR = (qr: any) => {
    setEditingQR(qr);
    setNewQRTitle(qr.title);
    setNewQRContent(qr.content);
  };

  const cancelEditQR = () => {
     setEditingQR(null);
     setNewQRTitle("");
     setNewQRContent("");
  };

  const handleCreateInitialGatilhos = async () => {
     const defaultQR = [
       { title: "Fatores de Transferência", content: "Nossos produtos utilizam Nano Fórmulas Inteligentes, que são compostos de alta tecnologia que potencializam a absorção dos nutrientes pelo organismo. Com isso, seu corpo consegue aproveitar ao máximo os benefícios dos ingredientes ativos, promovendo:\n✅ Maior fortalecimento da imunidade\n✅ Redução dos efeitos colaterais de tratamentos\n✅ Mais disposição e bem-estar\n✅Em alguns casos até remissão de doença.\n\nA diferença está na nossa tecnologia exclusiva de Fator de Transferência, que permite resultados mais rápidos e eficazes.\n\nVocê gostaria de saber mais detalhes?" },
       { title: "Prova Social", content: "\"Vou te enviar a história de pessoas que superaram suas doenças, uma das nossas clientes. Durante o tratamento, ela sentia fadiga intensa e baixa imunidade. Depois de usar os suplementos, percebeu melhora na disposição e no sistema imunológico. Hoje, ela recomenda para outras pessoas que estão na mesma luta.\n\n Quer ver mais depoimentos? Me avise!\"" },
       { title: "Preços", content: "1️⃣ *Caixa Essencial — R$ 197,00 + frete*\n✨ Ideal pra quem quer iniciar aos poucos o fortalecimento do sistema imune.\n2️⃣ *Kit Intermediário — R$ 542,00 + frete*\n✨ Ajuda a reativar suas defesas, traz mais energia e menos dores. Inclui orientação da equipe.\n3️⃣ *Kit Avançado — R$ 836,94 + frete*\n✨ Suporte completo, inclui plano alimentar e suplementação para imunidade e metabolismo.\n4️⃣ *Kit Imuno Ouro — R$ 1.399,00 (frete grátis)*\n✨ Para quem precisa de suporte máximo, sintomas persistentes ou prevenção intensa. Inclui reavaliação depois de 3 meses.\nTodos são aprovados pela ANVISA, naturais e com suporte humano em todo o processo. 🌱🤗\n\n Faz sentido para você acessar esses benefícios ?" },
       { title: "Triagem", content: "Escolha uma opção:\n\n1️⃣É indicado por médico?\n2️⃣Quero saber preço!\n3️⃣Estou apenas curiosa (o)" },
       { title: "Novo Cadastro", content: "Para gerar Nota Fiscal e Rastreio de entrega preciso:\n\n🪪 Nome Completo\n📆 Data de Nascimento \n🚹 CPF \n🏠 Endereço completo \n🚛 Cep \n📩 E-mail \n💰Forma de pagamento:\n Pix ou Cartão parcelado 3x" }
     ];

     for (const qr of defaultQR) {
        await createQuickReply({ ...qr, userId: user.id });
     }
     refreshData();
  };

  const handleDeleteGatilho = async (id: string) => {
    if (!confirm("Excluir este gatilho?")) return;
    await deleteQuickReply(id);
    refreshData();
  };

  const handleTransfer = async () => {
    if (!transferUserId || !selectedLead) return;
    
    const res = await transferLead(selectedLead.id, transferUserId, user.id);
    if (res.success) {
      setIsTransferring(false);
      setTransferUserId("");
      refreshData();
    }
  };

  const handlePullLead = async (leadId: string) => {
    const res = await pullLead(leadId, user.id);
    if (res.success) {
      refreshData();
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    if (!selectedLead) return;
    
    if (newStatus === "CLOSED") {
      const satisfaction = prompt("Conversa finalizada. Qual o nível de satisfação do cliente (1 a 5)? Deixe uma nota para o histórico.");
      if (satisfaction) {
        await addMessage({ leadId: selectedLead.id, content: `Venda concluída. Pesquisa de Satisfação: ${satisfaction} Estrelas.`, authorId: user.id, isSystem: true });
      }
    } else if (newStatus === "LOST") {
      const reason = prompt("Por que a venda foi perdida? (Deixe em branco p/ pular)");
      if (reason) {
        await addMessage({ leadId: selectedLead.id, content: `Venda perdida. Motivo: ${reason}`, authorId: user.id, isSystem: true });
      }
    }

    await updateLead(selectedLead.id, { status: newStatus });
    refreshData();
  };

  const handleInterestChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newInterest = e.target.value;
    if (!selectedLead) return;
    
    await updateLead(selectedLead.id, { interest: newInterest });
    await addMessage({ leadId: selectedLead.id, content: `Foco trocado para ${newInterest}. O Lead foi movido/focado com sucesso.`, authorId: user.id, isSystem: true });
    
    alert(`Foco atualizado! Se movido para Afiliados, ele aparecerá na aba Negócios.`);
    setIsDetailsOpen(false);
    refreshData();
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const leadData = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      interest: "Produto",
      status: formData.get("status") as string,
      assignedToId: formData.get("assignedToId") as string || undefined,
    };

    const res = await createLead(leadData);

    if (res.success) {
      setIsModalOpen(false);
      refreshData();
    } else {
      alert(res.error);
    }
  };

  const handleKanbanStatusChange = async (leadId: string, newStatus: string) => {
    // Quick optimistic visual feedback then real refresh
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    await updateLead(leadId, { status: newStatus });
    refreshData();
  };

  return (
    <div className="p-4 md:p-8 md:pt-8 pt-20 space-y-6 bg-slate-50/50 min-h-screen animate-in fade-in duration-500 w-full overflow-x-hidden">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-[0.2em] mb-1">
            <ShoppingBag size={14} />
            E-commerce & WhatsApp
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">Gestão de Vendas</h1>
          <p className="text-sm md:text-base text-slate-500 font-medium mt-2">
            Pool colaborativo. Puxe leads, converse e converta juntos.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex bg-white p-1.5 rounded-[1.25rem] shadow-sm border border-slate-200 justify-center">
            <button 
              onClick={() => setViewMode("table")}
              className={cn("p-2 rounded-xl transition-all duration-300 flex-1 flex justify-center", viewMode === "table" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400")}
            >
              <List size={20} />
            </button>
            <button 
              onClick={() => setViewMode("kanban")}
              className={cn("p-2 rounded-xl transition-all duration-300 flex-1 flex justify-center", viewMode === "kanban" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400")}
            >
              <LayoutGrid size={20} />
            </button>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3.5 md:py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all w-full sm:w-auto"
          >
            <Plus size={20} />
            Criar Venda Manual
          </button>
        </div>
      </header>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        {[
          { label: "Total", value: leads.length, icon: UserCheck, color: "blue" },
          { label: "Abertos", value: leads.filter(l => l.status === "CONTACTED").length, icon: MessageSquare, color: "indigo" },
          { label: "Fechados", value: leads.filter(l => l.status === "CLOSED").length, icon: CreditCard, color: "emerald" },
          { label: "Meus", value: leads.filter(l => l.assignedToId === user.id).length, icon: UserPlus, color: "purple" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 md:p-6 rounded-3xl md:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-5 text-center sm:text-left">
            <div className={`p-3 md:p-4 bg-${stat.color}-50 text-${stat.color}-600 rounded-2xl flex-shrink-0`}>
              <stat.icon size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl md:text-2xl font-black text-slate-900 leading-none mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-1 px-4 bg-white rounded-3xl md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 md:gap-4 items-center min-h-[70px] md:min-h-[80px]">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou WhatsApp..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 md:bg-white border-none outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="h-10 w-[1px] bg-slate-100 hidden md:block"></div>
        <select 
          className="w-full md:w-auto px-6 py-3 rounded-2xl bg-slate-50 md:bg-white border-none md:border-solid md:border-slate-100 outline-none cursor-pointer font-bold text-slate-600 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Status: Todos</option>
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-48 md:h-96 space-y-4">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Atualizando Central...</p>
        </div>
      ) : viewMode === "kanban" ? (
        <KanbanView 
          leads={filteredLeads}
          onEdit={(l) => { setSelectedLead(l); setIsDetailsOpen(true); }}
          onDelete={async (id) => { if (user.role === "ADMIN" && confirm("Excluir totalmente?")) { await deleteLead(id); refreshData(); } }}
          onSendMessage={handleSendMessageWhatsApp}
          onStatusChange={handleKanbanStatusChange}
        />
      ) : (
        <div className="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden w-full">
           <div className="overflow-x-auto w-full">
             <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="px-6 md:px-8 py-4 md:py-5 font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-400">Cliente</th>
                    <th className="px-6 md:px-8 py-4 md:py-5 font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-400">Atendimento</th>
                    <th className="px-6 md:px-8 py-4 md:py-5 font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-6 md:px-8 py-4 md:py-5 font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-400 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-indigo-50/30 transition-all group animate-in slide-in-from-bottom duration-300">
                      <td className="px-6 md:px-8 py-4 md:py-5 flex items-center gap-4">
                        {lead.profilePic ? (
                          <img src={lead.profilePic} alt={lead.name} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border border-slate-200 shadow-sm" />
                        ) : (
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold border border-slate-200">
                            <User size={20}/>
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 text-sm md:text-base">{lead.name}</div>
                          <div className="text-[10px] md:text-xs font-semibold text-slate-400 mt-0.5">{formatPhoneNumber(lead.phone)}</div>
                        </div>
                      </td>
                      <td className="px-6 md:px-8 py-4 md:py-5">
                        {lead.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", lead.assignedTo.id === user.id ? "bg-emerald-500" : "bg-slate-300")}></div>
                            <span className={cn("text-[10px] md:text-xs font-bold", lead.assignedTo.id === user.id ? "text-emerald-700" : "text-slate-500")}>
                              {lead.assignedTo.id === user.id ? "Seu Lead" : lead.assignedTo.name}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                            <span className="text-[10px] md:text-xs font-black text-amber-600 tracking-widest uppercase">Fila Geral</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 md:px-8 py-4 md:py-5">
                        <span className={cn("px-3 py-1 md:px-4 md:py-1.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider shadow-sm", statusStyles[lead.status as keyof typeof statusStyles])}>
                          {statusLabels[lead.status as keyof typeof statusLabels]}
                        </span>
                      </td>
                      <td className="px-6 md:px-8 py-4 md:py-5 text-right flex justify-end gap-2">
                         {(!lead.assignedTo || (lead.assignedTo.id !== user.id && user.role === 'ADMIN')) && (
                           <button 
                            onClick={() => handlePullLead(lead.id)}
                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
                           >
                             <ArrowRightLeft size={14} /> Puxar
                           </button>
                         )}
                         <button 
                          onClick={() => { setSelectedLead(lead); setIsDetailsOpen(true); }}
                          className="px-3 py-1.5 md:px-4 md:py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-[10px] md:text-xs hover:bg-slate-200 transition-all shadow-sm"
                         >
                           Chat
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
           </div>
        </div>
      )}

      {isDetailsOpen && selectedLead && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDetailsOpen(false)}></div>
          
          <div className="relative w-full sm:max-w-2xl bg-[#f0f2f5] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Cabeçalho do Chat */}
            <header className="p-3 bg-[#f0f2f5] flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsDetailsOpen(false)} className="md:hidden p-2 text-slate-500">
                  <ChevronLeft size={24} />
                </button>
                {selectedLead.profilePic ? (
                  <img src={selectedLead.profilePic} className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200" alt={selectedLead.name} />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center text-white"><User size={20}/></div>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">{selectedLead.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-emerald-600">Online CRM Bolt</span>
                    <span className="text-[10px] text-slate-400">|</span>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter cursor-pointer" onClick={() => setIsTransferring(!isTransferring)}>
                      {isTransferring ? "Fechar Painel" : "Painel Lead"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-slate-500">
                <button className="hover:text-indigo-600 transition-all"><Search size={20} /></button>
                <button onClick={() => setIsDetailsOpen(false)} className="hover:text-red-500 transition-all"><X size={20} /></button>
              </div>
            </header>

            {/* Painel de Ações do Lead (Opcional, abre sob o header) */}
            {isTransferring && (
              <div className="p-4 bg-white border-b border-slate-200 animate-in slide-in-from-top duration-300 space-y-4 shadow-sm z-20">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mover Estágio Kanban</label>
                      <select 
                        className="w-full text-xs font-bold px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-black"
                        value={selectedLead.status}
                        onChange={handleStatusChange}
                      >
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <option key={key} value={key} className="bg-white text-slate-900">{label}</option>
                        ))}
                      </select>
                    </div>
                
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Foco de Interesse</label>
                        <select 
                          className="w-full text-xs font-bold px-3 py-2 rounded-lg bg-slate-100 border border-slate-200"
                          value={selectedLead.interest || "Produto"}
                          onChange={handleInterestChange}
                        >
                          <option value="Produto">Produto</option>
                          <option value="Negócio">Negócio</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status Geral</label>
                        <select 
                          className={cn("w-full text-xs font-bold px-3 py-2 rounded-lg border border-slate-200", statusStyles[selectedLead.status as keyof typeof statusStyles])}
                          value={selectedLead.status}
                          onChange={handleStatusChange}
                        >
                          {Object.entries(statusLabels).map(([key, label]) => (
                            <option key={key} value={key} className="bg-white text-slate-900">{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  
                    <div className="space-y-2 border-t pt-2 border-slate-100">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transferir Atendimento</label>
                      <div className="flex gap-2">
                        <select 
                          className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                          value={transferUserId}
                          onChange={(e) => setTransferUserId(e.target.value)}
                        >
                          <option value="">Selecione outro atendente...</option>
                          {sellers.map((seller: any) => (
                            <option key={seller.id} value={seller.id}>{seller.name}</option>
                          ))}
                        </select>
                        <button 
                          onClick={handleTransfer}
                          disabled={!transferUserId}
                          className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shrink-0"
                        >
                          OK
                        </button>
                      </div>
                    </div>
              </div>
            )}

            {/* Mensagens (Fundo WhatsApp) */}
            <div 
              className="flex-1 overflow-y-auto p-4 md:px-12 md:py-8 space-y-4 relative scroll-smooth"
              style={{ 
                backgroundImage: `url('https://w0.peakpx.com/wallpaper/722/716/OHR-whatsapp-pattern-abstract-flat-style-light-green.jpg')`,
                backgroundSize: '400px',
                backgroundBlendMode: 'soft-light'
              }}
            >
              <div className="flex flex-col gap-2">
                {selectedLead.messages?.map((msg: any) => {
                  const isMe = msg.author?.id === user.id;
                  const isClient = !msg.author && !msg.isSystem;

                  if (msg.isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-3">
                        <span className="bg-[#e1f3fb] text-[#54656f] text-[10px] font-bold px-3 py-1 rounded-lg uppercase tracking-wide shadow-sm border border-[#c6e5f1]">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={cn("flex flex-col gap-1 max-w-[85%] relative group", isMe ? "self-end" : "self-start")}>
                      {!isClient && !msg.isSystem && !isMe && msg.author && (
                        <span className="text-[10px] font-black text-slate-400 ml-2 mb-0.5 uppercase tracking-widest">{msg.author.name}</span>
                      )}
                      
                      <div className={cn(
                        "px-3 py-2 rounded-xl text-sm font-medium shadow-sm leading-relaxed min-w-[80px]",
                        isClient ? "bg-white text-slate-800 rounded-tl-none pr-12" : 
                        msg.isNote ? "bg-[#fef3c7] border border-amber-200 text-amber-900 rounded-tr-none pb-5" : 
                        isMe ? "bg-[#d9fdd3] text-[#111b21] rounded-tr-none pr-12" : 
                        "bg-white text-[#111b21] rounded-tr-none pr-12"
                      )}>
                        {/* Autor no topo se for enviado por outro vendedor e sou eu quem estou vendo */}
                        {isMe && (
                           <span className="text-[9px] font-black text-emerald-600 block mb-1 uppercase opacity-40">Você ({user.name})</span>
                        )}

                        {/* Renderização de Mídia */}
                        {msg.mediaUrl && (
                          <div className="mb-2">
                            {msg.mediaType === 'image' || msg.mediaUrl.startsWith('data:image') ? (
                              <img src={msg.mediaUrl} alt="imagem" className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-100 transition-all border border-black/5" onClick={() => window.open(msg.mediaUrl, '_blank')} />
                            ) : msg.mediaType === 'video' || msg.mediaUrl.startsWith('data:video') ? (
                              <video src={msg.mediaUrl} controls className="rounded-lg max-w-full h-auto border border-black/5" />
                            ) : msg.mediaType === 'audio' || msg.mediaUrl.startsWith('data:audio') ? (
                              <div className="flex flex-col gap-2 min-w-[200px]">
                                <div className="flex items-center gap-3 p-2 bg-black/5 rounded-2xl border border-black/5">
                                  <div className="p-2 bg-[#d9fdd3] text-[#111b21] rounded-full shadow-sm">
                                    <Volume2 size={20} />
                                  </div>
                                  <audio src={msg.mediaUrl} controls className="h-8 max-w-[150px] md:max-w-full" />
                                </div>
                                {msg.transcription && (
                                  <div className="bg-white/40 p-2 rounded-lg border border-black/5 text-[11px] font-medium italic text-[#54656f]">
                                    <span className="font-black text-[9px] uppercase tracking-widest block mb-1">Transcrição:</span>
                                    {msg.transcription}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-black/5 rounded-lg border border-black/5 min-w-[200px]">
                                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><FileText size={24} /></div>
                                <div className="truncate flex-1">
                                  <p className="text-[11px] font-black truncate uppercase tracking-tighter text-slate-800">Visualizar Documento</p>
                                  <a href={msg.mediaUrl} target="_blank" className="text-[10px] text-indigo-600 underline font-bold hover:text-indigo-800 transition-colors">Download</a>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {editingMessageId === msg.id ? (
                           <div className="flex flex-col gap-2 mt-1">
                              <textarea 
                                value={editContent} 
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full p-2 text-xs border rounded bg-white font-medium outline-none focus:ring-1 focus:ring-indigo-300 h-16"
                              />
                              <div className="flex gap-2">
                                 <button onClick={handleSaveEdit} className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-1 rounded">Salvar</button>
                                 <button onClick={() => setEditingMessageId(null)} className="text-[10px] font-bold bg-slate-200 px-2 py-1 rounded">Cancelar</button>
                              </div>
                           </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}

                        <div className="absolute bottom-1 right-2 flex items-center gap-1 opacity-60 text-[9px]">
                          <span>{new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMe && !msg.isNote && (
                             <span className="text-blue-500 font-bold ml-1">✓✓</span>
                          )}
                        </div>

                        {/* Ações de Hover (Editar/Excluir) */}
                        {isMe && !msg.isSystem && (
                          <div className="absolute top-2 -left-12 opacity-0 group-hover:opacity-100 transition-all flex flex-col gap-2">
                             <button onClick={() => handleStartEdit(msg)} className="p-2 bg-white shadow-sm rounded-lg text-slate-400 hover:text-indigo-600 border border-slate-100 transition-all"><Pencil size={14}/></button>
                             <button onClick={() => handleDeleteMessage(msg.id)} className="p-2 bg-white shadow-sm rounded-lg text-slate-400 hover:text-red-500 border border-slate-100 transition-all"><Trash2 size={14}/></button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div ref={messagesEndRef} />
            </div>

            {/* Input e Controles */}
            <div className="p-3 bg-[#f0f2f5] border-t border-slate-200">
              {/* Preview de Arquivo antes do envio */}
              {selectedFile && (
                <div className="mb-3 bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xl animate-in slide-in-from-bottom duration-300">
                  <div className="flex items-center gap-3">
                    {filePreview ? (
                      <img src={filePreview} className="w-14 h-14 rounded-xl object-cover border border-slate-100 shadow-sm" alt="preview" />
                    ) : (
                      <div className="p-4 bg-slate-100 rounded-xl text-slate-500 border border-slate-200"><FileText size={28}/></div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-800 truncate max-w-[180px]">{selectedFile.name}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedFile(null); setFilePreview(null); }} className="p-3 hover:bg-red-50 text-red-500 rounded-2xl transition-all"><X size={20}/></button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                
                <div className="flex items-center bg-white rounded-2xl shadow-sm border border-slate-200">
                  <button 
                    type="button" 
                    onClick={() => setIsEmojiOpen(!isEmojiOpen)}
                    className={cn("p-3 text-slate-500 hover:text-indigo-600 transition-all", isEmojiOpen && "text-indigo-600")}
                  >
                    <Smile size={24} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-slate-500 hover:text-indigo-600 transition-all border-l border-slate-100"
                  >
                    <Paperclip size={24} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsGatilhoOpen(!isGatilhoOpen)}
                    className={cn("p-3 text-slate-500 hover:text-amber-500 transition-all border-l border-slate-100", isGatilhoOpen && "text-amber-500")}
                    title="Gatilhos Rápidos"
                  >
                    <Zap size={24} />
                  </button>
                </div>

                <form onSubmit={handleSendMessage} className="flex-1 flex flex-col gap-2">
                  <div className="flex-1 relative">
                    {/* Menu de Gatilhos */}
                    {isGatilhoOpen && (
                      <div className="absolute bottom-full mb-4 left-0 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-[2rem] p-3 flex flex-col gap-1 border border-slate-100 animate-in slide-in-from-bottom-2 duration-300 z-[70] w-64 md:w-80 max-h-[400px] overflow-y-auto">
                        <div className="flex items-center justify-between p-2 mb-2 border-b border-slate-50">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Gatilhos Rápidos</span>
                           <button type="button" onClick={() => setIsGatilhoManagerOpen(true)} className="text-[10px] font-bold text-indigo-600 hover:underline">Gerenciar</button>
                        </div>
                        {quickReplies.length === 0 && (
                          <div className="p-4 text-center">
                             <p className="text-xs text-slate-500 mb-3">Nenhum gatilho criado.</p>
                             <button type="button" onClick={handleCreateInitialGatilhos} className="text-[10px] bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg font-bold">Gerar Sugestões</button>
                          </div>
                        )}
                        {quickReplies.map(qr => (
                          <button 
                            key={qr.id} 
                            type="button" 
                            onClick={() => { setNewMessage(qr.content); setIsGatilhoOpen(false); }}
                            className="text-left p-3 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100 group"
                          >
                             <div className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 mb-1">{qr.title}</div>
                             <div className="text-[10px] text-slate-400 line-clamp-1">{qr.content}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    {isRecording ? (
                      <div className="w-full h-12 px-4 rounded-2xl bg-[#ffeeee] flex items-center justify-between border border-red-100 shadow-sm animate-pulse">
                         <div className="flex items-center gap-3">
                           <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                           <span className="text-[12px] font-bold text-red-600 tracking-tighter uppercase">Gravando Voice: {formatTime(recordingTime)}</span>
                         </div>
                         <button type="button" onClick={stopRecording} className="p-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-all"><Square size={16}/></button>
                      </div>
                    ) : (
                      <textarea 
                        placeholder={isNoteMode ? "Adicionar nota interna..." : "Enviar mensagem pelo CRM..."}
                        className={cn(
                          "w-full px-4 py-3 rounded-2xl text-sm font-semibold border-none outline-none transition-all shadow-sm min-h-[50px] max-h-[300px] resize-none overflow-y-auto pt-4",
                          isNoteMode ? "bg-[#fef3c7] focus:ring-2 focus:ring-amber-300" : "bg-white focus:ring-2 focus:ring-indigo-300"
                        )}
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = (e.target.scrollHeight) + 'px';
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        rows={1}
                      />
                    )}
                    {isEmojiOpen && (
                      <div className="absolute bottom-16 left-0 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-[2rem] p-5 grid grid-cols-6 gap-3 border border-slate-100 animate-in slide-in-from-bottom-2 duration-300 z-[70] w-64 md:w-80">
                        {["😀", "😂", "🚀", "🔥", "✅", "🙌", "🤝", "📦", "💰", "📞", "📝", "❓", "📌", "⚠️", "⏳", "🎉", "💙", "💊"].map(emoji => (
                          <button key={emoji} type="button" onClick={() => addEmoji(emoji)} className="text-2xl hover:scale-125 transition-all active:scale-95">{emoji}</button>
                        ))}
                        <button type="button" onClick={() => setIsEmojiOpen(false)} className="col-span-6 mt-2 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-100 pt-3">Fechar</button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsNoteMode(!isNoteMode)}
                      title={isNoteMode ? "Mudar para WhatsApp" : "Mudar para Nota Interna"}
                      className={cn(
                        "w-12 h-12 flex items-center justify-center rounded-2xl transition-all border shadow-sm",
                        isNoteMode ? "bg-amber-400 text-white border-amber-500" : "bg-white text-slate-400 border-slate-200 hover:bg-amber-50"
                      )}
                    >
                      {isNoteMode ? <CalendarCheck size={24} /> : <FileText size={24} />}
                    </button>

                    {!isNoteMode && !newMessage && !selectedFile ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#00a884] text-white shadow-xl shadow-emerald-200 hover:scale-110 active:scale-95 transition-all"
                      >
                        <Mic size={24} />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={(!newMessage.trim() && !selectedFile) || isSending}
                        className={cn(
                          "w-12 h-12 flex items-center justify-center rounded-2xl text-white shadow-xl transition-all active:scale-95",
                          isNoteMode ? "bg-amber-600 shadow-amber-200" : "bg-[#00a884] shadow-emerald-200"
                        )}
                      >
                        {isSending ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} className="ml-0.5" />}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criação Manual */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black">Novo Lead Manual</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                <X size={24} />
              </button>
            </div>
            <form className="space-y-5" onSubmit={handleSaveLead}>
              <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nome</label>
                 <input name="name" required placeholder="Ex: João Silva" className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-bold" />
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Telefone (com DDD)</label>
                 <input name="phone" required placeholder="Ex: 5527999881122" className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-bold" />
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Atribuir a</label>
                 <select name="assignedToId" className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none cursor-pointer font-bold">
                    <option value="">(Deixar na Fila Geral)</option>
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
              </div>
              <button 
                type="submit"
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all mt-4 tracking-widest"
              >
                 CRIAR LEAD AGORA
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gerenciador de Gatilhos */}
      {isGatilhoManagerOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-0 md:p-6 overflow-hidden">
          <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-[3rem] shadow-2xl flex flex-col animate-in zoom-in duration-300">
            <div className="flex items-center justify-between p-6 md:p-10 border-b border-slate-50">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900">Gerenciador de Gatilhos</h2>
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Personalize suas respostas rápidas</p>
              </div>
              <button 
                onClick={() => { setIsGatilhoManagerOpen(false); cancelEditQR(); }} 
                className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Coluna de Cadastro/Edição */}
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                     <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500">
                       {editingQR ? "Editando Gatilho" : "Criar Novo Gatilho"}
                     </h4>
                     {editingQR && (
                       <button onClick={cancelEditQR} className="text-[10px] font-bold text-red-500 hover:underline">Cancelar Edição</button>
                     )}
                   </div>
                   <div className="space-y-4">
                     <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Título do Botão</label>
                       <input 
                         placeholder="Ex: Preços, Boas-vindas..." 
                         className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-bold text-slate-900 text-sm"
                         value={newQRTitle}
                         onChange={(e) => setNewQRTitle(e.target.value)}
                       />
                     </div>
                     <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Mensagem do Gatilho</label>
                       <textarea 
                         placeholder="Escreva o texto que será enviado..." 
                         className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-medium text-slate-700 text-sm h-48 md:h-64 resize-none"
                         value={newQRContent}
                         onChange={(e) => setNewQRContent(e.target.value)}
                       />
                     </div>
                     <button 
                       onClick={handleAddGatilho}
                       className={cn(
                        "w-full py-5 rounded-2xl font-black shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                        editingQR ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                       )}
                     >
                       {editingQR ? "ATUALIZAR GATILHO" : "CRIAR GATILHO AGORA"}
                       <Zap size={20} className={editingQR ? "animate-pulse" : ""} />
                     </button>
                   </div>
                </div>

                {/* Coluna da Lista */}
                <div className="space-y-6 flex flex-col">
                   <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Meus Gatilhos ({quickReplies.length})</h4>
                   <div className="space-y-4">
                     {quickReplies.length === 0 ? (
                       <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                          <Zap size={32} className="mx-auto text-slate-200 mb-4" />
                          <p className="text-sm font-bold text-slate-400">Nenhum gatilho para exibir.</p>
                       </div>
                     ) : (
                       quickReplies.map(qr => (
                         <div key={qr.id} className={cn(
                           "p-5 rounded-2xl border transition-all group relative",
                           editingQR?.id === qr.id ? "bg-amber-50 border-amber-200 ring-2 ring-amber-100 shadow-sm" : "bg-slate-50 border-slate-100 hover:bg-white hover:shadow-xl hover:border-slate-200"
                         )}>
                            <div className="flex items-center justify-between mb-2">
                               <span className="font-bold text-sm text-slate-900">{qr.title}</span>
                               <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                  <button onClick={() => handleEditQR(qr)} className="text-slate-400 hover:text-indigo-600 transition-all" title="Editar"><Edit2 size={16}/></button>
                                  <button onClick={() => handleDeleteGatilho(qr.id)} className="text-slate-400 hover:text-red-600 transition-all" title="Excluir"><Trash2 size={16}/></button>
                               </div>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{qr.content}</p>
                         </div>
                       ))
                     )}
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
