"use client";

import { 
  Search, 
  Filter, 
  Plus, 
  Phone, 
  MessageSquare,
  ExternalLink,
  X,
  List,
  LayoutGrid,
  ArrowRightLeft,
  Pencil
} from "lucide-react";
import React, { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { openWhatsApp } from "@/lib/utils";
import { getLeads, createLead, updateLead, deleteLead, pullLead } from "@/app/actions/leads";
import { getSellers } from "@/app/actions/users";
import KanbanView from "@/components/leads/KanbanView";
import { User } from "lucide-react";

const statusStyles = {
  NEW: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CONTACTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PRESENTED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  REMARKETING: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CLOSED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  FOLLOWUP: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  LOST: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  NEW: "Recepção",
  CONTACTED: "Relacionamento",
  PRESENTED: "Apresentação",
  REMARKETING: "Pronto p/ Cadastro",
  CLOSED: "Cadastrado (4Life)",
  FOLLOWUP: "Acompanhamento",
  LOST: "Perdido",
};

export default function LeadsClient({ user }: { user: any }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [sellerFilter, setSellerFilter] = useState("");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  useEffect(() => {
    refreshLeads();
    fetchSellers();

    // Auto-refresh a cada 5 segundos (Tempo Real Silencioso)
    const interval = setInterval(() => {
      if (!isModalOpen) refreshLeads(true); // Só atualiza se não estiver com o modal aberto editando
    }, 5000);

    return () => clearInterval(interval);
  }, [isModalOpen]);

  const fetchSellers = async () => {
    const data = await getSellers();
    setSellers(data);
  };

  const refreshLeads = async (silent = false) => {
    if (!silent) setLoading(true);
    const data = await getLeads();
    setLeads(data.filter((l: any) => l.interest !== "Produto")); // Filtra apenas Leads de NEGÓCIO
    if (!silent) setLoading(false);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        (lead.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.phone || "").includes(searchTerm) ||
        (lead.email || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "" || lead.status === statusFilter;
      const matchesSeller = sellerFilter === "" || lead.assignedToId === sellerFilter;
      return matchesSearch && matchesStatus && matchesSeller;
    });
  }, [searchTerm, statusFilter, sellerFilter, leads]);


  const handleDeleteLead = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este convidado?")) {
      const res = await deleteLead(id);
      if (res.success) {
        refreshLeads();
      } else {
        alert(res.error);
      }
    }
  };

  const handlePullLead = async (leadId: string) => {
    const res = await pullLead(leadId, user.id);
    if (res.success) refreshLeads();
  };

  const handleOpenEditModal = (lead: any) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const leadData = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      interest: formData.get("interest") as string || "Negócio",
      status: formData.get("status") as string,
    };

    let res;
    if (selectedLead) {
      res = await updateLead(selectedLead.id, leadData);
    } else {
      res = await createLead(leadData);
    }

    if (res.success) {
      setIsModalOpen(false);
      setSelectedLead(null);
      refreshLeads();
    } else {
      alert(res.error);
    }
  };

  const handleKanbanStatusChange = async (leadId: string, newStatus: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    await updateLead(leadId, { status: newStatus });
    refreshLeads();
  };

  return (
    <div className="p-3 md:p-4 space-y-3 md:space-y-4 pb-4 md:pb-4 max-w-full overflow-hidden">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-lg md:text-2xl font-black tracking-tight text-slate-900 leading-none">Convidados</h1>
          <p className="text-slate-500 font-medium mt-1 text-xs md:text-sm hidden md:block">Gerencie seus prospectos Vida Plena.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg transition-all font-bold text-[10px] uppercase tracking-wider", 
                viewMode === "table" ? "bg-white text-blue-700 shadow-sm" : "text-slate-400 hover:text-blue-700"
              )}
            >
              <List size={14} />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button 
              onClick={() => setViewMode("kanban")}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all font-bold text-[10px] uppercase tracking-wider", 
                viewMode === "kanban" ? "bg-white text-blue-700 shadow-sm" : "text-slate-400 hover:text-blue-700"
              )}
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Kanban</span>
            </button>
          </div>
          <button 
            onClick={() => {
              setSelectedLead(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1 bg-blue-700 text-white px-3 py-2 rounded-xl font-bold text-xs hover:bg-blue-800 transition-all shadow-md"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Novo Convidado</span>
          </button>
        </div>
      </header>

      {/* FAB for Mobile - Above Bottom Nav */}
      <button 
        onClick={() => {
          setSelectedLead(null);
          setIsModalOpen(true);
        }}
        className="fixed bottom-24 right-4 z-40 md:hidden h-14 w-14 bg-blue-700 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
      >
        <Plus size={24} />
      </button>

      {/* Filters Area - Compact */}
      <div className="p-3 bg-white rounded-2xl border border-slate-200 flex flex-col gap-2">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Buscar convidados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
          />
          <input 
            type="text" 
            placeholder="Buscar por nome, telefone ou e-mail..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="px-6 py-3 rounded-2xl bg-white border border-slate-100 outline-none cursor-pointer font-bold text-slate-600 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Status: Todos</option>
          <option value="NEW">Recepção</option>
          <option value="CONTACTED">Relacionamento</option>
          <option value="PRESENTED">Apresentação</option>
          <option value="REMARKETING">Pronto p/ Cadastro</option>
          <option value="CLOSED">Cadastrado (4Life)</option>
          <option value="FOLLOWUP">Acompanhamento</option>
          <option value="LOST">Perdido</option>
        </select>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select 
            className="flex-1 md:flex-none px-6 py-3 rounded-2xl bg-blue-50 border border-blue-100 outline-none cursor-pointer font-black text-blue-800 text-sm"
            value={sellerFilter}
            onChange={(e) => setSellerFilter(e.target.value)}
          >
            <option value="">Parceiro: Todos</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {user?.role === 'SELLER' && (
            <button 
              onClick={() => setSellerFilter(sellerFilter === user.id ? "" : user.id)}
              className={cn(
                "px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all",
                sellerFilter === user.id ? "bg-blue-700 text-white shadow-lg" : "bg-white border border-slate-100 text-slate-600 hover:bg-slate-50"
              )}
            >
              <User size={16} />
              <span>{sellerFilter === user.id ? "Vendo Meus Convidados" : "Meus Convidados"}</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-8 py-5 font-black text-xs uppercase tracking-widest text-slate-400">Nome / Contato</th>
                  <th className="px-8 py-5 font-black text-xs uppercase tracking-widest text-slate-400">Origem</th>
                  <th className="px-8 py-5 font-black text-xs uppercase tracking-widest text-slate-400">Atribuído a</th>
                  <th className="px-8 py-5 font-black text-xs uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-8 py-5 font-black text-xs uppercase tracking-widest text-slate-400 text-left md:text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-blue-50/30 transition-all group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {lead.profilePic ? (
                            <img 
                              src={lead.profilePic} 
                              alt={lead.name} 
                              className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover border border-slate-200 shadow-sm"
                              onError={(e) => {
                                (e.target as any).style.display = 'none';
                                (e.target as any).nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            style={{ display: lead.profilePic ? 'none' : 'flex' }}
                            className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black border border-slate-200 text-xs"
                          >
                            {lead.name?.charAt(0) || 'L'}
                          </div>
                        </div>
                        <div className="flex flex-col relative">
                           <div className="font-black text-slate-900 text-sm md:text-base flex items-center gap-2">
                              {lead.name}
                              {lead.unreadCount > 0 && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-700 text-[10px] font-black text-white shadow-lg animate-in zoom-in duration-300">
                                  {lead.unreadCount}
                                </span>
                              )}
                           </div>
                          <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                            <Phone size={12} /> {lead.phone}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 rounded-lg px-2 py-1">
                        {lead.source}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-xs font-medium text-slate-400 italic">
                        {lead.assignedTo?.name || "Não atribuído"}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm",
                        statusStyles[lead.status as keyof typeof statusStyles]
                      )}>
                        {statusLabels[lead.status as keyof typeof statusLabels]}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-left md:text-right">
                      <div className="flex items-center justify-start md:justify-end gap-2 text-slate-400">
                        {(!lead.assignedTo || (lead.assignedTo.id !== user?.id && user?.role === 'ADMIN')) && (
                          <button
                            onClick={() => handlePullLead(lead.id)}
                            title="Puxar Atendimento"
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl font-bold text-xs hover:bg-blue-700 hover:text-white transition-all shadow-sm flex items-center gap-1"
                          >
                            <ArrowRightLeft size={14} />
                            <span>Puxar</span>
                          </button>
                        )}
                         <button 
                           onClick={() => window.location.href = `/dashboard/vendas?leadId=${lead.id}`}
                           className="p-2.5 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition-all font-bold flex items-center gap-1" 
                           title="Abrir Chat"
                         >
                           <MessageSquare size={18} />
                           <span className="text-[10px] hidden md:inline">Chat</span>
                         </button>
                         <button 
                           onClick={() => handleOpenEditModal(lead)}
                           className="p-2.5 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all" 
                           title="Editar Detalhes"
                         >
                           <Pencil size={18} />
                         </button>
                         <button 
                           onClick={() => handleDeleteLead(lead.id)}
                           className="p-2.5 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
                           title="Excluir"
                         >
                           <X size={18} />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <KanbanView 
          leads={filteredLeads}
          onEdit={handleOpenEditModal}
          onDelete={handleDeleteLead}
          onStatusChange={handleKanbanStatusChange}
        />
      )}

      {/* Modal Lead */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black">{selectedLead ? "Ajustar Convidado" : "Novo Convidado"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                <X size={24} />
              </button>
            </div>
            
            <form className="space-y-6" onSubmit={handleSaveLead}>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
                <input 
                  name="name"
                  type="text" 
                  defaultValue={selectedLead?.name || ""}
                  placeholder="Ex: João Silva" 
                  className="w-full p-5 rounded-2xl bg-slate-50 border-none focus:ring-4 focus:ring-blue-100 outline-none font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">WhatsApp</label>
                <input 
                  name="phone"
                  type="text" 
                  defaultValue={selectedLead?.phone || ""}
                  placeholder="Ex: 11999999999" 
                  className="w-full p-5 rounded-2xl bg-slate-50 border-none focus:ring-4 focus:ring-blue-100 outline-none font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Área / Foco</label>
                <select 
                  name="interest"
                  defaultValue={selectedLead?.interest || "Negócio"}
                  className="w-full p-5 rounded-2xl bg-slate-50 border-none focus:ring-4 focus:ring-blue-100 outline-none font-black text-slate-700"
                >
                  <option value="Negócio">Projeto/Afiliado (Esta aba)</option>
                  <option value="Produto">Venda de Produto (Aba Vendas)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Origem / Status</label>
                <select 
                  name="status"
                  defaultValue={selectedLead?.status || "NEW"}
                  className="w-full p-5 rounded-2xl bg-slate-50 border-none focus:ring-4 focus:ring-blue-100 outline-none font-black text-blue-700"
                >
                  <option value="NEW">Recepção</option>
                  <option value="CONTACTED">Relacionamento</option>
                  <option value="PRESENTED">Apresentação</option>
                  <option value="REMARKETING">Pronto p/ Cadastro</option>
                  <option value="CLOSED">Cadastrado (4Life)</option>
                  <option value="FOLLOWUP">Acompanhamento</option>
                  <option value="LOST">Perdido</option>
                </select>
              </div>
              
              <button 
                type="submit"
                className="w-full bg-blue-700 text-white py-6 rounded-3xl font-black text-xl shadow-2xl shadow-blue-100 hover:bg-blue-800 transition-all mt-4"
              >
                {selectedLead ? "SALVAR ALTERAÇÕES" : "CADASTRAR PROSPECTO"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
