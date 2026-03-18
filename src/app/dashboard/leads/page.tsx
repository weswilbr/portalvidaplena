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
  LayoutGrid
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getLeads, createLead, updateLead, deleteLead } from "@/app/actions/leads";
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

export default function LeadsPage() {
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
    setLeads(data);
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
    window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${message}`, "_blank");
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
      interest: formData.get("interest") as string,
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

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Leads</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus prospectos e converta-os em membros Vida Plena.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-secondary p-1 rounded-xl border border-border/10">
            <button 
              onClick={() => setViewMode("table")}
              className={cn("p-2 rounded-lg transition-all", viewMode === "table" ? "bg-white dark:bg-slate-800 shadow-sm text-primary" : "text-muted-foreground hover:text-primary")}
            >
              <List size={20} />
            </button>
            <button 
              onClick={() => setViewMode("kanban")}
              className={cn("p-2 rounded-lg transition-all", viewMode === "kanban" ? "bg-white dark:bg-slate-800 shadow-sm text-primary" : "text-muted-foreground hover:text-primary")}
            >
              <LayoutGrid size={20} />
            </button>
          </div>
          <button 
            onClick={() => {
              setSelectedLead(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={20} />
            Novo Prospecto
          </button>
        </div>
      </header>

      {/* Filters Area */}
      <div className="p-4 bg-card rounded-[1.5rem] border border-border/50 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, telefone ou e-mail..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary border-none outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border/10 hover:bg-accent transition-colors font-medium text-sm">
            <Filter size={16} />
            Filtros
          </button>
          <select 
            className="px-4 py-2.5 rounded-xl bg-secondary border border-border/10 hover:bg-accent transition-colors font-medium text-sm outline-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Status: Todos</option>
            <option value="NEW">Novo</option>
            <option value="CONTACTED">Contatado</option>
            <option value="PRESENTED">Apresentado</option>
            <option value="CLOSED">Fechado</option>
          </select>
        </div>
      </div>

      {/* Leads Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-card rounded-[2rem] border border-border/50 shadow-sm overflow-hidden min-h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="px-6 py-4 font-semibold text-sm">Nome / Contato</th>
                  <th className="px-6 py-4 font-semibold text-sm">Origem</th>
                  <th className="px-6 py-4 font-semibold text-sm">Interesse</th>
                  <th className="px-6 py-4 font-semibold text-sm">Status</th>
                  <th className="px-6 py-4 font-semibold text-sm text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-accent/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{lead.name}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone size={12} /> {lead.phone}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                        {lead.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {lead.interest}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold",
                        statusStyles[lead.status as keyof typeof statusStyles]
                      )}>
                        {statusLabels[lead.status as keyof typeof statusLabels]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleSendMessage(lead.phone)}
                          className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-colors"
                          title="Enviar mensagem no WhatsApp"
                        >
                          <MessageSquare size={18} />
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(lead)}
                          className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 transition-colors" 
                          title="Editar Lead"
                        >
                          <ExternalLink size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteLead(lead.id)}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                          title="Excluir Lead"
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
          <div className="p-6 border-t border-border/50 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-sm text-muted-foreground">
            <span>Mostrando {filteredLeads.length} leads</span>
            <div className="flex items-center gap-2">
              <button disabled className="px-3 py-1 rounded-lg bg-secondary disabled:opacity-50">Anterior</button>
              <button className="px-3 py-1 rounded-lg bg-secondary hover:bg-accent transition-colors">Próximo</button>
            </div>
          </div>
        </div>
      ) : (
        <KanbanView 
          leads={filteredLeads}
          onEdit={handleOpenEditModal}
          onDelete={handleDeleteLead}
          onSendMessage={handleSendMessage}
        />
      )}

      {/* Modal Lead (Novo/Editar) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-[2.5rem] border border-border shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{selectedLead ? "Editar Lead" : "Novo Prospecto"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-accent rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form className="space-y-4" onSubmit={handleSaveLead}>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Nome Completo</label>
                <input 
                  name="name"
                  type="text" 
                  defaultValue={selectedLead?.name || ""}
                  placeholder="Ex: João Silva" 
                  className="w-full mt-1.5 p-3 rounded-2xl bg-secondary border-none focus:ring-2 focus:ring-primary outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">WhatsApp (ddd+número)</label>
                <input 
                  name="phone"
                  type="text" 
                  defaultValue={selectedLead?.phone || ""}
                  placeholder="Ex: 11999999999" 
                  className="w-full mt-1.5 p-3 rounded-2xl bg-secondary border-none focus:ring-2 focus:ring-primary outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">E-mail</label>
                <input 
                  name="email"
                  type="email" 
                  defaultValue={selectedLead?.email || ""}
                  placeholder="Ex: joao@email.com" 
                  className="w-full mt-1.5 p-3 rounded-2xl bg-secondary border-none focus:ring-2 focus:ring-primary outline-none transition-all"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Interesse</label>
                  <select 
                    name="interest"
                    defaultValue={selectedLead?.interest || "Negócio"}
                    className="w-full mt-1.5 p-3 rounded-2xl bg-secondary border-none focus:ring-2 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="Negócio">Negócio</option>
                    <option value="Produto">Produto</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Status</label>
                  <select 
                    name="status"
                    defaultValue={selectedLead?.status || "NEW"}
                    className="w-full mt-1.5 p-3 rounded-2xl bg-secondary border-none focus:ring-2 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="NEW">Novo</option>
                    <option value="CONTACTED">Contatado</option>
                    <option value="PRESENTED">Apresentado</option>
                    <option value="CLOSED">Fechado</option>
                    <option value="LOST">Perdido</option>
                  </select>
                </div>
              </div>
              
              <button 
                type="submit"
                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:opacity-90 transition-all mt-4"
              >
                {selectedLead ? "Salvar Alterações" : "Cadastrar Prospecto"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
