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
  ArrowRightLeft
} from "lucide-react";
import React, { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { openWhatsApp } from "@/lib/utils";
import { getLeads, createLead, updateLead, deleteLead, pullLead } from "@/app/actions/leads";
import KanbanView from "@/components/leads/KanbanView";

const statusStyles = {
  NEW: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CONTACTED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  PRESENTED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  CLOSED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  LOST: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  NEW: "Novo",
  CONTACTED: "Contatado",
  PRESENTED: "Apresentado",
  CLOSED: "Fechado",
  LOST: "Perdido",
};

export default function LeadsClient({ user }: { user: any }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  useEffect(() => {
    refreshLeads();
  }, []);

  const refreshLeads = async () => {
    setLoading(true);
    const data = await getLeads();
    setLeads(data.filter((l: any) => l.interest !== "Produto")); // Filtra apenas Leads de NEGÓCIO
    setLoading(false);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        (lead.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.phone || "").includes(searchTerm) ||
        (lead.email || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "" || lead.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, leads]);

  const handleSendMessage = (phone: string) => {
    if (!phone) return;
    const message = encodeURIComponent("Olá! Sou do Projeto Vida Plena, como posso te ajudar?");
    openWhatsApp(phone, "Olá! Sou do Projeto Vida Plena, como posso te ajudar?");
  };

  const handleDeleteLead = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este lead?")) {
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
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">Gestão de Leads (Negócio)</h1>
          <p className="text-slate-500 font-medium mt-2">Gerencie seus prospectos interessados no Projeto Vida Plena e 4Life.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
            <button 
              onClick={() => setViewMode("table")}
              className={cn("p-2.5 rounded-xl transition-all", viewMode === "table" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-indigo-600")}
            >
              <List size={20} />
            </button>
            <button 
              onClick={() => setViewMode("kanban")}
              className={cn("p-2.5 rounded-xl transition-all", viewMode === "kanban" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-indigo-600")}
            >
              <LayoutGrid size={20} />
            </button>
          </div>
          <button 
            onClick={() => {
              setSelectedLead(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
          >
            <Plus size={20} />
            Novo Prospecto
          </button>
        </div>
      </header>

      {/* Filters Area */}
      <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, telefone ou e-mail..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="px-6 py-3 rounded-2xl bg-white border border-slate-100 outline-none cursor-pointer font-bold text-slate-600 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Filtro: Todos</option>
          <option value="NEW">Novo</option>
          <option value="CONTACTED">Contatado</option>
          <option value="PRESENTED">Apresentado</option>
          <option value="CLOSED">Fechado</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
                  <th className="px-8 py-5 font-black text-xs uppercase tracking-widest text-slate-400 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-indigo-50/30 transition-all group">
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{lead.name}</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <Phone size={12} /> {lead.phone}
                        </span>
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
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 text-slate-400">
                        {(!lead.assignedTo || (lead.assignedTo.id !== user?.id && user?.role === 'ADMIN')) && (
                          <button
                            onClick={() => handlePullLead(lead.id)}
                            title="Puxar Atendimento"
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-1"
                          >
                            <ArrowRightLeft size={14} />
                            <span>Puxar</span>
                          </button>
                        )}
                        <button 
                          onClick={() => handleSendMessage(lead.phone)}
                          className="p-2.5 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                          title="WhatsApp"
                        >
                          <MessageSquare size={18} />
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(lead)}
                          className="p-2.5 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all" 
                          title="Editar"
                        >
                          <ExternalLink size={18} />
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
          onSendMessage={handleSendMessage}
          onStatusChange={handleKanbanStatusChange}
        />
      )}

      {/* Modal Lead */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black">{selectedLead ? "Ajustar Lead" : "Novo Prospecto"}</h2>
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
                  className="w-full p-5 rounded-2xl bg-slate-50 border-none focus:ring-4 focus:ring-indigo-100 outline-none font-bold"
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
                  className="w-full p-5 rounded-2xl bg-slate-50 border-none focus:ring-4 focus:ring-indigo-100 outline-none font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Área / Foco</label>
                <select 
                  name="interest"
                  defaultValue={selectedLead?.interest || "Negócio"}
                  className="w-full p-5 rounded-2xl bg-slate-50 border-none focus:ring-4 focus:ring-indigo-100 outline-none font-black text-slate-700"
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
                  className="w-full p-5 rounded-2xl bg-slate-50 border-none focus:ring-4 focus:ring-indigo-100 outline-none font-black text-indigo-600"
                >
                  <option value="NEW">Novo</option>
                  <option value="CONTACTED">Contatado</option>
                  <option value="PRESENTED">Apresentado</option>
                  <option value="CLOSED">Fechado/Finalizado</option>
                  <option value="LOST">Perdido</option>
                </select>
              </div>
              
              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white py-6 rounded-3xl font-black text-xl shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all mt-4"
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
