"use client";

import { Image as ImageIcon, Search, Filter, Plus, ExternalLink, Grid, Layout } from "lucide-react";
import { useState } from "react";

const photos = [
  { id: 1, title: "Foto de Família 1950", status: "RESTORED", date: "2026-03-15" },
  { id: 2, title: "Retrato Avô", status: "IN_PROGRESS", date: "2026-03-14" },
  { id: 3, title: "Casamento Antigo", status: "PENDING", date: "2026-03-13" },
];

export default function ImagesPage() {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Galeria de Restaurações</h1>
          <p className="text-muted-foreground mt-1">Organize e gerencie os arquivos originais e restaurados.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20">
          <Plus size={20} />
          Nova Foto
        </button>
      </header>

      <div className="flex bg-card p-2 rounded-2xl border border-border/50 w-fit gap-2">
         <button className="p-2 rounded-xl bg-secondary text-primary"><Grid size={20} /></button>
         <button className="p-2 rounded-xl text-muted-foreground hover:bg-accent"><Layout size={20} /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {photos.map((photo) => (
          <div key={photo.id} className="group cursor-pointer">
            <div className="aspect-[4/5] bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] border border-border/50 relative overflow-hidden flex items-center justify-center transition-all group-hover:shadow-2xl group-hover:-translate-y-2">
               <ImageIcon size={48} className="text-muted-foreground opacity-20" />
               
               <div className="absolute inset-x-4 bottom-4 translate-y-full group-hover:translate-y-0 transition-transform bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-4 rounded-2xl border border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-md uppercase">Ver Detalhes</span>
                    <ExternalLink size={14} className="text-muted-foreground" />
                  </div>
               </div>
               
               <div className="absolute top-4 right-4">
                 <span className={cn(
                   "text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border shadow-sm",
                   photo.status === "RESTORED" ? "bg-green-100 text-green-700 border-green-200" :
                   photo.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700 border-blue-200" :
                   "bg-orange-100 text-orange-700 border-orange-200"
                 )}>
                   {photo.status === "RESTORED" ? "Restaurada" : photo.status === "IN_PROGRESS" ? "Em processo" : "Pendente"}
                 </span>
               </div>
            </div>
            <div className="mt-4 px-2 text-center">
              <h4 className="font-bold text-slate-800 dark:text-slate-100">{photo.title}</h4>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">{photo.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
