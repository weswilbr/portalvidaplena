"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { MessageSquare, ExternalLink, X, Phone } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  status: string;
  phone?: string;
  interest?: string;
}

interface KanbanViewProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onSendMessage: (phone: string) => void;
}

const statusColumns = [
  { id: "NEW", label: "Novos", color: "bg-blue-500" },
  { id: "CONTACTED", label: "Contatados", color: "bg-indigo-600" },
  { id: "PRESENTED", label: "Apresentados", color: "bg-orange-500" },
  { id: "CLOSED", label: "Fechados", color: "bg-emerald-500" },
];

export default function KanbanView({ leads, onEdit, onDelete, onSendMessage }: KanbanViewProps) {
  const groupedLeads = useMemo(() => {
    return statusColumns.reduce((acc, col) => {
      acc[col.id] = leads.filter(l => l.status === col.id);
      return acc;
    }, {} as Record<string, Lead[]>);
  }, [leads]);

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 min-h-[600px]">
      {statusColumns.map((col) => (
        <div key={col.id} className="flex-1 min-w-[300px] flex flex-col">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", col.color)}></div>
              <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">{col.label}</h3>
              <span className="bg-secondary px-2 py-0.5 rounded-full text-[10px] font-bold">
                {groupedLeads[col.id]?.length || 0}
              </span>
            </div>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-[2rem] flex-1 space-y-4 border border-border/50">
            {groupedLeads[col.id]?.map((lead) => (
              <div 
                key={lead.id}
                className="bg-card p-5 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">{lead.name}</h4>
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
                   <span className="text-[10px] font-bold px-2 py-0.5 bg-secondary rounded-full uppercase tracking-wider mb-3 inline-block">
                     {lead.interest}
                   </span>
                )}

                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone size={12} /> {lead.phone || "N/A"}
                  </span>
                  <button 
                    onClick={() => lead.phone && onSendMessage(lead.phone)}
                    className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
                  >
                    <MessageSquare size={14} />
                  </button>
                </div>
              </div>
            ))}
            
            {(!groupedLeads[col.id] || groupedLeads[col.id].length === 0) && (
              <div className="h-24 flex items-center justify-center border-2 border-dashed border-border/20 rounded-2xl">
                <span className="text-xs text-muted-foreground font-medium">Sem leads nesta fase</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
