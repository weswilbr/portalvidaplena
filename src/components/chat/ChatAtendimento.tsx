"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { openWhatsApp } from "@/lib/utils";
import { 
  Search, 
  Send, 
  MessageCircle,
  User,
  Phone,
  Clock,
  Zap,
  Thermometer,
  Circle,
  ChevronRight,
  Image,
  FileText,
  Mic,
  MoreVertical,
  Bookmark,
  SendHorizontal,
  RefreshCw,
  Filter,
  X,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  ArrowRight,
  Play,
  Pause,
  Plus,
  Trash2,
  Paperclip,
  Bell,
  BellOff,
  Camera,
  Video,
  Download,
  Sparkles,
} from "lucide-react";
import { getLeads, addMessage, sendWhatsAppMessage, updateLead, createLead, pullLead, updateMessage, deleteMessage, getQuickReplies, createQuickReply, updateQuickReply, deleteQuickReply, setLeadTyping } from "@/app/actions/leads";
import { getLeadAnalysis, getConversationSummary, getReplySuggestions } from "@/app/actions/ai";
import { getSellers } from "@/app/actions/users";

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  NEW: { color: "text-blue-600", bg: "bg-blue-50 border-blue-200", label: "Novo" },
  CONTACTED: { color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200", label: "Contatado" },
  PRESENTED: { color: "text-orange-600", bg: "bg-orange-50 border-orange-200", label: "Apresentado" },
  CLOSED: { color: "text-green-600", bg: "bg-green-50 border-green-200", label: "Fechado" },
  LOST: { color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Perdido" },
};

const temperatureConfig: Record<string, { color: string; bg: string; icon: string }> = {
  QUENTE: { color: "text-red-600", bg: "bg-red-100", icon: "🔥" },
  MORNO: { color: "text-orange-600", bg: "bg-orange-100", icon: "🌡️" },
  GELADO: { color: "text-blue-600", bg: "bg-blue-100", icon: "❄️" },
};

const defaultQuickReplies = [
  { title: "Bom dia!", content: "Bom dia!" },
  { title: "Olá!", content: "Olá! Tudo bem?" },
  { title: "Aguardando", content: "Estamos te aguardando!" },
  { title: "Ajuda", content: "Posso ajudar?" },
  { title: "Obrigado!", content: "Obrigado!" },
  { title: "Att", content: "Att, Vida Plena" },
];

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  source: string | null;
  status: string;
  interest: string | null;
  notes: string | null;
  profilePic: string | null;
  unreadCount: number;
  aiScore: number | null;
  aiStatus: string | null;
  aiAdvice: string | null;
  isTyping: boolean;
  assignedTo: { id: string; name: string } | null;
  messages: any[];
  createdAt: string;
  updatedAt: string;
}

export default function ChatAtendimento({ currentUser }: { currentUser: any }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [isInfoOpen, setIsInfoOpen] = useState(true);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [newLeadData, setNewLeadData] = useState({ name: "", phone: "" });
  const [viewMode, setViewMode] = useState<"meus" | "novos" | "todos">("meus");
  const [confirmLead, setConfirmLead] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [messageMenu, setMessageMenu] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [quickReplies, setQuickReplies] = useState<any[]>(defaultQuickReplies);
  const [showQRModal, setShowQRModal] = useState(false);
  const [editingQR, setEditingQR] = useState<any>(null);
  const [qrForm, setQRForm] = useState({ title: "", content: "" });
  const [selectedAtendente, setSelectedAtendente] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isClientTyping, setIsClientTyping] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allAtendentes, setAllAtendentes] = useState<any[]>([]);
  const [attachment, setAttachment] = useState<any>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifyPermission, setNotifyPermission] = useState<"default" | "granted" | "denied">("default");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterLeads, setFilterLeads] = useState<"meus" | "novos" | "todos">("meus");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch leads
  const refreshLeads = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getLeads();
      // Filter business leads and sort by unread + recent
      const businessLeads = data.filter((l: any) => l.interest !== "Produto");
      setLeads(businessLeads);
      
      // Update selected lead if it exists
      if (selectedLead) {
        const updated = businessLeads.find((l: any) => l.id === selectedLead.id);
        if (updated) {
          setSelectedLead(updated);
        }
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    refreshLeads();
    loadQuickReplies();
    loadAtendentes();
    const interval = setInterval(() => refreshLeads(true), 5000);
    return () => clearInterval(interval);
  }, []);

  const loadQuickReplies = async () => {
    try {
      const data = await getQuickReplies(currentUser.id);
      if (data && data.length > 0) {
        setQuickReplies(data);
      }
    } catch (e) { console.error("Error loading QRs", e); }
  };

  const loadAtendentes = async () => {
    try {
      const data = await getSellers();
      setAllAtendentes(data);
    } catch (e) { console.error("Error loading users", e); }
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("Este navegador não suporta notificações");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifyPermission(permission);
    setNotificationsEnabled(permission === "granted");
  };

  const sendNotification = (title: string, body: string) => {
    if (notificationsEnabled && notifyPermission === "granted") {
      new Notification(title, {
        body,
        icon: "/icon-192.png",
      });
    }
  };

  const handleAssignAtendente = async (atendenteId: string) => {
    if (!selectedLead) return;
    await updateLead(selectedLead.id, { assignedToId: atendenteId });
    await refreshLeads();
    setShowAssignModal(false);
  };

  const handleAIAction = async (action: "analyze" | "summary" | "suggest") => {
    if (!selectedLead || aiLoading) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      let result: string;
      if (action === "analyze") {
        result = await getLeadAnalysis(selectedLead.id);
      } else if (action === "summary") {
        result = await getConversationSummary(selectedLead.id);
      } else {
        result = await getReplySuggestions(selectedLead.id);
      }
      // Handle array responses (like suggestions) vs string
      const displayResult = Array.isArray(result) ? result.join('\n') : (result || "Nenhuma sugestão no momento.");
      setAiResult(displayResult);
    } catch (e) {
      setAiResult("Erro ao gerar. Tente novamente.");
    }
    setAiLoading(false);
  };

  const handleSaveQR = async () => {
    if (!qrForm.title.trim() || !qrForm.content.trim()) return;
    if (editingQR) {
      await updateQuickReply(editingQR.id, qrForm);
    } else {
      await createQuickReply({ ...qrForm, userId: currentUser.id });
    }
    setShowQRModal(false);
    setEditingQR(null);
    setQRForm({ title: "", content: "" });
    await loadQuickReplies();
  };

  const handleDeleteQR = async (id: string) => {
    if (!confirm("Deletar este gatilho?")) return;
    await deleteQuickReply(id);
    await loadQuickReplies();
  };

  const handleEditQR = (qr: any) => {
    setEditingQR(qr);
    setQRForm({ title: qr.title, content: qr.content });
    setShowQRModal(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLead) return;
    
    const preview = file.type.startsWith("image/") 
      ? URL.createObjectURL(file) 
      : null;
    
    setAttachment({ file, type: file.type });
    setAttachmentPreview(preview);
    setShowAttachmentMenu(false);
  };

  const handleSendAttachment = async () => {
    if (!attachment || !selectedLead) return;
    
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("file", attachment.file);
      
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      
      if (data.success) {
        await sendWhatsAppMessage({
          leadId: selectedLead.id,
          content: attachment.file.name,
          authorId: currentUser.id,
          mediaUrl: data.url,
          mediaType: data.type,
          fileName: attachment.file.name,
        });
        await refreshLeads(true);
      }
    } catch (e) { console.error(e); }
    
    setAttachment(null);
    setAttachmentPreview(null);
    setSending(false);
  };

  const cancelAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedLead?.messages]);

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads
      .filter(lead => {
        // Filter by assignment
        if (viewMode === "meus") {
          // Only leads assigned to current user
          if ((lead as any).assignedToId !== currentUser.id) return false;
        } else if (viewMode === "novos") {
          // Only unassigned leads (NEW status, no owner)
          if ((lead as any).assignedToId) return false;
        }
        // "todos" shows all
        
        // Search and status filters
        const matchesSearch = 
          lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (lead.phone || "").includes(searchTerm);
        const matchesStatus = !filterStatus || lead.status === filterStatus;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [leads, searchTerm, filterStatus, viewMode, currentUser]);

  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedLead || sending) return;
    
    setSending(true);
    const text = messageText.trim();
    setMessageText("");
    
    try {
      // Send via WhatsApp (creates message in DB + queues for bot)
      await sendWhatsAppMessage({
        leadId: selectedLead.id,
        content: text,
        authorId: currentUser.id,
      });
      
      // Refresh
      await refreshLeads(true);
      inputRef.current?.focus();
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Erro ao enviar mensagem");
    }
    setSending(false);
  };

  // Quick reply - load into text box
  const handleQuickReply = (content: string) => {
    if (!selectedLead) return;
    setMessageText(content);
    inputRef.current?.focus();
  };

  // Change lead status
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedLead) return;
    await updateLead(selectedLead.id, { status: newStatus });
    await refreshLeads(true);
  };

  // Create new lead
  const handleCreateLead = async () => {
    if (!newLeadData.name.trim()) return;
    const res = await createLead({
      name: newLeadData.name,
      phone: newLeadData.phone,
      source: "Manual",
      interest: "Negócio",
      status: "NEW",
    });
    if (res.success) {
      setIsCreatingLead(false);
      setNewLeadData({ name: "", phone: "" });
      await refreshLeads();
    }
  };

  const handleConfirmLead = async () => {
    if (!confirmLead) return;
    // Unassigned lead = PULL (become responsible)
    if (!confirmLead.assignedToId) {
      await pullLead(confirmLead.id, currentUser.id);
    }
    // Clear unread and set as selected
    const updated = { ...confirmLead, unreadCount: 0, assignedToId: confirmLead.assignedToId || currentUser.id };
    setSelectedLead(updated);
    setConfirmLead(null);
    await refreshLeads();
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelAudioRef = useRef(false);
  
  const handlePlayAudio = (msgId: string, mediaUrl: string) => {
    // If same audio is playing, stop it
    if (playingAudio === msgId && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setPlayingAudio(null);
      return;
    }
    
    // Stop any previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Start new audio
    const audio = new Audio(mediaUrl);
    audioRef.current = audio;
    setPlayingAudio(msgId);
    
    audio.onended = () => {
      setPlayingAudio(null);
      audioRef.current = null;
    };
    
    audio.onerror = () => {
      setPlayingAudio(null);
      audioRef.current = null;
    };
    
    audio.play();
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm("Deletar esta mensagem?")) return;
    await deleteMessage(msgId, true);
    setMessageMenu(null);
    await refreshLeads(true);
  };

  const handleEditMessage = async (msg: any) => {
    if (!editingMessage) {
      setEditingMessage(msg);
      setMessageText(msg.content);
      setMessageMenu(null);
    } else {
      // Save the edit
      if (messageText.trim() && selectedLead) {
        await updateMessage(editingMessage.id, messageText.trim());
        await sendWhatsAppMessage({
          leadId: selectedLead.id,
          content: messageText.trim(),
          authorId: currentUser.id,
        });
        setEditingMessage(null);
        setMessageText("");
        await refreshLeads(true);
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/ogg; codecs=opus') 
        ? 'audio/ogg; codecs=opus' 
        : 'audio/webm; codecs=opus';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const extension = mimeType.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([audioBlob], `voice_message.${extension}`, { type: mimeType });
        setIsRecording(false);
        
        if (cancelAudioRef.current) {
          cancelAudioRef.current = false;
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        // Upload audio
        const formData = new FormData();
        formData.append("file", file);
        
        try {
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          const data = await res.json();
          
          if (data.success && selectedLead) {
            await sendWhatsAppMessage({
              leadId: selectedLead.id,
              content: "🎤 Mensagem de voz",
              authorId: currentUser.id,
              mediaUrl: data.url,
              mediaType: "audio",
              fileName: file.name,
            });
            await refreshLeads(true);
          }
        } catch (err) {
          console.error("Erro ao enviar áudio:", err);
          alert("Erro ao enviar áudio");
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      alert("Permissão de áudio negada.");
    }
  };

  const stopRecording = (cancel = false) => {
    if (mediaRecorderRef.current && isRecording) {
      if (cancel) cancelAudioRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter to send
      if (e.ctrlKey && e.key === "Enter" && selectedLead) {
        handleSendMessage();
      }
      // Number keys for quick replies
      if (selectedLead && !e.ctrlKey && !e.metaKey && document.activeElement !== inputRef.current) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 6) {
          handleQuickReply(quickReplies[num - 1].label);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLead, messageText]);

  // Format time
  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return "Agora";
    if (hours < 24) return `${hours}h`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  // Get last message preview
  const getLastMessage = (lead: Lead) => {
    const msg = lead.messages[lead.messages.length - 1];
    if (!msg) return "Nenhuma mensagem";
    const prefix = msg.isSystem ? "📢 " : msg.isNote ? "📝 " : "";
    return prefix + msg.content.substring(0, 50) + (msg.content.length > 50 ? "..." : "");
  };

  return (
    <div className="h-full flex bg-slate-50 overflow-hidden">
      {/* Left Panel - Chat + Leads */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col h-full",
        selectedLead && "hidden md:flex"
      )}>
        {/* Header with View Switcher */}
        <div className="p-3 md:p-2 border-b border-slate-200 space-y-2 shrink-0 bg-white">
          {/* Tab Switcher */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => { setViewMode("meus"); setFilterLeads("meus"); setSelectedAtendente(null); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[10px] font-bold transition-all",
                viewMode === "meus" 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:text-indigo-600"
              )}
            >
              <span>Meus</span>
            </button>
            <button
              onClick={() => { setViewMode("novos"); setFilterLeads("novos"); setSelectedAtendente(null); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[10px] font-bold transition-all",
                viewMode === "novos" 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:text-indigo-600"
              )}
            >
              <span>Novos</span>
            </button>
            <button
              onClick={() => { setViewMode("todos"); setFilterLeads("todos"); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[10px] font-bold transition-all",
                viewMode === "todos" 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:text-indigo-600"
              )}
            >
              <span>Equipe</span>
            </button>
          </div>
          
          {/* User Badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-slate-600">{currentUser?.name || "Você"}</span>
            </div>
            <button
              onClick={() => setIsCreatingLead(true)}
              className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:scale-95 transition-all"
            >
              <UserPlus size={14} />
            </button>
            <button
              onClick={() => notificationsEnabled ? setNotificationsEnabled(false) : requestNotificationPermission()}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                notificationsEnabled 
                  ? "bg-green-100 text-green-600" 
                  : "bg-slate-100 text-slate-400 hover:text-slate-600"
              )}
              title={notificationsEnabled ? "Notificações ligadas" : "Ligar notificações"}
            >
              {notificationsEnabled ? <Bell size={14} /> : <BellOff size={14} />}
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
            />
          </div>
          
        </div>

        {/* Content - List */}
        {viewMode !== "novos" && (
          <div className="flex-1 overflow-y-auto">
            {loading && leads.length === 0 && (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="animate-spin text-indigo-600" size={24} />
              </div>
            )}
            {!loading && filteredLeads.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                <MessageCircle size={32} />
                <p className="text-sm font-medium mt-2">Nenhum lead encontrado</p>
              </div>
            )}
            {!loading && filteredLeads.length > 0 && filteredLeads.map((lead) => (
              <button
                key={lead.id}
                onClick={() => { 
                  if ((lead as any).assignedToId === currentUser.id) { 
                    // Clear unread in DB when selecting lead
                    updateLead(lead.id, { unreadCount: 0 });
                    const updated = { ...lead, unreadCount: 0 };
                    setSelectedLead(updated);
                  } else { 
                    setConfirmLead(lead); 
                  } 
                }}
                className={cn(
                  "w-full p-3 border-b border-slate-50 text-left hover:bg-slate-50 transition-all",
                  selectedLead?.id === lead.id && "bg-indigo-50"
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar - Smaller */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-black text-sm">
                      {lead.profilePic ? (
                        <img src={lead.profilePic} alt={lead.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        lead.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    {/* Unread Notification Badge */}
                    {lead.unreadCount > 0 && (
                      <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                        {lead.unreadCount > 9 ? "9+" : lead.unreadCount}
                      </div>
                    )}
                    {/* New Message Indicator Ring */}
                    {lead.unreadCount > 0 && (
                      <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-red-400 animate-ping pointer-events-none"></div>
                    )}
                  </div>
                  
                  {/* Content - Compact */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        "font-bold text-xs truncate",
                        lead.unreadCount > 0 ? "text-slate-900" : "text-slate-600"
                      )}>
                        {lead.name}
                      </span>
                      <span className="text-[9px] text-slate-400 shrink-0">
                        {formatTime(lead.updatedAt)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">
                      {getLastMessage(lead)}
                    </p>
                  </div>
                </div>
              </button>
            ))} 
          </div>
        )}
      </div>

      {/* Right Panel - Chat */}
      {selectedLead ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header - Clean Layout */}
          <div className="p-2 md:p-3 border-b border-slate-200 flex items-center gap-2 md:gap-3 bg-white shrink-0">
            <button
              onClick={() => setSelectedLead(null)}
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            >
              <ChevronRight size={18} className="rotate-180" />
            </button>
            
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-black text-xs md:text-sm shrink-0">
              {selectedLead.profilePic ? (
                <img src={selectedLead.profilePic} alt={selectedLead.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                selectedLead.name.charAt(0).toUpperCase()
              )}
            </div>
            
            <div className="flex-1 min-w-0 pr-2">
              <h2 className="font-bold text-xs md:text-sm text-slate-900 truncate">{selectedLead.name}</h2>
              <p className="text-[9px] md:text-[10px] text-slate-500 truncate">{selectedLead.phone || "Sem telefone"}</p>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => openWhatsApp(selectedLead.phone || "")}
                className="p-1.5 md:p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all"
                title="Abrir WhatsApp"
              >
                <Phone size={14} />
              </button>
              <button
                onClick={() => setIsInfoOpen(!isInfoOpen)}
                className={cn(
                  "p-1.5 md:p-2 rounded-lg transition-all",
                  isInfoOpen ? "bg-indigo-100 text-indigo-600" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                )}
                title="Informações do Lead"
              >
                <User size={14} />
              </button>
            </div>
          </div>

          {/* Lead Info Sidebar - Compact */}
          {isInfoOpen && (
            <div className="p-2 md:p-3 bg-gradient-to-r from-slate-50 to-indigo-50 border-b border-slate-100 space-y-2">
              <div className="flex flex-wrap gap-1">
                {Object.entries(statusConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handleStatusChange(key)}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                      selectedLead.status === key 
                        ? `${config.bg} ${config.color} ring-1 ring-current` 
                        : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
                    )}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Score</p>
                  <p className={cn(
                    "text-sm font-black",
                    (selectedLead.aiScore || 0) >= 70 ? "text-green-600" :
                    (selectedLead.aiScore || 0) >= 40 ? "text-orange-600" : "text-red-600"
                  )}>
                    {selectedLead.aiScore || 0}%
                  </p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Temp</p>
                  <p className={cn("text-xs font-black", temperatureConfig[selectedLead.aiStatus || "MORNO"]?.color)}>
                    {temperatureConfig[selectedLead.aiStatus || "MORNO"]?.icon}
                  </p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Origem</p>
                  <p className="text-[10px] font-bold text-slate-700 truncate">{selectedLead.source || "Direto"}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Atendente</p>
                  <p className="text-[10px] font-bold text-slate-700 truncate">{selectedLead.assignedTo?.name || "-"}</p>
                </div>
              </div>
              
              {/* AI Actions - Economic */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleAIAction("suggest")}
                  disabled={aiLoading}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-[9px] font-bold text-amber-700 disabled:opacity-50 transition-all"
                >
                  <Sparkles size={10} /> {aiLoading ? "..." : "Sugerir"}
                </button>
                <button
                  onClick={() => handleAIAction("summary")}
                  disabled={aiLoading}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-[9px] font-bold text-purple-700 disabled:opacity-50 transition-all"
                >
                  <Sparkles size={10} /> {aiLoading ? "..." : "Resumir"}
                </button>
              </div>
              {aiResult && (
                <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] text-slate-500 font-bold uppercase flex items-center gap-1">
                      <Sparkles size={9} /> Resultado IA
                    </p>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => { navigator.clipboard.writeText(aiResult); }}
                        className="px-2 py-0.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded text-[9px] font-bold"
                      >
                        📋 Copiar
                      </button>
                      <button 
                        onClick={() => { setMessageText(String(aiResult || "")); setAiResult(null); }}
                        className="px-2 py-0.5 bg-green-100 hover:bg-green-200 text-green-600 rounded text-[9px] font-bold"
                      >
                        ➡️ Usar
                      </button>
                      <button onClick={() => setAiResult(null)} className="px-1 py-0.5 text-slate-400 hover:text-slate-600">✕</button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-700 mt-1 whitespace-pre-wrap">{aiResult}</p>
                </div>
              )}
              {selectedLead.aiAdvice && !aiResult && (
                <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg">
                  <p className="text-[9px] text-amber-600 font-bold uppercase flex items-center gap-1">
                    <Zap size={10} /> Dica IA
                  </p>
                  <p className="text-[10px] text-amber-800 mt-0.5">{selectedLead.aiAdvice}</p>
                </div>
              )}
            </div>
          )}

          {/* Messages - Compact */}
          <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-2 md:space-y-3 bg-slate-50/50">
            {selectedLead.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <MessageCircle size={32} />
                <p className="text-xs font-medium mt-2">Nenhuma mensagem</p>
              </div>
            ) : (
              selectedLead.messages.map((msg: any, index: number) => {
                const isOwn = msg.authorId === currentUser.id;
                const isSystem = msg.isSystem;
                const isNote = msg.isNote;
                const isAudio = msg.mediaType === "audio";
                
                if (isSystem) {
                  return (
                    <div key={msg.id || index} className="flex justify-center">
                      <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-bold">
                        {msg.content}
                      </div>
                    </div>
                  );
                }
                
                if (isNote) {
                  return (
                    <div key={msg.id || index} className="flex justify-end">
                      <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl rounded-tr-md max-w-[85%]">
                        <p className="text-[9px] text-amber-400 font-bold uppercase mb-0.5">📝 Nota</p>
                        <p className="text-xs text-amber-800">{msg.content}</p>
                      </div>
                    </div>
                  );
                }
                
                const isReadOnly = viewMode === "todos";
                const isImage = msg.mediaType?.startsWith("image/") || msg.mediaUrl?.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i);
                const isVideo = msg.mediaType?.startsWith("video/") || msg.mediaUrl?.match(/\.(mp4|mov|avi|webm)$/i);
                
                return (
                  <div 
                    key={msg.id || index} 
                    className={cn("flex group relative", isOwn ? "justify-end" : "justify-start")}
                  >
                    {messageMenu === msg.id && (
                      <div className="absolute bottom-full mb-1 z-10 bg-white rounded-lg shadow-lg border border-slate-200 p-1 flex gap-1">
                        <button onClick={() => handleEditMessage(msg)} className="px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100 rounded">✏️ Editar</button>
                        <button onClick={() => handleDeleteMessage(msg.id)} className="px-2 py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded">🗑️ Apagar</button>
                      </div>
                    )}
                    
                    <div 
                      onContextMenu={(e) => { e.preventDefault(); setMessageMenu(messageMenu === msg.id ? null : msg.id); }}
                      onClick={() => messageMenu === msg.id && setMessageMenu(null)}
                      className={cn(
                        "max-w-[85%] rounded-2xl cursor-pointer overflow-hidden",
                        isOwn 
                          ? "bg-indigo-600 text-white rounded-tr-md" 
                          : "bg-white border border-slate-200 text-slate-800 rounded-tl-md",
                        !isAudio && !isImage && !isVideo && "px-3 py-2"
                      )}>
                      {isImage ? (
                        <div className="p-1">
                          <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                            <img 
                              src={msg.mediaUrl} 
                              alt="Imagem" 
                              className="max-w-[280px] max-h-[280px] object-cover rounded-xl cursor-pointer hover:opacity-90 transition-shadow"
                            />
                          </a>
                          {msg.content && msg.content !== "Imagem" && (
                            <p className="text-xs p-2 text-white">{msg.content}</p>
                          )}
                        </div>
                      ) : isVideo ? (
                        <div className="p-1">
                          <video 
                            src={msg.mediaUrl} 
                            controls 
                            className="max-w-[280px] max-h-[200px] rounded-xl"
                          />
                          {msg.content && (
                            <p className="text-xs p-2 text-white">{msg.content}</p>
                          )}
                        </div>
                      ) : msg.mediaType && !msg.mediaType.startsWith("image/") && !msg.mediaType.startsWith("video/") && !msg.mediaType.startsWith("audio/") ? (
                        <div className="flex items-center gap-2 px-3 py-2">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <FileText size={20} className="text-indigo-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{msg.content || "Documento"}</p>
                            <p className="text-[10px] text-indigo-200">📄 Documento</p>
                          </div>
                          <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-indigo-500 rounded">
                            <Download size={14} />
                          </a>
                        </div>
                      ) : isAudio ? (
                        <div className="flex items-center gap-3 px-3 py-2 bg-white/10 rounded-xl min-w-[120px]">
                          <button 
                            onClick={() => handlePlayAudio(msg.id, msg.mediaUrl)}
                            className={cn(
                              "p-2 rounded-full transition-all shadow-lg",
                              playingAudio === msg.id 
                                ? "bg-green-500 text-white animate-pulse scale-110" 
                                : "bg-white text-slate-700 hover:bg-green-100 hover:text-green-600"
                            )}
                          >
                            {playingAudio === msg.id ? <Pause size={16} /> : <Play size={16} />}
                          </button>
                          <div className="flex items-center gap-1 h-6">
                            {[1,2,3,4,5].map(i => (
                              <div 
                                key={i}
                                className={cn(
                                  "w-1 bg-white rounded-full transition-all",
                                  playingAudio === msg.id 
                                    ? "animate-pulse" 
                                    : "opacity-40"
                                )}
                                style={{
                                  height: playingAudio === msg.id 
                                    ? `${10 + (i % 3) * 6}px` 
                                    : '6px',
                                  animationDelay: `${i * 100}ms`
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                      )}
                      <p className={cn(
                        "text-[9px] mt-0.5 flex items-center gap-1",
                        isOwn ? "text-indigo-200" : "text-slate-400"
                      )}>
                        {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        {msg.mediaUrl && !isAudio && <a href={msg.mediaUrl} target="_blank" rel="noopener" className="underline">📎</a>}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies with Add Button */}
          <div className="px-2 md:px-3 py-1.5 bg-white border-t border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase">Gatilhos</span>
              <button
                onClick={() => { setEditingQR(null); setQRForm({ title: "", content: "" }); setShowQRModal(true); }}
                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
              >
                <Plus size={12} />
              </button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {quickReplies.map((qr, idx) => (
                <button
                  key={qr.id || idx}
                  onClick={() => handleQuickReply(qr.content)}
                  onContextMenu={(e) => { e.preventDefault(); handleEditQR(qr); }}
                  className="shrink-0 px-2 py-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-md text-[10px] font-bold transition-all"
                >
                  {qr.title}
                </button>
              ))}
            </div>
          </div>

          {/* Input - Compact */}
          <div className="p-2 md:p-3 bg-white border-t border-slate-100 space-y-2">
            {/* Attachment Preview */}
            {attachment && (
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
                {attachment.type.startsWith("image/") ? (
                  <img src={attachmentPreview || ""} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                ) : attachment.type.startsWith("video/") ? (
                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center border border-purple-200">
                    <Video size={20} className="text-purple-600" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center border border-indigo-200">
                    <FileText size={20} className="text-indigo-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate">{attachment.file.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {attachment.type.startsWith("image/") ? "📷 Foto" : 
                     attachment.type.startsWith("video/") ? "🎬 Vídeo" : 
                     attachment.type.startsWith("audio/") ? "🎤 Áudio" : "📄 Documento"}
                    {" "}({(attachment.file.size / 1024).toFixed(1)} KB)
                  </p>
                </div>
                <button onClick={cancelAttachment} className="p-1 text-slate-400 hover:text-red-500">
                  <X size={16} />
                </button>
                <button onClick={handleSendAttachment} className="p-1 text-green-600 hover:bg-green-50 rounded">
                  <SendHorizontal size={16} />
                </button>
              </div>
            )}
            
            {isRecording ? (
              <div className="flex items-center justify-center gap-4 py-3 bg-red-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-bold text-red-600">Gravando</span>
                </div>
                <span className="text-sm font-mono text-red-600">{formatRecordingTime(recordingTime)}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => stopRecording(true)}
                    className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"
                  >
                    <X size={18} />
                  </button>
                  <button
                    onClick={() => stopRecording(false)}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    <SendHorizontal size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                {/* Attachment Button */}
                <div className="relative">
                  <button
                    onClick={() => viewMode !== "todos" && setShowAttachmentMenu(!showAttachmentMenu)}
                    disabled={viewMode === "todos"}
                    className={cn(
                      "p-2 rounded-xl transition-all shrink-0",
                      viewMode === "todos"
                        ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    <Paperclip size={18} />
                  </button>
                  {showAttachmentMenu && (
                    <div className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-20 min-w-[180px]">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg"
                      >
                        <Image size={14} /> Imagem / Vídeo
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg"
                      >
                        <Camera size={14} /> Câmera
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg"
                      >
                        <FileText size={14} /> Documento
                      </button>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={startRecording}
                  disabled={viewMode === "todos"}
                  className={cn(
                    "p-2 rounded-xl transition-all shrink-0",
                    viewMode === "todos" 
                      ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  )}
                >
                  <Mic size={18} />
                </button>
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (viewMode !== "todos") handleSendMessage();
                      }
                    }}
                    placeholder={viewMode === "todos" ? "Modo consulta - apenas leitura" : "Digite..."}
                    className={cn(
                      "w-full px-3 py-2 border rounded-xl outline-none transition-all text-sm",
                      viewMode === "todos"
                        ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                    )}
                    disabled={sending || viewMode === "todos"}
                    readOnly={viewMode === "todos"}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sending || viewMode === "todos"}
                  className={cn(
                    "p-2 rounded-xl transition-all shrink-0",
                    messageText.trim() && viewMode !== "todos"
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95" 
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  )}
                >
                  <SendHorizontal size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State - Compact */
        <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50/50">
          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
              <MessageCircle className="text-indigo-600" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mt-3">Selecione uma conversa</h3>
            <p className="text-xs text-slate-500 mt-1">Escolha um lead na lista</p>
          </div>
        </div>
      )}

      {/* Assign Atendente Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">Atribuir Atendimento</h3>
              <button onClick={() => setShowAssignModal(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {allAtendentes.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleAssignAtendente(user.id)}
                  className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-black">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-slate-700">{user.name}</p>
                    <p className="text-[10px] text-slate-500">{user.role}</p>
                  </div>
                  {(selectedLead as any)?.assignedToId === user.id && (
                    <span className="text-xs font-bold text-green-600">✓ Atual</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QR Editor Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">{editingQR ? "Editar Gatilho" : "Novo Gatilho"}</h3>
              <button onClick={() => setShowQRModal(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Título (botão)</label>
                <input
                  type="text"
                  value={qrForm.title}
                  onChange={(e) => setQRForm({ ...qrForm, title: e.target.value })}
                  placeholder="Ex: Bom dia!"
                  className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Mensagem</label>
                <textarea
                  value={qrForm.content}
                  onChange={(e) => setQRForm({ ...qrForm, content: e.target.value })}
                  placeholder="Conteúdo da mensagem..."
                  rows={3}
                  className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 resize-none"
                />
              </div>
              <div className="flex gap-3">
                {editingQR && (
                  <button
                    onClick={() => handleDeleteQR(editingQR.id)}
                    className="px-4 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  onClick={handleSaveQR}
                  disabled={!qrForm.title.trim() || !qrForm.content.trim()}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Lead Modal */}
      {confirmLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">
              {confirmLead.assignedToId ? "Acompanhar Atendimento?" : "Puxar Atendimento"}
            </h3>
              <button onClick={() => setConfirmLead(null)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-black text-lg">
                {confirmLead.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-900">{confirmLead.name}</p>
                <p className="text-sm text-slate-500">{confirmLead.phone || "Sem telefone"}</p>
                <span className={cn("inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold", statusConfig[confirmLead.status]?.bg, statusConfig[confirmLead.status]?.color)}>
                  {statusConfig[confirmLead.status]?.label}
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              {confirmLead.assignedToId 
                ? "Este lead está com outro atendente. Deseja apenas acompanhar a conversa?" 
                : "Este lead não tem atendente. Puxar para seu nome?"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLead(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmLead}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                {confirmLead.assignedToId ? "Acompanhar" : "Puxar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Lead Modal */}
      {isCreatingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">Novo Lead</h3>
              <button onClick={() => setIsCreatingLead(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nome *</label>
                <input
                  type="text"
                  value={newLeadData.name}
                  onChange={(e) => setNewLeadData({ ...newLeadData, name: e.target.value })}
                  placeholder="Nome dolead"
                  className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">WhatsApp</label>
                <input
                  type="text"
                  value={newLeadData.phone}
                  onChange={(e) => setNewLeadData({ ...newLeadData, phone: e.target.value })}
                  placeholder="11999999999"
                  className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                />
              </div>
              <button
                onClick={handleCreateLead}
                disabled={!newLeadData.name.trim()}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Criar Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
