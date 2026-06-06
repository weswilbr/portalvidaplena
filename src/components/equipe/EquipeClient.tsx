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
  Link as LinkIcon,
  Edit,
  KeyRound,
  Save,
  Loader2,
  Sparkles
} from "lucide-react";
import { getSellersWithStats, createSeller, deleteSeller, updateUserProfile, forcePasswordReset } from "@/app/actions/equipe";
import { getBotConfig, updateBotConfig } from "@/app/actions/bot";
import { Bell, BellOff, MessageCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EquipeClient({ user }: { user: any }) {
  const [sellers, setSellers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // For Editing
  const [editingUser, setEditingUser] = useState<any>(null);
  const [botConfig, setBotConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);

  useEffect(() => {
    refreshSellers();
  }, []);

  const refreshSellers = async () => {
    setLoading(true);
    const [sellersData, configData] = await Promise.all([
      getSellersWithStats(),
      getBotConfig()
    ]);
    setSellers(sellersData);
    setBotConfig(configData);
    setLoading(false);
  };

  const handleToggleGlobalNotifications = async () => {
    if (!botConfig) return;
    setGlobalLoading(true);
    const newVal = !botConfig.globalNotificationsEnabled;
    const res = await updateBotConfig(botConfig.id, { globalNotificationsEnabled: newVal });
    if (res.success) {
      setBotConfig({ ...botConfig, globalNotificationsEnabled: newVal });
    }
    setGlobalLoading(false);
  };

  const handleToggleAi = async () => {
    if (!botConfig) return;
    setGlobalLoading(true);
    const newVal = !botConfig.aiEnabled;
    const res = await updateBotConfig(botConfig.id, { aiEnabled: newVal });
    if (res.success) {
      setBotConfig({ ...botConfig, aiEnabled: newVal });
    }
    setGlobalLoading(false);
  };

  const handleSaveSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.target as HTMLFormElement);
    
    if (editingUser) {
      // Editar
      const res = await updateUserProfile(editingUser.id, {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        phone: (formData.get("phone") as string)?.replace(/\D/g, "")
      });
      if (res.success) {
        setIsModalOpen(false);
        setEditingUser(null);
        refreshSellers();
      } else {
        alert(res.error);
      }
    } else {
      // Criar
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
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Atenção: Todos os leads de ${name} serão devolvidos para a Fila Geral.\n\nTem certeza que deseja DELETAR este parceiro?`)) {
      await deleteSeller(id);
      refreshSellers();
    }
  };

  const handleForcePasswordReset = async (id: string, name: string) => {
    const tempPassword = prompt(`Digite uma NOVA SENHA PROVISÓRIA para ${name}.\nO usuário será obrigado a criar uma definitiva no primeiro acesso:`, "mudar123");
    if (!tempPassword) return;

    setLoading(true);
    const res = await forcePasswordReset(id, tempPassword);
    if (res.success) {
      alert(`Senha provisória de ${name} alterada para: ${tempPassword}\nEnvie isso para ele/ela logar.`);
      refreshSellers();
    } else {
      alert(res.error);
    }
    setLoading(false);
  };

  const copyLoginInfo = (seller: any) => {
    const text = `*Portal Vida Plena - Seu Acesso*\n\nOlá, ${seller.name}!\n\n🔗 *Acesse agora:* https://portalfvp.duckdns.org/login\n👤 *Acesso:* ${seller.phone || seller.email}\n🔑 *Sua Senha Inicial:* (a senha que você definiu)\n\nAcesse para começarmos!`;
    navigator.clipboard.writeText(text);
    alert("Mensagem modelo copiada! Cole no WhatsApp do membro.");
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
          <div className="flex items-center gap-2 text-blue-700 font-black text-xs uppercase tracking-[0.2em] mb-1">
            <Users size={14} />
            Configuração Administrativa
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Usuários e Parceiros</h1>
          <p className="text-slate-500 font-medium mt-2">
            Adicione membros, edite perfis e gerencie as senhas de acesso do portal.
          </p>
        </div>
        
        <button 
          onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-blue-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-800 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <UserPlus size={20} />
          Cadastrar Novo
        </button>
      </header>

      {/* PAINEL DE CONFIGURAÇÕES GLOBAIS DO BOT */}
      {botConfig && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm grid md:grid-cols-2 gap-6 animate-in slide-in-from-top duration-500">
           {/* Notificações WhatsApp */}
           <div className={cn(
             "p-6 rounded-[2.5rem] border flex items-center justify-between gap-4 transition-all",
             botConfig.globalNotificationsEnabled ? "bg-emerald-50/50 border-emerald-100" : "bg-slate-50 border-slate-100"
           )}>
             <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-2xl shadow-sm", botConfig.globalNotificationsEnabled ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400")}>
                   {botConfig.globalNotificationsEnabled ? <Bell size={22} className="animate-bounce" /> : <BellOff size={22} />}
                </div>
                <div>
                   <h3 className="font-black text-slate-800 tracking-tight">Alertas WhatsApp</h3>
                   <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", botConfig.globalNotificationsEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {botConfig.globalNotificationsEnabled ? "Sistema Ativo" : "Sistema Pausado"}
                      </span>
                   </div>
                </div>
             </div>
             <button 
               onClick={handleToggleGlobalNotifications} 
               disabled={globalLoading} 
               className={cn(
                 "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md",
                 botConfig.globalNotificationsEnabled ? "bg-white text-emerald-600 hover:bg-emerald-600 hover:text-white" : "bg-slate-800 text-white"
               )}
             >
                {globalLoading ? "..." : botConfig.globalNotificationsEnabled ? "Pausar" : "Ativar"}
             </button>
           </div>

           {/* Inteligência Artificial (Gemini) */}
           <div className={cn(
             "p-6 rounded-[2.5rem] border flex items-center justify-between gap-4 transition-all",
             botConfig.aiEnabled ? "bg-blue-50/50 border-blue-100" : "bg-slate-50 border-slate-100"
           )}>
             <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-2xl shadow-sm", botConfig.aiEnabled ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400")}>
                   <Sparkles size={22} className={botConfig.aiEnabled ? "animate-pulse" : ""} />
                </div>
                <div>
                   <h3 className="font-black text-slate-800 tracking-tight">IA Multi-Modelo</h3>
                   <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", botConfig.aiEnabled ? "bg-blue-600 animate-pulse" : "bg-slate-300")} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {botConfig.aiEnabled ? "Inteligência Ativa" : "IA Desativada"}
                      </span>
                   </div>
                </div>
             </div>
             <button 
               onClick={handleToggleAi} 
               disabled={globalLoading} 
               className={cn(
                 "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md",
                 botConfig.aiEnabled ? "bg-white text-blue-700 hover:bg-blue-700 hover:text-white" : "bg-slate-800 text-white"
               )}
             >
                {globalLoading ? "..." : botConfig.aiEnabled ? "Desativar" : "Ativar"}
             </button>
           </div>
        </div>
      )}

      <div className="p-1 px-4 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex items-center min-h-[80px]">
        <Search className="text-slate-300 ml-4 mr-3" size={18} />
        <input 
          type="text" 
          placeholder="Buscar usuário por nome, e-mail ou WhatsApp..."
          className="w-full py-3 rounded-2xl bg-white border-none outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto w-full">
        <table className="w-full text-left whitespace-nowrap min-w-[800px]">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 font-black text-xs uppercase tracking-widest text-slate-400">Usuário / Permissão</th>
              <th className="px-8 py-5 font-black text-xs uppercase tracking-widest text-slate-400 text-center">Configuração de Alertas</th>
              <th className="px-8 py-5 font-black text-xs uppercase tracking-widest text-slate-400 text-center">Atendimentos</th>
              <th className="px-8 py-5 font-black text-xs uppercase tracking-widest text-slate-400 text-center">Fechamentos</th>
              <th className="px-8 py-5 font-black text-xs uppercase tracking-widest text-slate-400 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400 font-bold">Atualizando servidores...</td>
              </tr>
            ) : filteredSellers.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400 font-bold">Nenhum membro encontrado.</td>
              </tr>
            ) : (
              filteredSellers.map(seller => (
                <tr key={seller.id} className="hover:bg-blue-50/30 transition-all group animate-in slide-in-from-bottom duration-300">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-[1.25rem] bg-blue-50 text-blue-700 flex items-center justify-center font-black uppercase text-xl border border-blue-100">
                        {seller.name.substring(0,2)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          {seller.name}
                          {seller.role === "ADMIN" && <span className="px-2 py-0.5 bg-rose-100 text-rose-600 rounded text-[9px] uppercase tracking-widest font-black">Admin</span>}
                          {seller.id === user.id && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[9px] uppercase tracking-widest font-black">Você</span>}
                        </div>
                        <div className="text-xs font-medium text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{seller.phone || 'S/N'}</span>
                          <span className="text-slate-200">•</span>
                          <span>{seller.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col items-center gap-2 justify-center">
                       {seller.notificationPhone ? (
                         <>
                           <div className="flex items-center gap-3">
                              <div title="Alertas de Novo Lead" className={cn("p-1.5 rounded-lg border", seller.notificationsEnabled ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-slate-50 border-slate-200 text-slate-400")}>
                                 <AlertCircle size={14} />
                              </div>
                              <div title="Alertas de Mensagens" className={cn("p-1.5 rounded-lg border", seller.notifyNewMessages ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-400")}>
                                 <MessageCircle size={14} />
                              </div>
                           </div>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ativo em: {seller.notificationPhone}</span>
                         </>
                       ) : (
                         <div className="flex items-center gap-2 text-slate-600 italic text-[10px] font-bold">
                            <BellOff size={12} />
                            Sem alertas
                         </div>
                       )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className="font-black text-lg text-blue-600">{seller.activeConversations}</span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className="font-black text-lg text-emerald-600">{seller.closedSales}</span>
                  </td>
                  <td className="px-8 py-5 text-right flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditingUser(seller); setIsModalOpen(true); }}
                      title="Editar Informações Cadastrais"
                      className="p-3 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-blue-700 hover:border-blue-200 transition-all shadow-sm"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleForcePasswordReset(seller.id, seller.name)}
                      title="Gerar Senha Provisória"
                      className="p-3 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-amber-500 hover:border-amber-200 transition-all shadow-sm"
                    >
                      <KeyRound size={16} />
                    </button>
                    <button 
                      onClick={() => copyLoginInfo(seller)}
                      title="Copiar Modelo de Mensagem de Acesso p/ WhatsApp"
                      className="p-3 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-blue-500 hover:border-blue-200 transition-all shadow-sm"
                    >
                      <LinkIcon size={16} />
                    </button>
                    {seller.id !== user.id && seller.role !== "ADMIN" && (
                      <button 
                        onClick={() => handleDelete(seller.id, seller.name)}
                        title="Demitir / Remover Parceiro"
                        className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
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
              <h2 className="text-3xl font-black tracking-tight text-slate-900">{editingUser ? "Editar Dados" : "Novo Membro"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                <X size={24} />
              </button>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-8">
              {editingUser ? "Altere nome, contato ou permissões básicas." : "O parceiro poderá logar p/ usar o sistema e chat."}
            </p>
            
            <form className="space-y-4" onSubmit={handleSaveSeller}>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Nome Completo</label>
                <input name="name" defaultValue={editingUser?.name || ""} required placeholder="Ex: João da Silva" className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-blue-100 font-bold text-slate-900" />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">WhatsApp Business</label>
                <input name="phone" defaultValue={editingUser?.phone || ""} required placeholder="11999999999" className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-blue-100 font-bold text-slate-900" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">E-mail</label>
                <input name="email" defaultValue={editingUser?.email || ""} type="email" required placeholder="parceiro@email.com" className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-blue-100 font-bold text-slate-900" />
              </div>

              {!editingUser && (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Senha Provisória</label>
                  <input name="password" required defaultValue="vendas123" className="w-full p-4 rounded-2xl bg-slate-50 border-none border-amber-200 outline-none focus:ring-4 focus:ring-amber-50 font-bold text-slate-900 tracking-wider" />
                  <p className="text-[10px] text-amber-500 font-bold mt-1 ml-1 text-center">Eles serão obrigados a mudar a senha no primeiro acesso.</p>
                </div>
              )}
              
              <div className="pt-6">
                <button type="submit" disabled={saving} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-xl shadow-2xl shadow-slate-200 hover:bg-black hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                  {saving ? <Loader2 className="animate-spin" /> : editingUser ? <Save size={20} /> : <UserPlus size={20} />}
                  {editingUser ? "SALVAR ALTERAÇÕES" : "CRIAR ACESSO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
