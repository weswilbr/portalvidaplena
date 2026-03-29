"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Search, 
  X,
  CreditCard,
  MessageSquare,
  UserCheck,
  ShieldAlert,
  Link as LinkIcon
} from "lucide-react";
import { getSellersWithStats, createSeller, deleteSeller } from "@/app/actions/equipe";

export default function EquipeClient({ user }: { user: any }) {
  const [sellers, setSellers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshSellers();
  }, []);

  const refreshSellers = async () => {
    setLoading(true);
    const data = await getSellersWithStats();
    setSellers(data);
    setLoading(false);
  };

  const handleSaveSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const sellerData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string)?.replace(/\D/g, ""), // armazena apenas numeros
      password: formData.get("password") as string,
    };

    const res = await createSeller(sellerData);

    if (res.success) {
      setIsModalOpen(false);
      refreshSellers();
    } else {
      alert(res.error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Atenção: Todos os leads de ${name} serão devolvidos para a Fila Geral.\n\nTem certeza que deseja DELETAR este vendedor?`)) {
      await deleteSeller(id);
      refreshSellers();
    }
  };

  const copyLoginInfo = (seller: any) => {
    const text = `*Portal Vida Plena - Seu Acesso*\n\nOlá, ${seller.name}! Seu acesso foi criado.\n\n🔗 *Link:* https://vidaplena.app/login\n👤 *Acesso:* ${seller.phone || seller.email}\n🔑 *Senha:* (a senha que configuramos)\n\nAcesse para começarmos!`;
    navigator.clipboard.writeText(text);
    alert("Mensagem de acesso copiada! Envie no WhatsApp do vendedor.");
  };

  const filteredSellers = sellers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.phone && s.phone.includes(searchTerm)) ||
    (s.email && s.email.includes(searchTerm))
  );

  return (
    <div className="p-8 space-y-6 bg-slate-50/50 min-h-screen animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-[0.2em] mb-1">
            <Users size={14} />
            Gestão de Performance
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Minha Equipe</h1>
          <p className="text-slate-500 font-medium mt-2">
            Adicione vendedores e monitore a conversão de cada consultor da Vida Plena.
          </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <UserPlus size={20} />
          Cadastrar Vendedor
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5 hover:border-indigo-100 transition-all">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total na Equipe</p>
            <p className="text-2xl font-black text-slate-900 leading-none mt-1">{sellers.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5 hover:border-indigo-100 transition-all">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CreditCard size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendas Fechadas (Geral)</p>
            <p className="text-2xl font-black text-slate-900 leading-none mt-1">
              {sellers.reduce((acc, s) => acc + s.closedSales, 0)}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5 hover:border-indigo-100 transition-all">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
            <MessageSquare size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atendimentos Ativos</p>
            <p className="text-2xl font-black text-slate-900 leading-none mt-1">
              {sellers.reduce((acc, s) => acc + s.activeConversations, 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="p-1 px-4 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex items-center min-h-[80px]">
        <Search className="text-slate-300 ml-4 mr-3" size={18} />
        <input 
          type="text" 
          placeholder="Buscar vendedor por nome ou WhatsApp..."
          className="w-full py-3 rounded-2xl bg-white border-none outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 font-black text-xs uppercase tracking-widest text-slate-400">Vendedor</th>
              <th className="px-8 py-5 font-black text-xs uppercase tracking-widest text-slate-400 text-center">Atendimentos</th>
              <th className="px-8 py-5 font-black text-xs uppercase tracking-widest text-slate-400 text-center">Fechamentos</th>
              <th className="px-8 py-5 font-black text-xs uppercase tracking-widest text-slate-400 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400 font-bold">Carregando equipe...</td>
              </tr>
            ) : filteredSellers.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400 font-bold">Nenhum vendedor encontrado.</td>
              </tr>
            ) : (
              filteredSellers.map(seller => (
                <tr key={seller.id} className="hover:bg-indigo-50/30 transition-all group animate-in slide-in-from-bottom duration-300">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 uppercase">
                        {seller.name.substring(0,2)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{seller.name}</div>
                        <div className="text-xs font-medium text-slate-400 mt-0.5 flex gap-2">
                          <span>{seller.phone || 'Sem número'}</span>
                          <span className="text-slate-300">•</span>
                          <span>{seller.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className="font-black text-lg text-blue-600">{seller.activeConversations}</span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className="font-black text-lg text-emerald-600">{seller.closedSales}</span>
                  </td>
                  <td className="px-8 py-5 flex justify-end gap-2">
                    <button 
                      onClick={() => copyLoginInfo(seller)}
                      title="Copiar link de acesso para o vendedor"
                      className="p-3 bg-slate-50 text-slate-500 rounded-xl hover:bg-indigo-100 hover:text-indigo-600 transition-all"
                    >
                      <LinkIcon size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(seller.id, seller.name)}
                      title="Demitir / Remover Vendedor"
                      className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300 border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-3xl font-black tracking-tight text-slate-900">Novo Vendedor</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                <X size={24} />
              </button>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-8">
              O vendedor poderá logar com o WhatsApp e a senha definida abaixo.
            </p>
            
            <form className="space-y-5" onSubmit={handleSaveSeller}>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Nome Completo</label>
                <input name="name" required placeholder="Ex: João da Silva" className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-indigo-100 font-bold" />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">WhatsApp Business (Acesso)</label>
                <input name="phone" required placeholder="11999999999" className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-indigo-100 font-bold" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">E-mail (Opcional p/ Login)</label>
                <input name="email" type="email" required placeholder="vendedor@email.com" className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-slate-500" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Senha Padrão Inicial</label>
                <input name="password" required defaultValue="vendas123" className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-slate-900 tracking-wider" />
              </div>
              
              <div className="pt-4">
                <button className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black text-xl shadow-2xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                  <UserPlus size={20} /> CADASTRAR EQUIPE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
