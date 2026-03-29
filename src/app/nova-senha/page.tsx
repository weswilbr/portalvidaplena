"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { updateUserPassword, logout } from "@/app/actions/auth";

export default function NovaSenhaPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("currentPassword", currentPassword);
    formData.append("newPassword", newPassword);

    const res = await updateUserPassword(formData);

    if (res.success) {
      alert("Senha atualizada com sucesso! Você continuará para o sistema.");
      router.push("/dashboard/vendas");
    } else {
      setError(res.error || "Erro ao atualizar a senha.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 border border-slate-100 flex flex-col items-center">
        <div className="w-20 h-20 bg-amber-50 rounded-[1.5rem] flex items-center justify-center text-amber-500 mb-6 shadow-sm border border-amber-100/50">
          <ShieldCheck size={40} />
        </div>
        
        <h2 className="text-2xl font-black text-slate-900 mb-2">Ação Obrigatória</h2>
        <p className="text-slate-500 text-center mb-8 font-medium">
          Sua senha atual é provisória ou expirou. Para sua segurança, defina uma nova senha definitiva agora.
        </p>

        {error && (
          <div className="w-full bg-red-50 text-red-600 p-4 rounded-2xl mb-6 font-bold text-sm text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleUpdate} className="w-full space-y-5">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
              type="password" 
              name="currentPassword"
              placeholder="Senha Provisória Atual"
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-amber-50 focus:border-amber-400 focus:bg-white transition-all font-medium text-slate-900"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
              type="password" 
              name="newPassword"
              placeholder="Nova Senha Definitiva"
              required
              minLength={6}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-4 focus:ring-amber-50 focus:border-amber-400 focus:bg-white transition-all font-medium text-slate-900"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-200 hover:bg-black hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><ArrowRight /> CONTINUAR</>}
          </button>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full text-slate-400 font-bold hover:text-slate-600 mt-4 underline text-sm"
          >
            Sair e voltar depois
          </button>
        </form>
      </div>
    </div>
  );
}
