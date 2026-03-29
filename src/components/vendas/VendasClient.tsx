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
  CheckCircle2
} from "lucide-react";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { getLeads, createLead, updateLead, deleteLead, addMessage, transferLead, pullLead } from "@/app/actions/leads";
import { getSellers } from "@/app/actions/users";
import KanbanView from "@/components/leads/KanbanView";

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
  const [transferUserId, setTransferUserId] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (isDetailsOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedLead?.messages, isDetailsOpen]);

  const refreshData = async () => {
    setLoading(true);
    // Vendedores veem TODOS os leads de Produto para poder acompanhar e "puxar", 
    // mas não afeta a segurança pois o painel inteiro é auditável.
    const [leadsData, sellersData] = await Promise.all([
      getLeads(),
      getSellers()
    ]);
    
    setLeads(leadsData.filter((l: any) => l.interest === "Produto"));
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
    const message = encodeURIComponent("Olá! Sou consultor 4Life, vi seu interesse em nossos produtos. Como posso te auxiliar?");
    window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${message}`, "_blank");
  };

  const handleAddInternalMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedLead) return;
    
    const res = await addMessage({
      leadId: selectedLead.id,
      content: newMessage,
      authorId: user.id
    });
    
    if (res.success) {
      setNewMessage("");
      refreshData();
    }
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
                      <td className="px-6 md:px-8 py-4 md:py-5">
                        <div className="font-bold text-slate-900 text-sm md:text-base">{lead.name}</div>
                        <div className="text-xs font-medium text-slate-400 mt-0.5">{lead.phone}</div>
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
                            className="px-3 py-1.5 md:px-4 md:py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-1"
                           >
                             <ArrowRightLeft size={14} /> <span className="hidden md:inline">Puxar</span>
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
              <div>
                <h3 className="text-2xl font-black text-slate-900">{selectedLead.name}</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">{selectedLead.phone}</p>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-all">
                <X size={20} />
              </button>
            </header>

            <div className="p-6 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
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
                <div className="text-center text-slate-400 font-medium text-sm py-8">
                  Nenhuma anotação neste lead.
                </div>
              ) : (
                selectedLead.messages?.map((msg: any) => (
                  <div key={msg.id} className={cn(
                    "p-4 rounded-2xl w-[90%] space-y-2 relative group",
                    msg.isSystem ? "bg-slate-200 text-slate-700 mx-auto w-[95%] text-xs text-center italic" : 
                    msg.author?.name === user.name ? "bg-indigo-600 text-white ml-auto rounded-br-sm" : 
                    "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                  )}>
                    {!msg.isSystem && (
                      <div className="flex justify-between items-center text-[10px] font-bold opacity-70 mb-1">
                        <span>{msg.author?.name === user.name ? "Você" : msg.author?.name || "Usuário Removido"}</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    <p className={cn("leading-relaxed", msg.isSystem ? "text-[11px] font-semibold" : "text-sm font-medium")}>
                      {msg.content}
                    </p>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleAddInternalMessage} className="p-4 bg-white border-t border-slate-100">
              <div className="relative flex items-center">
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Adicionar nota interna ou histórico..."
                  className="w-full bg-slate-100 border-none rounded-2xl pl-4 pr-14 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-100 outline-none"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-2 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-all"
                >
                  <Send size={16} />
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
