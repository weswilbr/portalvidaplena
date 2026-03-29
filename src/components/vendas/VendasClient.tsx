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
  User
} from "lucide-react";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { cn, openWhatsApp, getWhatsAppHref } from "@/lib/utils";
import { getLeads, createLead, updateLead, deleteLead, addMessage, transferLead, pullLead, sendWhatsAppMessage, addInternalNote } from "@/app/actions/leads";
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    // Vendedores veem TODOS os leads de Produto para poder acompanhar e "puxar", 
    // mas não afeta a segurança pois o painel inteiro é auditável.
    const [leadsData, sellersData] = await Promise.all([
      getLeads(),
      getSellers()
    ]);
    
    // Lista os de produto, mas também puxa os leads virgens (sem interesse listado do bot)
    setLeads(leadsData.filter((l: any) => l.interest === "Produto" || !l.interest));
    setSellers(sellersData);
    
    // Atualiza o lead selecionado se o modal de detalhes estiver aberto
    if (selectedLead) {
      const updatedLead = leadsData.find((l: any) => l.id === selectedLead.id);
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
    if (!newMessage.trim() || !selectedLead || isSending) return;

    setIsSending(true);
    let res;

    if (isNoteMode) {
      res = await addInternalNote({ leadId: selectedLead.id, content: newMessage, authorId: user.id });
    } else {
      res = await sendWhatsAppMessage({ leadId: selectedLead.id, content: newMessage, authorId: user.id });
    }

    if (res.success) {
      setNewMessage("");
      refreshData();
    }
    setIsSending(false);
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
                         {(!lead.assignedTo || lead.assignedTo.id !== user.id) && (
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

      {/* Modal Lateral (Slide-over) */}
      {isDetailsOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDetailsOpen(false)}></div>
          
          <div className="relative w-full sm:max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right md:slide-in-from-right duration-300">
            <header className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-4">
                {selectedLead.profilePic ? (
                  <img src={selectedLead.profilePic} alt={selectedLead.name} className="w-14 h-14 rounded-full object-cover border-2 border-slate-200 shadow-sm" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400 font-bold border border-indigo-100">
                    <User size={28}/>
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-black text-slate-900 leading-none mb-1">{selectedLead.name}</h3>
                  <a href={getWhatsAppHref(selectedLead.phone?.split(':')[0] || '')} target="_blank" rel="noreferrer" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 active:scale-95 transition-all w-fit">
                    {formatPhoneNumber(selectedLead.phone)}
                  </a>
                </div>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="p-3 hover:bg-slate-200 bg-slate-100 text-slate-500 rounded-2xl transition-all">
                <X size={20} />
              </button>
            </header>

            <div className="p-6 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Área de Foco</label>
                <select 
                  className={cn("text-xs font-bold px-3 py-2 rounded-lg outline-none cursor-pointer appearance-none bg-slate-100 border border-slate-200 text-slate-700")}
                  value={selectedLead.interest || "Produto"}
                  onChange={handleInterestChange}
                >
                  <option value="Produto">Venda Produto</option>
                  <option value="Negócio">Negócio/Afiliado</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Atendente Atual</label>
                <div className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  {selectedLead.assignedTo ? selectedLead.assignedTo.name : "Fila Geral (Sem Dono)"}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Alterar Status</label>
                <select 
                  className={cn("text-xs font-bold px-3 py-2 rounded-lg outline-none cursor-pointer appearance-none", statusStyles[selectedLead.status as keyof typeof statusStyles])}
                  value={selectedLead.status}
                  onChange={handleStatusChange}
                >
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key} className="bg-white text-slate-900">{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 w-full mt-2">
                <button 
                  onClick={() => setIsTransferring(!isTransferring)}
                  className="flex-1 py-2.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowRightLeft size={16} /> {isTransferring ? "Cancelar Transferência" : "Transferir Lead"}
                </button>
                <button 
                  onClick={() => handleSendMessageWhatsApp(selectedLead.phone)}
                  className="flex-1 py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                >
                  <MessageSquare size={16} /> Chamar WhatsApp
                </button>
              </div>

              {isTransferring && (
                <div className="w-full flex items-center gap-2 animate-in fade-in duration-300 pt-2 border-t border-slate-100 mt-2">
                  <select 
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none"
                    value={transferUserId}
                    onChange={(e) => setTransferUserId(e.target.value)}
                  >
                    <option value="">Selecione outro atendente...</option>
                    {sellers.filter(s => s.id !== selectedLead.assignedTo?.id).map(seller => (
                      <option key={seller.id} value={seller.id}>{seller.name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={handleTransfer}
                    disabled={!transferUserId}
                    className="p-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"
                  >
                    Confirmar
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
              <div className="text-center pb-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Histórico de Atendimento</span>
              </div>
              
              {selectedLead.messages?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <MessageSquare size={32} className="mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhuma mensagem ainda.</p>
                  <p className="text-xs mt-1">Envie uma mensagem WhatsApp para iniciar o atendimento.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {selectedLead.messages?.map((msg: any) => {
                    const isMe = msg.author?.id === user.id;
                    const isClient = !msg.author && !msg.isSystem;

                    if (msg.isSystem) {
                      return (
                        <div key={msg.id} className="flex items-center gap-2 my-1">
                          <div className="flex-1 h-px bg-slate-200" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap px-2">{msg.content}</span>
                          <div className="flex-1 h-px bg-slate-200" />
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={cn("flex flex-col gap-1 max-w-[82%]", isMe ? "self-end items-end" : "self-start items-start")}>
                        <span className="text-[10px] font-bold text-slate-400 px-1">
                          {isClient ? "👤 Cliente" : isMe ? "Você" : msg.author?.name || "Atendente"}
                          {msg.isNote && " · 📝 Nota"}
                        </span>
                        <div className={cn(
                          "px-4 py-3 rounded-2xl text-sm font-medium shadow-sm leading-relaxed",
                          isClient
                            ? "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                            : msg.isNote
                            ? "bg-amber-50 border border-amber-200 text-amber-900 rounded-tr-sm"
                            : isMe
                            ? "bg-indigo-600 text-white rounded-tr-sm"
                            : "bg-slate-200 text-slate-700 rounded-tr-sm"
                        )}>
                          {msg.content}
                        </div>
                        <span className="text-[9px] text-slate-400 px-1">
                          {new Date(msg.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 space-y-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e as any); }
                }}
                placeholder={isNoteMode ? "Escreva uma nota interna... (Enter para salvar)" : "Mensagem para enviar via WhatsApp... (Enter para enviar)"}
                rows={2}
                className={cn(
                  "w-full rounded-2xl px-4 py-3 text-sm font-medium resize-none outline-none transition-all",
                  isNoteMode
                    ? "bg-amber-50 border border-amber-200 focus:ring-2 focus:ring-amber-300"
                    : "bg-slate-100 border-none focus:ring-4 focus:ring-indigo-100"
                )}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsNoteMode(!isNoteMode)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-bold transition-all border",
                    isNoteMode
                      ? "bg-amber-100 text-amber-700 border-amber-300"
                      : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-600"
                  )}
                >
                  📝 Nota
                </button>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm",
                    isNoteMode
                      ? "bg-amber-400 text-white hover:bg-amber-500 disabled:opacity-50"
                      : "bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 shadow-emerald-200"
                  )}
                >
                  {isSending
                    ? <Loader2 size={14} className="animate-spin" />
                    : isNoteMode ? "💾 Salvar Nota" : "📱 Enviar WhatsApp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Criação Manual para testes */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black">Criar Atendimento</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                <X size={24} />
              </button>
            </div>
            <form className="space-y-5" onSubmit={handleSaveLead}>
              <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nome</label>
                 <input name="name" required className="w-full p-4 rounded-2xl bg-slate-50 outline-none" />
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Telefone</label>
                 <input name="phone" required className="w-full p-4 rounded-2xl bg-slate-50 outline-none" />
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Atribuir a</label>
                 <select name="assignedToId" className="w-full p-4 rounded-2xl bg-slate-50 outline-none cursor-pointer">
                    <option value="">(Deixar na Fila Geral)</option>
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
              </div>
              <button className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all mt-4">
                 SALVAR
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
