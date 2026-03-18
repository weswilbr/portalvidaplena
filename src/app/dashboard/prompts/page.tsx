"use client";

import { Sparkles, Copy, Search, Zap, Star } from "lucide-react";
import { useState } from "react";

const prompts = [
  { id: 1, title: "Restauração Facial", content: "Restore old photo focusing on facial features, remove scratches, enhance skin texture, 8k resolution, cinematic lighting.", category: "Restoration" },
  { id: 2, title: "Colorização Natural", content: "Add natural colors to black and white historical landscape, realistic tones, soft sunlight, highly detailed.", category: "Colorization" },
  { id: 3, title: "Correção de Fundo", content: "Remove messy background from vintage portrait, replace with professional studio backdrop, maintain subject detail.", category: "Editing" },
];

export default function PromptsPage() {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Biblioteca de Prompts</h1>
          <p className="text-muted-foreground mt-1">Comandos otimizados para restauração de fotos com IA.</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-indigo-500/20">
          <Plus size={20} />
          Novo Prompt
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {prompts.map((prompt) => (
          <div key={prompt.id} className="bg-card p-6 rounded-[2.5rem] border border-border/50 shadow-sm flex flex-col group">
            <div className="flex items-center justify-between mb-4">
               <span className="text-[10px] font-bold px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full uppercase tracking-widest">
                 {prompt.category}
               </span>
               <Star size={16} className="text-amber-400 fill-amber-400" />
            </div>
            <h3 className="font-bold text-lg mb-3">{prompt.title}</h3>
            <div className="relative flex-1">
              <p className="text-sm text-muted-foreground bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-border/50 italic min-h-[100px]">
                "{prompt.content}"
              </p>
              <button 
                onClick={() => handleCopy(prompt.id, prompt.content)}
                className="absolute top-3 right-3 p-2 bg-white dark:bg-slate-800 rounded-xl border border-border/50 shadow-sm hover:scale-110 transition-all active:scale-95"
              >
                {copiedId === prompt.id ? <Zap size={16} className="text-green-500 fill-green-500" /> : <Copy size={16} />}
              </button>
            </div>
            <div className="mt-6 flex gap-2">
              <button className="flex-1 py-2 rounded-xl bg-secondary font-bold text-xs uppercase tracking-widest hover:bg-accent transition-colors">Testar agora</button>
              <button className="p-2 rounded-xl bg-secondary hover:bg-accent transition-colors">
                 <Search size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Plus({ size, className }: { size: number, className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14m-7-7v14"/>
    </svg>
  );
}
