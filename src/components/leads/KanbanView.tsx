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
  onSendMessage: (phone: string) => void;
  onStatusChange?: (leadId: string, newStatus: string) => Promise<void> | void;
}

const statusColumns = [
  { id: "NEW", label: "Novos", color: "bg-blue-500" },
  { id: "CONTACTED", label: "Contatados", color: "bg-indigo-600" },
  { id: "PRESENTED", label: "Apresentados", color: "bg-orange-500" },
  { id: "CLOSED", label: "Fechados", color: "bg-emerald-500" },
];

export default function KanbanView({ leads, onEdit, onDelete, onSendMessage, onStatusChange }: KanbanViewProps) {
  const [draggedLead, setDraggedLead] = React.useState<Lead | null>(null);

  const groupedLeads = useMemo(() => {
    return statusColumns.reduce((acc, col) => {
      acc[col.id] = leads.filter(l => l.status === col.id);
      return acc;
    }, {} as Record<string, Lead[]>);
  }, [leads]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessário para permitir o drop nativo
  };

  const handleDrop = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    if (draggedLead && draggedLead.status !== statusId && onStatusChange) {
      // Chama o callback externo para atualizar no Banco Prisma/estado React
      onStatusChange(draggedLead.id, statusId);
    }
    setDraggedLead(null);
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 min-h-[600px] w-full items-stretch shrink-0">
      {statusColumns.map((col) => (
        <div key={col.id} className="flex-1 min-w-[320px] max-w-[400px] flex flex-col shrink-0">
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
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 leading-tight">{lead.name}</h4>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(lead)} className="p-1 hover:text-blue-600 transition-colors">
                      <ExternalLink size={14} />
                    </button>
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

                <div className="flex items-center justify-between mt-3">
                  <a href={getWhatsAppHref(lead.phone?.split(':')[0] || '')} target="_blank" rel="noreferrer" className="text-xs text-slate-500 hover:text-green-600 flex items-center gap-1 font-bold transition-colors">
                    <Phone size={12} /> {formatPhoneNumber(lead.phone || "") || "Sem Contato"}
                  </a>
                  <button 
                    onClick={() => lead.phone && onSendMessage(lead.phone)}
                    className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-green-500 hover:text-white transition-all shadow-sm"
                  >
                    <MessageSquare size={14} />
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
  );
}
