"use client";

import { useState } from "react";
import {
  BookOpen, Plus, Trash2, FileText, Image as ImageIcon, Type,
  Eye, EyeOff, Upload, Loader2, X, Sparkles
} from "lucide-react";
import {
  addKnowledgeText, deleteKnowledge, toggleKnowledge, listKnowledge
} from "@/app/actions/knowledge";

type Item = {
  id: string; title: string; type: string; content: string;
  fileUrl?: string | null; active: boolean; createdAt: string;
};

const typeBadge: Record<string, { icon: any; label: string; color: string }> = {
  TEXT: { icon: Type, label: "Texto", color: "bg-blue-100 text-blue-700" },
  IMAGE: { icon: ImageIcon, label: "Imagem", color: "bg-cyan-100 text-cyan-700" },
  PDF: { icon: FileText, label: "PDF", color: "bg-sky-100 text-sky-700" },
};

export default function KnowledgeClient({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState<Item[]>(initialItems || []);
  const [mode, setMode] = useState<"text" | "file">("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Item | null>(null);

  const refresh = async () => setItems(await listKnowledge());

  const handleAdd = async () => {
    if (!title.trim()) return alert("Dê um título ao material.");
    setSaving(true);
    let res;
    if (mode === "text") {
      if (!content.trim()) { setSaving(false); return alert("Cole o conteúdo."); }
      res = await addKnowledgeText(title, content);
    } else {
      if (!file) { setSaving(false); return alert("Escolha um arquivo (imagem ou PDF)."); }
      const fd = new FormData();
      fd.append("title", title);
      fd.append("file", file);
      try {
        const r = await fetch("/api/knowledge/upload", { method: "POST", body: fd });
        res = await r.json();
      } catch (e) {
        res = { success: false, error: "Falha de conexão no upload." };
      }
    }
    setSaving(false);
    if (res?.success) {
      setTitle(""); setContent(""); setFile(null);
      await refresh();
    } else {
      alert(res?.error || "Falha ao salvar.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este material da base do bot?")) return;
    await deleteKnowledge(id);
    await refresh();
  };

  const handleToggle = async (item: Item) => {
    await toggleKnowledge(item.id, !item.active);
    await refresh();
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-700 font-black text-xs uppercase tracking-[0.2em] mb-1">
            <BookOpen size={14} />
            Cérebro do Bot
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">Base de Conhecimento</h1>
          <p className="text-slate-500 font-medium mt-2 max-w-2xl">
            Tudo que você subir aqui o bot <strong>lê e usa</strong> pra conversar com os convidados: slides, tabela de preços, kits, planos. A IA enxerga imagens e PDFs automaticamente.
          </p>
        </div>
      </header>

      {/* Formulário de adição */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setMode("text")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${mode === "text" ? "bg-white text-blue-700 shadow-sm" : "text-slate-400"}`}
          >
            <Type size={16} /> Colar Texto
          </button>
          <button
            onClick={() => setMode("file")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${mode === "file" ? "bg-white text-blue-700 shadow-sm" : "text-slate-400"}`}
          >
            <Upload size={16} /> Subir Imagem / PDF
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Título do material</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Tabela de Preços dos Kits 2026"
              className="w-full mt-2 p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-blue-100 font-bold"
            />
          </div>

          {mode === "text" ? (
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Conteúdo</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Cole aqui o texto: preços, planos, perguntas e respostas, descrição do projeto..."
                className="w-full mt-2 p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-blue-100 font-medium leading-relaxed resize-none"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Arquivo (imagem do slide/tabela ou PDF)</label>
              <label className="mt-2 flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-blue-200 rounded-2xl cursor-pointer hover:bg-blue-50/50 transition-all">
                <Upload size={28} className="text-blue-400" />
                <span className="font-bold text-slate-600 text-sm text-center">
                  {file ? file.name : "Clique para escolher imagem (PNG/JPG) ou PDF"}
                </span>
                <span className="text-[11px] text-slate-400">A IA vai ler o conteúdo automaticamente</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={saving}
            className="w-full sm:w-auto px-8 py-4 bg-blue-700 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-800 transition-all disabled:opacity-50"
          >
            {saving ? (<><Loader2 className="animate-spin" size={18} /> {mode === "file" ? "Lendo material com IA..." : "Salvando..."}</>) : (<><Plus size={18} /> Adicionar à base</>)}
          </button>
        </div>
      </div>

      {/* Lista de materiais */}
      <div className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 ml-1">
          Materiais na base ({items.length})
        </h2>
        {items.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-[2rem]">
            <Sparkles className="mx-auto text-slate-300 mb-3" size={32} />
            <p className="text-slate-400 font-bold">Nenhum material ainda. Suba o primeiro acima! 🚀</p>
          </div>
        )}
        {items.map((item) => {
          const badge = typeBadge[item.type] || typeBadge.TEXT;
          const Icon = badge.icon;
          return (
            <div key={item.id} className={`bg-white p-5 rounded-2xl border shadow-sm flex items-center gap-4 ${item.active ? "border-slate-100" : "border-slate-100 opacity-60"}`}>
              <div className={`p-3 rounded-xl ${badge.color}`}><Icon size={20} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-slate-900 truncate">{item.title}</h3>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${badge.color}`}>{badge.label}</span>
                  {!item.active && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 uppercase">Desativado</span>}
                </div>
                <p className="text-xs text-slate-400 mt-1 truncate">{item.content.slice(0, 110)}…</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setPreview(item)} title="Ver o que o bot lê" className="p-2.5 rounded-xl text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-all">
                  <Eye size={18} />
                </button>
                <button onClick={() => handleToggle(item)} title={item.active ? "Desativar" : "Ativar"} className="p-2.5 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all">
                  {item.active ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <button onClick={() => handleDelete(item.id)} title="Excluir" className="p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de preview do conteúdo que o bot lê */}
      {preview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-[2rem] shadow-2xl p-8 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">O que o bot lê deste material</p>
                <h2 className="text-2xl font-black text-slate-900">{preview.title}</h2>
              </div>
              <button onClick={() => setPreview(null)} className="p-2 text-slate-300 hover:text-slate-600"><X size={24} /></button>
            </div>
            {preview.fileUrl && preview.type === "IMAGE" && (
              <img src={preview.fileUrl} alt={preview.title} className="max-h-40 rounded-xl mb-4 object-contain self-start border border-slate-100" />
            )}
            <div className="overflow-y-auto bg-slate-50 rounded-2xl p-5 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
              {preview.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
