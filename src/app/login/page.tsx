"use client";

import React, { useState } from "react";
import { 
  LogIn, 
  ShieldCheck, 
  Mail, 
  Lock,
  Loader2,
  ArrowLeft 
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    const res = await login(formData);

    if (res.success) {
      if ((res.user as any)?.mustChangePassword) {
        window.location.href = "/nova-senha";
      } else {
        window.location.href = "/dashboard";
      }
    } else {
      setError(res.error || "Erro ao fazer login");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.05)_0%,_transparent_50%)]">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom duration-700">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:gap-3 transition-all mb-8">
            <ArrowLeft size={16} />
            Voltar para Home
          </Link>
          
          <div className="mx-auto w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center text-indigo-600 mb-6">
            <ShieldCheck size={32} />
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Portal Vida Plena</h1>
          <p className="text-slate-500 font-medium tracking-tight">Acesso para Vendedores e Parceiros Vida Plena</p>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100 border border-slate-100 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-bold animate-in shake duration-300">
              ⚠️ {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-widest ml-1">E-mail ou WhatsApp</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  name="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vendedor@email.com ou 11999999999"
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-widest ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  ACESSAR PORTAL
                  <LogIn size={20} />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-4">
            <p className="text-slate-400 text-sm font-medium">Esqueceu sua senha? Entre em contato com o Admin.</p>
          </div>
        </div>

        <div className="text-center">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest opacity-50">Distribuidor Independente Vida Plena</span>
        </div>
      </div>
    </div>
  );
}
