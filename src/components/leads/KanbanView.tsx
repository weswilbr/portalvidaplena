"use client";

import React, { useMemo, useState } from "react";
import { cn, getWhatsAppHref } from "@/lib/utils";
import { MessageSquare, ExternalLink, X, Phone } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  status: string;
  phone?: string;
  interest?: string;
  profilePic?: string;
  aiStatus?: string;
  aiScore?: number;
}

function formatPhoneNumber(phone: string) {
  if (!phone) return "";
  const basePhone = phone.split(':')[0];
  const cleaned = basePhone.replace(/\D/g, "");
  
  if (cleaned.length === 13 && cleaned.startsWith("55")) { // +55 27 99999-9999
    return `+55 (${cleaned.substring(2, 4)}) ${cleaned.substring(4, 9)}-${cleaned.substring(9)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith("55")) { // +55 27 9999-9999
    return `+55 (${cleaned.substring(2, 4)}) ${cleaned.substring(4, 8)}-${cleaned.substring(8)}`;
  }
  return basePhone.startsWith("+") ? basePhone : `+${cleaned || phone}`;
}

interface KanbanViewProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (leadId: string, newStatus: string) => Promise<void> | void;
}

const statusColumns = [
  { id: "NEW", label: "LEADS ENTRANTES", color: "bg-blue-500" },
  { id: "CONTACTED", label: "QUALIFICAÇÃO E DIAGNÓSTICO", color: "bg-indigo-600" },
  { id: "PRESENTED", label: "SOLUÇÃO E FECHAMENTO", color: "bg-orange-500" },
  { id: "REMARKETING", label: "REMARKETING ATIVO", color: "bg-purple-500" },
  { id: "CLOSED", label: "CLIENTE ATIVADO", color: "bg-emerald-500" },
  { id: "LOST", label: "OPORTUNIDADES PERDIDAS", color: "bg-slate-500" },
];

export default function KanbanView({ leads, onEdit, onDelete, onStatusChange }: KanbanViewProps) {
  const [draggedLead, setDraggedLead] = React.useState<Lead | null>(null);
  const [activeColumn, setActiveColumn] = useState("NEW");

  const groupedLeads = useMemo(() => {
    return statusColumns.reduce((acc, col) => {
      acc[col.id] = leads.filter(l => l.status === col.id);
      return acc;
    }, {} as Record<string, Lead[]>);
  }, [leads]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const handleDrop = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    if (draggedLead && draggedLead.status !== statusId && onStatusChange) {
      onStatusChange(draggedLead.id, statusId);
    }
    setDraggedLead(null);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Mobile Column Switcher */}
      <div className="flex md:hidden bg-slate-50 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar scroll-smooth">
        {statusColumns.map((col) => {
          const count = groupedLeads[col.id]?.length || 0;
          return (
            <button
              key={col.id}
              onClick={() => setActiveColumn(col.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest whitespace-nowrap",
                activeColumn === col.id ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-indigo-600"
              )}
            >
              <span>{col.label}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[8px]",
                activeColumn === col.id ? "bg-white/20" : "bg-slate-200"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col md:flex-row gap-6 overflow-x-auto md:pb-6 min-h-[400px] md:min-h-[600px] w-full items-stretch shrink-0">
        {statusColumns.map((col) => (
          <div 
            key={col.id} 
            className={cn(
              "flex-1 min-w-[320px] max-w-[400px] flex flex-col shrink-0 transition-all duration-300",
              activeColumn !== col.id ? "hidden md:flex" : "flex"
            )}
          >
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <div className={cn("w-2 h-2 rounded-full", col.color)}></div>
                <h3 className="font-bold text-sm uppercase tracking-widest">{col.label}</h3>
                <span className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {groupedLeads[col.id]?.length || 0}
                </span>
              </div>
            </div>

            <div 
              className="bg-slate-50/70 dark:bg-slate-900/50 p-4 rounded-[2rem] flex-1 space-y-4 border border-slate-200/60 dark:border-slate-800/60 transition-colors duration-300 flex flex-col items-center"
              style={{ minHeight: "200px" }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {groupedLeads[col.id]?.map((lead) => (
                <div 
                  key={lead.id}
                  draggable
                  onDragStart={() => setDraggedLead(lead)}
                  onDragEnd={() => setDraggedLead(null)}
                  className={cn(
                    "bg-white dark:bg-slate-800 p-5 w-full rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group cursor-grab active:cursor-grabbing hover:border-indigo-300",
                    draggedLead?.id === lead.id && "opacity-50 scale-95 border-indigo-500 shadow-xl"
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {lead.profilePic && (
                        <img src={lead.profilePic} alt={lead.name} className="w-8 h-8 rounded-full object-cover shadow-sm border border-slate-200" />
                      )}
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 leading-tight flex items-center gap-2">
                        {lead.name}
                        {lead.aiStatus && (
                          <div 
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest flex items-center gap-0.5 shadow-sm",
                              lead.aiStatus === 'QUENTE' ? "bg-orange-500 text-white" :
                              lead.aiStatus === 'MORNO' ? "bg-amber-400 text-white" : "bg-slate-200 text-slate-500"
                            )}
                            title={`${lead.aiStatus} (${lead.aiScore}%)`}
                          >
                             <div className={cn("w-1 h-1 rounded-full bg-white", lead.aiStatus === 'QUENTE' && "animate-ping")} />
                             {lead.aiStatus}
                          </div>
                        )}
                      </h4>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onDelete(lead.id)} className="p-1 hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {lead.interest && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full uppercase tracking-wider mb-2 inline-block">
                      {lead.interest}
                    </span>
                  )}

                  <div className="mt-3">
                    <button 
                      onClick={() => onEdit(lead)}
                      className="w-full py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <MessageSquare size={14} />
                      Abrir Atendimento
                    </button>
                  </div>
                </div>
              ))}
              
              {(!groupedLeads[col.id] || groupedLeads[col.id].length === 0) && (
                <div className="h-full w-full min-h-[120px] flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center px-4">Solte o Lead Aqui ou<br/>Lista Vazia</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
